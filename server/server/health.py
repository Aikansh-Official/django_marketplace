from django.http import JsonResponse, HttpResponse
from django.db import connection
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

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
    except Exception as e:
        logger.error(f"Database health check failed: {e}", exc_info=True)
        db_status = f"unhealthy: {str(e)}"
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

