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
        from django.core.cache import cache
        cache.clear()
        from unittest.mock import patch
        mail = patch('users.views.send_otp_email', return_value={'success': True})
        mail.start()
        self.addCleanup(mail.stop)
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

    def test_send_otp_signup_new_user(self):
        new_email = 'freshstudent123@gmail.com'
        res = self.client.post('/api/auth/send-otp/', {'email': new_email})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(OTPVerification.objects.filter(email=new_email).exists())

    def test_send_otp_signup_existing_email_blocked(self):
        buyer = User.objects.create_user(
            username='buyer123',
            email='existingbuyer@gmail.com',
            password='Password123!',
            role='BUYER'
        )
        res = self.client.post('/api/auth/send-otp/', {'email': buyer.email, 'purpose': 'signup'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already exists", str(res.data))

    def test_send_otp_upgrade_for_buyer(self):
        buyer = User.objects.create_user(
            username='buyer456',
            email='upgrademe@gmail.com',
            password='Password123!',
            role='BUYER'
        )
        self.client.force_authenticate(user=buyer)
        res = self.client.post('/api/auth/send-otp/', {'email': buyer.email, 'purpose': 'upgrade'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(OTPVerification.objects.filter(email=buyer.email).exists())

    def test_send_otp_upgrade_auto_detect_authenticated(self):
        buyer = User.objects.create_user(
            username='buyer789',
            email='autodetect@gmail.com',
            password='Password123!',
            role='BUYER'
        )
        self.client.force_authenticate(user=buyer)
        # Call without purpose, should auto-detect from authenticated user
        res = self.client.post('/api/auth/send-otp/', {'email': buyer.email})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(OTPVerification.objects.filter(email=buyer.email).exists())

    def test_send_otp_upgrade_already_seller_blocked(self):
        seller = User.objects.create_user(
            username='seller999',
            email='alreadyseller@gmail.com',
            password='Password123!',
            role='SELLER'
        )
        self.client.force_authenticate(user=seller)
        res = self.client.post('/api/auth/send-otp/', {'email': seller.email, 'purpose': 'upgrade'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already a verified Seller", str(res.data))

    def test_password_login_success_and_failure_history(self):
        from .models import UserLoginHistory
        initial_count = UserLoginHistory.objects.count()

        # 1. Successful password login
        res = self.client.post('/api/auth/login/', {
            'username': '12345678',
            'password': 'Password123!'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)

        # Check user last_login_method and UserLoginHistory
        self.regular_user.refresh_from_db()
        self.assertEqual(self.regular_user.last_login_method, 'PASSWORD')
        latest_log = UserLoginHistory.objects.order_by('-created_at').first()
        self.assertEqual(latest_log.login_method, 'PASSWORD')
        self.assertEqual(latest_log.status, 'SUCCESS')
        self.assertEqual(latest_log.user, self.regular_user)

        # 2. Failed password login
        res_fail = self.client.post('/api/auth/login/', {
            'username': '12345678',
            'password': 'WrongPassword999!'
        })
        self.assertEqual(res_fail.status_code, status.HTTP_401_UNAUTHORIZED)
        fail_log = UserLoginHistory.objects.order_by('-created_at').first()
        self.assertEqual(fail_log.status, 'FAILED')
        self.assertEqual(fail_log.login_method, 'PASSWORD')
        self.assertEqual(fail_log.failure_reason, 'INVALID_CREDENTIALS')

    def test_google_login_unregistered_email_rejected(self):
        from .models import UserLoginHistory
        from unittest.mock import patch, MagicMock
        import json

        mock_payload = {
            'email': 'unknownstudent@gmail.com',
            'email_verified': True,
            'sub': 'google_123456789',
            'name': 'Unknown Student'
        }

        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = json.dumps(mock_payload).encode('utf-8')
        mock_resp.__enter__.return_value = mock_resp

        with patch('urllib.request.urlopen', return_value=mock_resp):
            res = self.client.post('/api/auth/google/', {'credential': 'fake_google_id_token'})
            self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
            self.assertEqual(res.data.get('code'), 'NOT_REGISTERED')
            self.assertIn('not registered', res.data.get('error', '').lower())

            # Check that failed attempt was recorded for admin forensic review
            fail_log = UserLoginHistory.objects.filter(email_attempted='unknownstudent@gmail.com').first()
            self.assertIsNotNone(fail_log)
            self.assertEqual(fail_log.login_method, 'GOOGLE')
            self.assertEqual(fail_log.status, 'FAILED')
            self.assertEqual(fail_log.failure_reason, 'UNREGISTERED_EMAIL')

    def test_google_login_registered_email_success(self):
        from .models import UserLoginHistory
        from unittest.mock import patch, MagicMock
        import json

        registered_student = User.objects.create_user(
            username='22334455',
            email='verifiedstudent@gmail.com',
            password='Password123!',
            full_name='Verified Student'
        )

        mock_payload = {
            'email': 'verifiedstudent@gmail.com',
            'email_verified': True,
            'sub': 'google_sub_998877',
            'name': 'Verified Student'
        }

        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = json.dumps(mock_payload).encode('utf-8')
        mock_resp.__enter__.return_value = mock_resp

        with patch('urllib.request.urlopen', return_value=mock_resp):
            res = self.client.post('/api/auth/google/', {'credential': 'valid_google_id_token'})
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertIn('access', res.data)
            self.assertIn('refresh', res.data)

            registered_student.refresh_from_db()
            self.assertEqual(registered_student.last_login_method, 'GOOGLE')
            self.assertEqual(registered_student.google_id, 'google_sub_998877')

            # Verify history record
            success_log = UserLoginHistory.objects.filter(user=registered_student, login_method='GOOGLE').first()
            self.assertIsNotNone(success_log)
            self.assertEqual(success_log.status, 'SUCCESS')

    def test_admin_login_logs_and_user_history_endpoints(self):
        from .models import UserLoginHistory

        UserLoginHistory.objects.create(
            user=self.regular_user,
            email_attempted=self.regular_user.email,
            login_method='GOOGLE',
            status='SUCCESS'
        )

        # Anonymous cannot access
        res_anon = self.client.get(f'/api/auth/users/{self.regular_user.id}/login-history/')
        self.assertIn(res_anon.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

        # Regular user cannot access
        self.client.force_authenticate(user=self.regular_user)
        res_reg = self.client.get(f'/api/auth/users/{self.regular_user.id}/login-history/')
        self.assertEqual(res_reg.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can access student history
        self.client.force_authenticate(user=self.admin_user)
        res_admin = self.client.get(f'/api/auth/users/{self.regular_user.id}/login-history/')
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        self.assertEqual(res_admin.data['username'], self.regular_user.username)
        self.assertGreaterEqual(len(res_admin.data['logs']), 1)

        # Admin can access global login logs
        res_all_logs = self.client.get('/api/auth/login-logs/?method=GOOGLE')
        self.assertEqual(res_all_logs.status_code, status.HTTP_200_OK)
        self.assertIn('google_logins_count', res_all_logs.data)
        self.assertIn('password_logins_count', res_all_logs.data)

    def test_firebase_id_token_login_success(self):
        from .models import UserLoginHistory
        from unittest.mock import patch, MagicMock
        import json

        firebase_user = User.objects.create_user(
            username='99881122',
            email='firebase.student@gmail.com',
            password='Password123!',
            full_name='Firebase Student'
        )

        mock_firebase_payload = {
            'users': [
                {
                    'localId': 'firebase_uid_12345',
                    'email': 'firebase.student@gmail.com',
                    'emailVerified': True,
                    'displayName': 'Firebase Student',
                    'providerUserInfo': [
                        {
                            'providerId': 'google.com',
                            'rawId': 'google_sub_firebase_12345',
                            'email': 'firebase.student@gmail.com'
                        }
                    ]
                }
            ]
        }

        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = json.dumps(mock_firebase_payload).encode('utf-8')
        mock_resp.__enter__.return_value = mock_resp

        with patch('urllib.request.urlopen', return_value=mock_resp):
            res = self.client.post('/api/auth/google/', {'credential': 'valid_firebase_jwt_id_token'})
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertIn('access', res.data)
            self.assertIn('refresh', res.data)

            firebase_user.refresh_from_db()
            self.assertEqual(firebase_user.last_login_method, 'GOOGLE')
            self.assertEqual(firebase_user.google_id, 'google_sub_firebase_12345')

            # Verify audit trail
            log_entry = UserLoginHistory.objects.filter(user=firebase_user, login_method='GOOGLE').first()
            self.assertIsNotNone(log_entry)
            self.assertEqual(log_entry.status, 'SUCCESS')


