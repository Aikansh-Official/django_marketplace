import logging
import secrets
import json
import urllib.request
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.throttling import ScopedRateThrottle
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import models
import random
from .models import (
    OTPVerification, PasswordResetToken, PasswordResetOTP,
    ADMIN_PERMISSIONS_CATALOG, ALL_PERMISSION_KEYS, UserLoginHistory
)
from .permissions import HasAdminModulePermission, IsSuperAdminUser
from .serializers import (
    UserRegistrationSerializer, UserListSerializer, SendOTPSerializer,
    VerifyOTPSerializer, AdminUserUpdateSerializer, UserAdminDetailSerializer,
    UserDashboardSummarySerializer, StaffUserSerializer,
    ForgotPasswordRequestSerializer, ForgotPasswordResetSerializer,
    UserLoginHistorySerializer
)
from .email_service import send_otp_email, send_password_reset_email, send_password_reset_otp_email

logger = logging.getLogger(__name__)

import uuid
from datetime import timedelta
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

User = get_user_model()

def get_client_type(request):
    """Detect whether request is originating from 'android' app or 'web'."""
    # 1. Header takes highest precedence
    header_val = (request.headers.get('X-Client-Type') or request.META.get('HTTP_X_CLIENT_TYPE', '')).strip().lower()
    if header_val in ('android', 'app'):
        return 'android'
    if header_val == 'web':
        return 'web'

    # 2. Body parameter
    body_val = str(getattr(request, 'data', {}).get('client_type', '')).strip().lower()
    if body_val in ('android', 'app'):
        return 'android'
    if body_val == 'web':
        return 'web'

    # 3. User-Agent heuristic
    user_agent = (request.META.get('HTTP_USER_AGENT') or '').lower()
    if 'okhttp' in user_agent or 'campxchange-android' in user_agent:
        return 'android'

    return 'web'


def get_device_description(request):
    """Extract a user-friendly description of the client device."""
    client_type = get_client_type(request)
    ua = request.META.get('HTTP_USER_AGENT', '')
    if client_type == 'android':
        return 'CampXChange Android App'

    browser = 'Web Browser'
    if 'Edg/' in ua:
        browser = 'Microsoft Edge'
    elif 'Chrome/' in ua and 'Mobile' in ua:
        browser = 'Chrome Mobile'
    elif 'Chrome/' in ua:
        browser = 'Google Chrome'
    elif 'Firefox/' in ua:
        browser = 'Mozilla Firefox'
    elif 'Safari/' in ua:
        browser = 'Apple Safari'

    os_info = ''
    if 'Windows' in ua:
        os_info = ' (Windows)'
    elif 'Macintosh' in ua or 'Mac OS' in ua:
        os_info = ' (macOS)'
    elif 'Linux' in ua and 'Android' not in ua:
        os_info = ' (Linux)'
    elif 'iPhone' in ua or 'iPad' in ua:
        os_info = ' (iOS)'
    elif 'Android' in ua:
        os_info = ' (Android Web)'

    return f"{browser}{os_info}"


