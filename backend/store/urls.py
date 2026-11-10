
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import admin_views

from . import views, auth_views

urlpatterns = [
    path("categories/", views.categories, name="categories"),
    path("products/", views.products, name="products"),
    path("products/featured/", views.featured_products, name="featured-products"),
    path("products/bestsellers/", views.bestseller_products, name="bestseller-products"),
    path("products/new-arrivals/", views.new_arrivals, name="new-arrivals"),
    path("products/<slug:slug>/", views.product_detail, name="product-detail"),
    path("wishlist/", views.wishlist, name="wishlist"),

    path("checkout/", views.checkout, name="checkout"),
    path("payments/verify/", views.payment_verify, name="payment-verify"),
    path("payments/webhook/", views.razorpay_webhook, name="razorpay-webhook"),
    path("orders/mine/", views.my_orders, name="my-orders"),


    # Admin analytics
path(
    "admin/analytics/",
    admin_views.admin_analytics,
    name="admin-analytics",
),

# Admin products
path(
    "admin/products/",
    admin_views.admin_products,
    name="admin-products",
),
path(
    "admin/products/<int:product_id>/",
    admin_views.admin_product_detail,
    name="admin-product-detail",
),

# Product variants
path(
    "admin/products/<int:product_id>/variants/",
    admin_views.admin_create_variant,
    name="admin-create-variant",
),
path(
    "admin/variants/<int:variant_id>/",
    admin_views.admin_variant_detail,
    name="admin-variant-detail",
),

# Admin categories
path(
    "admin/categories/",
    admin_views.admin_categories,
    name="admin-categories",
),
path(
    "admin/categories/<int:category_id>/",
    admin_views.admin_category_detail,
    name="admin-category-detail",
),

# Admin customers
path(
    "admin/customers/",
    admin_views.admin_customers,
    name="admin-customers",
),
path(
    "admin/customers/<int:customer_id>/status/",
    admin_views.admin_customer_status,
    name="admin-customer-status",
),
    path("admin/dashboard/", views.dashboard, name="admin-dashboard"),
    path("admin/orders/", views.admin_orders, name="admin-orders"),
    path("admin/orders/<int:order_id>/", views.admin_update_order, name="admin-update-order"),
    path("products/<slug:slug>/reviews/", views.product_reviews, name="product-reviews"),

    # Authentication
    path("auth/register/", auth_views.register, name="register"),
    path("auth/login/", auth_views.login, name="login"),
    path("auth/logout/", auth_views.logout, name="logout"),
    path("auth/me/", auth_views.me, name="me"),
    path("auth/forgot-password/", auth_views.forgot_password, name="forgot-password"),
    path("auth/reset-password/", auth_views.reset_password, name="reset-password"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
]
