from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    # Additional fields for LocalTrade
    is_verified_student = models.BooleanField(default=False, help_text="True if the user has verified their college email.")
    email = models.EmailField(unique=True, help_text="Unique college email address")
    college_domain = models.CharField(max_length=255, blank=True, null=True, help_text="e.g. lpu.in, thapar.edu")
    trust_score = models.IntegerField(default=50, help_text="Trust score out of 100")
    profile_picture_url = models.URLField(max_length=500, blank=True, null=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True, unique=True)

    def __str__(self):
        return f"{self.username} ({self.college_domain if self.college_domain else 'Unverified'})"