def get_client_ip(request):
    """Extract real client IP address considering reverse proxies / CDNs."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def record_login_attempt(request, user=None, method='PASSWORD', status='SUCCESS', failure_reason='', email_attempted='', reg_no_attempted=''):
    """Centralized, fail-safe login history and audit logger."""
    try:
        client_type = get_client_type(request)
        device_desc = get_device_description(request)
        ip = get_client_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', '')
        UserLoginHistory.objects.create(
            user=user,
            email_attempted=email_attempted or (user.email if user else ''),
            reg_no_attempted=reg_no_attempted or (user.username if user else ''),
            login_method=method,
            client_type=client_type,
            ip_address=ip or None,
            user_agent=ua,
            device_info=device_desc,
            status=status,
            failure_reason=failure_reason
        )
    except Exception as e:
        logger.warning(f"Failed to record login attempt log: {e}")


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
        serializer = self.get_serializer(data=request.data)
        attempted_identifier = str(request.data.get('username', '')).strip()

        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            # Look up matching student for forensic audit log
            matched_user = User.objects.filter(
                models.Q(username__iexact=attempted_identifier) | models.Q(email__iexact=attempted_identifier)
            ).first()
            record_login_attempt(
                request,
                user=matched_user,
                method='PASSWORD',
                status='FAILED',
                failure_reason='INVALID_CREDENTIALS',
                reg_no_attempted=attempted_identifier,
                email_attempted=matched_user.email if matched_user else ''
            )
            if isinstance(e, TokenError):
                raise InvalidToken(e.args[0])
            raise e

        user = serializer.user
        user.last_login_method = 'PASSWORD'
        user.last_login = timezone.now()
        client_type = get_client_type(request)
        device_desc = get_device_description(request)
        new_session_id = uuid.uuid4().hex

        # Dual-Device Session Isolation:
        # Exactly 1 active Web session (30 days) and 1 active Android session (90 days)
        if client_type == 'android':
            user.android_session_id = new_session_id
            user.android_session_device = device_desc
            user.android_session_created_at = timezone.now()
            user.save(update_fields=['last_login_method', 'last_login', 'android_session_id', 'android_session_device', 'android_session_created_at'])

            refresh = RefreshToken.for_user(user)
            refresh_lifetime = getattr(settings, 'ANDROID_REFRESH_TOKEN_LIFETIME', timedelta(days=90))
            refresh.set_exp(lifetime=refresh_lifetime)
            refresh['session_id'] = new_session_id
            refresh['client_type'] = 'android'

            access = refresh.access_token
            access['session_id'] = new_session_id
            access['client_type'] = 'android'

            record_login_attempt(
                request,
                user=user,
                method='PASSWORD',
                status='SUCCESS',
                reg_no_attempted=user.username,
                email_attempted=user.email
            )

            response_data = {
                'refresh': str(refresh),
                'access': str(access),
                'client_type': 'android',
                'session_id': new_session_id,
                'expires_in_days': 90,
                'user': UserListSerializer(user).data,
                'message': 'Successfully logged in to Android app.'
            }
            return Response(response_data, status=status.HTTP_200_OK)

        else:
            # Web session
            user.web_session_id = new_session_id
            user.web_session_device = device_desc
            user.web_session_created_at = timezone.now()
            user.save(update_fields=['last_login_method', 'last_login', 'web_session_id', 'web_session_device', 'web_session_created_at'])

            refresh = RefreshToken.for_user(user)
            refresh_lifetime = getattr(settings, 'SIMPLE_JWT', {}).get('REFRESH_TOKEN_LIFETIME', timedelta(days=30))
            refresh.set_exp(lifetime=refresh_lifetime)
            refresh['session_id'] = new_session_id
            refresh['client_type'] = 'web'

            access = refresh.access_token
            access['session_id'] = new_session_id
            access['client_type'] = 'web'

            record_login_attempt(
                request,
                user=user,
                method='PASSWORD',
                status='SUCCESS',
                reg_no_attempted=user.username,
                email_attempted=user.email
            )

            response_data = {
                'refresh': str(refresh),
                'access': str(access),
                'client_type': 'web',
                'session_id': new_session_id,
                'expires_in_days': 30,
                'user': UserListSerializer(user).data,
                'message': 'Successfully logged in to Web.'
            }
            response = Response(response_data, status=status.HTTP_200_OK)
            set_jwt_cookies(response, str(access), str(refresh))
            return response


def extract_google_user_claims(data):
    """
    Extract email, email_verified, and subject from either Google OAuth tokeninfo or Firebase identitytoolkit payload.
    """
    if not isinstance(data, dict):
        return None

    # 1. Firebase Identity Toolkit response format:
    # {"users": [{"localId": "...", "email": "...", "emailVerified": True, ...}]}
    if 'users' in data and isinstance(data['users'], list) and len(data['users']) > 0:
        u = data['users'][0]
        email = u.get('email', '').strip().lower()
        email_verified = u.get('emailVerified') in [True, 'true', 'True', 1, '1']
        raw_id = u.get('localId')
        for p in u.get('providerUserInfo', []):
            if p.get('rawId'):
                raw_id = p.get('rawId')
                break
        return {
            'email': email,
            'email_verified': email_verified,
            'sub': raw_id,
            'aud': None,
            'source': 'firebase'
        }

    # 2. Google OAuth2 tokeninfo response format:
    # {"email": "...", "email_verified": "true", "sub": "...", "aud": "..."}
    if 'email' in data:
        email = data.get('email', '').strip().lower()
        email_verified = data.get('email_verified') in [True, 'true', 'True', 1, '1']
        sub = data.get('sub')
        aud = data.get('aud')
        return {
            'email': email,
            'email_verified': email_verified,
            'sub': sub,
            'aud': aud,
            'source': 'google_oauth'
        }

    return None


def verify_google_token(credential):
    """
    Verifies a Google OAuth ID token or Firebase ID token against Google/Firebase servers.
    Returns (claims_dict, error_code).
    """
    firebase_key = getattr(settings, 'FIREBASE_API_KEY', '').strip()

    # 1. If Firebase API key is available, check Firebase Identity Toolkit first
    if firebase_key:
        try:
            fb_url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={firebase_key}"
            req_data = json.dumps({"idToken": credential}).encode('utf-8')
            req = urllib.request.Request(
                fb_url,
                data=req_data,
                headers={'Content-Type': 'application/json', 'User-Agent': 'CampXChange-Auth/1.0'}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    resp_data = json.loads(resp.read().decode('utf-8'))
                    claims = extract_google_user_claims(resp_data)
                    if claims and claims.get('email'):
                        return claims, None
        except Exception as e:
            logger.debug(f"Firebase identity lookup did not match (will test tokeninfo): {e}")

    # 2. Fallback to Google OAuth2 tokeninfo endpoint
    try:
        tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"
        req = urllib.request.Request(tokeninfo_url, headers={'User-Agent': 'CampXChange-Auth/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                resp_data = json.loads(resp.read().decode('utf-8'))
                claims = extract_google_user_claims(resp_data)
                if claims and claims.get('email'):
                    return claims, None
                return None, 'INVALID_TOKEN'
            return None, 'INVALID_TOKEN'
    except Exception as e:
        logger.warning(f"Google tokeninfo verification failed: {e}")
        return None, 'TOKEN_VERIFY_ERROR'


class GoogleLoginView(APIView):
    """
    Authenticate a student via Google OAuth ID token or Firebase Auth ID token.
    STRICT POLICY: Account must already be registered and email verified on CampXChange.
    New users cannot auto-register through Google.
    """
    permission_classes = (AllowAny,)
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        credential = request.data.get('credential')
        client_type = get_client_type(request)
        device_desc = get_device_description(request)

        if not credential or not str(credential).strip():
            return Response(
                {'error': 'Google authentication credential is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Verify token with Firebase Identity Toolkit or Google OAuth tokeninfo
        claims, err_code = verify_google_token(credential)
        if not claims:
            fail_reason = 'INVALID_TOKEN' if err_code == 'INVALID_TOKEN' else 'TOKEN_VERIFY_ERROR'
            record_login_attempt(request, method='GOOGLE', status='FAILED', failure_reason=fail_reason)
            err_msg = 'Invalid or expired Google token.' if fail_reason == 'INVALID_TOKEN' else 'Unable to verify Google token with Google servers. Please try again.'
            return Response({'error': err_msg}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Extract and validate claims
        google_email = claims.get('email', '').strip().lower()
        email_verified = claims.get('email_verified')
        google_sub = claims.get('sub')

        if not google_email:
            record_login_attempt(request, method='GOOGLE', status='FAILED', failure_reason='NO_EMAIL_IN_TOKEN')
            return Response({'error': 'Google account did not provide a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)

        if not email_verified:
            record_login_attempt(request, method='GOOGLE', status='FAILED', failure_reason='EMAIL_NOT_VERIFIED_BY_GOOGLE', email_attempted=google_email)
            return Response({'error': 'Your Google account email is not verified by Google.'}, status=status.HTTP_400_BAD_REQUEST)

        # Audience validation if configured in environment and present in token
        configured_client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '').strip()
        if configured_client_id and claims.get('aud'):
            if claims.get('aud') != configured_client_id:
                logger.warning(f"Google aud mismatch: expected '{configured_client_id}', got '{claims.get('aud')}'")
                record_login_attempt(request, method='GOOGLE', status='FAILED', failure_reason='AUDIENCE_MISMATCH', email_attempted=google_email)
                return Response({'error': 'Google authentication client ID mismatch.'}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Lookup existing student in database by verified college email
        user = User.objects.filter(email__iexact=google_email).first()

        # STRICT REQUIREMENT: Only registered & verified accounts may log in!
        if not user:
            record_login_attempt(
                request,
                user=None,
                method='GOOGLE',
                status='FAILED',
                failure_reason='UNREGISTERED_EMAIL',
                email_attempted=google_email
            )
            return Response({
                'error': f'The email {google_email} is not registered on CampXChange. Please register your student account first.',
                'code': 'NOT_REGISTERED',
                'email': google_email
            }, status=status.HTTP_404_NOT_FOUND)

        # Suspended account check
        if not user.is_active:
            record_login_attempt(
                request,
                user=user,
                method='GOOGLE',
                status='FAILED',
                failure_reason='ACCOUNT_SUSPENDED',
                email_attempted=google_email,
                reg_no_attempted=user.username
            )
            return Response({
                'error': 'This student account has been suspended. Please contact campus administration.',
                'code': 'ACCOUNT_SUSPENDED'
            }, status=status.HTTP_403_FORBIDDEN)

        # 4. Successful login
        new_session_id = uuid.uuid4().hex
        user.last_login_method = 'GOOGLE'
        user.last_login = timezone.now()

        update_fields = ['last_login_method', 'last_login']
        if google_sub and not user.google_id:
            user.google_id = str(google_sub)
            update_fields.append('google_id')

        if client_type == 'android':
            user.android_session_id = new_session_id
            user.android_session_device = device_desc
            user.android_session_created_at = timezone.now()
            update_fields.extend(['android_session_id', 'android_session_device', 'android_session_created_at'])
            user.save(update_fields=update_fields)

            refresh = RefreshToken.for_user(user)
            refresh_lifetime = getattr(settings, 'ANDROID_REFRESH_TOKEN_LIFETIME', timedelta(days=90))
            refresh.set_exp(lifetime=refresh_lifetime)
            refresh['session_id'] = new_session_id
            refresh['client_type'] = 'android'

            access = refresh.access_token
            access['session_id'] = new_session_id
            access['client_type'] = 'android'

            record_login_attempt(
                request,
                user=user,
                method='GOOGLE',
                status='SUCCESS',
                email_attempted=google_email,
                reg_no_attempted=user.username
            )

            response_data = {
                'refresh': str(refresh),
                'access': str(access),
                'client_type': 'android',
                'session_id': new_session_id,
                'expires_in_days': 90,
                'user': UserListSerializer(user).data,
                'message': f'Welcome back, {user.full_name or user.username}!'
            }
            return Response(response_data, status=status.HTTP_200_OK)

        else:
            # Web session
            user.web_session_id = new_session_id
            user.web_session_device = device_desc
            user.web_session_created_at = timezone.now()
            update_fields.extend(['web_session_id', 'web_session_device', 'web_session_created_at'])
            user.save(update_fields=update_fields)

            refresh = RefreshToken.for_user(user)
            refresh_lifetime = getattr(settings, 'SIMPLE_JWT', {}).get('REFRESH_TOKEN_LIFETIME', timedelta(days=30))
            refresh.set_exp(lifetime=refresh_lifetime)
            refresh['session_id'] = new_session_id
            refresh['client_type'] = 'web'

            access = refresh.access_token
            access['session_id'] = new_session_id
            access['client_type'] = 'web'

            record_login_attempt(
                request,
                user=user,
                method='GOOGLE',
                status='SUCCESS',
                email_attempted=google_email,
                reg_no_attempted=user.username
            )

            response_data = {
                'refresh': str(refresh),
                'access': str(access),
                'client_type': 'web',
                'session_id': new_session_id,
                'expires_in_days': 30,
                'user': UserListSerializer(user).data,
                'message': f'Welcome back, {user.full_name or user.username}!'
            }
            response = Response(response_data, status=status.HTTP_200_OK)
            set_jwt_cookies(response, str(access), str(refresh))
            return response

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_cookie_name = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE_REFRESH', 'refresh_token')
        if not request.data.get('refresh') and request.COOKIES.get(refresh_cookie_name):
            from rest_framework.authentication import SessionAuthentication
            SessionAuthentication().enforce_csrf(request)
        
        raw_refresh = request.data.get('refresh') or request.COOKIES.get(refresh_cookie_name)
        if not raw_refresh:
            return Response({'error': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(raw_refresh)
            user_id = token.payload.get('user_id')
            token_session_id = token.payload.get('session_id')
            client_type = token.payload.get('client_type', 'web')

            user = User.objects.get(id=user_id)

            from .session_security import require_active_session
            require_active_session(user, token.payload)

            # Issue fresh access token carrying session claims
            access_token = token.access_token
            if token_session_id:
                access_token['session_id'] = token_session_id
                access_token['client_type'] = client_type

            response_data = {
                'access': str(access_token),
                'message': 'Token refreshed successfully.'
            }

            # If token rotation is active, rotate refresh token while maintaining session claims
            if getattr(settings, 'SIMPLE_JWT', {}).get('ROTATE_REFRESH_TOKENS', False):
                token.set_jti()
                # Preserve the original session expiry instead of extending it forever.
                if token_session_id:
                    token['session_id'] = token_session_id
                    token['client_type'] = client_type
                response_data['refresh'] = str(token)

            response = Response(response_data, status=status.HTTP_200_OK)
            set_jwt_cookies(response, str(access_token), response_data.get('refresh'))
            return response

        except Exception as e:
            return Response({'error': 'Invalid or expired session. Please sign in again.', 'session_invalidated': True}, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        response = Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)
        access_cookie_name = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE', 'access_token')
        refresh_cookie_name = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE_REFRESH', 'refresh_token')
        
        client_type = get_client_type(request)

        # Clear session for caller platform only (Web does not log out Android and vice-versa)
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            try:
                if client_type == 'android':
                    user.android_session_id = ''
                    user.android_session_device = ''
                    user.save(update_fields=['android_session_id', 'android_session_device'])
                else:
                    user.web_session_id = ''
                    user.web_session_device = ''
                    user.save(update_fields=['web_session_id', 'web_session_device'])
            except Exception:
                pass

        # Blacklist the refresh token server-side if provided
        refresh_token = request.COOKIES.get(refresh_cookie_name) or request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        
        response.delete_cookie(access_cookie_name)
        response.delete_cookie(refresh_cookie_name)
        return response


class UserActiveSessionsView(APIView):
    """Returns active session status for Web (30d) and Android (90d)."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        user = request.user
        return Response({
            'web': {
                'is_active': bool(user.web_session_id),
                'device': user.web_session_device or 'Web Browser',
                'logged_in_at': user.web_session_created_at,
                'lifetime_days': 30
            },
            'android': {
                'is_active': bool(user.android_session_id),
                'device': user.android_session_device or 'CampXChange Android App',
                'logged_in_at': user.android_session_created_at,
                'lifetime_days': 90
            }
        })


