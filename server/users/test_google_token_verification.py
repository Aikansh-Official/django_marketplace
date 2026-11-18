from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from .serializers import VerifyOTPSerializer
from .views import verify_google_token


class GoogleTokenVerificationTests(SimpleTestCase):
    @override_settings(FIREBASE_API_KEY='', GOOGLE_CLIENT_ID='')
    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_unconfigured_client_cannot_accept_oauth_tokens(self, verify):
        self.assertEqual(verify_google_token('token'), (None, 'TOKEN_VERIFY_ERROR'))
        verify.assert_not_called()

    @override_settings(FIREBASE_API_KEY='', GOOGLE_CLIENT_ID='our-client')
    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_configured_client_is_passed_to_google_verifier(self, verify):
        verify.return_value = {'email': 'student@gmail.com', 'email_verified': True,
                               'sub': 'google-id', 'aud': 'our-client'}
        claims, error = verify_google_token('token')
        self.assertIsNone(error)
        self.assertEqual(claims['email'], 'student@gmail.com')
        self.assertEqual(verify.call_args.args[2], 'our-client')

    @override_settings(FIREBASE_API_KEY='', GOOGLE_CLIENT_ID='our-client')
    @patch('google.oauth2.id_token.verify_oauth2_token', side_effect=ValueError('wrong audience'))
    def test_invalid_token_is_rejected(self, verify):
        self.assertEqual(verify_google_token('token'), (None, 'INVALID_TOKEN'))

    def test_otp_email_is_normalized(self):
        serializer = VerifyOTPSerializer(data={'email': 'Student@Gmail.com', 'otp': '123456'})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['email'], 'student@gmail.com')
