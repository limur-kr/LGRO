from django.db import transaction
from django.db.models import Count, F
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SearchKeyword, SearchLog, VisitLog
from .serializers import (
    SearchKeywordSerializer,
    SearchLogCreateSerializer,
    SearchLogSerializer,
    VisitLogSerializer,
)


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def get_session_key(request):
    session = getattr(request, "session", None)
    if not session:
        return ""
    return session.session_key or ""


def get_request_user(request):
    user = getattr(request, "user", None)
    return user if user and user.is_authenticated else None


def normalize_keyword(keyword):
    return " ".join(keyword.split()).casefold()


class VisitLogCreateAPIView(generics.CreateAPIView):
    serializer_class = VisitLogSerializer
    permission_classes = (permissions.AllowAny,)

    def perform_create(self, serializer):
        serializer.save(
            user=get_request_user(self.request),
            ip_address=get_client_ip(self.request),
            user_agent=self.request.META.get("HTTP_USER_AGENT", ""),
            session_key=get_session_key(self.request),
        )


class SearchLogCreateAPIView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = SearchLogCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        keyword = serializer.validated_data["keyword"]
        normalized_keyword = normalize_keyword(keyword)
        now = timezone.now()

        with transaction.atomic():
            popular_keyword, _ = SearchKeyword.objects.select_for_update().get_or_create(
                normalized_keyword=normalized_keyword,
                defaults={
                    "keyword": keyword,
                    "search_count": 0,
                    "first_searched_at": now,
                    "last_searched_at": now,
                },
            )
            SearchKeyword.objects.filter(pk=popular_keyword.pk).update(
                keyword=keyword,
                search_count=F("search_count") + 1,
                last_searched_at=now,
            )
            popular_keyword.refresh_from_db()
            search_log = SearchLog.objects.create(
                user=get_request_user(request),
                keyword=keyword,
                normalized_keyword=normalized_keyword,
                result_count=serializer.validated_data.get("result_count"),
                ip_address=get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
                session_key=get_session_key(request),
                metadata=serializer.validated_data.get("metadata") or {},
            )

        return Response(
            {
                "search": SearchLogSerializer(search_log).data,
                "keyword": SearchKeywordSerializer(popular_keyword).data,
            },
            status=status.HTTP_201_CREATED,
        )


class PopularSearchKeywordListAPIView(generics.ListAPIView):
    serializer_class = SearchKeywordSerializer
    permission_classes = (permissions.IsAdminUser,)

    def get_queryset(self):
        limit = self.request.query_params.get("limit")
        queryset = SearchKeyword.objects.order_by("-search_count", "-last_searched_at", "keyword")
        if limit:
            try:
                return queryset[: max(1, min(100, int(limit)))]
            except ValueError:
                pass
        return queryset[:20]


class AnalyticsSummaryAPIView(APIView):
    permission_classes = (permissions.IsAdminUser,)

    def get(self, request):
        today = timezone.localdate()
        popular_paths = (
            VisitLog.objects.values("path")
            .annotate(count=Count("id"))
            .order_by("-count", "path")[:10]
        )
        popular_searches = SearchKeyword.objects.order_by("-search_count", "-last_searched_at", "keyword")[:10]
        recent_searches = SearchLog.objects.order_by("-created_at")[:10]

        return Response(
            {
                "visits": {
                    "total": VisitLog.objects.count(),
                    "today": VisitLog.objects.filter(created_at__date=today).count(),
                    "popular_paths": list(popular_paths),
                },
                "searches": {
                    "total": SearchLog.objects.count(),
                    "today": SearchLog.objects.filter(created_at__date=today).count(),
                    "popular_keywords": SearchKeywordSerializer(popular_searches, many=True).data,
                    "recent": SearchLogSerializer(recent_searches, many=True).data,
                },
            }
        )
