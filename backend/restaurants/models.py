import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Region(models.Model):
    code = models.CharField(max_length=10, primary_key=True)
    name = models.CharField(max_length=80)
    parent = models.ForeignKey(
        "self",
        related_name="children",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    ordering = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["ordering", "name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self) -> str:
        return self.name


class JjambbongRestaurant(models.Model):
    SOUP_MEAT = "MEAT"
    SOUP_SEAFOOD = "SEAFOOD"
    SOUP_MIXED = "MIXED"
    SOUP_UNKNOWN = "UNKNOWN"

    SOUP_STYLE_CHOICES = (
        (SOUP_MEAT, "고기 육수"),
        (SOUP_SEAFOOD, "해물 육수"),
        (SOUP_MIXED, "혼합 육수"),
        (SOUP_UNKNOWN, "미분류"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    region = models.ForeignKey(
        Region,
        related_name="restaurants",
        on_delete=models.PROTECT,
    )
    name = models.CharField(max_length=255)
    address = models.TextField()
    detail_address = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    opening_hours = models.TextField(blank=True)
    description = models.TextField(blank=True)
    soup_style = models.CharField(
        max_length=20,
        choices=SOUP_STYLE_CHOICES,
        default=SOUP_UNKNOWN,
    )
    spice_level = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
    )
    average_price = models.PositiveIntegerField(null=True, blank=True)
    sentiment_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    youtube_featured = models.BooleanField(default=False)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["region", "is_visible"]),
            models.Index(fields=["soup_style"]),
            models.Index(fields=["spice_level"]),
            models.Index(fields=["sentiment_score"]),
        ]

    def __str__(self) -> str:
        return self.name


class RestaurantMenu(models.Model):
    restaurant = models.ForeignKey(
        JjambbongRestaurant,
        related_name="menus",
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=120)
    price = models.PositiveIntegerField(null=True, blank=True)
    description = models.TextField(blank=True)
    is_signature = models.BooleanField(default=False)
    ordering = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["ordering", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "name"],
                name="unique_menu_name_per_restaurant",
            )
        ]

    def __str__(self) -> str:
        return f"{self.restaurant} - {self.name}"


class RestaurantImage(models.Model):
    restaurant = models.ForeignKey(
        JjambbongRestaurant,
        related_name="images",
        on_delete=models.CASCADE,
    )
    image = models.ImageField(upload_to="restaurants/", null=True, blank=True)
    image_url = models.URLField(blank=True)
    caption = models.CharField(max_length=255, blank=True)
    is_primary = models.BooleanField(default=False)
    ordering = models.PositiveSmallIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="uploaded_restaurant_images",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["ordering", "id"]
        indexes = [
            models.Index(fields=["restaurant", "is_primary"]),
            models.Index(fields=["restaurant", "is_approved"]),
        ]

    def __str__(self) -> str:
        return self.caption or f"{self.restaurant} 이미지"


class UserFavorite(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="favorite_restaurants",
        on_delete=models.CASCADE,
    )
    restaurant = models.ForeignKey(
        JjambbongRestaurant,
        related_name="favorited_by",
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "restaurant"],
                name="unique_user_favorite_restaurant",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user} -> {self.restaurant}"

# Create your models here.
