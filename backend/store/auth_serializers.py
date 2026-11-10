import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import CustomerProfile

User = get_user_model()


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(read_only=True)
    phone = serializers.SerializerMethodField()

    # Admin permissions
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)

    def get_full_name(self, obj):
        return obj.first_name or obj.username

    def get_phone(self, obj):
        profile = getattr(obj, "customer_profile", None)
        return profile.phone if profile else ""

class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=150)
    phone = serializers.RegexField(r"^[6-9]\d{9}$")
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False
    )
    confirm_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False
    )

    def validate_email(self, value):
        value = value.strip().lower()

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "This email is already registered."
            )

        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(
                "This email cannot be used as a username."
            )

        return value

    def validate_phone(self, value):
        if CustomerProfile.objects.filter(phone=value).exists():
            raise serializers.ValidationError(
                "This mobile number is already registered."
            )
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        temporary_user = User(
            username=attrs["email"],
            email=attrs["email"],
            first_name=attrs["full_name"]
        )

        try:
            validate_password(attrs["password"], temporary_user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({
                "password": exc.messages
            })
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("confirm_password")

        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            first_name=validated_data["full_name"],
            password=validated_data["password"]
        )

        CustomerProfile.objects.create(
            user=user,
            phone=validated_data["phone"]
        )

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False
    )

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        password = attrs["password"]

        users = User.objects.filter(email__iexact=email)

        if users.count() != 1:
            raise serializers.ValidationError({
                "detail": "Invalid email or password."
            })

        user = users.first()

        if not user.check_password(password) or not user.is_active:
            raise serializers.ValidationError({
                "detail": "Invalid email or password."
            })

        attrs["user"] = user
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        return attrs