from unittest.mock import patch

from django.test import SimpleTestCase, override_settings


@override_settings(DEBUG=False, TESTING=False, DATA_SECURITY_KEY='test-only-key',
                   SECURE_SSL_REDIRECT=False, ALLOWED_HOSTS=['testserver'])
class LightweightReadinessTests(SimpleTestCase):
    def test_public_readiness_skips_database_and_live_env_key_loading(self):
        with patch('sys.argv', ['manage.py', 'runserver']), patch(
                'server.health.connection.ensure_connection',
                side_effect=AssertionError('Readiness must not access MongoDB')) as database, patch(
                'server.middleware.dotenv_values',
                side_effect=AssertionError('Readiness must not load secret environment files')) as env, patch(
                'server.render_heartbeat.heartbeat_status',
                return_value={'enabled': True, 'last_success_at': 'test-timestamp'}):
            # A session cookie must not turn this lightweight route into a user query.
            self.client.cookies['sessionid'] = 'test-only-not-a-real-session'
            for route in ['/api/ready/', '/api/ready']:
                response = self.client.get(route, secure=True)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), {
                    'ready': True, 'service': 'CampXChange API',
                    'heartbeat': {'enabled': True, 'last_success_at': 'test-timestamp'},
                })
                self.assertIn('no-store', response['Cache-Control'])
            database.assert_not_called()
            env.assert_not_called()

    def test_protected_api_stays_blocked_without_security_header(self):
        # Disable the test-runner bypass to exercise the production middleware branch.
        with patch('sys.argv', ['manage.py', 'runserver']), patch(
                'server.middleware.dotenv_values', return_value={'DATA_SECURITY_KEY': 'test-only-key'}):
            for route in ['/api/auth/profile/', '/api/marketplace/categories/', '/api/ready/admin']:
                response = self.client.get(route, secure=True)
                self.assertEqual(response.status_code, 403)
                self.assertEqual(response.json()['status'], 403)

    def test_readiness_rejects_state_changing_methods_without_touching_database(self):
        with patch('sys.argv', ['manage.py', 'runserver']), patch(
                'server.health.connection.ensure_connection',
                side_effect=AssertionError('Readiness must not access MongoDB')) as database:
            response = self.client.post('/api/ready/', {}, secure=True)
        self.assertEqual(response.status_code, 405)
        database.assert_not_called()
