from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Avg
from .models import Review, ReviewImage, OrderItem
from datetime import timedelta
from django.utils import timezone
from django.db.models.functions import TruncDate
from .models import CustomerProfile
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from django.db.models import Sum, Count, F
from . import services
from .models import Order, Variant
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from .models import Category, Product
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    ReviewSerializer,
)
from PIL import Image, UnidentifiedImageError
from decimal import Decimal, InvalidOperation
from rest_framework.decorators import parser_classes

from .models import WishlistItem
from .serializers import WishlistItemSerializer
from rest_framework.permissions import IsAuthenticated

class ItemS(serializers.Serializer):
    variant_id = serializers.IntegerField()
    qty = serializers.IntegerField(min_value=1, max_value=20)


class CheckoutS(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    phone = serializers.RegexField(r"^[6-9]\d{9}$")
    email = serializers.EmailField()
    address = serializers.CharField(max_length=500)
    city = serializers.CharField(max_length=80)
    state = serializers.CharField(max_length=80)
    pincode = serializers.RegexField(r"^\d{6}$")
    payment_method = serializers.ChoiceField(choices=["online", "cod"])
    coupon = serializers.CharField(required=False, allow_blank=True)
    items = ItemS(many=True)


class CheckoutThrottle(AnonRateThrottle):
    rate = "20/min"


@api_view(["POST"])
@permission_classes([AllowAny])  # guest checkout; gate with a store setting if disabled
@throttle_classes([CheckoutThrottle])
def checkout(request):
    s = CheckoutS(data=request.data)
    s.is_valid(raise_exception=True)
    return Response(
    services.place_order(request.user, s.validated_data),
    status=201
)


@api_view(["POST"])
@permission_classes([AllowAny])
def payment_verify(request):
    d = request.data
    order = services.verify_payment(d.get("order_id"), d.get("razorpay_order_id"),
    d.get("razorpay_payment_id"), d.get("razorpay_signature"))

    return Response({
        "order_id": order.order_id,
        "payment_status": order.payment_status,
        "order_status": order.status,
        "late_payment_needs_refund": order.late_payment_needs_refund,
        "payment_expires_at": (
            order.payment_expires_at.isoformat()
            if order.payment_expires_at
            else None
        ),
    })

@csrf_exempt
def razorpay_webhook(request):
    services.handle_webhook(request.body, request.headers.get("X-Razorpay-Signature", ""))
    return HttpResponse(status=200)





@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_orders(request):
    qs = (
        Order.objects
        .filter(user=request.user)
        .select_related("coupon")
        .prefetch_related("items")
        .order_by("-created_at")
    )

    orders = []

    for order in qs:
        items = []

        for item in order.items.all():
            items.append({
                "id": item.id,
                "name": item.name,
                "size": item.size,
                "color": item.color,
                "qty": item.quantity,
                "quantity": item.quantity,
                "unit_price": str(item.unit_price),
                "line_total": str(
                    item.unit_price * item.quantity
                ),
            })

        orders.append({
            # Order information
            "id": order.id,
            "order_id": order.order_id,
            "status": order.status,
            "created_at": order.created_at,

            # Customer information
            "customer_name": order.name,
            "name": order.name,
            "phone": order.phone,
            "email": order.email,

            # Delivery address
            "address": order.address,
            "city": order.city,
            "state": order.state,
            "pincode": order.pincode,

            # Payment information
            "payment_method": order.payment_method,
            "payment_status": order.payment_status,
            "razorpay_payment_id": order.razorpay_payment_id,

            # Payment expiry and refund information
            "payment_expires_at": (
                order.payment_expires_at.isoformat()
                if order.payment_expires_at
                else None
            ),
            "late_payment_needs_refund": (
                order.late_payment_needs_refund
            ),

            # Price breakdown
            "subtotal": str(order.subtotal),
            "discount": str(order.discount),
            "shipping": str(order.shipping),
            "total": str(order.total),

            # Coupon
            "coupon": (
                order.coupon.code
                if order.coupon
                else None
            ),

            # Shipment information
            "courier": order.courier,
            "tracking": order.tracking_number,
            "tracking_number": order.tracking_number,

            # Products
            "items": items,
        })

    return Response({
        "success": True,
        "count": len(orders),
        "orders": orders,
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def dashboard(request):

    # ---------------------------------
    # REVENUE
    # ---------------------------------

    paid_orders = Order.objects.filter(
        Q(
            payment_status="paid",
            late_payment_needs_refund=False
        )
        |
        Q(
            payment_method="cod",
            status="delivered"
        )
    )

    total_revenue = (
        paid_orders.aggregate(total=Sum("total"))["total"] or 0
    )

    # ---------------------------------
    # ORDER COUNTS
    # ---------------------------------

    total_orders = Order.objects.count()

    pending_orders = Order.objects.filter(
        status="pending"
    ).count()

    processing_orders = Order.objects.filter(
        status="processing"
    ).count()

    shipped_orders = Order.objects.filter(
        status__in=["shipped", "out_for_delivery"]
    ).count()

    delivered_orders = Order.objects.filter(
        status="delivered"
    ).count()

    cancelled_orders = Order.objects.filter(
        status="cancelled"
    ).count()

    # ---------------------------------
    # CUSTOMERS AND PRODUCTS
    # ---------------------------------

    total_customers = CustomerProfile.objects.count()

    total_products = Product.objects.filter(
        is_active=True
    ).count()

    # ---------------------------------
    # STOCK
    # ---------------------------------

    low_stock_products = (
        Variant.objects.filter(
            stock__gt=0,
            stock__lte=F("product__low_stock_threshold")
        )
        .values("product_id")
        .distinct()
        .count()
    )

    out_of_stock = Variant.objects.filter(
        stock=0
    ).count()

    # ---------------------------------
    # RECENT ORDERS
    # ---------------------------------

    recent_orders = []

    recent_queryset = Order.objects.order_by(
        "-created_at"
    )[:6]

    for order in recent_queryset:
        recent_orders.append({
            "id": order.id,
            "order_id": order.order_id,
            "customer_name": order.name,
            "email": order.email,
            "phone": order.phone,
            "total": str(order.total),
            "status": order.status,
            "payment_status": order.payment_status,
            "payment_method": order.payment_method,
            "created_at": order.created_at.isoformat(),
        })

    # ---------------------------------
    # LAST 7 DAYS REVENUE
    # ---------------------------------

    today = timezone.localdate()
    start_date = today - timedelta(days=6)

    daily_revenue = (
        paid_orders.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=today
        )
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(revenue=Sum("total"))
        .order_by("day")
    )

    revenue_map = {
        item["day"]: float(item["revenue"] or 0)
        for item in daily_revenue
    }

    revenue_by_day = []

    for i in range(7):
        day = start_date + timedelta(days=i)

        revenue_by_day.append({
            "date": day.isoformat(),
            "label": day.strftime("%d %b"),
            "revenue": revenue_map.get(day, 0),
        })

    # ---------------------------------
    # FINAL RESPONSE
    # ---------------------------------

    return Response({
        "success": True,

        "total_revenue": str(total_revenue),
        "total_orders": total_orders,
        "total_customers": total_customers,
        "total_products": total_products,

        "pending_orders": pending_orders,
        "processing_orders": processing_orders,
        "shipped_orders": shipped_orders,
        "delivered_orders": delivered_orders,
        "cancelled_orders": cancelled_orders,

        "low_stock_products": low_stock_products,
        "out_of_stock": out_of_stock,

        "recent_orders": recent_orders,
        "revenue_by_day": revenue_by_day,
    })



# ==========================================
# ADMIN ORDER MANAGEMENT
# ==========================================

@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_orders(request):

    queryset = (
        Order.objects
        .prefetch_related("items")
        .order_by("-created_at")
    )

    orders = []

    for order in queryset:
        items = []

        for item in order.items.all():
            items.append({
                "id": item.id,
                "name": item.name,
                "size": item.size,
                "color": item.color,
                "quantity": item.quantity,
                "unit_price": str(item.unit_price),
                "line_total": str(item.unit_price * item.quantity),
            })

        orders.append({
            "id": order.id,
            "order_id": order.order_id,

            "customer_name": order.name,
            "phone": order.phone,
            "email": order.email,

            "address": order.address,
            "city": order.city,
            "state": order.state,
            "pincode": order.pincode,

            "status": order.status,

            "payment_method": order.payment_method,
            "payment_status": order.payment_status,
            "late_payment_needs_refund": order.late_payment_needs_refund,

            "subtotal": str(order.subtotal),
            "discount": str(order.discount),
            "shipping": str(order.shipping),
            "total": str(order.total),

            "courier": order.courier,
            "tracking_number": order.tracking_number,

            "created_at": order.created_at.isoformat(),

            "items": items,
        })

    return Response({
        "success": True,
        "count": len(orders),
        "orders": orders,
    })


@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def admin_update_order(request, order_id):

    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response(
            {"success": False, "message": "Order not found"},
            status=404
        )

    allowed_fields = {"status", "courier", "tracking_number"}

    invalid_fields = set(request.data.keys()) - allowed_fields

    if invalid_fields:
        return Response(
            {
                "success": False,
                "message": "Invalid fields",
                "fields": list(invalid_fields),
            },
            status=400
        )

    if "status" in request.data:
        new_status = request.data.get("status")

        valid_statuses = [
            "pending",
            "confirmed",
            "processing",
            "packed",
            "shipped",
            "out_for_delivery",
            "delivered",
        ]
        if new_status not in valid_statuses:
            return Response(
                {
                    "success": False,
                    "message": "Invalid order status",
                    "valid_statuses": valid_statuses,
                },
                status=400
            )

        order.status = new_status

    if "courier" in request.data:
        order.courier = str(request.data.get("courier") or "").strip()

    if "tracking_number" in request.data:
        order.tracking_number = str(
            request.data.get("tracking_number") or ""
        ).strip()

    order.save()

    return Response({
        "success": True,
        "message": "Order updated successfully",
        "order": {
            "id": order.id,
            "order_id": order.order_id,
            "status": order.status,
            "courier": order.courier,
            "tracking_number": order.tracking_number,
        }
    })
# ==========================================
# CATEGORY API
# ==========================================

@api_view(["GET"])
@permission_classes([AllowAny])
def categories(request):
    queryset = Category.objects.filter(
        is_active=True
    ).order_by("sort_order", "name")

    serializer = CategorySerializer(
        queryset,
        many=True,
        context={"request": request},
    )

    return Response({
        "success": True,
        "count": queryset.count(),
        "categories": serializer.data,
    })


# ==========================================
# COMMON PRODUCT QUERYSET
# ==========================================

def get_product_queryset():
    return (
        Product.objects.filter(
            is_active=True,
            category__is_active=True,
        )
        .select_related("category")
        .prefetch_related("images", "variants")
    )


# ==========================================
# PRODUCT LIST API
# ==========================================

@api_view(["GET"])
@permission_classes([AllowAny])
def products(request):
    queryset = get_product_queryset()

    # Category filter
    category_slug = request.query_params.get("category")

    if category_slug:
        queryset = queryset.filter(
            category__slug=category_slug
        )

    # Search filter
    search = request.query_params.get("search")

    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(description__icontains=search)
            | Q(brand__icontains=search)
            | Q(category__name__icontains=search)
        )


    # Price filters
    for param, lookup in [
        ("min_price", "price__gte"),
        ("max_price", "price__lte"),
    ]:
        value = request.query_params.get(param)
    
        if value:
            try:
                price = Decimal(value)
    
                if not price.is_finite() or price < 0:
                    raise InvalidOperation
    
                queryset = queryset.filter(**{lookup: price})
    
            except (InvalidOperation, ValueError):
                return Response(
                    {
                        "success": False,
                        "message": f"Invalid {param}",
                    },
                    status=400,
                )
    

    # Sorting
    sort = request.query_params.get("sort", "newest")

    sort_options = {
        "newest": "-created_at",
        "price_low": "price",
        "price_high": "-price",
        "name": "name",
    }

    if sort not in sort_options:
        return Response(
            {"success": False, "message": "Invalid sort option"},
            status=400,
        )

    queryset = queryset.order_by(sort_options[sort])

    serializer = ProductSerializer(
        queryset,
        many=True,
        context={"request": request},
    )

    return Response({
        "success": True,
        "count": len(serializer.data),
        "products": serializer.data,
    })


# ==========================================
# SINGLE PRODUCT DETAIL API
# ==========================================

@api_view(["GET"])
@permission_classes([AllowAny])
def product_detail(request, slug):
    try:
        product = get_product_queryset().get(slug=slug)
    except Product.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Product not found",
            },
            status=404,
        )

    serializer = ProductSerializer(
        product,
        context={"request": request},
    )

    return Response({
        "success": True,
        "product": serializer.data,
    })


