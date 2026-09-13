from rest_framework import permissions


def HasAdminModulePermission(module_key):
    """
    Factory function returning a DRF Permission class that checks if the
    authenticated staff user has the specific module permission granted.
    Super Admins automatically pass all checks.
    """
    class _ModulePermission(permissions.BasePermission):
        message = f"Access denied. Missing '{module_key}' administrative permission."

        def has_permission(self, request, view):
            user = request.user
            if not (user and user.is_authenticated and (user.is_staff or user.is_superuser)):
                return False
            return user.has_admin_permission(module_key)

    _ModulePermission.__name__ = f"Has_{module_key}_Permission"
    return _ModulePermission


class IsSuperAdminUser(permissions.BasePermission):
    """
    Allows access only to Super Administrators.
    """
    message = "Only Super Administrators can perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or user.effective_admin_role == 'SUPER_ADMIN'))
