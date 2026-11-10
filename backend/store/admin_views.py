
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Sum, Count, Q, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.text import slugify

from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status

from .models import (
    Category,
    Product,
    ProductImage,
    Variant,
    Order,
    OrderItem,
    CustomerProfile,
)


User = get_user_model()


# --------------------------------------------------
# SERIALIZERS
# --------------------------------------------------

class AdminCategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

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
            "product_count",
        ]
        read_only_fields = ["id", "slug", "product_count"]


class AdminVariantSerializer(serializers.ModelSerializer):
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
        read_only_fields = ["id", "unit_price"]


class AdminProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all()
    )
    variants = AdminVariantSerializer(many=True, read_only=True)
    images = serializers.SerializerMethodField()
    total_stock = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "category_name",
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
            "is_sample",
            "created_at",
            "variants",
            "images",
            "total_stock",
        ]
        read_only_fields = ["id", "slug", "created_at", "total_stock"]

    def get_images(self, obj):
        request = self.context.get("request")
        result = []

        for image in obj.images.all():
            url = image.image.url
            if request:
                url = request.build_absolute_uri(url)

            result.append({
                "id": image.id,
                "image": url,
                "sort_order": image.sort_order,
            })

        return result

    def validate(self, attrs):
        mrp = attrs.get("mrp", getattr(self.instance, "mrp", None))
        price = attrs.get("price", getattr(self.instance, "price", None))

        if mrp is not None and price is not None:
            if price > mrp:
                raise serializers.ValidationError({
                    "price": "Selling price cannot be greater than MRP."
                })

        return attrs


# --------------------------------------------------
# DASHBOARD ANALYTICS
# --------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_analytics(request):
    today = timezone.localdate()
    start_date = today - timezone.timedelta(days=29)

    orders = Order.objects.filter(created_at__date__gte=start_date)

    paid_orders = Order.objects.filter(
        Q(
            payment_status="paid",
            late_payment_needs_refund=False,
        )
        |
        Q(
            payment_method="cod",
            status="delivered",
        )
    )

    revenue = paid_orders.aggregate(
        total=Sum("total")
    )["total"] or Decimal("0.00")

    daily_revenue = (
        paid_orders.filter(created_at__date__gte=start_date)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(revenue=Sum("total"), orders=Count("id"))
        .order_by("day")
    )

    status_counts = (
        Order.objects.values("status")
        .annotate(count=Count("id"))
        .order_by("status")
    )

    payment_counts = (
        Order.objects.values("payment_status")
        .annotate(count=Count("id"))
        .order_by("payment_status")
    )

    top_products = (
        OrderItem.objects.filter(
            order__in=paid_orders
        )
        .values("name")
        .annotate(
            quantity_sold=Sum("quantity"),
            revenue=Sum(F("unit_price") * F("quantity")),
        )
        .order_by("-quantity_sold")[:10]
    )

    return Response({
        "success": True,
        "period": {
            "from": str(start_date),
            "to": str(today),
        },
        "summary": {
            "total_revenue": str(revenue),
            "total_orders": Order.objects.count(),
            "period_orders": orders.count(),
            "total_customers": CustomerProfile.objects.count(),
            "total_products": Product.objects.count(),
        },
        "revenue_by_day": [
            {
                "date": str(row["day"]),
                "revenue": str(row["revenue"] or 0),
                "orders": row["orders"],
            }
            for row in daily_revenue
        ],
        "orders_by_status": list(status_counts),
        "payments_by_status": list(payment_counts),
        "top_products": [
            {
                "name": row["name"],
                "quantity_sold": row["quantity_sold"],
                "revenue": str(row["revenue"] or 0),
            }
            for row in top_products
        ],
    })


