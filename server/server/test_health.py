import json
from unittest.mock import patch

from django.test import RequestFactory, SimpleTestCase
from pymongo.errors import ServerSelectionTimeoutError

from server.health import health_check


class DatabaseHealthTests(SimpleTestCase):
    def test_healthy_database_is_actually_pinged(self):
        with patch('server.health.connection') as database:
            response = health_check(RequestFactory().get('/api/health/'))
        database.ensure_connection.assert_called_once_with()
        database.database.command.assert_called_once_with('ping')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content)['database'], 'healthy')

    def test_stale_client_does_not_report_healthy_or_leak_details(self):
        with patch('server.health.connection') as database:
            database.database.command.side_effect = ServerSelectionTimeoutError(
                'private-host-and-password')
            with self.assertLogs('server.health', level='ERROR') as logs:
                response = health_check(RequestFactory().get('/api/health/'))
        self.assertEqual(response.status_code, 503)
        self.assertEqual(json.loads(response.content)['database'], 'unhealthy')
        self.assertNotIn(b'private-host-and-password', response.content)
        self.assertNotIn('private-host-and-password', '\n'.join(logs.output))
