import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import connection


class Command(BaseCommand):
    help = "Create or promote a Django superuser"

    def handle(self, *args, **options):
        User = get_user_model()

        username = os.environ.get("ADMIN_USERNAME")
        email = os.environ.get("ADMIN_EMAIL")
        password = os.environ.get("ADMIN_PASSWORD")

        if not all([username, email, password]):
            raise Exception("Admin environment variables are missing")

        connection.ensure_connection()

        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email}
        )

        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        self.stdout.write(
            self.style.SUCCESS(
                f"Admin {'created' if created else 'updated'} successfully"
            )
        )