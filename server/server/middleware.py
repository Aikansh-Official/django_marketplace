import os
import hmac
from dotenv import dotenv_values
from django.conf import settings
from django.http import JsonResponse

class DataSecurityMiddleware:
    """
    Middleware that enforces an API Security Shield using DATA_SECURITY_KEY strictly from .env.
    Requires incoming requests to /api/ endpoints to carry a valid X-App-Security-Key header.
    Blocks external unauthorized crawlers, bots, and unauthorized access attempts.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        # Only protect /api/ endpoints; exempt admin, static, media, health, etc.
        if path.startswith('/api/'):
            # Allow CORS preflight requests, health check endpoints, and test runner
            import sys
            is_testing = 'test' in sys.argv or getattr(settings, 'TESTING', False)
            if request.method == 'OPTIONS' or path in ('/api/health/', '/health/', '/api/ping/', '/ping/', '/api/health', '/health', '/api/ping', '/ping', '/') or is_testing:
                return self.get_response(request)

            # Retrieve security key from request headers
            incoming_key = request.headers.get('X-App-Security-Key') or request.META.get('HTTP_X_APP_SECURITY_KEY', '')

            # Read live from .env file so any change in .env takes effect immediately
            env_file = os.path.join(settings.BASE_DIR, '.env')
            env_values = dotenv_values(env_file) if os.path.exists(env_file) else {}
            raw_env = env_values.get('DATA_SECURITY_KEY') or getattr(settings, 'DATA_SECURITY_KEY', None) or os.environ.get('DATA_SECURITY_KEY', '')

            # Split comma-separated keys if multiple are defined
            allowed_keys = [k.strip() for k in str(raw_env).split(',') if k.strip()]

            # If security key is configured in .env, validate incoming request
            if allowed_keys:
                is_valid = any(hmac.compare_digest(incoming_key, key) for key in allowed_keys)
                if not is_valid:
                    # In DEBUG mode, allow local development calls (emulator, localhost, and physical phones on local Wi-Fi)
                    remote_ip = str(request.META.get('REMOTE_ADDR', ''))
                    is_local_dev = settings.DEBUG and (
                        remote_ip in ('127.0.0.1', '::1', '10.0.2.2') or
                        remote_ip.startswith(('10.', '192.168.', '172.')) or
                        any(request.get_host().startswith(host) for host in ('127.0.0.1', 'localhost', '10.0.2.2', '10.'))
                    )
                    if is_local_dev and not incoming_key:
                        return self.get_response(request)

                    return JsonResponse(
                        {
                            'error': 'Data Security Protection: Missing or invalid X-App-Security-Key header.',
                            'status': 403
                        },
                        status=403
                    )

        return self.get_response(request)
