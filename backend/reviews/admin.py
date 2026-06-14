from django.contrib import admin

from .models import ReviewSource


@admin.register(ReviewSource)
class ReviewSourceAdmin(admin.ModelAdmin):
    list_display = (
        "restaurant",
        "source_type",
        "title",
        "author",
        "is_advertorial",
        "quality_score",
        "collected_at",
    )
    list_filter = ("source_type", "is_advertorial")
    search_fields = ("restaurant__name", "title", "author", "url", "content")

# Register your models here.