# ==========================================
# FEATURED PRODUCTS API
# ==========================================

@api_view(["GET"])
@permission_classes([AllowAny])
def featured_products(request):
    queryset = get_product_queryset().filter(
        is_featured=True
    ).order_by("-created_at")

    serializer = ProductSerializer(
        queryset,
        many=True,
        context={"request": request},
    )

    return Response({
        "success": True,
        "count": len(serializer.data),
        "products": serializer.data,
    })


# ==========================================
# BESTSELLER PRODUCTS API
# ==========================================

@api_view(["GET"])
@permission_classes([AllowAny])
def bestseller_products(request):
    queryset = get_product_queryset().filter(
        is_bestseller=True
    ).order_by("-created_at")

    serializer = ProductSerializer(
        queryset,
        many=True,
        context={"request": request},
    )

    return Response({
        "success": True,
        "count": len(serializer.data),
        "products": serializer.data,
    })


# ==========================================
# NEW ARRIVALS API
# ==========================================

@api_view(["GET"])
@permission_classes([AllowAny])
def new_arrivals(request):
    queryset = get_product_queryset().filter(
        is_new=True
    ).order_by("-created_at")

    serializer = ProductSerializer(
        queryset,
        many=True,
        context={"request": request},
    )

    return Response({
        "success": True,
        "count": len(serializer.data),
        "products": serializer.data,
    })



