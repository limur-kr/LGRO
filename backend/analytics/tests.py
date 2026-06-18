from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import SearchKeyword, SearchLog, VisitLog


User = get_user_model()


class AnalyticsAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="password123",
        )

    def test_visit_log_create_allows_anonymous_users(self):
        response = self.client.post(
            "/api/analytics/visits/",
            {
                "event_type": "page_view",
                "path": "/",
                "full_url": "http://localhost:5173/",
                "metadata": {"title": "짬뽕지도"},
            },
            format="json",
            HTTP_USER_AGENT="api-test",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(VisitLog.objects.count(), 1)
        visit = VisitLog.objects.get()
        self.assertEqual(visit.path, "/")
        self.assertEqual(visit.user_agent, "api-test")

    def test_search_log_updates_popular_keyword(self):
        for keyword in ("홍대 짬뽕", "  홍대   짬뽕  "):
            response = self.client.post(
                "/api/analytics/searches/",
                {"keyword": keyword, "result_count": 3},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(SearchLog.objects.count(), 2)
        self.assertEqual(SearchKeyword.objects.count(), 1)
        popular = SearchKeyword.objects.get()
        self.assertEqual(popular.normalized_keyword, "홍대 짬뽕")
        self.assertEqual(popular.search_count, 2)

    def test_summary_requires_admin(self):
        anonymous_response = self.client.get("/api/analytics/summary/")
        self.assertIn(anonymous_response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

        self.client.force_authenticate(self.admin)
        admin_response = self.client.get("/api/analytics/summary/")
        self.assertEqual(admin_response.status_code, status.HTTP_200_OK)
        self.assertIn("visits", admin_response.data)
        self.assertIn("searches", admin_response.data)
