from django.contrib import admin

from .models import SearchKeyword, SearchLog, VisitLog


@admin.register(VisitLog)
class VisitLogAdmin(admin.ModelAdmin):
    list_display = ("event_type", "path", "restaurant", "user", "ip_address", "created_at")
    list_filter = ("event_type", "created_at")
    search_fields = ("path", "full_url", "referrer", "user__username", "restaurant__name")
    readonly_fields = (
        "user",
        "restaurant",
        "event_type",
        "path",
        "full_url",
        "referrer",
        "user_agent",
        "ip_address",
        "session_key",
        "metadata",
        "created_at",
    )


@admin.register(SearchKeyword)
class SearchKeywordAdmin(admin.ModelAdmin):
    list_display = ("keyword", "search_count", "first_searched_at", "last_searched_at")
    search_fields = ("keyword", "normalized_keyword")
    readonly_fields = (
        "keyword",
        "normalized_keyword",
        "search_count",
        "first_searched_at",
        "last_searched_at",
        "updated_at",
    )


@admin.register(SearchLog)
class SearchLogAdmin(admin.ModelAdmin):
    list_display = ("keyword", "result_count", "user", "ip_address", "created_at")
    list_filter = ("created_at",)
    search_fields = ("keyword", "normalized_keyword", "user__username")
    readonly_fields = (
        "user",
        "keyword",
        "normalized_keyword",
        "result_count",
        "ip_address",
        "user_agent",
        "session_key",
        "metadata",
        "created_at",
    )
