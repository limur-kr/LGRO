import uuid

from django.db import models


class ReviewSource(models.Model):
    SOURCE_NAVER_BLOG = "NAVER_BLOG"
    SOURCE_YOUTUBE = "YOUTUBE"
    SOURCE_USER = "USER"

    SOURCE_CHOICES = (
        (SOURCE_NAVER_BLOG, "네이버 블로그"),
        (SOURCE_YOUTUBE, "유튜브"),
        (SOURCE_USER, "사용자 제보"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    restaurant = models.ForeignKey(
        "restaurants.JjambbongRestaurant",
        related_name="review_sources",
        on_delete=models.CASCADE,
    )
    source_type = models.CharField(max_length=30, choices=SOURCE_CHOICES)
    title = models.CharField(max_length=255, blank=True)
    url = models.URLField(max_length=500)
    author = models.CharField(max_length=120, blank=True)
    content = models.TextField(blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    is_advertorial = models.BooleanField(default=False)
    quality_score = models.PositiveSmallIntegerField(default=0)
    collected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-published_at", "-collected_at"]
        indexes = [
            models.Index(fields=["restaurant", "source_type"]),
            models.Index(fields=["is_advertorial"]),
        ]

    def __str__(self) -> str:
        return self.title or self.url

# Create your models here.
