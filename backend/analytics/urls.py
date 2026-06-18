from django.urls import path

from .views import (
    AnalyticsSummaryAPIView,
    PopularSearchKeywordListAPIView,
    SearchLogCreateAPIView,
    VisitLogCreateAPIView,
)

urlpatterns = [
    path("analytics/visits/", VisitLogCreateAPIView.as_view(), name="analytics-visit-create"),
    path("analytics/searches/", SearchLogCreateAPIView.as_view(), name="analytics-search-create"),
    path(
        "analytics/popular-searches/",
        PopularSearchKeywordListAPIView.as_view(),
        name="analytics-popular-searches",
    ),
    path("analytics/summary/", AnalyticsSummaryAPIView.as_view(), name="analytics-summary"),
]
