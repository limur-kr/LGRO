import uuid

from django.conf import settings
from django.db import models


class Question(models.Model):
    STATUS_OPEN = "OPEN"
    STATUS_ANSWERED = "ANSWERED"
    STATUS_CLOSED = "CLOSED"

    STATUS_CHOICES = (
        (STATUS_OPEN, "답변 대기"),
        (STATUS_ANSWERED, "답변 완료"),
        (STATUS_CLOSED, "종료"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="questions",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    is_public = models.BooleanField(default=True)
    restaurant_name = models.CharField(max_length=255, blank=True)
    restaurant_address = models.CharField(max_length=255, blank=True)
    linked_restaurant = models.ForeignKey(
        "restaurants.JjambbongRestaurant",
        related_name="source_reports",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "is_public"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return self.title


class Answer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        Question,
        related_name="answers",
        on_delete=models.CASCADE,
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="answers",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.question} 답변"

# Create your models here.
