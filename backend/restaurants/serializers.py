from rest_framework import serializers

from .models import (
    JjambbongRestaurant,
    Region,
    RestaurantImage,
    RestaurantMenu,
    UserFavorite,
)


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ("code", "name", "parent", "ordering", "is_active")


class RestaurantMenuSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantMenu
        fields = ("id", "name", "price", "description", "is_signature", "ordering")


class RestaurantImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantImage
        fields = ("id", "image", "image_url", "caption", "is_primary", "ordering")


class RestaurantListSerializer(serializers.ModelSerializer):
    region = RegionSerializer(read_only=True)
    primary_image_url = serializers.SerializerMethodField()

    class Meta:
        model = JjambbongRestaurant
        fields = (
            "id",
            "name",
            "region",
            "address",
            "latitude",
            "longitude",
            "phone",
            "soup_style",
            "spice_level",
            "average_price",
            "sentiment_score",
            "youtube_featured",
            "primary_image_url",
        )

    def get_primary_image_url(self, obj):
        image = next((item for item in obj.images.all() if item.is_primary), None)
        if image and image.image_url:
            return image.image_url
        if image and image.image:
            return image.image.url
        return None


class RestaurantDetailSerializer(RestaurantListSerializer):
    menus = RestaurantMenuSerializer(many=True, read_only=True)
    images = RestaurantImageSerializer(many=True, read_only=True)
    is_favorite = serializers.SerializerMethodField()

    class Meta(RestaurantListSerializer.Meta):
        fields = RestaurantListSerializer.Meta.fields + (
            "detail_address",
            "opening_hours",
            "description",
            "is_visible",
            "menus",
            "images",
            "is_favorite",
            "created_at",
            "updated_at",
        )

    def get_is_favorite(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return UserFavorite.objects.filter(user=request.user, restaurant=obj).exists()
