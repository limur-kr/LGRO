from rest_framework import serializers

from .models import (
    AIAnalysisResult,
    RestaurantKeyword,
    SentimentAspectScore,
    WordCloudResult,
)


class SentimentAspectScoreSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()

    class Meta:
        model = SentimentAspectScore
        fields = ("aspect", "label", "score", "summary")

    def get_label(self, obj):
        labels = {
            SentimentAspectScore.ASPECT_SOUP: "국물",
            SentimentAspectScore.ASPECT_SPICINESS: "매운맛",
            SentimentAspectScore.ASPECT_FIRE: "불향",
            SentimentAspectScore.ASPECT_NOODLE: "면 식감",
            SentimentAspectScore.ASPECT_TOPPING: "해물/고명",
            SentimentAspectScore.ASPECT_QUANTITY: "양",
            SentimentAspectScore.ASPECT_PRICE: "가격",
            SentimentAspectScore.ASPECT_WAITING: "대기",
            SentimentAspectScore.ASPECT_HYGIENE: "위생",
            SentimentAspectScore.ASPECT_SERVICE: "서비스",
            SentimentAspectScore.ASPECT_RETURN_INTENT: "재방문 의사",
        }
        return labels.get(obj.aspect, obj.get_aspect_display())


class RestaurantKeywordSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantKeyword
        fields = ("keyword", "weight", "frequency", "sentiment")


class AIAnalysisResultSerializer(serializers.ModelSerializer):
    restaurant_id = serializers.UUIDField(read_only=True)
    scores = serializers.SerializerMethodField()
    aspect_scores = SentimentAspectScoreSerializer(many=True, read_only=True)
    aspect_details = SentimentAspectScoreSerializer(source="aspect_scores", many=True, read_only=True)
    keywords = RestaurantKeywordSerializer(many=True, read_only=True)
    ai_one_liner = serializers.CharField(source="ai_summary", read_only=True)
    summary = serializers.CharField(source="ai_summary", read_only=True)

    class Meta:
        model = AIAnalysisResult
        fields = (
            "id",
            "restaurant",
            "restaurant_id",
            "status",
            "blog_score",
            "youtube_score",
            "total_score",
            "review_count",
            "scores",
            "aspect_scores",
            "aspect_details",
            "keywords",
            "ai_one_liner",
            "summary",
            "error_message",
            "is_latest",
            "analyzed_at",
            "created_at",
            "updated_at",
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
