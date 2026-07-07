import logging

import requests
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer, UserSerializer
from .social_auth import issue_tokens_for_user, resolve_or_create_social_user

logger = logging.getLogger(__name__)


class RegisterAPIView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


class MeAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user

    def perform_destroy(self, instance):
        if instance.has_usable_password():
            password = self.request.data.get("password", "")
            if not instance.check_password(password):
                raise serializers.ValidationError({"password": "비밀번호가 일치하지 않습니다."})
        instance.delete()


class GoogleLoginAPIView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        access_token = request.data.get("access_token")
        if not access_token:
            return Response({"detail": "access_token이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            response = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=5,
            )
            response.raise_for_status()
            payload = response.json()
        except requests.RequestException as exc:
            logger.warning("Google access_token verification failed: %s", exc)
            return Response({"detail": "유효하지 않은 Google access_token입니다."}, status=status.HTTP_401_UNAUTHORIZED)

        subject = payload["sub"]
        email = payload.get("email", "") if payload.get("email_verified") else ""
        display_name = payload.get("name", "")

        user = resolve_or_create_social_user("google", subject, email, display_name)
        return Response(issue_tokens_for_user(user))


class KakaoLoginAPIView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        access_token = request.data.get("access_token")
        if not access_token:
            return Response({"detail": "access_token이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            response = requests.get(
                "https://kapi.kakao.com/v2/user/me",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=5,
            )
            response.raise_for_status()
            payload = response.json()
        except requests.RequestException:
            return Response({"detail": "유효하지 않은 Kakao access_token입니다."}, status=status.HTTP_401_UNAUTHORIZED)

        subject = str(payload["id"])
        kakao_account = payload.get("kakao_account", {})
        email = kakao_account.get("email", "") if kakao_account.get("is_email_valid") else ""
        display_name = kakao_account.get("profile", {}).get("nickname", "")

        user = resolve_or_create_social_user("kakao", subject, email, display_name)
        return Response(issue_tokens_for_user(user))

# Create your views here.
