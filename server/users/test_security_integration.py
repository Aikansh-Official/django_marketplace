from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from users.models import OTPVerification
from users.serializers import UserRegistrationSerializer


class RegistrationOtpSecurityTests(TestCase):
    def test_expired_verified_code_rejected_and_fresh_code_accepted(self):
        record = OTPVerification.objects.create(email='regression@gmail.com', otp='unused', is_verified=True)
        OTPVerification.objects.filter(pk=record.pk).update(created_at=timezone.now() - timedelta(minutes=11))
        data = {'username': '12345678', 'full_name': 'Test Student',
                'email': 'regression@gmail.com', 'phone_number': '9876543210',
                'password': 'SecureRegression!582', 'password_confirm': 'SecureRegression!582', 'role': 'BUYER'}
        expired = UserRegistrationSerializer(data=data)
        self.assertFalse(expired.is_valid())
        self.assertIn('email', expired.errors)
        OTPVerification.objects.filter(pk=record.pk).update(created_at=timezone.now())
        fresh = UserRegistrationSerializer(data=data)
        self.assertTrue(fresh.is_valid(), fresh.errors)
