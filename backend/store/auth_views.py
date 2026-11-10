
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.conf import settings

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .auth_serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)

User = get_user_model()


def token_response(user):
    refresh = RefreshToken.for_user(user)

    return {
        "success": True,
        "message": "Authentication successful.",
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    }


# =========================
# REGISTER
# =========================

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()

        return Response(
            token_response(user),
            status=status.HTTP_201_CREATED
        )

    return Response(
        {
            "success": False,
            "errors": serializer.errors
        },
        status=status.HTTP_400_BAD_REQUEST
    )


# =========================
# LOGIN
# =========================

@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.validated_data["user"]

        return Response(
            token_response(user),
            status=status.HTTP_200_OK
        )

    return Response(
        {
            "success": False,
            "errors": serializer.errors
        },
        status=status.HTTP_400_BAD_REQUEST
    )


# =========================
# LOGOUT
# =========================

@api_view(["POST"])
@permission_classes([AllowAny])
def logout(request):
    refresh_token = request.data.get("refresh")

    if not refresh_token:
        return Response(
            {
                "success": False,
                "message": "Refresh token is required."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        token = RefreshToken(refresh_token)
        token.blacklist()

        return Response(
            {
                "success": True,
                "message": "Logged out successfully."
            },
            status=status.HTTP_200_OK
        )

    except TokenError:
        return Response(
            {
                "success": False,
                "message": "Invalid or expired refresh token."
            },
            status=status.HTTP_400_BAD_REQUEST
        )


# =========================
# CURRENT USER PROFILE
# =========================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(
        {
            "success": True,
            "user": UserSerializer(request.user).data
        },
        status=status.HTTP_200_OK
    )


# =========================
# FORGOT PASSWORD
# =========================

@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    serializer = ForgotPasswordSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    email = serializer.validated_data["email"].strip().lower()

    users = User.objects.filter(
        email__iexact=email,
        is_active=True
    )

    # Same response whether account exists or not.
    if users.count() == 1:
        user = users.first()

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        reset_url = (
            f"{settings.FRONTEND_URL}/reset-password"
            f"?uid={uid}&token={token}"
        )

        send_mail(
            subject="Reset Your ZAZEER GARMENTS Password",
            message=(
                f"Hello {user.first_name or 'Customer'},\n\n"
                "We received a request to reset your password.\n\n"
                f"Reset your password using this link:\n{reset_url}\n\n"
                "If you did not request this, please ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

    return Response(
        {
            "success": True,
            "message": (
                "If an account exists with this email, "
                "a password reset link has been sent."
            )
        },
        status=status.HTTP_200_OK
    )


# =========================
# RESET PASSWORD
# =========================

@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    serializer = ResetPasswordSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    uid = serializer.validated_data["uid"]
    token = serializer.validated_data["token"]
    new_password = serializer.validated_data["password"]

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id, is_active=True)

    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response(
            {
                "success": False,
                "message": "Invalid password reset link."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if not default_token_generator.check_token(user, token):
        return Response(
            {
                "success": False,
                "message": "Invalid or expired password reset link."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from django.contrib.auth.password_validation import validate_password

        validate_password(new_password, user)

    except DjangoValidationError as exc:
        return Response(
            {
                "success": False,
                "errors": {
                    "password": exc.messages
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    user.set_password(new_password)
    user.save(update_fields=["password"])

    return Response(
        {
            "success": True,
            "message": "Password reset successfully. Please login."
        },
        status=status.HTTP_200_OK
    )
