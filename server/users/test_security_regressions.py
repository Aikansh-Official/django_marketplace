from types import SimpleNamespace
from django.test import SimpleTestCase
from users.permissions import IsSuperAdminUser
from users.serializers import AdminUserUpdateSerializer
from users.views import UserAdminDetailView
from users.session_security import require_active_session, revoke_user_sessions
from rest_framework.exceptions import AuthenticationFailed
from unittest.mock import patch
from django.test import RequestFactory
from django.middleware.csrf import get_token
from rest_framework.exceptions import PermissionDenied
from users.authentication import CookieJWTAuthentication
from users.identity_verification import require_verified_identity
from rest_framework.exceptions import ValidationError, APIException


class StudentAdministrationSecurityTests(SimpleTestCase):
    def test_student_editor_cannot_assign_staff_authority(self):
        serializer = AdminUserUpdateSerializer(data={
            'admin_role': 'SUPER_ADMIN', 'admin_permissions': ['team'],
        }, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn('admin_role', serializer.validated_data)
        self.assertNotIn('admin_permissions', serializer.validated_data)

    def test_super_admin_role_requires_staff_membership(self):
        user = SimpleNamespace(is_authenticated=True, is_active=True,
                               is_staff=False, is_superuser=False,
                               effective_admin_role='SUPER_ADMIN')
        permission = IsSuperAdminUser()
        self.assertFalse(permission.has_permission(SimpleNamespace(user=user), None))
        user.is_staff = True
        self.assertTrue(permission.has_permission(SimpleNamespace(user=user), None))
        user.is_active = False
        self.assertFalse(permission.has_permission(SimpleNamespace(user=user), None))

    def test_student_endpoint_excludes_staff_accounts(self):
        filters = {clause.lhs.target.name: clause.rhs
                   for clause in UserAdminDetailView.queryset.query.where.children}
        self.assertIs(filters['is_staff'], False)
        self.assertIs(filters['is_superuser'], False)


class SessionSecurityTests(SimpleTestCase):
    def test_valid_web_and_android_sessions(self):
        user = SimpleNamespace(is_active=True, web_session_id='web-id', android_session_id='app-id')
        for platform, session in [('web', 'web-id'), ('android', 'app-id')]:
            require_active_session(user, {'client_type': platform, 'session_id': session})

    def test_missing_cross_platform_and_revoked_claims_are_rejected(self):
        user = SimpleNamespace(is_active=True, web_session_id='web-id', android_session_id='app-id')
        for claims in ({}, {'client_type': 'web'}, {'client_type': 'other', 'session_id': 'web-id'},
                       {'client_type': 'android', 'session_id': 'web-id'}):
            with self.assertRaises(AuthenticationFailed):
                require_active_session(user, claims)
        revoke_user_sessions(user)
        with self.assertRaises(AuthenticationFailed):
            require_active_session(user, {'client_type': 'web', 'session_id': 'web-id'})


    def test_suspended_user_is_rejected(self):
        user = SimpleNamespace(is_active=False, web_session_id='web-id')
        with self.assertRaises(AuthenticationFailed):
            require_active_session(user, {'client_type': 'web', 'session_id': 'web-id'})


class CookieCsrfSecurityTests(SimpleTestCase):
    def authenticate_request(self, request):
        user = SimpleNamespace(is_active=True, web_session_id='valid-session')
        auth = CookieJWTAuthentication()
        with patch.object(auth, 'get_validated_token', return_value={
            'client_type': 'web', 'session_id': 'valid-session',
        }), patch.object(auth, 'get_user', return_value=user):
            return auth.authenticate(request)

    def test_cookie_write_requires_csrf(self):
        request = RequestFactory().post('/api/auth/profile/')
        request.COOKIES['access_token'] = 'token'
        with self.assertRaises(PermissionDenied):
            self.authenticate_request(request)

    def test_cookie_write_accepts_matching_csrf_token(self):
        request = RequestFactory().post('/api/auth/profile/')
        request.COOKIES['access_token'] = 'token'
        request.META['HTTP_X_CSRFTOKEN'] = get_token(request)
        request.COOKIES['csrftoken'] = request.META['CSRF_COOKIE']
        self.assertIsNotNone(self.authenticate_request(request))


    def test_bearer_write_does_not_require_cookie_csrf(self):
        request = RequestFactory().post('/api/auth/profile/', HTTP_AUTHORIZATION='Bearer token')
        self.assertIsNotNone(self.authenticate_request(request))



class IdentitySecurityTests(SimpleTestCase):
    def test_forged_or_mismatched_identity_rejected(self):
        for result in ({'success': True, 'is_valid': False},
                       {'success': True, 'is_valid': True, 'extracted_reg_no': '99999999'}):
            with patch('users.identity_verification.verification_result', return_value=result):
                with self.assertRaises(ValidationError):
                    require_verified_identity('image', '12345678', 'Test Student')

    def test_service_failure_never_grants_seller_authority(self):
        with patch('users.identity_verification.verification_result', return_value={'success': False}):
            with self.assertRaises(APIException) as error:
                require_verified_identity('image', '12345678', 'Test Student')
            self.assertEqual(error.exception.status_code, 503)

    def test_matching_server_result_is_accepted(self):
        result = {'success': True, 'is_valid': True, 'extracted_reg_no': '12345678'}
        with patch('users.identity_verification.verification_result', return_value=result):
            self.assertEqual(require_verified_identity('image', '12345678', 'Test Student')['extracted_reg_no'], '12345678')

