from types import SimpleNamespace
from django.test import SimpleTestCase
from users.permissions import IsSuperAdminUser
from users.serializers import AdminUserUpdateSerializer
from users.views import UserAdminDetailView


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
