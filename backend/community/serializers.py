from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import Answer, Feedback, Question


class AnswerSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Answer
        fields = ("id", "question", "author", "content", "created_at", "updated_at")
        read_only_fields = ("id", "question", "author", "created_at", "updated_at")


class QuestionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    answers = AnswerSerializer(many=True, read_only=True)
    linked_restaurant_name = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = (
            "id",
            "user",
            "title",
            "content",
            "status",
            "is_public",
            "restaurant_name",
            "restaurant_address",
            "linked_restaurant",
            "linked_restaurant_name",
            "answers",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "user",
            "status",
            "linked_restaurant",
            "linked_restaurant_name",
            "answers",
            "created_at",
            "updated_at",
        )

    def get_linked_restaurant_name(self, obj):
        return obj.linked_restaurant.name if obj.linked_restaurant_id else None


class FeedbackCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ("category", "message", "page_path")


class FeedbackSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Feedback
        fields = (
            "id",
            "user",
            "category",
            "message",
            "page_path",
            "is_resolved",
            "created_at",
        )
        read_only_fields = ("id", "user", "is_resolved", "created_at")
