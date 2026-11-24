from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from django.conf import settings
from rest_framework.authentication import SessionAuthentication

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        
        # Check cookies first
        raw_token = request.COOKIES.get(getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE', 'access_token')) or None
        
        # Fallback to header
        if header is not None:
            raw_token = self.get_raw_token(header)
            
        if raw_token is None:
            return None

        if header is None:
            SessionAuthentication().enforce_csrf(request)
            
        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)

            from .session_security import require_active_session
            require_active_session(user, validated_token)

            return user, validated_token
        except (InvalidToken, AuthenticationFailed):
            # Invalid or expired token: return None so the request is treated as unauthenticated.
            # Protected views (IsAuthenticated, IsAdminUser) will still reject with 401/403,
            # while public views (AllowAny) like categories & listings will serve guests seamlessly.
            return None
