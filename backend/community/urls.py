from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FeedbackViewSet, QuestionViewSet

router = DefaultRouter()
router.register("questions", QuestionViewSet, basename="question")
router.register("feedback", FeedbackViewSet, basename="feedback")

urlpatterns = [
    path("", include(router.urls)),
]
