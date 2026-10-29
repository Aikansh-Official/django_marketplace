from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from users.models import OTPVerification
from users.serializers import UserRegistrationSerializer
from users.admin_bootstrap import create_seed_admin
from django.contrib.auth import get_user_model


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


class AdminBootstrapSecurityTests(TestCase):
    def test_missing_credentials_do_not_create_default_admin(self):
        self.assertFalse(create_seed_admin('', '', ''))
        self.assertFalse(get_user_model().objects.exists())

    def test_existing_user_is_never_promoted_or_password_reset(self):
        user = get_user_model().objects.create_user(username='existing', email='existing@example.test', password='Original!5929')
        self.assertFalse(create_seed_admin(user.username, user.email, 'Replacement!5829'))
        user.refresh_from_db()
        self.assertFalse(user.is_staff)
        self.assertTrue(user.check_password('Original!5929'))

    def test_explicit_new_credentials_create_admin(self):
        self.assertTrue(create_seed_admin('new-admin', 'admin@example.test', 'UniqueSeed!59292'))
        self.assertTrue(get_user_model().objects.get(username='new-admin').is_superuser)
