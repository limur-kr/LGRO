from rest_framework import permissions, viewsets

from .models import AIAnalysisResult, WordCloudResult
from .serializers import AIAnalysisResultSerializer, WordCloudResultSerializer


class AIAnalysisResultViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AIAnalysisResultSerializer
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        return (
            AIAnalysisResult.objects.select_related("restaurant")
            .prefetch_related("aspect_scores", "keywords")
            .order_by("-is_latest", "-created_at")
        )


class WordCloudResultViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WordCloudResultSerializer
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        return WordCloudResult.objects.select_related("restaurant", "analysis").order_by("-generated_at")
