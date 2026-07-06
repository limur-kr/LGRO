from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import GoogleLoginAPIView, KakaoLoginAPIView, MeAPIView, RegisterAPIView

urlpatterns = [
    path("register/", RegisterAPIView.as_view(), name="auth-register"),
    path("login/", TokenObtainPairView.as_view(), name="token-obtain-pair"),
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", MeAPIView.as_view(), name="auth-me"),
    path("google/", GoogleLoginAPIView.as_view(), name="auth-google"),
    path("kakao/", KakaoLoginAPIView.as_view(), name="auth-kakao"),
]
