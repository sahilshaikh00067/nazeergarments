import hashlib, hmac, secrets
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import Coupon, Order, OrderItem, StockMovement, Variant
from datetime import timedelta


FREE_SHIP_ABOVE = Decimal(getattr(settings, "FREE_SHIPPING_THRESHOLD", 999))
FLAT_SHIPPING = Decimal(getattr(settings, "FLAT_SHIPPING", 79))


def _razorpay():
    import razorpay
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def validate_coupon(code, user, lines, subtotal):
    """lines: list of (variant, qty). Returns (coupon, discount, free_shipping). All rules enforced server-side."""
    try:
        c = Coupon.objects.get(code__iexact=code, is_active=True)
    except Coupon.DoesNotExist:
        raise ValidationError({"coupon": "Invalid coupon"})
    now = timezone.now()
    if not (c.starts_at <= now <= c.expires_at):
        raise ValidationError({"coupon": "Coupon expired or not active yet"})
    if subtotal < c.min_order:
        raise ValidationError({"coupon": f"Minimum order {c.min_order}"})
    if c.usage_limit and Order.objects.filter(coupon=c).exclude(status="cancelled").count() >= c.usage_limit:
        raise ValidationError({"coupon": "Usage limit reached"})
    if user and user.is_authenticated:
        used = Order.objects.filter(coupon=c, user=user).exclude(status="cancelled").count()
        if used >= c.per_customer_limit:
            raise ValidationError({"coupon": "You have already used this coupon"})
    if c.first_order_only and Order.objects.filter(
        user=user
    ).exclude(status="cancelled").exists():
        raise ValidationError({"coupon": "Valid on first order only"})
    elif c.first_order_only:
        raise ValidationError({"coupon": "Login required for this coupon"})

    cat_ids = set(c.categories.values_list("id", flat=True))
    prod_ids = set(c.products.values_list("id", flat=True))
    eligible = subtotal
    if cat_ids or prod_ids:
        eligible = sum(
            (v.unit_price * q for v, q in lines
             if v.product_id in prod_ids or v.product.category_id in cat_ids), Decimal(0))
        if eligible == 0:
            raise ValidationError({"coupon": "Coupon not applicable to these items"})

    if c.kind == Coupon.PERCENT:
        d = eligible * c.value / 100
    elif c.kind == Coupon.FIXED:
        d = min(c.value, eligible)
    else:
        d = Decimal(0)
    if c.max_discount:
        d = min(d, c.max_discount)
    return c, d.quantize(Decimal("0.01")), c.kind == Coupon.FREE_SHIP



