from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_USER = "user"
    ROLE_ADMIN = "admin"

    ROLE_CHOICES = (
        (ROLE_USER, "일반 사용자"),
        (ROLE_ADMIN, "관리자"),
    )

    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=50, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_USER)
    profile_image_url = models.URLField(blank=True)
    oauth_provider = models.CharField(max_length=30, blank=True)
    oauth_subject = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["role"]),
        ]

    @property
    def is_service_admin(self) -> bool:
        return self.role == self.ROLE_ADMIN or self.is_staff

# Create your models here.
