import http.client
import json
import socket
import threading
import unittest
from pathlib import Path
import runpy
from unittest.mock import MagicMock, patch

from server.render_heartbeat import (
    INITIAL_DELAY_SECONDS, INTERVAL_SECONDS, REQUEST_TIMEOUT_SECONDS,
    MAX_RESPONSE_BYTES, RenderHeartbeat, configured_hostname, request_health,
)


class RenderHeartbeatTests(unittest.TestCase):
    def test_only_explicit_render_service_host_is_accepted(self):
        valid = {'RENDER': 'true', 'RENDER_EXTERNAL_HOSTNAME': 'my-api.onrender.com'}
        self.assertEqual(configured_hostname(valid), 'my-api.onrender.com')
        self.assertIsNone(configured_hostname({}))
        self.assertIsNone(configured_hostname({**valid, 'RENDER': 'false'}))
        self.assertIsNone(configured_hostname({**valid, 'KEEP_ALIVE_ENABLED': 'false'}))
        for host in ['localhost', '127.0.0.1', 'https://my-api.onrender.com',
                     'my-api.onrender.com/secret', 'my-api.onrender.com:443',
                     'user@my-api.onrender.com', 'my-api.onrender.com.evil.test',
                     'evil.test', '-api.onrender.com', 'api-.onrender.com']:
            self.assertIsNone(configured_hostname({**valid, 'RENDER_EXTERNAL_HOSTNAME': host}))

    def test_reference_timing_is_one_minute_then_five_minutes(self):
        self.assertEqual(INITIAL_DELAY_SECONDS, 60)
        self.assertEqual(INTERVAL_SECONDS, 300)
        self.assertEqual(REQUEST_TIMEOUT_SECONDS, 10)

    def test_http_request_validates_health_bounds_response_and_never_follows_redirects(self):
        for status, body, healthy in [(200, b'{"ready":true}', True),
                                      (200, b'{"ready":false}', False),
                                      (200, b'{"ready":1}', False),
                                      (200, b'{"status":"ok","database":"healthy"}', False),
                                      (200, b'[]', False), (200, b'not JSON', False),
                                      (200, b'x' * (MAX_RESPONSE_BYTES + 1), False),
                                      (302, b'', False), (503, b'', False)]:
            with self.subTest(status=status, body=body[:40]), patch(
                    'server.render_heartbeat.http.client.HTTPSConnection') as constructor:
                connection = constructor.return_value
                response = connection.getresponse.return_value
                response.status, response.read.return_value = status, body
                registered = []
                result = request_health('api.onrender.com', threading.Event(), registered.append)
                self.assertEqual(result, healthy)
                self.assertEqual(constructor.call_args.kwargs['timeout'], 10)
                self.assertIsNotNone(constructor.call_args.kwargs['context'])
                connection.request.assert_called_once()
                self.assertEqual(connection.request.call_args.args, ('GET', '/api/ready/'))
                response.close.assert_called_once()
                connection.close.assert_called_once()
                self.assertIsNone(registered[-1])
                if status == 200:
                    response.read.assert_called_once_with(MAX_RESPONSE_BYTES + 1)

    def test_network_timeout_and_protocol_failure_are_sanitized(self):
        for error in [socket.timeout('private-details'), OSError('private-details'),
                      http.client.RemoteDisconnected('private-details')]:
            with patch('server.render_heartbeat.http.client.HTTPSConnection') as constructor:
                constructor.return_value.connect.side_effect = error
                self.assertFalse(request_health('api.onrender.com', threading.Event(), lambda _: None))
                constructor.return_value.close.assert_called_once()

    def test_stop_before_startup_delay_cancels_timer_without_a_request(self):
        request = MagicMock()
        heartbeat = RenderHeartbeat('api.onrender.com', request=request, initial_delay=60)
        heartbeat.start()
        heartbeat.stop()
        request.assert_not_called()
        self.assertFalse(heartbeat.thread.is_alive())
        self.assertEqual(heartbeat.status(), {'enabled': False, 'last_success_at': None})

    def test_shutdown_aborts_pending_request_and_prevents_further_requests(self):
        entered, aborted = threading.Event(), threading.Event()
        count = []

        def request(host, stopped, register_abort):
            count.append(host)
            register_abort(aborted.set)
            entered.set()
            self.assertTrue(aborted.wait(2))
            register_abort(None)
            return False

        heartbeat = RenderHeartbeat('api.onrender.com', request=request, initial_delay=0, interval=0)
        heartbeat.start()
        try:
            self.assertTrue(entered.wait(1))
        finally:
            heartbeat.stop()
        self.assertTrue(aborted.is_set())
        self.assertFalse(heartbeat.thread.is_alive())
        self.assertEqual(count, ['api.onrender.com'])

    def test_cancellation_also_closes_a_live_network_socket(self):
        stopped = threading.Event()
        with patch('server.render_heartbeat.http.client.HTTPSConnection') as constructor:
            connection = constructor.return_value
            response = connection.getresponse.return_value
            response.status = 200
            response.read.return_value = b'{"ready":true}'

            def register(callback):
                if callback:
                    callback()
                    stopped.set()

            self.assertFalse(request_health('api.onrender.com', stopped, register))
            connection.sock.shutdown.assert_called_once_with(socket.SHUT_RDWR)
            connection.request.assert_not_called()

    def test_success_timestamp_and_interval_start_only_after_completion(self):
        calls, healthy = [], threading.Event()

        def request(host, stopped, register_abort):
            calls.append(host)
            healthy.set()
            return True

        heartbeat = RenderHeartbeat('api.onrender.com', request=request, initial_delay=0, interval=60)
        heartbeat.start()
        try:
            self.assertTrue(healthy.wait(1))
            # The worker's wait marks completion of processing, not just request entry.
            for _ in range(100):
                if heartbeat.status()['last_success_at']:
                    break
                threading.Event().wait(0.001)
            self.assertIsNotNone(heartbeat.status()['last_success_at'])
        finally:
            heartbeat.stop()
        self.assertEqual(calls, ['api.onrender.com'])
        self.assertFalse(heartbeat.thread.is_alive())

    def test_total_deadline_aborts_even_a_slow_response(self):
        with patch('server.render_heartbeat.http.client.HTTPSConnection') as constructor, patch(
                'server.render_heartbeat.threading.Timer') as timer:
            connection = constructor.return_value
            response = connection.getresponse.return_value
            response.status = 200

            def finish_after_deadline(*args):
                timer.call_args.args[1]()
                return b'{"ready":true}'

            response.read.side_effect = finish_after_deadline
            self.assertFalse(request_health('api.onrender.com', threading.Event(), lambda _: None))
            self.assertEqual(timer.call_args.args[0], 10)
            timer.return_value.start.assert_called_once()
            timer.return_value.cancel.assert_called_once()
            connection.sock.shutdown.assert_called_once_with(socket.SHUT_RDWR)

    def test_gunicorn_only_starts_after_worker_initialization_and_stops_on_exit(self):
        with patch('server.render_heartbeat.start_render_heartbeat') as start, patch(
                'server.render_heartbeat.stop_render_heartbeat') as stop:
            config = runpy.run_path(str(Path(__file__).resolve().parents[1] / 'gunicorn.conf.py'))
            start.assert_not_called()
            config['post_worker_init'](MagicMock())
            start.assert_called_once_with()
            config['worker_exit'](MagicMock(), MagicMock())
            stop.assert_called_once_with()