from rest_framework.parsers import MultiPartParser, FormParser


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def product_reviews(request, slug):
    try:
        product = Product.objects.get(
            slug=slug,
            is_active=True
        )
    except Product.DoesNotExist:
        return Response(
            {"success": False, "message": "Product not found"},
            status=404
        )

    if request.method == "GET":
        reviews = Review.objects.filter(
            product=product,
            is_approved=True
        ).select_related("user").prefetch_related("images")

        serializer = ReviewSerializer(
    reviews,
    many=True,
    context={"request": request}
)

        return Response({
            "success": True,
            "count": reviews.count(),
            "reviews": serializer.data
        })

    if not request.user.is_authenticated:
        return Response(
            {"success": False, "message": "Please login to submit a review"},
            status=401
        )

    rating = request.data.get("rating")
    comment = str(request.data.get("comment", "")).strip()
    title = str(request.data.get("title", "")).strip()
    uploaded_images = request.FILES.getlist("images")

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return Response(
            {"success": False, "message": "Rating must be between 1 and 5"},
            status=400
        )

    if rating < 1 or rating > 5:
        return Response(
            {"success": False, "message": "Rating must be between 1 and 5"},
            status=400
        )

    if not comment:
        return Response(
            {"success": False, "message": "Review comment is required"},
            status=400
        )

    if len(uploaded_images) > 5:
        return Response(
            {"success": False, "message": "Maximum 5 photos allowed"},
            status=400
        )

    for image in uploaded_images:
        if image.size > 5 * 1024 * 1024:
            return Response(
                {"success": False, "message": "Each photo must be under 5 MB"},
                status=400
            )
    
        try:
            image_file = Image.open(image)
            image_file.verify()
    
            if image_file.format not in ["JPEG", "PNG", "WEBP"]:
                return Response(
                    {
                        "success": False,
                        "message": "Only JPEG, PNG and WEBP images are allowed"
                    },
                    status=400
                )
    
            image.seek(0)
    
        except (UnidentifiedImageError, OSError, ValueError):
            return Response(
                {"success": False, "message": "Invalid image file"},
                status=400
            )

    purchased = OrderItem.objects.filter(
        order__user=request.user,
        order__status="delivered",
        variant__product=product
    ).exists()

    if not purchased:
        return Response(
            {
                "success": False,
                "message": "Only customers who received this product can review it"
            },
            status=403
        )

    if Review.objects.filter(
        user=request.user,
        product=product
    ).exists():
        return Response(
            {"success": False, "message": "You have already reviewed this product"},
            status=400
        )

    from django.db import transaction

    try:
        with transaction.atomic():
            review = Review.objects.create(
                user=request.user,
                product=product,
                rating=rating,
                title=title,
                comment=comment
            )

            for image in uploaded_images:
                ReviewImage.objects.create(
                    review=review,
                    image=image
                )

    except Exception:
        raise

    serializer = ReviewSerializer(
    review,
    context={"request": request}
)

    return Response({
        "success": True,
        "message": "Review submitted successfully",
        "review": serializer.data
    }, status=201)


