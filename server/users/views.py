from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.throttling import ScopedRateThrottle
from django.contrib.auth import get_user_model
from django.utils import timezone
import random
from .models import OTPVerification
from .serializers import UserRegistrationSerializer, UserListSerializer, SendOTPSerializer, VerifyOTPSerializer

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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access_token = response.data.get('access')
            refresh_token = response.data.get('refresh')
            set_jwt_cookies(response, access_token, refresh_token)
            
            # Attach user details for client convenience
            try:
                username = request.data.get('username')
                user = User.objects.get(username=username)
                response.data['user'] = UserListSerializer(user).data
            except Exception:
                pass
            response.data['message'] = 'Successfully logged in.'
            
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
            response.data['message'] = 'Token refreshed successfully.'
            
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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'signup'
    serializer_class = UserRegistrationSerializer

class SendOTPView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'signup'

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp = str(random.randint(100000, 999999))
            
            OTPVerification.objects.update_or_create(
                email=email,
                defaults={'otp': otp, 'is_verified': False, 'created_at': timezone.now()}
            )
            
            print(f"\n=========================================\nOTP FOR {email}: {otp}\n=========================================\n")
            
            return Response({"message": "OTP sent successfully."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyOTPView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'signup'

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp = serializer.validated_data['otp']
            
            try:
                record = OTPVerification.objects.get(email=email)
                if not record.is_valid():
                    return Response({"error": "OTP has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
                if record.otp != otp:
                    return Response({"error": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)
                
                record.is_verified = True
                record.save()
                return Response({"message": "Email verified successfully."})
            except OTPVerification.DoesNotExist:
                return Response({"error": "OTP not found for this email."}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserListView(generics.ListAPIView):
    # This view is for the admin dashboard to fetch all users
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = (IsAdminUser,)
    serializer_class = UserListSerializer

class UserAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    # This view is for the admin dashboard to manage/delete a specific user
    queryset = User.objects.all()
    permission_classes = (IsAdminUser,)
    serializer_class = UserListSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    # This view fetches and updates the currently logged-in user's profile
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

class AuthStatusView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        if request.user and request.user.is_authenticated:
            return Response({
                "isAuthenticated": True,
                "is_staff": request.user.is_staff,
                "is_superuser": request.user.is_superuser,
                "username": request.user.username
            })
        return Response({"isAuthenticated": False})
