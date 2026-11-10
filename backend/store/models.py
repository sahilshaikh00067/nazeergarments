from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True, blank=True)
    parent = models.ForeignKey("self", null=True, blank=True, related_name="children", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="categories/", blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "categories"

    def save(self, *a, **kw):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*a, **kw)

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    description = models.TextField(blank=True)
    brand = models.CharField(max_length=100, blank=True)
    fabric = models.CharField(max_length=100, blank=True)
    specs = models.JSONField(default=dict, blank=True)  # saree length, blouse piece, fit type, etc.
    mrp = models.DecimalField(max_digits=10, decimal_places=2)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_bestseller = models.BooleanField(default=False)
    is_new = models.BooleanField(default=False)
    is_sample = models.BooleanField(default=False)  # separates demo data from real store data
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *a, **kw):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*a, **kw)

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(Product, related_name="images", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="products/")
    sort_order = models.PositiveIntegerField(default=0)




class Review(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_reviews"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    rating = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=150, blank=True)
    comment = models.TextField()

    is_approved = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "product"],
                name="unique_user_product_review"
            )
        ]

    def __str__(self):
        return f"{self.user} - {self.product} ({self.rating}/5)"


class ReviewImage(models.Model):
    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="images"
    )

    image = models.ImageField(upload_to="reviews/")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review image - {self.review_id}"

class WishlistItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist_items"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="wishlisted_by"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "product"],
                name="unique_user_wishlist_product"
            )
        ]

    def __str__(self):
        return f"{self.user} - {self.product}"

class Variant(models.Model):
    product = models.ForeignKey(Product, related_name="variants", on_delete=models.CASCADE)
    sku = models.CharField(max_length=64, unique=True)
    size = models.CharField(max_length=20, blank=True)
    color = models.CharField(max_length=40, blank=True)
    price_override = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True)

    class Meta:
        unique_together = ("product", "size", "color")

    @property
    def unit_price(self):
        return self.price_override if self.price_override is not None else self.product.price


class StockMovement(models.Model):
    variant = models.ForeignKey(Variant, on_delete=models.CASCADE, related_name="movements")
    delta = models.IntegerField()
    reason = models.CharField(max_length=60)  # order, cancel, restock, adjustment
    ref = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Coupon(models.Model):
    PERCENT, FIXED, FREE_SHIP = "percent", "fixed", "free_shipping"
    code = models.CharField(max_length=40, unique=True)
    kind = models.CharField(max_length=20, choices=[(PERCENT, "Percent"), (FIXED, "Fixed"), (FREE_SHIP, "Free shipping")])
    value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_order = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    starts_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    per_customer_limit = models.PositiveIntegerField(default=1)
    first_order_only = models.BooleanField(default=False)
    categories = models.ManyToManyField(Category, blank=True)
    products = models.ManyToManyField(Product, blank=True)
    is_active = models.BooleanField(default=True)


class Order(models.Model):
    STATUSES = ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery",
                "delivered", "cancelled", "return_requested", "returned", "refunded"]
    order_id = models.CharField(max_length=24, unique=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders")
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=15)
    email = models.EmailField()
    address = models.TextField()
    city = models.CharField(max_length=80)
    state = models.CharField(max_length=80)
    pincode = models.CharField(max_length=6)
    status = models.CharField(max_length=20, choices=[(s, s) for s in STATUSES], default="pending")
    payment_method = models.CharField(max_length=10, choices=[("online", "online"), ("cod", "cod")])
    payment_status = models.CharField(max_length=10, default="unpaid")  # unpaid / paid / failed / refunded
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    coupon = models.ForeignKey(Coupon, null=True, blank=True, on_delete=models.SET_NULL)
    courier = models.CharField(max_length=60, blank=True)
    tracking_number = models.CharField(max_length=80, blank=True)
    razorpay_order_id = models.CharField(max_length=64, blank=True, db_index=True)
    razorpay_payment_id = models.CharField(max_length=64, blank=True)
    payment_expires_at = models.DateTimeField(null=True, blank=True)
    stock_released = models.BooleanField(default=False)
    late_payment_needs_refund = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name="items", on_delete=models.CASCADE)
    variant = models.ForeignKey(Variant, on_delete=models.PROTECT)
    name = models.CharField(max_length=200)
    size = models.CharField(max_length=20, blank=True)
    color = models.CharField(max_length=40, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()



class CustomerProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_profile"
    )
    phone = models.CharField(max_length=10, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.phone}"