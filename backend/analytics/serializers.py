from rest_framework import serializers

from restaurants.models import JjambbongRestaurant

from .models import SearchKeyword, SearchLog, VisitLog


class VisitLogSerializer(serializers.ModelSerializer):
    restaurant = serializers.PrimaryKeyRelatedField(
        queryset=JjambbongRestaurant.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = VisitLog
        fields = (
            "id",
            "event_type",
            "path",
            "full_url",
            "referrer",
            "restaurant",
            "metadata",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate_path(self, value):
        path = value.strip()
        if not path:
            raise serializers.ValidationError("path is required.")
        return path


class SearchLogCreateSerializer(serializers.Serializer):
    keyword = serializers.CharField(max_length=120, trim_whitespace=True)
    result_count = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    metadata = serializers.JSONField(required=False)

    def validate_keyword(self, value):
        keyword = " ".join(value.split())
        if not keyword:
            raise serializers.ValidationError("keyword is required.")
        return keyword


class SearchLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchLog
        fields = (
            "id",
            "keyword",
            "normalized_keyword",
            "result_count",
            "metadata",
            "created_at",
        )
        read_only_fields = fields


class SearchKeywordSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchKeyword
        fields = (
            "id",
            "keyword",
            "normalized_keyword",
            "search_count",
            "first_searched_at",
            "last_searched_at",
            "updated_at",
        )
        read_only_fields = fields