@transaction.atomic
def place_order(user, data):
    """
    Create an order using database prices.
    Duplicate variant IDs are aggregated before stock validation.
    Stock is reserved when the order is created.
    """

    items = data["items"]

    if not items:
        raise ValidationError({"items": "Cart is empty"})

    # 1. Aggregate duplicate variant IDs
    requested_quantities = {}

    for item in items:
        variant_id = item["variant_id"]
        qty = int(item["qty"])

        requested_quantities[variant_id] = (
            requested_quantities.get(variant_id, 0) + qty
        )

    # 2. Validate aggregated quantities
    for variant_id, qty in requested_quantities.items():
        if qty < 1 or qty > 20:
            raise ValidationError({
                "items": "Maximum 20 units allowed per variant."
            })

    # 3. Lock variants in consistent ID order
    variant_ids = sorted(requested_quantities.keys())

    locked_variants = (
        Variant.objects
        .select_for_update()
        .select_related("product__category")
        .filter(id__in=variant_ids)
        .order_by("id")
    )

    variants = {
        variant.id: variant
        for variant in locked_variants
    }

    if len(variants) != len(variant_ids):
        raise ValidationError({
            "items": "One or more products are unavailable."
        })

    # 4. Validate stock and availability
    lines = []

    for variant_id in variant_ids:
        variant = variants[variant_id]
        qty = requested_quantities[variant_id]

        if (
            not variant.is_available
            or not variant.product.is_active
            or not variant.product.category.is_active
        ):
            raise ValidationError({
                "items": "An item is unavailable."
            })

        if variant.stock < qty:
            raise ValidationError({
                "items": (
                    f"Only {variant.stock} left for "
                    f"{variant.product.name} "
                    f"{variant.size} {variant.color}"
                )
            })

        lines.append((variant, qty))

    # 5. Calculate subtotal using database prices
    subtotal = sum(
        (variant.unit_price * qty for variant, qty in lines),
        Decimal("0.00")
    )

    # 6. Validate coupon
    coupon, discount, free_ship = (
        None,
        Decimal("0.00"),
        False
    )

    if data.get("coupon"):
        coupon, discount, free_ship = validate_coupon(
            data["coupon"],
            user,
            lines,
            subtotal
        )

    # 7. Calculate shipping and final total
    shipping = (
        Decimal("0.00")
        if free_ship or subtotal - discount >= FREE_SHIP_ABOVE
        else FLAT_SHIPPING
    )

    total = subtotal - discount + shipping

    # 8. Create order
    order = Order.objects.create(
        order_id=(
            "ZG"
            + timezone.now().strftime("%y%m%d")
            + secrets.token_hex(3).upper()
        ),
        user=(
            user
            if user and user.is_authenticated
            else None
        ),
        name=data["name"],
        phone=data["phone"],
        email=data["email"],
        address=data["address"],
        city=data["city"],
        state=data["state"],
        pincode=data["pincode"],
        payment_method=data["payment_method"],
        payment_expires_at=(
    timezone.now() + timedelta(minutes=15)
    if data["payment_method"] == "online"
    else None
),
        subtotal=subtotal,
        discount=discount,
        shipping=shipping,
        total=total,
        coupon=coupon,
        status=(
            "confirmed"
            if data["payment_method"] == "cod"
            else "pending"
        ),
    )

    # 9. Create order items and reserve stock
    for variant, qty in lines:

        OrderItem.objects.create(
            order=order,
            variant=variant,
            name=variant.product.name,
            size=variant.size,
            color=variant.color,
            unit_price=variant.unit_price,
            quantity=qty,
        )

        variant.stock -= qty
        variant.save(update_fields=["stock"])

        StockMovement.objects.create(
            variant=variant,
            delta=-qty,
            reason="order",
            ref=order.order_id,
        )

    # 10. Create Razorpay order for online payment
    payload = {
        "order_id": order.order_id,
        "total": str(total),
        "payment_method": order.payment_method,
    }

    if order.payment_method == "online":

        rp = _razorpay().order.create({
            "amount": int(total * 100),
            "currency": "INR",
            "receipt": order.order_id,
            "payment_capture": 1,
        })

        order.razorpay_order_id = rp["id"]
        order.save(update_fields=["razorpay_order_id"])

        payload.update({
            "razorpay_order_id": rp["id"],
            "key_id": settings.RAZORPAY_KEY_ID,
            "amount": rp["amount"],
        })

    return payload

@transaction.atomic
def _release_order_stock_locked(order, reason="payment_expired"):
    """
    Caller must lock the Order row first.
    Restores reserved stock only once.
    """
    if order.stock_released:
        return False

    # Aggregate quantities by variant, then lock variants in ID order.
    quantities = {}

    for item in order.items.all():
        quantities[item.variant_id] = (
            quantities.get(item.variant_id, 0) + item.quantity
        )

    variant_ids = sorted(quantities.keys())

    variants = {
        variant.id: variant
        for variant in (
            Variant.objects
            .select_for_update()
            .filter(id__in=variant_ids)
            .order_by("id")
        )
    }

    if len(variants) != len(variant_ids):
        raise ValidationError("Unable to release stock for this order.")

    for variant_id in variant_ids:
        variant = variants[variant_id]
        qty = quantities[variant_id]

        variant.stock += qty
        variant.save(update_fields=["stock"])

        StockMovement.objects.create(
            variant=variant,
            delta=qty,
            reason=reason,
            ref=order.order_id,
        )

    order.stock_released = True
    order.save(update_fields=["stock_released"])

    return True

def expire_pending_online_orders():
    now = timezone.now()

    expired_ids = list(
        Order.objects.filter(
            payment_method="online",
            payment_status="unpaid",
            status="pending",
            payment_expires_at__lte=now,
            stock_released=False,
        )
        .order_by("id")
        .values_list("id", flat=True)[:500]
    )

    expired_count = 0

    for order_pk in expired_ids:

        with transaction.atomic():

            order = (
                Order.objects
                .select_for_update()
                .filter(pk=order_pk)
                .first()
            )

            if not order:
                continue

            if (
                order.payment_method != "online"
                or order.payment_status != "unpaid"
                or order.status != "pending"
                or not order.payment_expires_at
                or order.payment_expires_at > timezone.now()
                or order.stock_released
            ):
                continue

            _release_order_stock_locked(
                order,
                reason="payment_expired"
            )

            order.status = "cancelled"
            order.payment_status = "expired"

            order.save(update_fields=[
                "status",
                "payment_status",
            ])

            expired_count += 1

    return expired_count

