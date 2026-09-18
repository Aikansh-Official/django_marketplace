from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

User = settings.AUTH_USER_MODEL

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=50, default='Package', blank=True, help_text="Lucide icon name")

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name

class Listing(models.Model):
    TRANSACTION_TYPES = (
        ('SELL', 'Sell'),
        ('DONATE', 'Donate'),
        ('EXCHANGE', 'Exchange / Barter'),
    )
    
    CONDITION_CHOICES = (
        ('NEW', 'Brand New'),
        ('LIKE_NEW', 'Like New'),
        ('GOOD', 'Good'),
        ('FAIR', 'Fair'),
        ('POOR', 'For Parts / Poor'),
    )

    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('PENDING', 'Pending (Reserved)'),
        ('SOLD', 'Sold'),
        ('HIDDEN', 'Hidden'),
    )

    CONTACT_PREFERENCES = (
        ('ALL', 'All (Chat, WhatsApp, Call)'),
        ('WHATSAPP', 'WhatsApp Preferred'),
        ('CALL', 'Phone Call Preferred'),
        ('CHAT', 'In-App Chat Only'),
        ('MEETUP', 'Campus Meetup Only'),
    )

    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listings')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='listings')
    title = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Set to 0 for Donate or pure Exchange")
    is_negotiable = models.BooleanField(default=True)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES, default='SELL')
    is_exchange_allowed = models.BooleanField(default=False, help_text="Open for item swap/exchange")
    exchange_preferences = models.CharField(max_length=255, blank=True, null=True, help_text="What seller wants in exchange")
    rent_period = models.CharField(max_length=20, default='month', blank=True, null=True, help_text="e.g. day, week, month, semester")
    condition = models.CharField(max_length=10, choices=CONDITION_CHOICES, default='GOOD')
    location = models.CharField(max_length=255, help_text="e.g. Block 34, BH-4, Uni-Mall, Law Gate")
    contact_preference = models.CharField(max_length=20, choices=CONTACT_PREFERENCES, default='ALL')
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    contact_whatsapp = models.CharField(max_length=20, blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class ListingImage(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='images')
    image_url = models.TextField(help_text="Image URL or Base64 URI")
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.listing.title}"

import uuid
from django.utils import timezone

class Offer(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('COUNTERED', 'Countered'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='offers_made')
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='offers')
    offer_amount = models.DecimalField(max_digits=10, decimal_places=2)
    counter_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    seller_note = models.TextField(blank=True, default='')
    buyer_message = models.TextField(blank=True, default='')
    is_exchange_offer = models.BooleanField(default=False)
    exchange_item_title = models.CharField(max_length=255, blank=True, null=True, help_text="Item offered in exchange")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.buyer} requested {self.listing.title} for {self.offer_amount}"


class HandoverSession(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('USED', 'Used'),
        ('EXPIRED', 'Expired'),
        ('CANCELLED', 'Cancelled'),
    )

    offer = models.ForeignKey(Offer, on_delete=models.CASCADE, related_name='handover_sessions')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    pin_code = models.CharField(max_length=6, db_index=True)
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='ACTIVE')
    failed_attempts = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        if self.status != 'ACTIVE':
            return False
        if timezone.now() > self.expires_at:
            self.status = 'EXPIRED'
            self.save(update_fields=['status'])
            return False
        return True

    def __str__(self):
        return f"HandoverSession for Offer #{self.offer_id} ({self.status}) - PIN {self.pin_code}"


class Notification(models.Model):
    TYPES = (
        ('BUY_REQUEST', 'New Purchase Request'),
        ('REQUEST_ACCEPTED', 'Purchase Request Accepted'),
        ('REQUEST_REJECTED', 'Purchase Request Declined'),
        ('HANDOVER_READY', 'Handover QR Ready'),
        ('ITEM_SOLD', 'Item Sold / Handover Completed'),
        ('DEAL_CANCELLED', 'Deal Cancelled'),
        ('BROADCAST', 'Campus Broadcast Announcement'),
        ('DIRECT_WARNING', 'Official Direct Notice / Warning'),
        ('OFFER_COUNTERED', 'Price Counter-Offer Received'),
        ('NEW_REVIEW', 'New Peer Review Received'),
        ('NEW_CHAT_MESSAGE', 'New In-App Message'),
        ('GENERAL', 'General Alert'),
    )
    PRIORITIES = (
        ('NORMAL', 'Normal'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    )

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications_sent')
    notification_type = models.CharField(max_length=30, choices=TYPES, default='GENERAL')
    priority = models.CharField(max_length=10, choices=PRIORITIES, default='NORMAL')
    title = models.CharField(max_length=255)
    message = models.TextField()
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    link = models.CharField(max_length=255, blank=True, default='')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient}: {self.title} ({self.priority})"


