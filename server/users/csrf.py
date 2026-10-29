from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET


@never_cache
@require_GET
def csrf_token(request):
    return JsonResponse({'csrfToken': get_token(request)})
