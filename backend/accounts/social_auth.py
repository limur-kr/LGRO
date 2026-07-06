import re
import uuid

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


def _generate_unique_username(email: str, provider: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9_]", "", (email.split("@")[0] if email else "")) or f"{provider}user"
    base = base[:20] or f"{provider}user"

    candidate = base
    suffix = 0
    while User.objects.filter(username=candidate).exists():
        suffix += 1
        candidate = f"{base}{suffix}"
    return candidate


@transaction.atomic
def resolve_or_create_social_user(
    provider: str,
    subject: str,
    email: str = "",
    display_name: str = "",
) -> User:
    user = User.objects.filter(oauth_provider=provider, oauth_subject=subject).first()
    if user:
        return user

    if email:
        user = User.objects.filter(email=email).first()
        if user:
            user.oauth_provider = provider
            user.oauth_subject = subject
            user.save(update_fields=["oauth_provider", "oauth_subject", "updated_at"])
            return user

    username = _generate_unique_username(email, provider)
    user = User(
        username=username,
        email=email or f"{provider}-{uuid.uuid4().hex[:12]}@no-email.jjambbong.local",
        display_name=display_name[:50],
        oauth_provider=provider,
        oauth_subject=subject,
    )
    user.set_unusable_password()
    user.save()
    return user


def issue_tokens_for_user(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}
