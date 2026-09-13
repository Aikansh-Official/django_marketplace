from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta

# 12 Modular Administrative Permissions Catalog
ADMIN_PERMISSIONS_CATALOG = [
    {'key': 'dashboard', 'label': 'Dashboard Overview', 'group': 'Core', 'description': 'Summary metrics, quick KPIs & overview dashboard'},
    {'key': 'analytics', 'label': 'Analytics & Growth', 'group': 'Monitoring', 'description': 'Charts, growth trends & volume reports'},
    {'key': 'students', 'label': 'Students & Verification', 'group': 'Community', 'description': 'Student directory, ID card lightbox & verification status'},
    {'key': 'listings', 'label': 'Listings & Catalog', 'group': 'Operations', 'description': 'Marketplace catalog, moderation & status management'},
    {'key': 'deals', 'label': 'Deals & Handovers', 'group': 'Operations', 'description': 'Peer transactions, handover QR sessions & dispute actions'},
    {'key': 'categories', 'label': 'Category Management', 'group': 'Operations', 'description': 'Create, edit, organize and delete categories'},
    {'key': 'reports', 'label': 'Reports & Moderation', 'group': 'Operations', 'description': 'Student reports, flagged items & banned keyword blacklist'},
    {'key': 'notifications', 'label': 'Campus Broadcasts', 'group': 'Community', 'description': 'Campus-wide announcements & direct notices'},
    {'key': 'audit_logs', 'label': 'Audit Trail', 'group': 'Governance', 'description': 'Immutable admin action history & forensic review'},
    {'key': 'system_health', 'label': 'System Health', 'group': 'Governance', 'description': 'Database diagnostics, server latency & worker status'},
    {'key': 'team', 'label': 'Staff Team (RBAC)', 'group': 'Governance', 'description': 'Staff directory, appointments & custom permissions'},
    {'key': 'settings', 'label': 'Platform Settings', 'group': 'Governance', 'description': 'Platform constraints, maintenance mode & domain whitelist'},
]

ALL_PERMISSION_KEYS = [p['key'] for p in ADMIN_PERMISSIONS_CATALOG]

DEFAULT_ROLE_PERMISSIONS = {
    'SUPER_ADMIN': ALL_PERMISSION_KEYS,
    'MODERATOR': ['dashboard', 'listings', 'deals', 'categories', 'reports'],
    'ID_VERIFIER': ['dashboard', 'students'],
}

class CustomUser(AbstractUser):
    # Additional fields for LocalTrade
    full_name = models.CharField(max_length=255, blank=True, default='', help_text="Full Name of the student")
    is_verified_student = models.BooleanField(default=False, help_text="True if the user has verified their college email.")
    is_id_verified = models.BooleanField(default=False, help_text="True if the student has verified their physical student ID card.")
    id_card_image = models.TextField(blank=True, null=True, help_text="Verified student ID card image data or URL")
    id_card_data = models.JSONField(default=dict, blank=True, null=True, help_text="Structured data extracted from student ID card")
    email = models.EmailField(unique=True, help_text="Unique college email address")
    college_domain = models.CharField(max_length=255, blank=True, null=True, help_text="e.g. lpu.in, thapar.edu")
    trust_score = models.IntegerField(default=0, help_text="Trust score out of 100")
    profile_picture_url = models.URLField(max_length=500, blank=True, null=True)
    profile_photo = models.TextField(blank=True, null=True, help_text="Base64 selfie image used as profile photo")
    phone_number = models.CharField(max_length=15, blank=True, null=True, unique=True)
    
    ROLE_CHOICES = (
        ('BUYER', 'Buyer'),
        ('SELLER', 'Seller'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='BUYER', help_text="User role: BUYER or SELLER")

    ADMIN_ROLE_CHOICES = (
        ('SUPER_ADMIN', 'Super Admin'),
        ('MODERATOR', 'Content Moderator'),
        ('ID_VERIFIER', 'Student ID Verifier'),
    )
    admin_role = models.CharField(
        max_length=20,
        choices=ADMIN_ROLE_CHOICES,
        default='MODERATOR',
        blank=True,
        help_text="Role for staff administration (SUPER_ADMIN, MODERATOR, ID_VERIFIER)"
    )
    admin_permissions = models.JSONField(
        default=list,
        blank=True,
        help_text="Custom list of allowed admin permission module keys"
    )

    @property
    def effective_admin_role(self):
        if self.is_superuser:
            return 'SUPER_ADMIN'
        return self.admin_role or 'MODERATOR'

    @property
    def effective_admin_permissions(self):
        if self.is_superuser or self.effective_admin_role == 'SUPER_ADMIN':
            return list(ALL_PERMISSION_KEYS)
        if self.admin_permissions and isinstance(self.admin_permissions, list) and len(self.admin_permissions) > 0:
            return list(self.admin_permissions)
        return list(DEFAULT_ROLE_PERMISSIONS.get(self.effective_admin_role, ['dashboard']))

    def has_admin_permission(self, perm_key):
        if not (self.is_staff or self.is_superuser):
            return False
        if self.is_superuser or self.effective_admin_role == 'SUPER_ADMIN':
            return True
        return perm_key in self.effective_admin_permissions

    def calculate_trust_score(self):
        score = 0
        # 1. Email Authenticated (+5 Points)
        if self.email and str(self.email).strip():
            score += 5

        # 2. Student ID Card Upload (+5 Points)
        if getattr(self, 'is_id_verified', False):
            score += 5

        # 3. Selfie Profile Photo (+3 Points)
        if self.profile_photo:
            score += 3

        # 4. Successful Peer Trades (+5 Points per completed trade)
        try:
            from marketplace.models import Offer
            trades_count = Offer.objects.filter(
                models.Q(buyer=self) | models.Q(listing__seller=self),
                status='COMPLETED'
            ).distinct().count()
            score += trades_count * 5
        except Exception:
            pass

        # 5. Peer Ratings & Reviews (+ up to 15 Points for high average ratings, or deduction for low ratings)
        try:
            from marketplace.models import Review
            reviews = Review.objects.filter(reviewed_user=self)
            review_count = reviews.count()
            if review_count > 0:
                avg_rating = reviews.aggregate(models.Avg('rating'))['rating__avg'] or 0
                if avg_rating >= 4.5:
                    score += min(15, review_count * 3)
                elif avg_rating >= 3.5:
                    score += min(8, review_count * 2)
                elif avg_rating < 2.5:
                    score -= min(15, review_count * 3)
        except Exception:
            pass

        return max(0, min(100, score))

    def save(self, *args, **kwargs):
        if self.full_name and not self.first_name:
            self.first_name = self.full_name
        elif self.first_name and not self.full_name:
            self.full_name = f"{self.first_name} {self.last_name}".strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name or self.username} ({self.college_domain if self.college_domain else 'Unverified'})"


class OTPVerification(models.Model):
    email = models.EmailField(unique=True)
    otp = models.CharField(max_length=255, help_text="Encrypted OTP verification code")
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)
    attempts = models.PositiveIntegerField(default=0)

    MAX_ATTEMPTS = 5

    def is_valid(self):
        return timezone.now() < self.created_at + timedelta(minutes=10)

    def is_locked(self):
        return self.attempts >= self.MAX_ATTEMPTS

    def get_plain_otp(self):
        from server.crypto import decrypt_data
        return decrypt_data(self.otp)

    def __str__(self):
        return f"{self.email} - [Encrypted OTP]"
