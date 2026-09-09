import os
import hmac
from django.conf import settings
from django.http import JsonResponse

class DataSecurityMiddleware:
    """
    Middleware that enforces an API Security Shield using DATA_SECURITY_KEY.
    Requires incoming requests to /api/ endpoints to carry a valid X-App-Security-Key header.
    Blocks external unauthorized crawlers, bots, and unauthorized access attempts.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        self.security_key = getattr(settings, 'DATA_SECURITY_KEY', None) or os.environ.get('DATA_SECURITY_KEY', '')

    def __call__(self, request):
        path = request.path

        # Only protect /api/ endpoints; exempt admin, static, media, health, etc.
        if path.startswith('/api/'):
            # Allow CORS preflight requests and health check endpoints
            if request.method == 'OPTIONS' or path in ('/api/health/', '/health/'):
                return self.get_response(request)

            # Retrieve security key from request headers
            incoming_key = request.headers.get('X-App-Security-Key') or request.META.get('HTTP_X_APP_SECURITY_KEY', '')

            # If security key is configured on server, validate it
            if self.security_key:
                if not incoming_key or not hmac.compare_digest(incoming_key, self.security_key):
                    return JsonResponse(
                        {
                            'error': 'Data Security Protection: Missing or invalid X-App-Security-Key header.',
                            'status': 403
                        },
                        status=403
                    )

        return self.get_response(request)
