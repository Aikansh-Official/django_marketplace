import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from marketplace.models import Offer, Listing, Notification, HandoverSession
from marketplace.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Runs automated background trade crons, expiry alerts, and notification retention cleanup."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("[INFO] Starting CampXChange Trade Retention Crons..."))
        now = timezone.now()

        # ---------------------------------------------------------
        # 1. Handover Pending Reminder (> 24 Hours)
        # ---------------------------------------------------------
        try:
            pending_cutoff = now - timedelta(hours=24)
            accepted_offers = Offer.objects.filter(
                status='ACCEPTED',
                updated_at__lte=pending_cutoff
            ).select_related('listing', 'buyer', 'listing__seller')

            reminded_count = 0
            for offer in accepted_offers:
                session = HandoverSession.objects.filter(offer=offer).first()
                if not session or session.status == 'PENDING':
                    # Send reminder to buyer
                    NotificationService.send_notification(
                        recipient=offer.buyer,
                        title=f"Handover Pending: '{offer.listing.title}'",
                        message=f"Your reserved campus pickup for '{offer.listing.title}' is waiting. Meet the seller to complete handover!",
                        notification_type='HANDOVER_READY',
                        priority='HIGH',
                        link=f"/profile?tab=my-orders&offer={offer.id}",
                        listing=offer.listing,
                        extra_data={'offer_id': str(offer.id), 'action': 'HANDOVER_REMINDER'}
                    )
                    # Send reminder to seller
                    NotificationService.send_notification(
                        recipient=offer.listing.seller,
                        title=f"Handover Pending: '{offer.listing.title}'",
                        message=f"Buyer is waiting to pick up '{offer.listing.title}'. Open your QR or share PIN to verify handover.",
                        notification_type='HANDOVER_READY',
                        priority='HIGH',
                        link=f"/profile?tab=my-sales&offer={offer.id}",
                        listing=offer.listing,
                        extra_data={'offer_id': str(offer.id), 'action': 'HANDOVER_REMINDER'}
                    )
                    reminded_count += 1

            self.stdout.write(self.style.SUCCESS(f"[SUCCESS] Handover Reminders: {reminded_count} deals reminded."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[ERROR] Error in Handover Reminders: {e}"))

        # ---------------------------------------------------------
        # 2. Stale Listing Bump Tip (7 Days Old, 0 Offers)
        # ---------------------------------------------------------
        try:
            stale_cutoff = now - timedelta(days=7)
            stale_listings = Listing.objects.filter(
                status='ACTIVE',
                created_at__lte=stale_cutoff,
                offers__isnull=True
            ).select_related('seller')[:50]

            bump_count = 0
            for listing in stale_listings:
                NotificationService.send_notification(
                    recipient=listing.seller,
                    title=f"Tip to Sell '{listing.title}' Faster",
                    message="Items with multiple clear photos and flexible pricing sell 3x faster on campus! Tap to review your listing.",
                    notification_type='GENERAL',
                    priority='NORMAL',
                    link=f"/product/{listing.id}",
                    listing=listing,
                    extra_data={'listing_id': str(listing.id), 'action': 'LISTING_TIP'}
                )
                bump_count += 1

            self.stdout.write(self.style.SUCCESS(f"[SUCCESS] Stale Listing Tips: {bump_count} sellers prompted."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[ERROR] Error in Stale Listing Tips: {e}"))

        # ---------------------------------------------------------
        # 3. Notification Retention Cleanup (ExamPoint TTL Policy)
        # ---------------------------------------------------------
        try:
            read_cleanup_cutoff = now - timedelta(days=30)
            unread_cleanup_cutoff = now - timedelta(days=60)

            # Purge read notifications older than 30 days
            deleted_read, _ = Notification.objects.filter(
                recipient__isnull=False,
                is_read=True,
                created_at__lte=read_cleanup_cutoff
            ).delete()

            # Purge ancient unread notifications older than 60 days
            deleted_unread, _ = Notification.objects.filter(
                created_at__lte=unread_cleanup_cutoff
            ).delete()

            self.stdout.write(
                self.style.SUCCESS(
                    f"[SUCCESS] Retention Cleanup: Purged {deleted_read} old read notifications and {deleted_unread} expired notifications."
                )
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[ERROR] Error in Retention Cleanup: {e}"))

        self.stdout.write(self.style.SUCCESS("[SUCCESS] All retention crons completed."))
