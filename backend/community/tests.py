from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from restaurants.models import JjambbongRestaurant, Region

from .models import Question


User = get_user_model()


class QuestionApproveRejectAPITests(APITestCase):
    def setUp(self):
        self.region = Region.objects.create(code="11", name="서울")
        self.reporter = User.objects.create_user(
            username="reporter",
            email="reporter@example.com",
            password="password123",
        )
        self.admin = User.objects.create_user(
            username="svcadmin",
            email="admin@example.com",
            password="password123",
            role=User.ROLE_ADMIN,
        )
        self.report = Question.objects.create(
            user=self.reporter,
            title="새 짬뽕집 제보",
            content="여기 진짜 맛있어요",
            restaurant_name="제보 짬뽕",
            restaurant_address="서울시 강남구 123",
        )

    def test_non_admin_cannot_approve(self):
        self.client.force_authenticate(self.reporter)
        response = self.client.post(
            f"/api/questions/{self.report.id}/approve/",
            {"region_code": self.region.code},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_approve_creates_restaurant_and_links_question(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/api/questions/{self.report.id}/approve/",
            {
                "region_code": self.region.code,
                "soup_style": JjambbongRestaurant.SOUP_SEAFOOD,
                "spice_level": 3,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, Question.STATUS_ANSWERED)
        self.assertIsNotNone(self.report.linked_restaurant)
        self.assertEqual(self.report.linked_restaurant.name, "제보 짬뽕")
        self.assertEqual(self.report.linked_restaurant.address, "서울시 강남구 123")
        self.assertTrue(self.report.answers.exists())
        self.assertEqual(JjambbongRestaurant.objects.filter(name="제보 짬뽕").count(), 1)

    def test_approve_without_restaurant_name_requires_explicit_name(self):
        plain_question = Question.objects.create(
            user=self.reporter,
            title="일반 문의",
            content="영업시간이 궁금해요",
        )
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/api/questions/{plain_question.id}/approve/",
            {"region_code": self.region.code},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_closes_question_with_reason(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/api/questions/{self.report.id}/reject/",
            {"reason": "중복 제보입니다"},
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, Question.STATUS_CLOSED)
        self.assertIsNone(self.report.linked_restaurant)
        self.assertEqual(self.report.answers.get().content, "중복 제보입니다")

    def test_report_queue_filters_open_reports_only(self):
        Question.objects.create(user=self.reporter, title="일반 문의", content="문의 내용")
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/questions/", {"status": "OPEN", "reported_only": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["title"] for item in response.data["results"]]
        self.assertIn("새 짬뽕집 제보", names)
        self.assertNotIn("일반 문의", names)
