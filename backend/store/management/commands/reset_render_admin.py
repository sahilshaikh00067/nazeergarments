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

        email_matches = User.objects.filter(
            email__iexact=user.email
        ).count()
        
        self.stdout.write("\n========== ADMIN LOGIN CHECK ==========")
        self.stdout.write(f"Username: {user.username}")
        self.stdout.write(f"Email: {user.email}")
        self.stdout.write(f"Email matches in database: {email_matches}")
        self.stdout.write(f"Password verification: {user.check_password(password)}")
        self.stdout.write(f"Account active: {user.is_active}")
        self.stdout.write(f"Staff permission: {user.is_staff}")
        self.stdout.write(f"Superuser permission: {user.is_superuser}")
        self.stdout.write("=======================================\n")
        
        if email_matches != 1:
            raise CommandError(
                "Admin email is duplicated or missing. Login cannot identify one account."
            )
        
        if not user.check_password(password) or not user.is_active:
            raise CommandError("Admin credentials verification failed.")
        
        self.stdout.write(self.style.SUCCESS(
            "ADMIN LOGIN VERIFIED SUCCESSFULLY"
        ))
        