@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def wishlist(request):

    if request.method == "GET":
        items = WishlistItem.objects.filter(
            user=request.user
        ).select_related("product")

        serializer = WishlistItemSerializer(
            items,
            many=True,
            context={"request": request}
        )

        return Response({
            "success": True,
            "count": items.count(),
            "wishlist": serializer.data
        })

    if request.method == "POST":
        product_id = request.data.get("product_id")

        if not product_id:
            return Response({
                "success": False,
                "message": "Product ID is required."
            }, status=400)

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({
                "success": False,
                "message": "Product not found."
            }, status=404)

        item, created = WishlistItem.objects.get_or_create(
            user=request.user,
            product=product
        )

        return Response({
            "success": True,
            "message": (
                "Product added to wishlist."
                if created else "Product already in wishlist."
            ),
            "wishlist_id": item.id,
            "created": created
        }, status=201 if created else 200)

    if request.method == "DELETE":
        product_id = request.data.get("product_id")

        if not product_id:
            return Response({
                "success": False,
                "message": "Product ID is required."
            }, status=400)

        deleted, _ = WishlistItem.objects.filter(
            user=request.user,
            product_id=product_id
        ).delete()

        return Response({
            "success": True,
            "message": (
                "Product removed from wishlist."
                if deleted else "Product was not in wishlist."
            )
        })