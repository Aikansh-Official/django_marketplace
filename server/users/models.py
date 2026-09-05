from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta

class CustomUser(AbstractUser):
    # Additional fields for LocalTrade
    full_name = models.CharField(max_length=255, blank=True, default='', help_text="Full Name of the student")
    is_verified_student = models.BooleanField(default=False, help_text="True if the user has verified their college email.")
    email = models.EmailField(unique=True, help_text="Unique college email address")
    college_domain = models.CharField(max_length=255, blank=True, null=True, help_text="e.g. lpu.in, thapar.edu")
    trust_score = models.IntegerField(default=50, help_text="Trust score out of 100")
    profile_picture_url = models.URLField(max_length=500, blank=True, null=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True, unique=True)

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
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)
    attempts = models.PositiveIntegerField(default=0)

    MAX_ATTEMPTS = 5

    def is_valid(self):
        return timezone.now() < self.created_at + timedelta(minutes=10)

    def is_locked(self):
        return self.attempts >= self.MAX_ATTEMPTS

    def __str__(self):
        return f"{self.email} - {self.otp}"