class BroadcastLog(models.Model):
    AUDIENCE_CHOICES = (
        ('ALL', 'All Students'),
        ('SELLERS', 'All Sellers'),
        ('BUYERS', 'All Buyers'),
        ('UNVERIFIED', 'Unverified Students'),
    )
    PRIORITY_CHOICES = (
        ('NORMAL', 'Normal'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    )

    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='broadcast_logs')
    target_audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='ALL')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='NORMAL')
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True, default='')
    recipients_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"BroadcastLog #{self.id}: {self.title} ({self.recipients_count} recipients)"



class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist')
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='wishlisted_by')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'listing')

    def __str__(self):
        return f"{self.user} wishlisted {self.listing.title}"

class ListingReport(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('RESOLVED', 'Resolved'),
        ('DISMISSED', 'Dismissed'),
    )

    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_submitted')
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='reports', null=True, blank=True)
    reported_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_received', null=True, blank=True)
    reason = models.CharField(max_length=255)
    details = models.TextField(blank=True, default='', max_length=2000)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        target = self.listing.title if self.listing else (self.reported_user.username if self.reported_user else 'Unknown')
        return f"Report #{self.id} for {target} ({self.status})"

class PlatformSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.key}: {self.value[:30]}"


class AdminAuditLog(models.Model):
    ACTION_CHOICES = (
        ('USER_BAN', 'User Banned / Suspended'),
        ('USER_UNBAN', 'User Reactivated'),
        ('USER_VERIFY', 'Student ID Verified'),
        ('USER_REVOKE_VERIFY', 'Student ID Verification Revoked'),
        ('USER_UPDATE', 'Student Profile Modified'),
        ('LISTING_DELETE', 'Listing Deleted'),
        ('LISTING_HIDE', 'Listing Hidden'),
        ('LISTING_ACTIVATE', 'Listing Activated'),
        ('LISTING_UPDATE', 'Listing Details Modified'),
        ('DEAL_FORCE_CANCEL', 'Deal Force-Cancelled'),
        ('DEAL_FORCE_COMPLETE', 'Deal Force-Completed'),
        ('CATEGORY_CREATE', 'Category Created'),
        ('CATEGORY_UPDATE', 'Category Updated'),
        ('CATEGORY_DELETE', 'Category Deleted'),
        ('BROADCAST_SENT', 'Campus Broadcast Dispatched'),
        ('DIRECT_NOTICE_SENT', 'Direct Student Notice Dispatched'),
        ('REPORT_RESOLVED', 'Report Resolved / Action Taken'),
        ('BANNED_WORDS_UPDATE', 'Banned Words Blacklist Updated'),
        ('SETTINGS_UPDATE', 'Platform Settings Updated'),
        ('STAFF_PROMOTE', 'Staff Admin Appointed / Promoted'),
        ('STAFF_ROLE_CHANGE', 'Staff Admin Role Updated'),
        ('STAFF_REVOKE', 'Staff Admin Privileges Revoked'),
        ('SECURITY_ALERT', 'Security Incident / Alert'),
    )

    admin_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    admin_username = models.CharField(max_length=150, help_text="Cached admin username")
    action = models.CharField(max_length=30, choices=ACTION_CHOICES, db_index=True)
    target_type = models.CharField(max_length=50, blank=True, default='')
    target_id = models.CharField(max_length=100, blank=True, default='')
    target_repr = models.CharField(max_length=255, blank=True, default='')
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M')}] {self.admin_username} -> {self.action} ({self.target_repr})"


class Review(models.Model):
    deal = models.ForeignKey(Offer, on_delete=models.CASCADE, related_name='reviews')
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    reviewed_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 to 5 stars"
    )
    comment = models.TextField(blank=True, default='')
    quick_tags = models.JSONField(default=list, blank=True, help_text="List of quick tags like 'Smooth Handover', 'Polite', etc.")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('deal', 'reviewer')

    def __str__(self):
        return f"Review by #{self.reviewer_id} for #{self.reviewed_user_id} ({self.rating}★)"


class ChatMessage(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='chat_messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_chat_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_chat_messages')
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Msg from #{self.sender_id} to #{self.recipient_id} on Listing #{self.listing_id}"
