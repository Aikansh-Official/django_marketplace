from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, override_settings

from .email_service import (
    get_otp_email_template, get_password_reset_otp_template,
    get_password_reset_template, get_welcome_email_template,
    send_email_via_resend, send_otp_email,
)


FRONTEND = 'https://django-marketplace-aikansh.pages.dev'


@override_settings(DEBUG=False, FRONTEND_URL=FRONTEND,
                   RESEND_API_KEY='test-only-not-a-real-key',
                   RESEND_FROM_EMAIL='CampXChange <onboarding@resend.dev>',
                   RESEND_REPLY_TO_EMAIL='')
class EmailTemplateTests(SimpleTestCase):
    def test_all_email_navigation_uses_the_configured_deployment(self):
        templates = [
            get_otp_email_template('123456', 'student@example.test'),
            get_password_reset_otp_template('123456', 'student@example.test', 'Student'),
            get_password_reset_template(FRONTEND + '/reset-password?token=test-only', 'student@example.test'),
            get_welcome_email_template('Student', 'student@example.test'),
        ]
        for subject, html, text in templates:
            with self.subTest(subject=subject):
                self.assertIn(f'href="{FRONTEND}"', html)
                self.assertIn(f'src="{FRONTEND}/favicon.png"', html)
                self.assertIn(FRONTEND, text)
                self.assertNotIn('anshuman892494', html + text)

    def test_frontend_configuration_rejects_unsafe_links(self):
        for url in ['', 'javascript:alert(1)', 'https://user:password@example.test',
                    'http://example.test', 'https://example.test/?redirect=other',
                    'https://example.test/#fragment', 'https://example.test/"onclick="bad']:
            with self.subTest(url=url), override_settings(FRONTEND_URL=url):
                with self.assertRaises(ImproperlyConfigured):
                    get_otp_email_template('123456', 'student@example.test')

    def test_local_http_remains_available_only_in_debug(self):
        with override_settings(DEBUG=True, FRONTEND_URL='http://localhost:5173/'):
            _, html, text = get_otp_email_template('123456', 'student@example.test')
        self.assertIn('http://localhost:5173', html)
        self.assertIn('http://localhost:5173', text)

    def test_user_text_is_escaped_in_html_but_readable_in_plain_text(self):
        name = '<a href="https://attacker.test">Student</a>'
        email = '<img src=x onerror=alert(1)>@example.test'
        for template in [
            get_password_reset_otp_template('123456', email, name),
            get_password_reset_template(FRONTEND + '/reset-password?token=test-only', email, name),
            get_welcome_email_template(name, 'student@example.test'),
        ]:
            _, html, text = template
            self.assertNotIn(name, html)
            self.assertNotIn(email, html)
            self.assertIn('&lt;a href=', html)
            self.assertIn(name, text)

    def test_reset_link_stays_on_the_configured_origin_and_escapes_query(self):
        url = FRONTEND + '/reset-password?token=test-only&next=profile'
        _, html, text = get_password_reset_template(url, 'student@example.test')
        self.assertIn('?token=test-only&amp;next=profile', html)
        self.assertIn(url, text)
        for bad in ['https://attacker.test/reset', '//attacker.test/reset',
                    'javascript:alert(1)', 'https://user@django-marketplace-aikansh.pages.dev/reset']:
            with self.subTest(url=bad), self.assertRaises(ValueError):
                get_password_reset_template(bad, 'student@example.test')

    def test_sender_is_configured_and_missing_reply_to_is_not_invented(self):
        with patch.dict('os.environ', {'RESEND_REPLY_TO_EMAIL': ''}), patch('resend.Emails.send', return_value={'id': 'test-message'}) as send:
            result = send_email_via_resend('student@example.test', 'Test', '<p>Test</p>', 'Test')
        self.assertTrue(result['success'])
        params = send.call_args.args[0]
        self.assertEqual(params['from'], 'CampXChange <onboarding@resend.dev>')
        self.assertNotIn('reply_to', params)

    @override_settings(RESEND_REPLY_TO_EMAIL='support@example.test')
    def test_explicit_reply_mailbox_is_used(self):
        with patch('resend.Emails.send', return_value={'id': 'test-message'}) as send:
            result = send_email_via_resend('student@example.test', 'Test', '<p>Test</p>', 'Test')
        self.assertTrue(result['success'])
        self.assertEqual(send.call_args.args[0]['reply_to'], 'support@example.test')

    @override_settings(RESEND_REPLY_TO_EMAIL='not-a-mailbox')
    def test_invalid_reply_mailbox_does_not_dispatch(self):
        with patch('resend.Emails.send') as send:
            result = send_email_via_resend('student@example.test', 'Test', '<p>Test</p>', 'Test')
        self.assertFalse(result['success'])
        send.assert_not_called()

    @override_settings(FRONTEND_URL='')
    def test_missing_frontend_configuration_fails_closed_without_provider_dispatch(self):
        with patch('resend.Emails.send') as send, self.assertLogs('users.email_service', level='WARNING') as logs:
            result = send_otp_email('student@example.test', '123456')
        self.assertEqual(result, {'success': False, 'mock': False, 'error': 'Email delivery is unavailable.'})
        self.assertNotIn('123456', '\n'.join(logs.output))
        send.assert_not_called()

    def test_provider_error_does_not_expose_otp_credentials_or_recipient(self):
        private_details = 'otp=123456 key=test-only-not-a-real-key recipient=student@example.test'
        with patch('resend.Emails.send', side_effect=RuntimeError(private_details)), self.assertLogs('users.email_service', level='ERROR') as logs:
            result = send_email_via_resend('student@example.test', 'Code: 123456', '<p>123456</p>', '123456')
        self.assertEqual(result['error'], 'Email delivery is unavailable.')
        output = str(result) + '\n'.join(logs.output)
        for secret in ['123456', 'test-only-not-a-real-key', 'student@example.test']:
            self.assertNotIn(secret, output)

    def test_missing_provider_message_id_does_not_report_success(self):
        for response in [None, {}, {'id': ''}]:
            with self.subTest(response=response), patch('resend.Emails.send', return_value=response):
                result = send_email_via_resend('student@example.test', 'Test', '<p>Test</p>', 'Test')
            self.assertFalse(result['success'])
