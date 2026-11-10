
from django.contrib import admin
from django.utils.html import format_html

from .models import (
    Category,
    Product,
    ProductImage,
    Variant,
    StockMovement,
    Coupon,
    Order,
    OrderItem,
)


# ==========================================
# CATEGORY ADMIN
# ==========================================

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "parent",
        "slug",
        "is_active",
        "sort_order",
    )

    list_filter = ("is_active", "parent")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("sort_order", "name")


# ==========================================
# PRODUCT IMAGE INLINE
# ==========================================

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


# ==========================================
# PRODUCT VARIANT INLINE
# ==========================================

class VariantInline(admin.TabularInline):
    model = Variant
    extra = 1
    fields = (
        "sku",
        "size",
        "color",
        "price_override",
        "stock",
        "is_available",
    )


# ==========================================
# PRODUCT ADMIN
# ==========================================

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "category",
        "price",
        "mrp",
        "total_stock",
        "is_active",
        "is_featured",
        "is_bestseller",
        "is_new",
    )

    list_filter = (
        "category",
        "is_active",
        "is_featured",
        "is_bestseller",
        "is_new",
        "is_sample",
    )

    search_fields = (
        "name",
        "slug",
        "brand",
        "category__name",
    )

    prepopulated_fields = {"slug": ("name",)}

    readonly_fields = ("created_at",)

    inlines = [
        ProductImageInline,
        VariantInline,
    ]

    fieldsets = (
        ("Basic Information", {
            "fields": (
                "name",
                "slug",
                "category",
                "description",
                "brand",
                "fabric",
            )
        }),
        ("Pricing", {
            "fields": (
                "mrp",
                "price",
            )
        }),
        ("Product Specifications", {
            "fields": ("specs",)
        }),
        ("Product Settings", {
            "fields": (
                "low_stock_threshold",
                "is_active",
                "is_featured",
                "is_bestseller",
                "is_new",
                "is_sample",
            )
        }),
        ("Timestamps", {
            "fields": ("created_at",)
        }),
    )

    def total_stock(self, obj):
        return sum(
            variant.stock for variant in obj.variants.all()
        )

    total_stock.short_description = "Total Stock"


# ==========================================
# VARIANT ADMIN
# ==========================================

@admin.register(Variant)
class VariantAdmin(admin.ModelAdmin):
    list_display = (
        "sku",
        "product",
        "size",
        "color",
        "unit_price",
        "stock",
        "is_available",
    )

    list_filter = (
        "is_available",
        "size",
        "color",
    )

    search_fields = (
        "sku",
        "product__name",
        "color",
        "size",
    )

    list_editable = (
        "stock",
        "is_available",
    )


# ==========================================
# STOCK MOVEMENT ADMIN
# ==========================================

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = (
        "variant",
        "delta",
        "reason",
        "ref",
        "created_at",
    )

    list_filter = (
        "reason",
        "created_at",
    )

    search_fields = (
        "variant__sku",
        "variant__product__name",
        "ref",
    )

    readonly_fields = (
        "variant",
        "delta",
        "reason",
        "ref",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


# ==========================================
# COUPON ADMIN
# ==========================================

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "kind",
        "value",
        "min_order",
        "starts_at",
        "expires_at",
        "is_active",
    )

    list_filter = (
        "kind",
        "is_active",
        "first_order_only",
    )

    search_fields = ("code",)

    filter_horizontal = (
        "categories",
        "products",
    )


# ==========================================
# ORDER ITEM INLINE
# ==========================================

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False

    fields = (
        "variant",
        "name",
        "size",
        "color",
        "unit_price",
        "quantity",
    )

    readonly_fields = (
        "variant",
        "name",
        "size",
        "color",
        "unit_price",
        "quantity",
    )


# ==========================================
# ORDER ADMIN
# ==========================================

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_id",
        "name",
        "phone",
        "total",
        "payment_method",
        "payment_status",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "payment_method",
        "payment_status",
        "created_at",
    )

    search_fields = (
        "order_id",
        "name",
        "phone",
        "email",
        "tracking_number",
        "razorpay_order_id",
    )

    readonly_fields = (
        "order_id",
        "user",
        "name",
        "phone",
        "email",
        "address",
        "city",
        "state",
        "pincode",
        "payment_method",
        "subtotal",
        "discount",
        "shipping",
        "total",
        "coupon",
        "razorpay_order_id",
        "razorpay_payment_id",
        "created_at",
    )

    inlines = [OrderItemInline]

    fieldsets = (
        ("Order Information", {
            "fields": (
                "order_id",
                "user",
                "created_at",
                "status",
            )
        }),
        ("Customer Information", {
            "fields": (
                "name",
                "phone",
                "email",
                "address",
                "city",
                "state",
                "pincode",
            )
        }),
        ("Payment Information", {
            "fields": (
                "payment_method",
                "payment_status",
                "subtotal",
                "discount",
                "shipping",
                "total",
                "coupon",
            )
        }),
        ("Shipping & Tracking", {
            "fields": (
                "courier",
                "tracking_number",
            )
        }),
        ("Razorpay Information", {
            "fields": (
                "razorpay_order_id",
                "razorpay_payment_id",
            )
        }),
    )

    def has_delete_permission(self, request, obj=None):
        return False
