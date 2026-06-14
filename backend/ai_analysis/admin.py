from django.contrib import admin

from .models import (
    AIAnalysisResult,
    RestaurantKeyword,
    SentimentAspectScore,
    WordCloudResult,
)


class SentimentAspectScoreInline(admin.TabularInline):
    model = SentimentAspectScore
    extra = 0


class RestaurantKeywordInline(admin.TabularInline):
    model = RestaurantKeyword
    extra = 0


@admin.register(AIAnalysisResult)
class AIAnalysisResultAdmin(admin.ModelAdmin):
    list_display = (
        "restaurant",
        "status",
        "total_score",
        "blog_score",
        "youtube_score",
        "review_count",
        "is_latest",
        "created_at",
    )
    list_filter = ("status", "is_latest")
    search_fields = ("restaurant__name", "ai_summary", "error_message")
    inlines = (SentimentAspectScoreInline, RestaurantKeywordInline)


@admin.register(SentimentAspectScore)
class SentimentAspectScoreAdmin(admin.ModelAdmin):
    list_display = ("analysis", "aspect", "score", "summary")
    list_filter = ("aspect",)
    search_fields = ("analysis__restaurant__name", "summary")


@admin.register(RestaurantKeyword)
class RestaurantKeywordAdmin(admin.ModelAdmin):
    list_display = ("restaurant", "keyword", "weight", "frequency", "sentiment")
    list_filter = ("sentiment",)
    search_fields = ("restaurant__name", "keyword")


@admin.register(WordCloudResult)
class WordCloudResultAdmin(admin.ModelAdmin):
    list_display = ("restaurant", "analysis", "generated_at")
    search_fields = ("restaurant__name",)

# Register your models here.
