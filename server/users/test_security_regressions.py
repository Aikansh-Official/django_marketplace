from types import SimpleNamespace
from django.test import SimpleTestCase
from users.permissions import IsSuperAdminUser
from users.serializers import AdminUserUpdateSerializer
from users.views import UserAdminDetailView
from users.session_security import require_active_session, revoke_user_sessions
from rest_framework.exceptions import AuthenticationFailed


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
