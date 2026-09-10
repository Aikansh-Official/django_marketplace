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
from .serializers import (
    UserRegistrationSerializer, UserListSerializer, SendOTPSerializer,
    VerifyOTPSerializer, AdminUserUpdateSerializer, UserAdminDetailSerializer,
    UserDashboardSummarySerializer
)

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
        try:
            serializer = SendOTPSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            email = serializer.validated_data['email']
            otp = str(random.randint(100000, 999999))
            
            # Data Security Layer: Encrypt OTP before persisting to database
            from server.crypto import encrypt_data
            encrypted_otp = encrypt_data(otp)

            OTPVerification.objects.update_or_create(
                email=email,
                defaults={'otp': encrypted_otp, 'is_verified': False, 'created_at': timezone.now(), 'attempts': 0}
            )
            
            # Send verification email via configured backend (SMTP in prod, console in dev)
            from django.core.mail import send_mail
            try:
                send_mail(
                    subject="Your CampusXChange Verification Code",
                    message=f"Hello,\n\nYour OTP verification code for CampusXChange is: {otp}\n\nThis code is valid for 10 minutes.\nNever share this OTP with anyone.\n\nBest regards,\nCampusXChange Team",
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@campusxchange.com'),
                    recipient_list=[email],
                    fail_silently=False,
                )
            except Exception as mail_err:
                logger.warning(f"Failed to send OTP email to {email}: {mail_err}")
                if not settings.DEBUG and getattr(settings, 'EMAIL_HOST_USER', None):
                    return Response(
                        {"error": "Failed to send verification email. Please try again later."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

            logger.info(f'OTP generated and sent for {email}')
            if settings.DEBUG:
                print(f"\n=========================================\n[CAMPUSXCHANGE OTP FOR {email}]: {otp}\n=========================================\n")
                logger.debug(f'[DEV ONLY] OTP for {email}: {otp}')
            
            return Response({"message": "OTP sent successfully."})
        except Exception as e:
            logger.exception(f"Unexpected error in SendOTPView: {e}")
            return Response(
                {"error": f"Failed to send OTP: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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

                from server.crypto import decrypt_data
                stored_otp = decrypt_data(record.otp)

                if stored_otp != otp:
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
    # This view is for the admin dashboard to fetch all users (deferred heavy image data for speed)
    queryset = User.objects.all().defer('id_card_image', 'id_card_data').order_by('-date_joined')
    permission_classes = (IsAdminUser,)
    serializer_class = UserListSerializer

class UserAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    # This view is for the admin dashboard to inspect/manage/delete a specific user with full ID card
    queryset = User.objects.all()
    permission_classes = (IsAdminUser,)

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return AdminUserUpdateSerializer
        return UserAdminDetailSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # If ID verification or student verification changed and trust_score wasn't explicitly provided, recalculate
        if 'trust_score' not in request.data and ('is_id_verified' in request.data or 'is_verified_student' in request.data):
            try:
                instance.trust_score = instance.calculate_trust_score()
                instance.save(update_fields=['trust_score'])
            except Exception:
                pass

        # Determine specific audit action type
        if 'is_active' in request.data and request.data['is_active'] is False:
            action_type = 'USER_BAN'
        elif 'is_active' in request.data and request.data['is_active'] is True:
            action_type = 'USER_UNBAN'
        elif 'is_id_verified' in request.data and request.data['is_id_verified'] is True:
            action_type = 'USER_VERIFY'
        elif 'is_id_verified' in request.data and request.data['is_id_verified'] is False:
            action_type = 'USER_REVOKE_VERIFY'
        else:
            action_type = 'USER_UPDATE'

        try:
            from marketplace.views import log_admin_action
            log_admin_action(
                request,
                action=action_type,
                target_type='USER',
                target_id=instance.id,
                target_repr=f"@{instance.username} ({instance.full_name or instance.username})",
                details={k: v for k, v in request.data.items() if k not in ['id_card_image', 'profile_photo']}
            )
        except Exception:
            pass

        return Response(UserAdminDetailSerializer(instance).data)

    def perform_destroy(self, instance):
        user_id = instance.id
        user_repr = f"@{instance.username} ({instance.full_name or instance.username})"
        super().perform_destroy(instance)
        try:
            from marketplace.views import log_admin_action
            log_admin_action(
                self.request,
                action='USER_DELETE',
                target_type='USER',
                target_id=user_id,
                target_repr=user_repr,
                details={}
            )
        except Exception:
            pass

class UserProfileView(generics.RetrieveUpdateAPIView):
    # This view fetches and updates the currently logged-in user's profile
    permission_classes = (IsAuthenticated,)
    serializer_class = UserListSerializer

    def get_object(self):
        return self.request.user

class CheckUsernameView(APIView):
    authentication_classes = []
    permission_classes = (AllowAny,)

    def get(self, request):
        username = request.query_params.get('username', None)
        if not username:
            return Response({"error": "Username parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        username = str(username).strip()
        exists = User.objects.filter(username__iexact=username).exists()
        return Response({
            "available": not exists,
            "message": "Available" if not exists else "This registration number is already registered."
        })

class CheckPhoneView(APIView):
    authentication_classes = []
    permission_classes = (AllowAny,)

    def get(self, request):
        phone = request.query_params.get('phone', None)
        if not phone:
            return Response({"error": "Phone parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        phone = str(phone).strip().replace(' ', '').replace('-', '')
        raw_10 = phone[-10:] if len(phone) >= 10 else phone
        from django.db.models import Q
        exists = User.objects.filter(
            Q(phone_number=phone) |
            Q(phone_number=raw_10) |
            Q(phone_number=f"+91{raw_10}") |
            Q(phone_number=f"91{raw_10}")
        ).exists()
        return Response({
            "available": not exists,
            "message": "Available" if not exists else "This phone number is already registered."
        })

class CheckEmailView(APIView):
    authentication_classes = []
    permission_classes = (AllowAny,)

    def get(self, request):
        email = request.query_params.get('email', None)
        if not email:
            return Response({"error": "Email parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        email = str(email).strip().lower()
        exists = User.objects.filter(email__iexact=email).exists()
        return Response({
            "available": not exists,
            "message": "Available" if not exists else "This email address is already registered."
        })

class CheckAvailabilityView(APIView):
    authentication_classes = []
    permission_classes = (AllowAny,)

    def get(self, request):
        return self._check(request.query_params)

    def post(self, request):
        return self._check(request.data)

    def _check(self, data):
        username = str(data.get('username', '')).strip()
        phone = str(data.get('phone', data.get('phone_number', ''))).strip().replace(' ', '').replace('-', '')
        email = str(data.get('email', '')).strip().lower()

        errors = {}

        if username:
            if User.objects.filter(username__iexact=username).exists():
                errors['username'] = "This registration number is already registered."

        if phone:
            raw_10 = phone[-10:] if len(phone) >= 10 else phone
            from django.db.models import Q
            if User.objects.filter(
                Q(phone_number=phone) |
                Q(phone_number=raw_10) |
                Q(phone_number=f"+91{raw_10}") |
                Q(phone_number=f"91{raw_10}")
            ).exists():
                errors['phone_number'] = "This phone number is already registered."

        if email:
            if User.objects.filter(email__iexact=email).exists():
                errors['email'] = "This email address is already registered."

        return Response({
            "available": len(errors) == 0,
            "errors": errors
        })

class AuthStatusView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        if request.user and request.user.is_authenticated:
            user_data = UserListSerializer(request.user).data
            return Response({
                "isAuthenticated": True,
                "is_staff": request.user.is_staff,
                "is_superuser": request.user.is_superuser,
                "role": getattr(request.user, 'role', 'BUYER'),
                "username": request.user.username,
                "user": user_data
            })
        return Response({"isAuthenticated": False, "user": None, "role": None})

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
        user.role = 'SELLER'
        if id_card_image:
            user.id_card_image = id_card_image
        id_card_data = request.data.get('id_card_data', None)
        if id_card_data and isinstance(id_card_data, dict):
            user.id_card_data = id_card_data
        profile_photo = request.data.get('profile_photo', None)
        if profile_photo and isinstance(profile_photo, str) and len(profile_photo) > 100:
            user.profile_photo = profile_photo
        user.trust_score = user.calculate_trust_score()
        user.save()

        logger.info(f"User {user.username} successfully completed student ID verification and upgraded to SELLER.")
        return Response({
            "message": "Student ID verified successfully! You are now a Verified Seller.",
            "user": UserListSerializer(user).data
        }, status=status.HTTP_200_OK)

    def delete(self, request):
        user = request.user
        user.is_id_verified = False
        user.role = 'BUYER'
        user.id_card_image = None
        user.id_card_data = {}
        user.trust_score = user.calculate_trust_score()
        user.save(update_fields=['is_id_verified', 'role', 'id_card_image', 'id_card_data', 'trust_score'])
        return Response({
            "message": "ID verification reset successfully. Role returned to Buyer.",
            "user": UserListSerializer(user).data
        }, status=status.HTTP_200_OK)


class UpgradeToSellerView(APIView):
    """
    Dedicated endpoint for a Buyer to upgrade to a Verified Seller.
    Requires:
      - reg_no (must match user.username)
      - id_card_image (base64 image of physical student ID)
      - profile_photo (base64 selfie photo)
      - id_card_data (extracted OCR metadata, optional)
      - otp (6-digit OTP sent to user's registered email)
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        user = request.user
        reg_no = str(request.data.get('reg_no', '')).strip() or user.username
        id_card_image = request.data.get('id_card_image', None)
        id_card_data = request.data.get('id_card_data', {})
        profile_photo = request.data.get('profile_photo', None)
        otp = str(request.data.get('otp', '')).strip()

        # 1. Match registration number against account
        if str(user.username).strip() != str(reg_no).strip():
            return Response(
                {"error": f"Registration number mismatch. Your account is registered as '{user.username}', but '{reg_no}' was submitted."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Check physical student ID card image
        if not id_card_image or not isinstance(id_card_image, str) or len(id_card_image) < 100:
            return Response(
                {"error": "A valid student ID card photo is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Check selfie verification photo
        if not profile_photo or not isinstance(profile_photo, str) or len(profile_photo) < 100:
            return Response(
                {"error": "A clear selfie photo is required to verify identity against your student ID card."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. Check email verification code
        if not otp or len(otp) != 6:
            return Response(
                {"error": "Please enter the 6-digit verification code sent to your email."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            record = OTPVerification.objects.get(email=user.email)

            if record.is_locked():
                return Response(
                    {"error": "Too many failed OTP attempts. Please request a new code."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            if not record.is_valid():
                return Response(
                    {"error": "Verification code has expired. Please request a new code."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            from server.crypto import decrypt_data
            stored_otp = decrypt_data(record.otp)

            if stored_otp != otp:
                record.attempts += 1
                record.save(update_fields=['attempts'])
                remaining = max(0, record.MAX_ATTEMPTS - record.attempts)
                return Response(
                    {"error": f"Invalid verification code. {remaining} attempt(s) remaining."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            record.is_verified = True
            record.save()
        except OTPVerification.DoesNotExist:
            return Response(
                {"error": "No verification code was sent to this email. Please request a code first."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 5. Successfully upgrade Buyer to Verified Seller
        user.is_id_verified = True
        user.role = 'SELLER'
        user.id_card_image = id_card_image
        if id_card_data and isinstance(id_card_data, dict):
            user.id_card_data = id_card_data
        user.profile_photo = profile_photo
        user.trust_score = user.calculate_trust_score()
        user.save()

        logger.info(f"User {user.username} successfully upgraded from BUYER to SELLER via UpgradeToSellerView.")
        return Response({
            "message": "Congratulations! Your account has been upgraded to Verified Seller.",
            "user": UserListSerializer(user).data
        }, status=status.HTTP_200_OK)



