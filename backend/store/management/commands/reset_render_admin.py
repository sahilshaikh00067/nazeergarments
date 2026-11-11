from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
import os

User = get_user_model()


class Command(BaseCommand):
    help = "Safely reset the existing Render admin password"

    def handle(self, *args, **options):
        username = os.getenv("ADMIN_USERNAME")
        email = os.getenv("ADMIN_EMAIL")
        password = os.getenv("ADMIN_PASSWORD")

        if not username or not email or not password:
            raise CommandError("ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD are required.")

        users = User.objects.filter(username=username)

        if users.count() != 1:
            raise CommandError("Expected exactly one user for ADMIN_USERNAME.")

        user = users.first()

        self.stdout.write(f"Existing username: {user.username}")
        self.stdout.write(f"Existing email: {user.email}")

        try:
            validate_password(password, user)
        except ValidationError as exc:
            raise CommandError("; ".join(exc.messages))

        with transaction.atomic():
            user.set_password(password)
            user.is_active = True
            user.is_staff = True
            user.is_superuser = True
            user.save(update_fields=[
                "password",
                "is_active",
                "is_staff",
                "is_superuser",
            ])

        self.stdout.write(self.style.SUCCESS(
            "Existing admin password and permissions updated successfully."
        ))