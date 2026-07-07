from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


class AccountDeletionAPITests(APITestCase):
    def test_password_account_requires_correct_password(self):
        user = User.objects.create_user(username="pwuser", email="pw@example.com", password="correct-horse")
        self.client.force_authenticate(user)

        wrong = self.client.delete("/api/auth/me/", {"password": "wrong-password"}, format="json")
        self.assertEqual(wrong.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(id=user.id).exists())

        correct = self.client.delete("/api/auth/me/", {"password": "correct-horse"}, format="json")
        self.assertEqual(correct.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(id=user.id).exists())

    def test_social_account_deletes_without_password(self):
        user = User(username="socialuser", email="social@example.com", oauth_provider="google", oauth_subject="abc123")
        user.set_unusable_password()
        user.save()
        self.client.force_authenticate(user)

        response = self.client.delete("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(id=user.id).exists())

    def test_unauthenticated_cannot_delete(self):
        response = self.client.delete("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
