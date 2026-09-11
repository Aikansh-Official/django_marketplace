from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.conf import settings
from django.utils import timezone
from .models import OTPVerification

User = get_user_model()

class UserSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        security_key = getattr(settings, 'DATA_SECURITY_KEY', '')
        if security_key:
            self.client.credentials(HTTP_X_APP_SECURITY_KEY=security_key)
        self.regular_user = User.objects.create_user(
            username='12345678',
            email='student@lpu.in',
            password='Password123!',
            full_name='Regular Student',
            phone_number='9876543210'
        )
        self.admin_user = User.objects.create_superuser(
            username='87654321',
            email='admin@lpu.in',
            password='AdminPassword123!',
            full_name='Admin User'
        )

    def test_admin_user_list_forbidden_for_anonymous(self):
        response = self.client.get('/api/auth/users/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_admin_user_list_forbidden_for_regular_user(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/auth/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_user_list_allowed_for_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/auth/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_otp_brute_force_lockout(self):
        email = 'newstudent@gmail.com'
        from server.crypto import encrypt_data
        OTPVerification.objects.create(
            email=email,
            otp=encrypt_data('123456'),
            created_at=timezone.now(),
            attempts=0
        )

        # 5 wrong attempts
        for attempt in range(1, 5):
            res = self.client.post('/api/auth/verify-otp/', {'email': email, 'otp': '000000'})
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('attempt(s) remaining', res.data.get('error', ''))

        # 5th wrong attempt triggers lockout
        res = self.client.post('/api/auth/verify-otp/', {'email': email, 'otp': '000000'})
        self.assertEqual(res.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        # 6th attempt is blocked as locked
        res = self.client.post('/api/auth/verify-otp/', {'email': email, 'otp': '123456'})
        self.assertEqual(res.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
