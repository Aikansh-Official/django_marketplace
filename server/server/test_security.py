from django.test import SimpleTestCase, RequestFactory, override_settings
from django.http import HttpResponse
from corsheaders.middleware import CorsMiddleware
from marketplace.media_security import is_origin_allowed
from unittest.mock import patch
import json
from server.health import health_check


@override_settings(DEBUG=False, CORS_ALLOW_ALL_ORIGINS=False)
class OriginSecurityTests(SimpleTestCase):
    def test_shared_hosting_origin_is_not_trusted(self):
        middleware = CorsMiddleware(lambda request: HttpResponse('ok'))
        for origin in ('https://attacker.vercel.app', 'https://attacker.onrender.com'):
            response = middleware(RequestFactory().get('/api/', HTTP_ORIGIN=origin))
            self.assertNotIn('Access-Control-Allow-Origin', response)
            self.assertFalse(is_origin_allowed(origin, {'https://cxc-marketplace.vercel.app'}))

    def test_application_origin_remains_usable(self):
        origin = 'https://cxc-marketplace.vercel.app'
        response = CorsMiddleware(lambda request: HttpResponse('ok'))(
            RequestFactory().get('/api/', HTTP_ORIGIN=origin))
        self.assertEqual(response['Access-Control-Allow-Origin'], origin)
        self.assertTrue(is_origin_allowed(origin, {origin}))


class DiagnosticSecurityTests(SimpleTestCase):
    def test_public_health_does_not_expose_internal_exception(self):
        with patch('server.health.connection.ensure_connection', side_effect=RuntimeError('secret-database-host')):
            response = health_check(RequestFactory().get('/health/'))
        self.assertEqual(response.status_code, 503)
        self.assertEqual(json.loads(response.content)['database'], 'unhealthy')
        self.assertNotIn(b'secret-database-host', response.content)

    @override_settings(DEBUG=False, RESEND_API_KEY='')
    def test_missing_email_provider_does_not_report_delivery_or_log_code(self):
        from users.email_service import send_email_via_resend
        with patch.dict('os.environ', {'RESEND_API_KEY': ''}), self.assertLogs('users.email_service', level='WARNING') as logs:
            result = send_email_via_resend('test@example.test', 'Code: 123456', 'body', 'body')
        self.assertFalse(result['success'])
        self.assertNotIn('123456', '\n'.join(logs.output))
