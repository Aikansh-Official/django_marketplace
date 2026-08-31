from rest_framework_simplejwt.authentication import JWTAuthentication
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
            
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
