from django.test import SimpleTestCase, RequestFactory, override_settings
from django.http import HttpResponse
from corsheaders.middleware import CorsMiddleware
from marketplace.media_security import is_origin_allowed


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
