
import os

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import connection


class Command(BaseCommand):
    help = "Create a temporary Django superuser"

    def handle(self, *args, **options):
        username = os.environ.get("ADMIN_USERNAME")
        email = os.environ.get("ADMIN_EMAIL")
        password = os.environ.get("ADMIN_PASSWORD")

        if not all([username, email, password]):
            raise CommandError("Admin environment variables are missing.")

        if len(password) < 12:
            raise CommandError("Admin password must be at least 12 characters.")

        connection.ensure_connection()

        User = get_user_model()

        if User.objects.filter(username=username).exists():
            raise CommandError(
                "This username already exists. Choose a different username."
            )

        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Admin created successfully: {user.username}"
            )
        )
