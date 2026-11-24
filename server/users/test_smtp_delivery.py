from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from .email_service import send_otp_email


@override_settings(
    EMAIL_PROVIDER='smtp', FRONTEND_URL='https://example.test', DEBUG=False,
    SMTP_HOST='smtp.hostinger.com', SMTP_PORT=465,
    SMTP_USER='sender@example.test', SMTP_PASSWORD='test-password',
    SMTP_FROM_EMAIL='', SMTP_USE_SSL=True, SMTP_USE_TLS=False,
)
class SmtpDeliveryTests(SimpleTestCase):
    @patch('users.email_service.get_connection')
    def test_otp_uses_authenticated_smtp_and_sends_both_formats(self, get_connection):
        get_connection.return_value.send_messages.return_value = 1
        result = send_otp_email('student@example.test', '123456')
        self.assertTrue(result['success'])
        self.assertTrue(get_connection.call_args.kwargs['use_ssl'])
        message = get_connection.return_value.send_messages.call_args.args[0][0]
        self.assertEqual(message.from_email, 'sender@example.test')
        self.assertIn('123456', message.body)
        self.assertEqual(message.alternatives[0].mimetype, 'text/html')

    @override_settings(SMTP_PASSWORD='')
    @patch('users.email_service.get_connection')
    def test_missing_credentials_fail_without_attempting_delivery(self, get_connection):
        self.assertFalse(send_otp_email('student@example.test', '123456')['success'])
        get_connection.assert_not_called()

    @patch('users.email_service.get_connection', side_effect=RuntimeError('private 123456'))
    def test_smtp_errors_do_not_expose_details(self, get_connection):
        with self.assertLogs('users.email_service', level='ERROR') as logs:
            result = send_otp_email('student@example.test', '123456')
        self.assertFalse(result['success'])
        self.assertNotIn('123456', str(result) + str(logs.output))
