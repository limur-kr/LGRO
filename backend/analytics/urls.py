from django.urls import path

from .views import (
    AnalyticsSummaryAPIView,
    PopularSearchKeywordListAPIView,
    SearchLogCreateAPIView,
    VisitLogCreateAPIView,
)

urlpatterns = [
    path("visits/", VisitLogCreateAPIView.as_view(), name="analytics-visit-create"),
    path("searches/", SearchLogCreateAPIView.as_view(), name="analytics-search-create"),
    path(
        "popular-searches/",
        PopularSearchKeywordListAPIView.as_view(),
        name="analytics-popular-searches",
    ),
    path("summary/", AnalyticsSummaryAPIView.as_view(), name="analytics-summary"),
]
