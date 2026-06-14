from rest_framework import serializers

from .models import (
    AIAnalysisResult,
    RestaurantKeyword,
    SentimentAspectScore,
    WordCloudResult,
)


class SentimentAspectScoreSerializer(serializers.ModelSerializer):
    label = serializers.CharField(source="get_aspect_display", read_only=True)

    class Meta:
        model = SentimentAspectScore
        fields = ("aspect", "label", "score", "summary")


class RestaurantKeywordSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantKeyword
        fields = ("keyword", "weight", "frequency", "sentiment")


class AIAnalysisResultSerializer(serializers.ModelSerializer):
    scores = serializers.SerializerMethodField()
    aspect_details = SentimentAspectScoreSerializer(source="aspect_scores", many=True)
    keywords = RestaurantKeywordSerializer(many=True, read_only=True)
    ai_one_liner = serializers.CharField(source="ai_summary", read_only=True)

    class Meta:
        model = AIAnalysisResult
        fields = (
            "id",
            "restaurant",
            "status",
            "blog_score",
            "youtube_score",
            "total_score",
            "review_count",
            "scores",
            "aspect_details",
            "keywords",
            "ai_one_liner",
            "analyzed_at",
            "created_at",
        )

    def get_scores(self, obj):
        return {score.aspect: score.score for score in obj.aspect_scores.all()}


class WordCloudResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = WordCloudResult
        fields = (
            "id",
            "restaurant",
            "analysis",
            "image",
            "image_url",
            "keywords",
            "generated_at",
        )
