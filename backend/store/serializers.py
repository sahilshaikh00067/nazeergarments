
from rest_framework import serializers
from .models import WishlistItem

from .models import (
    Category,
    Product,
    ProductImage,
    Variant,
    Review,
    ReviewImage,
)



class CategorySerializer(serializers.ModelSerializer):
    image = serializers.ImageField(read_only=True)

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "parent",
            "image",
            "is_active",
            "sort_order",
        ]


class ProductImageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(read_only=True)

    class Meta:
        model = ProductImage
        fields = [
            "id",
            "image",
            "sort_order",
        ]


class ProductVariantSerializer(serializers.ModelSerializer):
    unit_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = Variant
        fields = [
            "id",
            "sku",
            "size",
            "color",
            "price_override",
            "unit_price",
            "stock",
            "is_available",
        ]


class ReviewImageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(read_only=True)

    class Meta:
        model = ReviewImage
        fields = ["id", "image"]


class ReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    images = ReviewImageSerializer(many=True, read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "customer_name",
            "rating",
            "title",
            "comment",
            "images",
            "created_at",
        ]

    def get_customer_name(self, obj):
        return obj.user.get_full_name() or obj.user.email




class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    total_stock = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "description",
            "brand",
            "fabric",
            "specs",
            "mrp",
            "price",
            "low_stock_threshold",
            "is_active",
            "is_featured",
            "is_bestseller",
            "is_new",
            "images",
            "variants",
            "total_stock",
            "average_rating",
            "total_reviews",
            "created_at",

        ]

    def get_total_stock(self, obj):
        return sum(
            variant.stock
            for variant in obj.variants.all()
            if variant.is_available
        )

    def get_average_rating(self, obj):
        from django.db.models import Avg

        result = obj.reviews.filter(
            is_approved=True
        ).aggregate(avg=Avg("rating"))

        return round(result["avg"] or 0, 1)

    def get_total_reviews(self, obj):
        return obj.reviews.filter(is_approved=True).count()

class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = ["id", "product", "created_at"]
