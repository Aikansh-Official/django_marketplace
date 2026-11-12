"""Best-effort Render self-heartbeat, matching DSA Visual Lab's timing.

This cannot recover a stopped process or guarantee uptime on a free hosting plan.
No thread starts when the module is imported (important before Gunicorn forks).
"""
from datetime import datetime, timezone
import http.client
import json
import logging
import os
import re
import socket
import ssl
import threading


logger = logging.getLogger(__name__)
INITIAL_DELAY_SECONDS = 60
INTERVAL_SECONDS = 300
REQUEST_TIMEOUT_SECONDS = 10
MAX_RESPONSE_BYTES = 8192
_RENDER_HOST = re.compile(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.onrender\.com\Z')
_instance = None
_instance_lock = threading.Lock()


def configured_hostname(environ=None):
    """Only Render's own public service hostname can become a request target."""
    environ = os.environ if environ is None else environ
    if environ.get('RENDER', '').lower() != 'true':
        return None
    if environ.get('KEEP_ALIVE_ENABLED', 'true').lower() == 'false':
        return None
    hostname = environ.get('RENDER_EXTERNAL_HOSTNAME', '').lower()
    return hostname if _RENDER_HOST.fullmatch(hostname) else None


def request_health(hostname, stopped, register_abort):
    """Read a bounded, certificate-verified response; redirects are never followed."""
    connection = http.client.HTTPSConnection(
        hostname, timeout=REQUEST_TIMEOUT_SECONDS, context=ssl.create_default_context())
    live_socket = None
    response = None
    timed_out = threading.Event()

    def abort():
        # shutdown interrupts a pending socket read, rather than waiting for its timeout.
        active_socket = live_socket or connection.sock
        if active_socket is not None:
            try:
                active_socket.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
        connection.close()

    def expire():
        timed_out.set()
        abort()

    # A total request deadline also stops a peer that trickles response bytes.
    deadline = threading.Timer(REQUEST_TIMEOUT_SECONDS, expire)
    deadline.daemon = True
    register_abort(abort)
    deadline.start()
    try:
        if stopped.is_set():
            return False
        connection.connect()
        live_socket = connection.sock
        if stopped.is_set():
            return False
        connection.request('GET', '/api/ready/', headers={
            'Cache-Control': 'no-cache',
            'Accept': 'application/json',
            'User-Agent': 'CampXChange-Render-Heartbeat',
        })
        response = connection.getresponse()
        if not 200 <= response.status < 300:
            return False
        body = response.read(MAX_RESPONSE_BYTES + 1)
        if len(body) > MAX_RESPONSE_BYTES:
            return False
        result = json.loads(body)
        return (not stopped.is_set() and not timed_out.is_set()
                and isinstance(result, dict) and result.get('ready') is True)
    except (OSError, ValueError, http.client.HTTPException):
        return False
    finally:
        deadline.cancel()
        register_abort(None)
        if response is not None:
            response.close()
        connection.close()


class RenderHeartbeat:
    def __init__(self, hostname, *, request=request_health,
                 initial_delay=INITIAL_DELAY_SECONDS, interval=INTERVAL_SECONDS):
        self.hostname = hostname
        self.request = request
        self.initial_delay = initial_delay
        self.interval = interval
        self.stopped = threading.Event()
        self.lock = threading.Lock()
        self.abort_request = None
        self.last_success_at = None
        self.thread = threading.Thread(target=self.run, name='render-heartbeat', daemon=True)

    def start(self):
        self.thread.start()
        logger.info('Render heartbeat enabled: public /api/ready/ every five minutes.')

    def register_abort(self, callback):
        with self.lock:
            self.abort_request = callback
            should_abort = self.stopped.is_set()
        if callback is not None and should_abort:
            callback()

    def run(self):
        if self.stopped.wait(self.initial_delay):
            return
        while not self.stopped.is_set():
            try:
                ready = self.request(self.hostname, self.stopped, self.register_abort)
            except Exception:
                # Background diagnostics must never crash the serving worker or leak errors.
                ready = False
            if self.stopped.is_set():
                break
            if ready:
                with self.lock:
                    self.last_success_at = datetime.now(timezone.utc).isoformat()
                logger.info('Render heartbeat: application ready.')
            else:
                logger.warning('Render heartbeat: health check unavailable; retrying next interval.')
            # Delay starts after completion, so slow requests never overlap.
            if self.stopped.wait(self.interval):
                break

    def stop(self):
        self.stopped.set()
        with self.lock:
            abort = self.abort_request
        if abort is not None:
            abort()
        if self.thread.is_alive() and threading.current_thread() is not self.thread:
            self.thread.join(timeout=2)

    def status(self):
        with self.lock:
            return {'enabled': self.thread.is_alive() and not self.stopped.is_set(),
                    'last_success_at': self.last_success_at}


def start_render_heartbeat():
    global _instance
    hostname = configured_hostname()
    if hostname is None:
        return
    with _instance_lock:
        if _instance is None:
            _instance = RenderHeartbeat(hostname)
            _instance.start()


def stop_render_heartbeat():
    global _instance
    with _instance_lock:
        heartbeat, _instance = _instance, None
    if heartbeat is not None:
        heartbeat.stop()


def heartbeat_status():
    with _instance_lock:
        heartbeat = _instance
    return heartbeat.status() if heartbeat else {'enabled': False, 'last_success_at': None}
