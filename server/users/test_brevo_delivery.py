import json
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from .email_service import _NoEmailRedirects, send_otp_email


@override_settings(
    EMAIL_PROVIDER='brevo', FRONTEND_URL='https://example.test', DEBUG=False,
    BREVO_API_KEY='example-api-key', BREVO_FROM_EMAIL='sender@example.test',
    BREVO_FROM_NAME='CampXChange',
)
class BrevoDeliveryTests(SimpleTestCase):
    @patch('users.email_service.urlrequest.build_opener')
    def test_sends_otp_over_https_and_requires_provider_message_id(self, build_opener):
        response = MagicMock(status=201)
        response.read.return_value = b'{"messageId":"example-id"}'
        build_opener.return_value.open.return_value.__enter__.return_value = response
        result = send_otp_email('student@example.test', '123456')
        self.assertTrue(result['success'])
        req = build_opener.return_value.open.call_args.args[0]
        self.assertEqual(req.full_url, 'https://api.brevo.com/v3/smtp/email')
        self.assertEqual(req.get_method(), 'POST')
        payload = json.loads(req.data)
        self.assertEqual(payload['sender']['email'], 'sender@example.test')
        self.assertEqual(payload['to'], [{'email': 'student@example.test'}])
        self.assertIn('123456', payload['htmlContent'])
        self.assertNotIn('textContent', payload)
        self.assertEqual(build_opener.return_value.open.call_args.kwargs['timeout'], 15)
        response.read.return_value = b'{}'
        self.assertFalse(send_otp_email('student@example.test', '123456')['success'])

    @override_settings(BREVO_API_KEY='')
    @patch('users.email_service.urlrequest.build_opener')
    def test_missing_key_fails_before_network(self, build_opener):
        self.assertFalse(send_otp_email('student@example.test', '123456')['success'])
        build_opener.assert_not_called()

    @patch('users.email_service.urlrequest.build_opener')
    def test_provider_error_does_not_log_code_or_key(self, build_opener):
        build_opener.return_value.open.side_effect = RuntimeError('example-api-key 123456')
        with self.assertLogs('users.email_service', level='ERROR') as logs:
            result = send_otp_email('student@example.test', '123456')
        self.assertFalse(result['success'])
        self.assertNotIn('example-api-key', str(logs.output) + str(result))
        self.assertNotIn('123456', str(logs.output) + str(result))

    @patch('users.email_service.urlrequest.build_opener')
    def test_non_success_response_is_not_reported_as_sent(self, build_opener):
        response = MagicMock(status=202)
        build_opener.return_value.open.return_value.__enter__.return_value = response
        self.assertFalse(send_otp_email('student@example.test', '123456')['success'])

    def test_provider_redirect_is_not_followed(self):
        handler = _NoEmailRedirects()
        self.assertIsNone(handler.redirect_request(None, None, 302, '', {}, 'https://example.test/'))