def _signature_ok(body: str, sig: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig or "")


@transaction.atomic
def verify_payment(order_id, rp_order_id, rp_payment_id, signature):
    order = (
        Order.objects
        .select_for_update()
        .filter(
            order_id=order_id,
            razorpay_order_id=rp_order_id,
        )
        .first()
    )

    if not order:
        raise ValidationError({"payment": "Order not found."})

    if not _signature_ok(
        f"{rp_order_id}|{rp_payment_id}",
        signature,
        settings.RAZORPAY_KEY_SECRET,
    ):
        raise ValidationError({
            "payment": "Signature verification failed."
        })

    payment = _razorpay().payment.fetch(rp_payment_id)

    if (
        payment.get("order_id") != rp_order_id
        or payment.get("amount") != int(order.total * 100)
        or payment.get("status") != "captured"
    ):
        raise ValidationError({
            "payment": "Payment mismatch or not captured."
        })

    if order.payment_status == "paid":
        return order

    if order.payment_method != "online":
        raise ValidationError({
            "payment": "Invalid payment method."
        })

    # Payment received after reservation expiry:
    # release stock if it has not already been released.
    is_late = (
        order.stock_released
        or not order.payment_expires_at
        or timezone.now() >= order.payment_expires_at
        or order.status == "cancelled"
    )

    if is_late:
        _release_order_stock_locked(
            order,
            reason="payment_expired",
        )

        order.status = "cancelled"
        order.payment_status = "paid"
        order.razorpay_payment_id = rp_payment_id
        order.late_payment_needs_refund = True

        order.save(update_fields=[
            "status",
            "payment_status",
            "razorpay_payment_id",
            "late_payment_needs_refund",
        ])

        return order

    order.payment_status = "paid"
    order.status = "confirmed"
    order.razorpay_payment_id = rp_payment_id

    order.save(update_fields=[
        "payment_status",
        "status",
        "razorpay_payment_id",
    ])

    return order

@transaction.atomic
def handle_webhook(raw_body: bytes, signature: str):
    import json

    if not _signature_ok(
        raw_body.decode("utf-8"),
        signature,
        settings.RAZORPAY_WEBHOOK_SECRET,
    ):
        raise ValidationError("Invalid Razorpay webhook signature.")

    event_data = json.loads(raw_body)

    event = event_data.get("event")
    payment = (
        event_data.get("payload", {})
        .get("payment", {})
        .get("entity", {})
    )

    if not payment:
        return

    rp_order_id = payment.get("order_id")

    order = (
        Order.objects
        .select_for_update()
        .filter(razorpay_order_id=rp_order_id)
        .first()
    )

    if not order:
        return

    if event == "payment.captured":
        if (
            payment.get("status") != "captured"
            or payment.get("amount") != int(order.total * 100)
            or not payment.get("id")
        ):
            return

        if order.payment_status == "paid":
            return

        is_late = (
            order.stock_released
            or not order.payment_expires_at
            or timezone.now() >= order.payment_expires_at
            or order.status == "cancelled"
        )

        if is_late:
            _release_order_stock_locked(
                order,
                reason="payment_expired",
            )

            order.status = "cancelled"
            order.payment_status = "paid"
            order.razorpay_payment_id = payment["id"]
            order.late_payment_needs_refund = True

            order.save(update_fields=[
                "status",
                "payment_status",
                "razorpay_payment_id",
                "late_payment_needs_refund",
            ])

        else:
            order.payment_status = "paid"
            order.status = "confirmed"
            order.razorpay_payment_id = payment["id"]

            order.save(update_fields=[
                "payment_status",
                "status",
                "razorpay_payment_id",
            ])

    elif event == "payment.failed":
        # Do not release stock immediately.
        # Customer may retry within the 15-minute window.
        return

@transaction.atomic
def cancel_order(order, reason="cancel"):
    order = (
        Order.objects
        .select_for_update()
        .get(pk=order.pk)
    )

    if order.status in (
        "cancelled",
        "delivered",
        "returned",
        "refunded",
    ):
        raise ValidationError("Order cannot be cancelled.")

    # Paid online orders need a refund workflow.
    if (
        order.payment_method == "online"
        and order.payment_status == "paid"
    ):
        raise ValidationError(
            "Paid online orders require refund handling before cancellation."
        )

    _release_order_stock_locked(
        order,
        reason=reason,
    )

    order.status = "cancelled"

    if order.payment_method == "online":
        order.payment_status = "expired"

    order.save(update_fields=[
        "status",
        "payment_status",
    ])

    return order