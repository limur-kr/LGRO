from django.urls import path

from . import admin_views

urlpatterns = [
    path("collect-reviews/", admin_views.collect_reviews, name="admin-collect-reviews"),
    path("run-analysis/", admin_views.run_analysis, name="admin-run-analysis"),
    path("jobs/<str:job_id>/", admin_views.job_status, name="admin-job-status"),
]
