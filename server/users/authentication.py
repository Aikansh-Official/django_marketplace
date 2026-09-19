from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from django.conf import settings

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
            
        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)

            # Enforce single active session per platform (1 Web + 1 Android)
            token_session_id = validated_token.get('session_id')
            client_type = validated_token.get('client_type', 'web')

            if token_session_id:
                if client_type == 'android':
                    active_session = getattr(user, 'android_session_id', '')
                    if not active_session or active_session != token_session_id:
                        request._session_invalidated = True
                        raise AuthenticationFailed('Your Android session was terminated because your account was logged in on another Android device or logged out.')
                else:
                    active_session = getattr(user, 'web_session_id', '')
                    if not active_session or active_session != token_session_id:
                        request._session_invalidated = True
                        raise AuthenticationFailed('Your web session was terminated because your account was logged in on another web browser/device or logged out.')

            return user, validated_token
        except (InvalidToken, AuthenticationFailed):
            # Invalid or expired token: return None so the request is treated as unauthenticated.
            # Protected views (IsAuthenticated, IsAdminUser) will still reject with 401/403,
            # while public views (AllowAny) like categories & listings will serve guests seamlessly.
            return None