class RevokeSessionView(APIView):
    """Allows remote termination of either Web or Android session."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        target = str(request.data.get('target', '')).strip().lower()
        user = request.user
        if target == 'android':
            user.android_session_id = ''
            user.android_session_device = ''
            user.save(update_fields=['android_session_id', 'android_session_device'])
            return Response({'message': 'Android session terminated successfully.'})
        elif target == 'web':
            user.web_session_id = ''
            user.web_session_device = ''
            user.save(update_fields=['web_session_id', 'web_session_device'])
            return Response({'message': 'Web session terminated successfully.'})
        else:
            return Response({'error': "Invalid target. Specify 'web' or 'android'."}, status=status.HTTP_400_BAD_REQUEST)

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
            serializer = SendOTPSerializer(data=request.data, context={'request': request})
            if not serializer.is_valid():
                first_err = None
                for field, err_list in serializer.errors.items():
                    if isinstance(err_list, list) and len(err_list) > 0:
                        first_err = str(err_list[0])
                        break
                    elif isinstance(err_list, str):
                        first_err = err_list
                        break
                return Response(
                    {"error": first_err or "Invalid input provided.", "details": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            email = serializer.validated_data['email']
            otp = str(random.randint(100000, 999999))
            
            # Data Security Layer: Encrypt OTP before persisting to database
            from server.crypto import encrypt_data
            encrypted_otp = encrypt_data(otp)

            OTPVerification.objects.update_or_create(
                email=email,
                defaults={'otp': encrypted_otp, 'is_verified': False, 'created_at': timezone.now(), 'attempts': 0}
            )
            
            # Send verification email via Resend HTML email service
            mail_result = send_otp_email(email, otp)
            if not mail_result.get('success', False) and not mail_result.get('mock', False):
                logger.warning(f"Failed to send OTP email to {email}: {mail_result.get('error')}")
                if not settings.DEBUG and getattr(settings, 'RESEND_API_KEY', None):
                    return Response(
                        {"error": "Failed to send verification email. Please check your address or try again later."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

            logger.info(f'OTP generated and sent for {email}')
            if settings.DEBUG:
                print(f"\n=========================================\n[CAMPXCHANGE OTP FOR {email}]: {otp}\n=========================================\n")
                logger.debug(f'[DEV ONLY] OTP for {email}: {otp}')
            
            return Response({"message": "Verification code sent to your email successfully."})
        except Exception as e:
            logger.exception(f"Unexpected error in SendOTPView: {e}")
            return Response(
                {"error": f"Failed to send OTP: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ForgotPasswordRequestView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        try:
            serializer = ForgotPasswordRequestSerializer(data=request.data)
            if not serializer.is_valid():
                errors = serializer.errors
                if 'non_field_errors' in errors and len(errors['non_field_errors']) > 0:
                    err_msg = errors['non_field_errors'][0]
                elif 'reg_no' in errors:
                    err_msg = errors['reg_no'][0]
                elif 'email' in errors:
                    err_msg = errors['email'][0]
                else:
                    err_msg = "Invalid registration number or email address."
                return Response({"error": err_msg}, status=status.HTTP_400_BAD_REQUEST)

            user = serializer.validated_data['user']
            clean_reg = serializer.validated_data['reg_no']
            clean_email = serializer.validated_data['email']

            # Invalidate previous unused password reset OTPs for this user
            PasswordResetOTP.objects.filter(
                models.Q(email__iexact=clean_email) | models.Q(reg_no__iexact=clean_reg),
                is_verified=False
            ).delete()

            # Generate 6-digit numeric OTP
            import secrets
            otp = f"{secrets.randbelow(900000) + 100000}"

            # Encrypt OTP before storing in database
            from server.crypto import encrypt_data
            encrypted_otp = encrypt_data(otp)

            PasswordResetOTP.objects.create(
                user=user,
                email=clean_email,
                reg_no=clean_reg,
                otp=encrypted_otp,
                is_verified=False,
                attempts=0
            )

            # Send OTP email via Resend
            name_to_greet = user.full_name or user.first_name or user.username
            mail_res = send_password_reset_otp_email(clean_email, otp, name_to_greet)

            if not mail_res.get('success', False) and not mail_res.get('mock', False):
                logger.warning(f"Resend password reset OTP delivery issue for {clean_email}: {mail_res.get('error')}")
                if not settings.DEBUG and getattr(settings, 'RESEND_API_KEY', None):
                    return Response(
                        {"error": "Failed to deliver verification code email. Please try again in a moment."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

            if settings.DEBUG:
                print(f"\n=========================================\n[PASSWORD RESET OTP FOR {clean_reg} ({clean_email})]: {otp}\n=========================================\n")

            return Response({
                "message": f"A 6-digit verification code has been sent to {clean_email}.",
                "email": clean_email,
                "reg_no": clean_reg
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Unexpected error in ForgotPasswordRequestView: {e}")
            return Response(
                {"error": "An unexpected error occurred while processing your request."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ForgotPasswordResetView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        try:
            serializer = ForgotPasswordResetSerializer(data=request.data)
            if not serializer.is_valid():
                errors = serializer.errors
                if 'non_field_errors' in errors and len(errors['non_field_errors']) > 0:
                    err_msg = errors['non_field_errors'][0]
                elif 'otp' in errors:
                    err_msg = errors['otp'][0]
                elif 'password' in errors:
                    err_msg = errors['password'][0]
                elif 'password_confirm' in errors:
                    err_msg = errors['password_confirm'][0]
                else:
                    err_msg = "Invalid data provided for password reset."
                return Response({"error": err_msg}, status=status.HTTP_400_BAD_REQUEST)

            user = serializer.validated_data['user']
            reset_otp_obj = serializer.validated_data['reset_otp_obj']
            new_password = serializer.validated_data['password']

            # Update user password using Django's secure hasher
            user.set_password(new_password)
            from .session_security import revoke_user_sessions
            revoke_user_sessions(user)
            user.save()

            # Mark OTP as verified and clean up used OTPs
            reset_otp_obj.is_verified = True
            reset_otp_obj.save(update_fields=['is_verified'])
            PasswordResetOTP.objects.filter(
                models.Q(email__iexact=user.email) | models.Q(reg_no__iexact=user.username)
            ).delete()

            logger.info(f"Password successfully reset with OTP for user {user.username} ({user.email})")

            return Response({
                "message": "Your password has been reset successfully! You can now log in with your registration number and new password."
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Unexpected error in ForgotPasswordResetView: {e}")
            return Response(
                {"error": "Failed to reset password. Please request a new verification code."},
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
    permission_classes = (HasAdminModulePermission('students'),)
    serializer_class = UserListSerializer

class UserAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    # This view is for the admin dashboard to inspect/manage/delete a specific user with full ID card
    # Staff accounts are managed exclusively by the super-admin team endpoints.
    queryset = User.objects.filter(is_staff=False, is_superuser=False)
    permission_classes = (HasAdminModulePermission('students'),)

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

    def perform_update(self, serializer):
        from marketplace.cloudinary_upload import upload_user_image_to_cloudinary
        raw_photo = serializer.validated_data.get('profile_photo', None) or serializer.validated_data.get('profile_picture_url', None)
        if raw_photo:
            uploaded_photo = upload_user_image_to_cloudinary(raw_photo, folder="campxchange/profiles")
            serializer.validated_data['profile_photo'] = uploaded_photo
            serializer.validated_data['profile_picture_url'] = uploaded_photo

        user = serializer.save()
        try:
            user.trust_score = user.calculate_trust_score()
            user.save(update_fields=['trust_score'])
        except Exception as e:
            logger.warning(f"Error recalculating trust score for {user.username}: {e}")

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
            is_admin = request.user.is_staff or request.user.is_superuser
            admin_role = request.user.effective_admin_role if is_admin else None
            admin_permissions = request.user.effective_admin_permissions if is_admin else []
            return Response({
                "isAuthenticated": True,
                "is_staff": request.user.is_staff,
                "is_superuser": request.user.is_superuser,
                "role": getattr(request.user, 'role', 'BUYER'),
                "admin_role": admin_role,
                "admin_permissions": admin_permissions,
                "username": request.user.username,
                "user": user_data
            })
        return Response({"isAuthenticated": False, "user": None, "role": None, "admin_role": None, "admin_permissions": []})

class CompleteIdVerificationView(APIView):
    permission_classes = (IsAuthenticated,)
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'signup'

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
                {"error": "A valid student ID card photo is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        clean_user_reg = str(user.username).strip().lstrip('@')
        clean_input_reg = str(reg_no).strip().lstrip('@')

        if clean_user_reg != clean_input_reg:
            return Response(
                {"error": f"Registration number mismatch. Your account is registered with '{user.username}', but '{reg_no}' was submitted."},
                status=status.HTTP_400_BAD_REQUEST
            )

        from marketplace.cloudinary_upload import upload_user_image_to_cloudinary

        from .identity_verification import require_verified_identity
        verified_data = require_verified_identity(id_card_image, user.username, user.full_name)

        cloudinary_id_card = upload_user_image_to_cloudinary(
            id_card_image, folder="campxchange/id_cards"
        )

        user.is_id_verified = True
        user.role = 'SELLER'
        user.id_card_image = cloudinary_id_card
        user.id_card_data = verified_data
        profile_photo = request.data.get('profile_photo', None) or request.data.get('profile_picture_url', None)
        if profile_photo:
            uploaded_photo = upload_user_image_to_cloudinary(profile_photo, folder="campxchange/profiles")
            user.profile_photo = uploaded_photo
            user.profile_picture_url = uploaded_photo
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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'signup'

    def post(self, request):
        user = request.user

        # 0. Check if user is already a Verified Seller
        if user.role == 'SELLER':
            return Response(
                {"error": "Your account is already a Verified Seller."},
                status=status.HTTP_400_BAD_REQUEST
            )

        reg_no = str(request.data.get('reg_no', '')).strip() or user.username
        id_card_image = request.data.get('id_card_image', None)
        id_card_data = request.data.get('id_card_data', {})
        profile_photo = request.data.get('profile_photo', None)
        otp = str(request.data.get('otp', '')).strip()

        # 1. Match registration number against account (ignore leading @)
        clean_user_reg = str(user.username).strip().lstrip('@')
        clean_input_reg = str(reg_no).strip().lstrip('@')

        if clean_user_reg != clean_input_reg:
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

        record = OTPVerification.objects.filter(email__iexact=user.email).order_by('-created_at').first()
        if not record:
            return Response(
                {"error": "No verification code was sent to this email. Please request a code first."},
                status=status.HTTP_400_BAD_REQUEST
            )

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

        # 5. Upload student ID and profile photo to Cloudinary in .webp format
        from marketplace.cloudinary_upload import upload_user_image_to_cloudinary

        from .identity_verification import require_verified_identity
        verified_data = require_verified_identity(id_card_image, user.username, user.full_name)

        cloudinary_id_card = upload_user_image_to_cloudinary(
            id_card_image, folder="campxchange/id_cards"
        )
        cloudinary_profile_photo = upload_user_image_to_cloudinary(
            profile_photo, folder="campxchange/profiles"
        )

        # 6. Successfully upgrade Buyer to Verified Seller
        user.is_id_verified = True
        user.role = 'SELLER'
        user.id_card_image = cloudinary_id_card
        user.id_card_data = verified_data
        user.profile_photo = cloudinary_profile_photo
        user.profile_picture_url = cloudinary_profile_photo
        user.trust_score = user.calculate_trust_score()
        user.save()

        # Invalidate OTP record so it cannot be reused
        record.delete()

        logger.info(f"User {user.username} successfully upgraded from BUYER to SELLER via UpgradeToSellerView.")
        return Response({
            "message": "Congratulations! Your account has been upgraded to Verified Seller.",
            "user": UserListSerializer(user).data
        }, status=status.HTTP_200_OK)


class VerifyIdCardAIView(APIView):
    """
    Endpoint for AI-powered verification of Student ID Cards using Google Gemini Vision.
    Accessible to both registering students and existing buyers upgrading to seller.
    """
    permission_classes = (AllowAny,)
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'signup'

    def post(self, request):
        image = request.data.get('image')
        reg_no = str(request.data.get('reg_no', '') or request.data.get('username', '')).strip()
        full_name = str(request.data.get('full_name', '')).strip()
        university = str(request.data.get('university', 'Lovely Professional University')).strip()

        if not image or not isinstance(image, str) or len(image) < 100:
            return Response(
                {"success": False, "is_valid": False, "reason": "A valid ID card photo is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not reg_no:
            return Response(
                {"success": False, "is_valid": False, "reason": "Registration number is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .identity_verification import verification_result
        result = verification_result(image, reg_no, full_name)

        return Response(result, status=status.HTTP_200_OK)


class AdminStaffListView(APIView):
    permission_classes = (HasAdminModulePermission('team'),)

    def get(self, request):
        from django.db.models import Q
        staff_users = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).order_by('-is_superuser', 'username')
        serializer = StaffUserSerializer(staff_users, many=True)

        total = staff_users.count()
        super_admins = sum(1 for u in staff_users if u.effective_admin_role == 'SUPER_ADMIN')
        moderators = sum(1 for u in staff_users if u.effective_admin_role == 'MODERATOR')
        id_verifiers = sum(1 for u in staff_users if u.effective_admin_role == 'ID_VERIFIER')

        return Response({
            'staff': serializer.data,
            'stats': {
                'total_staff': total,
                'super_admins': super_admins,
                'moderators': moderators,
                'id_verifiers': id_verifiers,
            },
            'available_permissions': ADMIN_PERMISSIONS_CATALOG
        })

    def post(self, request):
        if not (request.user.is_superuser or request.user.effective_admin_role == 'SUPER_ADMIN'):
            return Response({'error': 'Only Super Administrators can appoint or promote staff members.'}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get('user_id')
        username = str(request.data.get('username', '')).strip()
        target_role = request.data.get('admin_role', 'MODERATOR')
        raw_permissions = request.data.get('admin_permissions', None)
        if hasattr(request.data, 'getlist') and len(request.data.getlist('admin_permissions')) > 1:
            raw_permissions = request.data.getlist('admin_permissions')
        if isinstance(raw_permissions, str):
            import json
            try:
                raw_permissions = json.loads(raw_permissions)
            except Exception:
                raw_permissions = [p.strip() for p in raw_permissions.split(',') if p.strip()]

        if target_role not in ['SUPER_ADMIN', 'MODERATOR', 'ID_VERIFIER']:
            return Response({'error': 'Invalid admin role specified.'}, status=status.HTTP_400_BAD_REQUEST)

        target_user = None
        if user_id:
            target_user = User.objects.filter(pk=user_id).first()
        elif username:
            target_user = User.objects.filter(username__iexact=username).first()

        if not target_user:
            return Response({'error': 'Target student user not found.'}, status=status.HTTP_404_NOT_FOUND)

        target_user.is_staff = True
        target_user.admin_role = target_role
        if raw_permissions is not None and isinstance(raw_permissions, (list, tuple)):
            target_user.admin_permissions = [p for p in raw_permissions if p in ALL_PERMISSION_KEYS]
        else:
            target_user.admin_permissions = []
        target_user.save(update_fields=['is_staff', 'admin_role', 'admin_permissions'])

        try:
            from marketplace.views import log_admin_action
            log_admin_action(
                request,
                action='STAFF_PROMOTE',
                target_type='USER',
                target_id=target_user.id,
                target_repr=f"@{target_user.username} ({target_user.full_name or target_user.username})",
                details={
                    'assigned_role': target_role,
                    'permissions': target_user.effective_admin_permissions
                }
            )
        except Exception:
            pass

        return Response({
            'message': f"Successfully promoted @{target_user.username} to {target_role}.",
            'staff': StaffUserSerializer(target_user).data
        }, status=status.HTTP_201_CREATED)


class AdminStaffDetailView(APIView):
    permission_classes = (HasAdminModulePermission('team'),)

    def patch(self, request, pk):
        if not (request.user.is_superuser or request.user.effective_admin_role == 'SUPER_ADMIN'):
            return Response({'error': 'Only Super Administrators can modify staff roles and permissions.'}, status=status.HTTP_403_FORBIDDEN)

        target_user = User.objects.filter(pk=pk).first()
        if not target_user:
            return Response({'error': 'Staff member not found.'}, status=status.HTTP_404_NOT_FOUND)

        update_fields = []
        details = {}

        if 'admin_role' in request.data:
            new_role = request.data.get('admin_role')
            if new_role not in ['SUPER_ADMIN', 'MODERATOR', 'ID_VERIFIER']:
                return Response({'error': 'Invalid admin role.'}, status=status.HTTP_400_BAD_REQUEST)
            details['old_role'] = target_user.effective_admin_role
            details['new_role'] = new_role
            target_user.admin_role = new_role
            update_fields.append('admin_role')

        if 'admin_permissions' in request.data:
            if hasattr(request.data, 'getlist') and len(request.data.getlist('admin_permissions')) > 1:
                raw_perms = request.data.getlist('admin_permissions')
            else:
                raw_perms = request.data.get('admin_permissions')
            if isinstance(raw_perms, str):
                import json
                try:
                    raw_perms = json.loads(raw_perms)
                except Exception:
                    raw_perms = [p.strip() for p in raw_perms.split(',') if p.strip()]
            if isinstance(raw_perms, (list, tuple)):
                clean_perms = [p for p in raw_perms if p in ALL_PERMISSION_KEYS]
                details['permissions_updated'] = clean_perms
                target_user.admin_permissions = clean_perms
                update_fields.append('admin_permissions')

        if update_fields:
            target_user.save(update_fields=update_fields)

        try:
            from marketplace.views import log_admin_action
            log_admin_action(
                request,
                action='STAFF_ROLE_CHANGE',
                target_type='USER',
                target_id=target_user.id,
                target_repr=f"@{target_user.username} ({target_user.full_name or target_user.username})",
                details=details
            )
        except Exception:
            pass

        return Response({
            'message': f"Updated permissions and role for @{target_user.username}.",
            'staff': StaffUserSerializer(target_user).data
        })

    def delete(self, request, pk):
        if not (request.user.is_superuser or request.user.effective_admin_role == 'SUPER_ADMIN'):
            return Response({'error': 'Only Super Administrators can revoke staff access.'}, status=status.HTTP_403_FORBIDDEN)

        target_user = User.objects.filter(pk=pk).first()
        if not target_user:
            return Response({'error': 'Staff member not found.'}, status=status.HTTP_404_NOT_FOUND)

        if target_user.id == request.user.id:
            return Response({'error': 'You cannot revoke your own staff privileges.'}, status=status.HTTP_400_BAD_REQUEST)

        previous_role = target_user.effective_admin_role
        target_user.is_staff = False
        target_user.save(update_fields=['is_staff'])

        try:
            from marketplace.views import log_admin_action
            log_admin_action(
                request,
                action='STAFF_REVOKE',
                target_type='USER',
                target_id=target_user.id,
                target_repr=f"@{target_user.username} ({target_user.full_name or target_user.username})",
                details={'previous_role': previous_role}
            )
        except Exception:
            pass

        return Response({'message': f"Revoked staff privileges for @{target_user.username}."})


class UserLoginHistoryView(APIView):
    """
    Retrieve audit history of login attempts for a specific student.
    Accessible to administrators with 'students' permission.
    """
    permission_classes = (HasAdminModulePermission('students'),)

    def get(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        logs = UserLoginHistory.objects.filter(
            models.Q(user=target_user) | models.Q(email_attempted=target_user.email) | models.Q(reg_no_attempted=target_user.username)
        ).order_by('-created_at')[:30]

        serializer = UserLoginHistorySerializer(logs, many=True)
        return Response({
            'user_id': str(target_user.id),
            'username': target_user.username,
            'full_name': target_user.full_name,
            'last_login_method': target_user.last_login_method,
            'last_login': target_user.last_login,
            'is_google_linked': bool(target_user.google_id),
            'logs': serializer.data
        }, status=status.HTTP_200_OK)


class AdminLoginLogsView(APIView):
    """
    Global immutable audit log stream of student login sessions.
    Allows filtering by method (GOOGLE vs PASSWORD), status (SUCCESS vs FAILED), and text search.
    """
    permission_classes = (HasAdminModulePermission('students'),)

    def get(self, request):
        qs = UserLoginHistory.objects.select_related('user').all()

        method = request.query_params.get('method')
        if method in ['PASSWORD', 'GOOGLE']:
            qs = qs.filter(login_method=method)

        log_status = request.query_params.get('status')
        if log_status in ['SUCCESS', 'FAILED']:
            qs = qs.filter(status=log_status)

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                models.Q(email_attempted__icontains=search) |
                models.Q(reg_no_attempted__icontains=search) |
                models.Q(user__username__icontains=search) |
                models.Q(user__email__icontains=search) |
                models.Q(user__full_name__icontains=search) |
                models.Q(ip_address__icontains=search)
            )

        total_count = qs.count()
        recent_logs = qs.order_by('-created_at')[:100]
        serializer = UserLoginHistorySerializer(recent_logs, many=True)

        google_success = UserLoginHistory.objects.filter(login_method='GOOGLE', status='SUCCESS').count()
        password_success = UserLoginHistory.objects.filter(login_method='PASSWORD', status='SUCCESS').count()
        total_failed = UserLoginHistory.objects.filter(status='FAILED').count()

        return Response({
            'total_count': total_count,
            'google_logins_count': google_success,
            'password_logins_count': password_success,
            'failed_logins_count': total_failed,
            'logs': serializer.data
        }, status=status.HTTP_200_OK)
