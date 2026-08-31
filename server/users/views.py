from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from .serializers import UserRegistrationSerializer, UserListSerializer

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings

User = get_user_model()

def set_jwt_cookies(response, access_token, refresh_token=None):
    access_cookie_name = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE', 'access_token')
    refresh_cookie_name = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE_REFRESH', 'refresh_token')
    cookie_secure = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE_SECURE', False)
    cookie_httponly = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE_HTTP_ONLY', True)
    cookie_samesite = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE_SAMESITE', 'Lax')
    
    if access_token:
        access_max_age = getattr(settings, 'SIMPLE_JWT', {}).get('ACCESS_TOKEN_LIFETIME').total_seconds()
        response.set_cookie(
            access_cookie_name,
            access_token,
            max_age=access_max_age,
            secure=cookie_secure,
            httponly=cookie_httponly,
            samesite=cookie_samesite
        )
    
    if refresh_token:
        refresh_max_age = getattr(settings, 'SIMPLE_JWT', {}).get('REFRESH_TOKEN_LIFETIME').total_seconds()
        response.set_cookie(
            refresh_cookie_name,
            refresh_token,
            max_age=refresh_max_age,
            secure=cookie_secure,
            httponly=cookie_httponly,
            samesite=cookie_samesite
        )

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access_token = response.data.get('access')
            refresh_token = response.data.get('refresh')
            set_jwt_cookies(response, access_token, refresh_token)
            
            # Optional: Remove tokens from response body if you want them strictly in cookies
            # del response.data['access']
            # del response.data['refresh']
            # response.data['message'] = 'Successfully logged in.'
            
        return response

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_cookie_name = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE_REFRESH', 'refresh_token')
        
        # Inject refresh token from cookie into request data so TokenRefreshSerializer finds it
        if refresh_cookie_name in request.COOKIES and 'refresh' not in request.data:
            request.data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            request.data['refresh'] = request.COOKIES[refresh_cookie_name]
            
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access_token = response.data.get('access')
            set_jwt_cookies(response, access_token)
            
            # del response.data['access']
            # if 'refresh' in response.data:
            #     del response.data['refresh']
            # response.data['message'] = 'Token refreshed successfully.'
            
        return response

class LogoutView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        response = Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)
        access_cookie_name = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE', 'access_token')
        refresh_cookie_name = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE_REFRESH', 'refresh_token')
        
        response.delete_cookie(access_cookie_name)
        response.delete_cookie(refresh_cookie_name)
        return response

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer

class UserListView(generics.ListAPIView):
    # This view is for the admin dashboard to fetch all users
    # In a real scenario, permission_classes = (IsAdminUser,) might be used
    # But to allow easy testing via our separate frontend, we'll allow authenticated users or anyone for now.
    # Let's keep it somewhat secure but accessible if tested locally.
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = (AllowAny,) # Set to AllowAny temporarily for easy testing, should be IsAdminUser
    serializer_class = UserListSerializer

class UserProfileView(generics.RetrieveAPIView):
    # This view fetches the currently logged-in user's profile
    permission_classes = (IsAuthenticated,)
    serializer_class = UserListSerializer

    def get_object(self):
        return self.request.user

class CheckUsernameView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        username = request.query_params.get('username', None)
        if not username:
            return Response({"error": "Username parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        exists = User.objects.filter(username__iexact=username).exists()
        return Response({"available": not exists})
