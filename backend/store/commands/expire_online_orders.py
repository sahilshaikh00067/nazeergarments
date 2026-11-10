from django.core.management.base import BaseCommand
from store.services import expire_pending_online_orders


class Command(BaseCommand):
    help = "Release stock for expired online payment orders."

    def handle(self, *args, **options):
        count = expire_pending_online_orders()

        self.stdout.write(
            self.style.SUCCESS(
                f"Expired online orders processed: {count}"
            )
        )