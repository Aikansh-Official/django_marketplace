import logging
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

logger = logging.getLogger(__name__)

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
        
        # Blacklist the refresh token server-side so it can't be reused
        refresh_token = request.COOKIES.get(refresh_cookie_name) or request.data.get('refresh')
        if refresh_token:
            try:
                from rest_framework_simplejwt.tokens import RefreshToken
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass  # Token may already be invalid/expired — safe to ignore
        
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
                defaults={'otp': otp, 'is_verified': False, 'created_at': timezone.now(), 'attempts': 0}
            )
            
            # Send verification email via configured backend (SMTP in prod, console in dev)
            from django.core.mail import send_mail
            try:
                send_mail(
                    subject="Your LPUTrade Verification Code",
                    message=f"Hello,\n\nYour OTP verification code for LPUTrade is: {otp}\n\nThis code is valid for 10 minutes.\nNever share this OTP with anyone.\n\nBest regards,\nLPUTrade Team",
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@lputrade.com'),
                    recipient_list=[email],
                    fail_silently=False,
                )
            except Exception as mail_err:
                logger.error(f"Failed to send OTP email to {email}: {mail_err}")
                if not settings.DEBUG:
                    return Response(
                        {"error": "Failed to send verification email. Please try again later."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

            logger.info(f'OTP generated and sent for {email}')
            if settings.DEBUG:
                logger.debug(f'[DEV ONLY] OTP for {email}: {otp}')
            
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

                # Check if locked due to too many failed attempts
                if record.is_locked():
                    return Response(
                        {"error": "Too many failed attempts. Please request a new OTP."},
                        status=status.HTTP_429_TOO_MANY_REQUESTS
                    )

                if not record.is_valid():
                    return Response({"error": "OTP has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)

                if record.otp != otp:
                    # Increment failed attempts counter
                    record.attempts += 1
                    record.save(update_fields=['attempts'])
                    remaining = record.MAX_ATTEMPTS - record.attempts
                    if remaining <= 0:
                        return Response(
                            {"error": "Too many failed attempts. OTP has been invalidated. Please request a new one."},
                            status=status.HTTP_429_TOO_MANY_REQUESTS
                        )
                    return Response(
                        {"error": f"Invalid OTP. {remaining} attempt(s) remaining."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
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
                "username": request.user.username,
                "user": UserListSerializer(request.user).data
            })
        return Response({"isAuthenticated": False, "user": None})

class CompleteIdVerificationView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        user = request.user
        reg_no = str(request.data.get('reg_no', '')).strip()
        id_card_image = request.data.get('id_card_image', None)

        if not reg_no:
            return Response(
                {"error": "Registration number is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not id_card_image or not isinstance(id_card_image, str) or len(id_card_image) < 100:
            return Response(
                {"error": "A valid student ID card image must be uploaded."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if str(user.username).strip() != reg_no:
            return Response(
                {"error": f"Registration number mismatch. Your account is registered with '{user.username}', but '{reg_no}' was submitted."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.is_id_verified = True
        if id_card_image:
            user.id_card_image = id_card_image
        user.trust_score = user.calculate_trust_score()
        user.save()

        logger.info(f"User {user.username} successfully completed student ID verification.")
        return Response({
            "message": "Student ID verified successfully! +5 Trust Score Points awarded.",
            "user": UserListSerializer(user).data
        }, status=status.HTTP_200_OK)

    def delete(self, request):
        user = request.user
        user.is_id_verified = False
        user.id_card_image = None
        user.trust_score = user.calculate_trust_score()
        user.save(update_fields=['is_id_verified', 'id_card_image', 'trust_score'])
        return Response({
            "message": "ID verification reset successfully.",
            "user": UserListSerializer(user).data
        }, status=status.HTTP_200_OK)


