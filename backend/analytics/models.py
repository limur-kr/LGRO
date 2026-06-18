from django.conf import settings
from django.db import models
from django.utils import timezone


class VisitLog(models.Model):
    EVENT_PAGE_VIEW = "page_view"
    EVENT_DETAIL_VIEW = "detail_view"

    EVENT_CHOICES = (
        (EVENT_PAGE_VIEW, "Page view"),
        (EVENT_DETAIL_VIEW, "Detail view"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="visit_logs",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    restaurant = models.ForeignKey(
        "restaurants.JjambbongRestaurant",
        related_name="visit_logs",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    event_type = models.CharField(max_length=30, choices=EVENT_CHOICES, default=EVENT_PAGE_VIEW)
    path = models.CharField(max_length=512)
    full_url = models.TextField(blank=True)
    referrer = models.TextField(blank=True)
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    session_key = models.CharField(max_length=80, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event_type", "created_at"]),
            models.Index(fields=["path", "created_at"]),
            models.Index(fields=["restaurant", "created_at"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.event_type} {self.path}"


class SearchKeyword(models.Model):
    keyword = models.CharField(max_length=120)
    normalized_keyword = models.CharField(max_length=120, unique=True)
    search_count = models.PositiveIntegerField(default=0)
    first_searched_at = models.DateTimeField(default=timezone.now)
    last_searched_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-search_count", "-last_searched_at", "keyword"]
        indexes = [
            models.Index(fields=["-search_count", "-last_searched_at"]),
            models.Index(fields=["last_searched_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.keyword} ({self.search_count})"


class SearchLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="search_logs",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    keyword = models.CharField(max_length=120)
    normalized_keyword = models.CharField(max_length=120)
    result_count = models.PositiveIntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_key = models.CharField(max_length=80, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["normalized_keyword", "created_at"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return self.keyword
