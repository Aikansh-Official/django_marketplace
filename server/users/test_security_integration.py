from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from users.models import OTPVerification
from users.serializers import UserRegistrationSerializer
from users.admin_bootstrap import create_seed_admin
from django.contrib.auth import get_user_model
from server.crypto import encrypt_data
from rest_framework.test import APIClient
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor
from django.db import close_old_connections


class RegistrationOtpSecurityTests(TestCase):
    def setUp(self):
        self.email = 'regression@gmail.com'
        self.data = {'username': '12345678', 'full_name': 'Test Student',
                     'email': self.email, 'phone_number': '9876543210',
                     'password': 'SecureRegression!582', 'password_confirm': 'SecureRegression!582',
                     'role': 'BUYER', 'otp': '123456'}
        self.record = OTPVerification.objects.create(
            email=self.email, otp=encrypt_data('123456'), is_verified=True,
        )

    def test_expired_verified_code_rejected_and_fresh_code_accepted(self):
        OTPVerification.objects.filter(pk=self.record.pk).update(created_at=timezone.now() - timedelta(minutes=11))
        expired = UserRegistrationSerializer(data=self.data)
        self.assertFalse(expired.is_valid())
        self.assertIn('otp', expired.errors)
        OTPVerification.objects.filter(pk=self.record.pk).update(created_at=timezone.now())
        fresh = UserRegistrationSerializer(data=self.data)
        self.assertTrue(fresh.is_valid(), fresh.errors)

    def test_other_person_cannot_register_with_verified_email_alone(self):
        data = self.data.copy()
        del data['otp']
        missing = UserRegistrationSerializer(data=data)
        self.assertFalse(missing.is_valid())
        self.assertIn('otp', missing.errors)

        data['otp'] = '000000'
        for attempt in range(5):
            wrong = UserRegistrationSerializer(data=data)
            self.assertFalse(wrong.is_valid())
            self.assertIn('otp', wrong.errors)
        self.record.refresh_from_db()
        self.assertEqual(self.record.attempts, 5)
        locked = UserRegistrationSerializer(data=self.data)
        self.assertFalse(locked.is_valid())

    def test_resend_invalidates_proof_even_after_validation(self):
        serializer = UserRegistrationSerializer(data=self.data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        OTPVerification.objects.filter(pk=self.record.pk).update(
            otp=encrypt_data('654321'), is_verified=False,
        )
        from rest_framework.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            serializer.save()
        self.assertFalse(get_user_model().objects.filter(email=self.email).exists())

    @patch('users.email_service.send_welcome_email', return_value={'success': True})
    def test_registration_consumes_proof_and_never_returns_it(self, _welcome):
        response = APIClient().post('/api/auth/register/', self.data, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertNotIn('otp', response.data)
        self.assertFalse(OTPVerification.objects.filter(email=self.email).exists())
        self.assertTrue(get_user_model().objects.filter(email=self.email).exists())

    @patch('users.email_service.send_welcome_email', return_value={'success': True})
    @patch('users.views.send_otp_email', return_value={'success': True})
    def test_send_verify_and_register_flow(self, send, _welcome):
        client = APIClient()
        sent = client.post('/api/auth/send-otp/', {'email': self.email}, format='json')
        self.assertEqual(sent.status_code, 200, sent.data)
        code = send.call_args.args[1]
        verified = client.post('/api/auth/verify-otp/', {'email': self.email, 'otp': code}, format='json')
        self.assertEqual(verified.status_code, 200, verified.data)
        response = client.post('/api/auth/register/', {**self.data, 'otp': code}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertFalse(OTPVerification.objects.filter(email=self.email).exists())

    def test_verify_cannot_mark_a_resent_code_as_verified(self):
        def resend_during_verification(_stored):
            OTPVerification.objects.filter(pk=self.record.pk).update(
                otp=encrypt_data('654321'), is_verified=False,
            )
            return '123456'

        with patch('server.crypto.decrypt_data', side_effect=resend_during_verification):
            response = APIClient().post('/api/auth/verify-otp/',
                                        {'email': self.email, 'otp': '123456'}, format='json')
        self.assertEqual(response.status_code, 400, response.data)
        self.record.refresh_from_db()
        self.assertFalse(self.record.is_verified)

    @patch('users.serializers.User.objects.create_user', side_effect=RuntimeError('test failure'))
    def test_account_creation_failure_requires_new_code(self, _create):
        response = APIClient().post('/api/auth/register/', self.data, format='json')
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn('request a new verification code', str(response.data))
        self.assertFalse(OTPVerification.objects.filter(email=self.email).exists())

    def test_simultaneous_wrong_verification_attempts_are_counted(self):
        OTPVerification.objects.filter(pk=self.record.pk).update(is_verified=False)

        def attempt(_):
            try:
                response = APIClient().post('/api/auth/verify-otp/',
                                            {'email': self.email, 'otp': '000000'}, format='json')
                return response.status_code
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=8) as executor:
            statuses = list(executor.map(attempt, range(8)))
        self.assertTrue(all(code in (400, 429) for code in statuses), statuses)
        self.record.refresh_from_db()
        self.assertEqual(self.record.attempts, 5)
        correct = APIClient().post('/api/auth/verify-otp/',
                                   {'email': self.email, 'otp': '123456'}, format='json')
        self.assertEqual(correct.status_code, 429)


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
