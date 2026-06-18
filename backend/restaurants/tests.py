from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import JjambbongRestaurant, Region, UserFavorite


User = get_user_model()


class RestaurantFilterAPITests(APITestCase):
    def setUp(self):
        self.region = Region.objects.create(code="11", name="서울")
        JjambbongRestaurant.objects.create(
            region=self.region,
            name="고기 매운 짬뽕",
            address="서울시 중구",
            soup_style=JjambbongRestaurant.SOUP_MEAT,
            spice_level=5,
            average_price=9000,
            sentiment_score=88,
        )
        JjambbongRestaurant.objects.create(
            region=self.region,
            name="해물 순한 짬뽕",
            address="서울시 종로구",
            soup_style=JjambbongRestaurant.SOUP_SEAFOOD,
            spice_level=2,
            average_price=12000,
            sentiment_score=95,
        )

    def test_restaurant_list_filters_tab_params(self):
        response = self.client.get(
            "/api/restaurants/",
            {
                "soup_style": JjambbongRestaurant.SOUP_MEAT,
                "min_spice": 4,
                "ordering": "-spice",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["name"], "고기 매운 짬뽕")


class RestaurantFavoriteAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="tester",
            email="tester@example.com",
            password="password123",
        )
        self.region = Region.objects.create(code="11", name="서울")
        self.restaurant = JjambbongRestaurant.objects.create(
            region=self.region,
            name="저장할 짬뽕",
            address="서울시 강남구",
            soup_style=JjambbongRestaurant.SOUP_MIXED,
            spice_level=3,
            sentiment_score=90,
        )

    def test_favorite_create_and_delete(self):
        self.client.force_authenticate(self.user)

        create_response = self.client.post(f"/api/restaurants/{self.restaurant.id}/favorite/")
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(create_response.data["is_favorite"])
        self.assertTrue(UserFavorite.objects.filter(user=self.user, restaurant=self.restaurant).exists())

        delete_response = self.client.delete(f"/api/restaurants/{self.restaurant.id}/favorite/")
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)
        self.assertFalse(delete_response.data["is_favorite"])
        self.assertFalse(UserFavorite.objects.filter(user=self.user, restaurant=self.restaurant).exists())
