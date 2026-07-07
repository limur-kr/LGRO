from django.db.models import ExpressionWrapper, F, FloatField, Prefetch, Q
from django.db.models.functions import Power
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from ai_analysis.models import AIAnalysisResult, WordCloudResult
from ai_analysis.serializers import AIAnalysisResultSerializer, WordCloudResultSerializer
from accounts.permissions import IsServiceAdmin

from .models import JjambbongRestaurant, Region, RestaurantImage, UserFavorite
from .serializers import (
    PendingRestaurantImageSerializer,
    RegionSerializer,
    RestaurantDetailSerializer,
    RestaurantImageUploadSerializer,
    RestaurantListSerializer,
    RestaurantMenuSerializer,
)


class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RegionSerializer
    permission_classes = (permissions.AllowAny,)
    queryset = Region.objects.filter(is_active=True)


class RestaurantViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        queryset = (
            JjambbongRestaurant.objects.filter(is_visible=True)
            .select_related("region")
            .prefetch_related(
                "menus",
                Prefetch(
                    "images",
                    queryset=RestaurantImage.objects.filter(is_approved=True).order_by("-is_primary", "ordering"),
                ),
            )
        )
        params = self.request.query_params

        keyword = params.get("q")
        if keyword:
            queryset = queryset.filter(
                Q(name__icontains=keyword)
                | Q(address__icontains=keyword)
                | Q(description__icontains=keyword)
            )

        region_code = params.get("region_code") or params.get("region")
        if region_code:
            queryset = queryset.filter(region_id=region_code)

        soup_style = params.get("soup_style")
        if soup_style:
            queryset = queryset.filter(soup_style=soup_style)

        spice_level = params.get("spice_level")
        if spice_level:
            queryset = queryset.filter(spice_level=spice_level)

        min_spice = params.get("min_spice")
        if min_spice:
            queryset = queryset.filter(spice_level__gte=min_spice)

        max_spice = params.get("max_spice")
        if max_spice:
            queryset = queryset.filter(spice_level__lte=max_spice)

        min_price = params.get("min_price")
        if min_price:
            queryset = queryset.filter(average_price__gte=min_price)

        max_price = params.get("max_price")
        if max_price:
            queryset = queryset.filter(average_price__lte=max_price)

        youtube_featured = params.get("youtube_featured")
        if youtube_featured in {"true", "1", "yes"}:
            queryset = queryset.filter(youtube_featured=True)

        ordering = params.get("ordering")
        if ordering:
            ordering_options = {
                "score": ("-sentiment_score", "name"),
                "-score": ("-sentiment_score", "name"),
                "price": (F("average_price").asc(nulls_last=True), "-sentiment_score", "name"),
                "-price": (F("average_price").desc(nulls_last=True), "-sentiment_score", "name"),
                "spice": ("spice_level", "-sentiment_score", "name"),
                "-spice": ("-spice_level", "-sentiment_score", "name"),
                "latest": ("-created_at", "name"),
            }
            if ordering in ordering_options:
                queryset = queryset.order_by(*ordering_options[ordering])
        elif params.get("lat") and params.get("lng"):
            try:
                lat_value = float(params["lat"])
                lng_value = float(params["lng"])
            except ValueError:
                lat_value = lng_value = None

            if lat_value is not None:
                queryset = (
                    queryset.filter(latitude__isnull=False, longitude__isnull=False)
                    .annotate(
                        distance_sq=ExpressionWrapper(
                            Power(F("latitude") - lat_value, 2) + Power(F("longitude") - lng_value, 2),
                            output_field=FloatField(),
                        )
                    )
                    .order_by("distance_sq")
                )

        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return RestaurantDetailSerializer
        return RestaurantListSerializer

    @action(detail=True, methods=["get"])
    def menus(self, request, pk=None):
        restaurant = self.get_object()
        serializer = RestaurantMenuSerializer(restaurant.menus.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def sentiment(self, request, pk=None):
        restaurant = self.get_object()
        analysis = (
            AIAnalysisResult.objects.filter(
                restaurant=restaurant,
                status=AIAnalysisResult.STATUS_COMPLETED,
            )
            .prefetch_related("aspect_scores", "keywords")
            .order_by("-is_latest", "-created_at")
            .first()
        )
        if not analysis:
            return Response(
                {"detail": "아직 저장된 AI 감성 분석 결과가 없습니다."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = AIAnalysisResultSerializer(analysis)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def wordcloud(self, request, pk=None):
        restaurant = self.get_object()
        wordcloud = WordCloudResult.objects.filter(restaurant=restaurant).first()
        if not wordcloud:
            return Response(
                {"detail": "아직 저장된 워드클라우드 결과가 없습니다."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = WordCloudResultSerializer(wordcloud)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post", "delete"],
        permission_classes=(permissions.IsAuthenticated,),
    )
    def favorite(self, request, pk=None):
        restaurant = self.get_object()
        if request.method == "POST":
            UserFavorite.objects.get_or_create(user=request.user, restaurant=restaurant)
            return Response({"is_favorite": True}, status=status.HTTP_201_CREATED)

        UserFavorite.objects.filter(user=request.user, restaurant=restaurant).delete()
        return Response({"is_favorite": False}, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=(permissions.IsAuthenticated,),
        parser_classes=(MultiPartParser, FormParser),
        url_path="images",
    )
    def upload_image(self, request, pk=None):
        restaurant = self.get_object()
        serializer = RestaurantImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(restaurant=restaurant, uploaded_by=request.user, is_approved=False)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RestaurantImageViewSet(mixins.ListModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    serializer_class = PendingRestaurantImageSerializer

    def get_queryset(self):
        queryset = RestaurantImage.objects.select_related("restaurant", "uploaded_by")
        if self.action == "list":
            queryset = queryset.filter(is_approved=False)
        return queryset.order_by("created_at")

    def get_permissions(self):
        if self.action in {"list", "approve"}:
            return [IsServiceAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_destroy(self, instance):
        user = self.request.user
        if instance.uploaded_by_id != user.id and not user.is_service_admin:
            raise PermissionDenied("본인이 등록한 사진만 삭제할 수 있습니다.")
        instance.delete()

    @action(detail=True, methods=["post"], permission_classes=(IsServiceAdmin,))
    def approve(self, request, pk=None):
        image = self.get_object()
        image.is_approved = True
        image.save(update_fields=["is_approved"])
        return Response(PendingRestaurantImageSerializer(image).data)

# Create your views here.
