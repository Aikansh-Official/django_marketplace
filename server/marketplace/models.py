from django.db import models
from django.conf import settings

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
        ('RENT', 'Rent'),
        ('DONATE', 'Donate'),
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
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Set to 0 for Donate")
    is_negotiable = models.BooleanField(default=True)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES, default='SELL')
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

class Offer(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('COUNTERED', 'Countered'),
    )

    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='offers_made')
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='offers')
    offer_amount = models.DecimalField(max_digits=10, decimal_places=2)
    buyer_message = models.TextField(blank=True, default='')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.buyer} requested {self.listing.title} for {self.offer_amount}"


class Notification(models.Model):
    TYPES = (
        ('BUY_REQUEST', 'New Purchase Request'),
        ('REQUEST_ACCEPTED', 'Purchase Request Accepted'),
        ('REQUEST_REJECTED', 'Purchase Request Declined'),
        ('ITEM_SOLD', 'Item Sold'),
        ('GENERAL', 'General Alert'),
    )

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications_sent')
    notification_type = models.CharField(max_length=30, choices=TYPES, default='GENERAL')
    title = models.CharField(max_length=255)
    message = models.TextField()
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient}: {self.title}"


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
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='reports')
    reason = models.CharField(max_length=255)
    details = models.TextField(blank=True, default='', max_length=2000)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Report #{self.id} for {self.listing.title} ({self.status})"

class PlatformSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.key}: {self.value[:30]}"
