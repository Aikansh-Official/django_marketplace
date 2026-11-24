from django.http import JsonResponse, HttpResponse
from django.db import connection
from django.conf import settings
from django.utils import timezone
from django.views.decorators.http import require_safe
import logging

logger = logging.getLogger(__name__)

@require_safe
def ready_check(request):
    """Process readiness only: no database, user, storage, or business work."""
    from .render_heartbeat import heartbeat_status
    response = JsonResponse({
        'ready': True,
        'service': 'CampXChange API',
        'heartbeat': heartbeat_status(),
    })
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response


def health_check(request):
    """
    Production health check probe for load balancers, orchestrators, and uptime monitors.
    Returns HTTP 200 if the server and database connection are healthy.
    Returns HTTP 503 if the database is unreachable.
    """
    db_status = "healthy"
    status_code = 200

    try:
        connection.ensure_connection()
        # A cached client can exist even after the database becomes unreachable.
        connection.database.command('ping')
    except Exception:
        # Driver errors can contain connection details; keep diagnostics private.
        logger.error("Database health check failed")
        db_status = 'unhealthy'
        status_code = 503

    response_data = {
        "status": "ok" if status_code == 200 else "degraded",
        "service": "CampXChange API",
        "version": getattr(settings, 'APP_VERSION', '2.4.0'),
        "database": db_status,
        "environment": "development" if settings.DEBUG else "production",
        "timestamp": timezone.now().isoformat(),
    }

    return JsonResponse(response_data, status=status_code)

def ping(request):
    """
    Ultra-lightweight ping probe returning minimal 'True' (4 bytes)
    to minimize bandwidth consumption on frequent uptime / cron pings.
    """
    response = HttpResponse("True", content_type="text/plain")
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response

