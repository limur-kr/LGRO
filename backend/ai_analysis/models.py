import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class AIAnalysisResult(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_COMPLETED = "COMPLETED"
    STATUS_FAILED = "FAILED"

    STATUS_CHOICES = (
        (STATUS_PENDING, "대기"),
        (STATUS_COMPLETED, "완료"),
        (STATUS_FAILED, "실패"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    restaurant = models.ForeignKey(
        "restaurants.JjambbongRestaurant",
        related_name="analysis_results",
        on_delete=models.CASCADE,
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    blog_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    youtube_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField(default=0)
    ai_summary = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    is_latest = models.BooleanField(default=True)
    analyzed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "is_latest"]),
            models.Index(fields=["status"]),
            models.Index(fields=["total_score"]),
        ]

    def __str__(self) -> str:
        return f"{self.restaurant} 분석 결과 ({self.status})"


class SentimentAspectScore(models.Model):
    ASPECT_SOUP = "soup"
    ASPECT_SPICINESS = "spiciness"
    ASPECT_FIRE = "fire"
    ASPECT_NOODLE = "noodle"
    ASPECT_TOPPING = "topping"
    ASPECT_QUANTITY = "quantity"
    ASPECT_PRICE = "price"
    ASPECT_WAITING = "waiting"
    ASPECT_HYGIENE = "hygiene"
    ASPECT_SERVICE = "service"
    ASPECT_RETURN_INTENT = "return_intent"

    ASPECT_CHOICES = (
        (ASPECT_SOUP, "국물 맛"),
        (ASPECT_SPICINESS, "매운맛"),
        (ASPECT_FIRE, "불향"),
        (ASPECT_NOODLE, "면 식감"),
        (ASPECT_TOPPING, "해산물/고명"),
        (ASPECT_QUANTITY, "양"),
        (ASPECT_PRICE, "가격 만족도"),
        (ASPECT_WAITING, "웨이팅"),
        (ASPECT_HYGIENE, "위생"),
        (ASPECT_SERVICE, "서비스"),
        (ASPECT_RETURN_INTENT, "재방문 의사"),
    )

    analysis = models.ForeignKey(
        AIAnalysisResult,
        related_name="aspect_scores",
        on_delete=models.CASCADE,
    )
    aspect = models.CharField(max_length=30, choices=ASPECT_CHOICES)
    score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    summary = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["aspect"]
        constraints = [
            models.UniqueConstraint(
                fields=["analysis", "aspect"],
                name="unique_aspect_per_analysis",
            )
        ]

    def __str__(self) -> str:
        return f"{self.analysis} - {self.aspect}: {self.score}"


class RestaurantKeyword(models.Model):
    restaurant = models.ForeignKey(
        "restaurants.JjambbongRestaurant",
        related_name="keywords",
        on_delete=models.CASCADE,
    )
    analysis = models.ForeignKey(
        AIAnalysisResult,
        related_name="keywords",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    keyword = models.CharField(max_length=80)
    weight = models.DecimalField(max_digits=6, decimal_places=3, default=1)
    frequency = models.PositiveIntegerField(default=1)
    sentiment = models.CharField(max_length=20, blank=True)

    class Meta:
        ordering = ["-weight", "keyword"]
        indexes = [
            models.Index(fields=["restaurant", "keyword"]),
        ]

    def __str__(self) -> str:
        return self.keyword


class WordCloudResult(models.Model):
    restaurant = models.ForeignKey(
        "restaurants.JjambbongRestaurant",
        related_name="wordcloud_results",
        on_delete=models.CASCADE,
    )
    analysis = models.ForeignKey(
        AIAnalysisResult,
        related_name="wordcloud_results",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    image = models.ImageField(upload_to="wordclouds/", null=True, blank=True)
    image_url = models.URLField(blank=True)
    keywords = models.JSONField(default=list, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-generated_at"]
        indexes = [
            models.Index(fields=["restaurant", "generated_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.restaurant} 워드클라우드"

# Create your models here.
