from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import Answer, Question


class AnswerSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Answer
        fields = ("id", "question", "author", "content", "created_at", "updated_at")
        read_only_fields = ("id", "question", "author", "created_at", "updated_at")


class QuestionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    answers = AnswerSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = (
            "id",
            "user",
            "title",
            "content",
            "status",
            "is_public",
            "answers",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "user", "status", "answers", "created_at", "updated_at")