# --------------------------------------------------
# ADMIN PRODUCTS
# --------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_products(request):

    if request.method == "GET":
        queryset = (
            Product.objects
            .select_related("category")
            .prefetch_related("variants", "images")
            .annotate(total_stock=Sum("variants__stock"))
            .order_by("-created_at")
        )

        search = request.query_params.get("search", "").strip()
        category = request.query_params.get("category")
        active = request.query_params.get("active")

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(brand__icontains=search)
                | Q(slug__icontains=search)
            )

        if category:
            queryset = queryset.filter(category_id=category)

        if active in ("true", "false"):
            queryset = queryset.filter(is_active=(active == "true"))

        serializer = AdminProductSerializer(
            queryset,
            many=True,
            context={"request": request},
        )

        return Response({
            "success": True,
            "count": queryset.count(),
            "products": serializer.data,
        })

    serializer = AdminProductSerializer(
        data=request.data,
        context={"request": request},
    )
    serializer.is_valid(raise_exception=True)

    product = serializer.save()

    return Response({
        "success": True,
        "message": "Product created successfully.",
        "product": AdminProductSerializer(
            product,
            context={"request": request},
        ).data,
    }, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_product_detail(request, product_id):

    try:
        product = (
            Product.objects
            .select_related("category")
            .prefetch_related("variants", "images")
            .get(pk=product_id)
        )
    except Product.DoesNotExist:
        return Response(
            {"detail": "Product not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        return Response(
            AdminProductSerializer(
                product,
                context={"request": request},
            ).data
        )

    if request.method == "DELETE":
        # Soft delete: preserve old order records and product data.
        product.is_active = False
        product.save(update_fields=["is_active"])

        return Response({
            "success": True,
            "message": "Product deactivated successfully.",
        })

    serializer = AdminProductSerializer(
        product,
        data=request.data,
        partial=True,
        context={"request": request},
    )
    serializer.is_valid(raise_exception=True)
    product = serializer.save()

    return Response({
        "success": True,
        "message": "Product updated successfully.",
        "product": AdminProductSerializer(
            product,
            context={"request": request},
        ).data,
    })


# --------------------------------------------------
# PRODUCT VARIANTS / STOCK
# --------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_create_variant(request, product_id):

    try:
        product = Product.objects.get(pk=product_id)
    except Product.DoesNotExist:
        return Response(
            {"detail": "Product not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = AdminVariantSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    variant = serializer.save(product=product)

    return Response(
        AdminVariantSerializer(variant).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAdminUser])
def admin_variant_detail(request, variant_id):

    try:
        variant = Variant.objects.get(pk=variant_id)
    except Variant.DoesNotExist:
        return Response(
            {"detail": "Variant not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "DELETE":
        # Do not delete variants that are referenced by past orders.
        if OrderItem.objects.filter(variant=variant).exists():
            return Response(
                {
                    "detail": (
                        "This variant is used in previous orders. "
                        "Mark it unavailable instead of deleting it."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        variant.delete()
        return Response({"success": True})

    serializer = AdminVariantSerializer(
        variant,
        data=request.data,
        partial=True,
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()

    return Response(serializer.data)


# --------------------------------------------------
# ADMIN CATEGORIES
# --------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_categories(request):

    if request.method == "GET":
        queryset = (
            Category.objects
            .annotate(product_count=Count("products"))
            .order_by("sort_order", "name")
        )

        serializer = AdminCategorySerializer(
            queryset,
            many=True,
            context={"request": request},
        )

        return Response({
            "success": True,
            "count": queryset.count(),
            "categories": serializer.data,
        })

    serializer = AdminCategorySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    category = serializer.save()

    return Response({
        "success": True,
        "category": AdminCategorySerializer(category).data,
    }, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_category_detail(request, category_id):

    try:
        category = Category.objects.get(pk=category_id)
    except Category.DoesNotExist:
        return Response(
            {"detail": "Category not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "DELETE":
        # Avoid deleting categories referenced by products.
        if Product.objects.filter(category=category).exists():
            return Response(
                {
                    "detail": (
                        "This category contains products. "
                        "Move those products to another category first."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        category.is_active = False
        category.save(update_fields=["is_active"])

        return Response({
            "success": True,
            "message": "Category deactivated.",
        })

    serializer = AdminCategorySerializer(
        category,
        data=request.data,
        partial=True,
    )
    serializer.is_valid(raise_exception=True)
    category = serializer.save()

    return Response({
        "success": True,
        "category": AdminCategorySerializer(category).data,
    })


# --------------------------------------------------
# ADMIN CUSTOMERS
# --------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_customers(request):

    queryset = (
        CustomerProfile.objects
        .select_related("user")
        .order_by("-created_at")
    )

    search = request.query_params.get("search", "").strip()

    if search:
        queryset = queryset.filter(
            Q(user__email__icontains=search)
            | Q(user__first_name__icontains=search)
            | Q(user__last_name__icontains=search)
            | Q(phone__icontains=search)
        )

    customers = []

    for profile in queryset:
        user = profile.user

        order_qs = Order.objects.filter(user=user)

        customers.append({
            "id": user.pk,
            "name": user.get_full_name() or user.get_username(),
            "email": user.email,
            "phone": profile.phone,
            "joined_at": profile.created_at,
            "total_orders": order_qs.count(),
            "total_spent": str(
                order_qs.filter(
                    Q(payment_status="paid", late_payment_needs_refund=False)
                    | Q(payment_method="cod", status="delivered")
                ).aggregate(total=Sum("total"))["total"] or 0
            ),
            "is_active": user.is_active,
        })

    return Response({
        "success": True,
        "count": len(customers),
        "customers": customers,
    })


# --------------------------------------------------
# CUSTOMER ACCOUNT STATUS
# --------------------------------------------------

@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def admin_customer_status(request, customer_id):

    try:
        customer = User.objects.get(pk=customer_id)
    except User.DoesNotExist:
        return Response(
            {"detail": "Customer not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if customer.is_staff or customer.is_superuser:
        return Response(
            {"detail": "Admin accounts cannot be changed here."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if "is_active" not in request.data:
        return Response(
            {"detail": "is_active is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    value = request.data["is_active"]

    if not isinstance(value, bool):
        return Response(
            {"detail": "is_active must be true or false."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    customer.is_active = value
    customer.save(update_fields=["is_active"])

    return Response({
        "success": True,
        "is_active": customer.is_active,
    })
