from django.db.models import Count
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsServiceAdmin
from restaurants.models import JjambbongRestaurant, Region
from restaurants.services import geocode_address

from .models import Answer, Feedback, Question
from .serializers import (
    AnswerSerializer,
    FeedbackCreateSerializer,
    FeedbackSerializer,
    QuestionSerializer,
)


class QuestionViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionSerializer

    def get_queryset(self):
        queryset = Question.objects.prefetch_related("answers").select_related("user", "linked_restaurant")
        user = self.request.user
        if user.is_authenticated and (user.is_staff or getattr(user, "is_service_admin", False)):
            pass
        else:
            queryset = queryset.filter(is_public=True)

        params = self.request.query_params
        status_param = params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)
        if params.get("reported_only") in {"true", "1", "yes"}:
            queryset = queryset.exclude(restaurant_name="")

        return queryset

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy", "mine"}:
            return [permissions.IsAuthenticated()]
        if self.action == "answer":
            return [permissions.IsAdminUser()]
        if self.action in {"approve", "reject", "stats"}:
            return [IsServiceAdmin()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def mine(self, request):
        queryset = (
            Question.objects.filter(user=request.user)
            .prefetch_related("answers")
            .select_related("user")
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def answer(self, request, pk=None):
        question = self.get_object()
        serializer = AnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        Answer.objects.create(
            question=question,
            author=request.user,
            content=serializer.validated_data["content"],
        )
        question.status = Question.STATUS_ANSWERED
        question.save(update_fields=["status", "updated_at"])
        output = self.get_serializer(question)
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        question = self.get_object()

        name = str(request.data.get("name") or question.restaurant_name or "").strip()
        if not name:
            return Response(
                {"detail": "등록할 식당명이 없습니다. 맛집 제보가 아닌 문의는 승인할 수 없습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        region_code = request.data.get("region_code")
        if not region_code:
            return Response({"detail": "region_code는 필수입니다."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            region = Region.objects.get(code=region_code)
        except Region.DoesNotExist:
            return Response({"detail": "존재하지 않는 region_code입니다."}, status=status.HTTP_400_BAD_REQUEST)

        address = str(request.data.get("address") or question.restaurant_address or "").strip()

        restaurant = JjambbongRestaurant(
            region=region,
            name=name,
            address=address,
            description=request.data.get("description", ""),
            soup_style=request.data.get("soup_style", JjambbongRestaurant.SOUP_UNKNOWN),
            spice_level=request.data.get("spice_level", 0),
            average_price=request.data.get("average_price") or None,
        )
        coords = geocode_address(address)
        if coords:
            restaurant.latitude, restaurant.longitude = coords
        restaurant.save()

        question.linked_restaurant = restaurant
        question.status = Question.STATUS_ANSWERED
        question.save(update_fields=["linked_restaurant", "status", "updated_at"])
        Answer.objects.create(
            question=question,
            author=request.user,
            content=f"제보하신 '{restaurant.name}'이(가) 맛집으로 등록되었습니다.",
        )

        output = self.get_serializer(question)
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        question = self.get_object()
        reason = str(request.data.get("reason") or "").strip()

        question.status = Question.STATUS_CLOSED
        question.save(update_fields=["status", "updated_at"])
        Answer.objects.create(
            question=question,
            author=request.user,
            content=reason or "제보가 반려되었습니다.",
        )

        output = self.get_serializer(question)
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        queryset = Question.objects.all()
        by_status = dict(queryset.values_list("status").annotate(count=Count("id")).order_by())
        reported_pending = queryset.filter(status=Question.STATUS_OPEN).exclude(restaurant_name="").count()
        return Response(
            {
                "open": by_status.get(Question.STATUS_OPEN, 0),
                "answered": by_status.get(Question.STATUS_ANSWERED, 0),
                "closed": by_status.get(Question.STATUS_CLOSED, 0),
                "reported_pending": reported_pending,
            }
        )


class FeedbackViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Feedback.objects.select_related("user").all()

    def get_queryset(self):
        queryset = super().get_queryset()
        is_resolved = self.request.query_params.get("is_resolved")
        if is_resolved is not None:
            queryset = queryset.filter(is_resolved=is_resolved.lower() in {"true", "1", "yes"})
        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return FeedbackCreateSerializer
        return FeedbackSerializer

    def get_permissions(self):
        if self.action in {"list", "resolve", "stats"}:
            return [IsServiceAdmin()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)

    @action(detail=True, methods=["post"], permission_classes=(IsServiceAdmin,))
    def resolve(self, request, pk=None):
        feedback = self.get_object()
        feedback.is_resolved = True
        feedback.save(update_fields=["is_resolved"])
        return Response(FeedbackSerializer(feedback).data)

    @action(detail=False, methods=["get"], permission_classes=(IsServiceAdmin,))
    def stats(self, request):
        queryset = Feedback.objects.all()
        by_category = dict(queryset.values_list("category").annotate(count=Count("id")).order_by())
        return Response(
            {
                "total": queryset.count(),
                "unresolved": queryset.filter(is_resolved=False).count(),
                "by_category": by_category,
            }
        )
