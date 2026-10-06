from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, UserLoginHistory

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['username', 'email', 'last_login_method', 'is_verified_student', 'college_domain', 'trust_score', 'last_login', 'is_staff']
    list_filter = ['last_login_method', 'is_verified_student', 'role', 'is_staff', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('CampXChange Student Info', {
            'fields': ('last_login_method', 'google_id', 'is_verified_student', 'college_domain', 'trust_score', 'profile_picture_url')
        }),
    )

class UserLoginHistoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_identifier', 'login_method', 'client_type', 'ip_address', 'device_info', 'status', 'failure_reason', 'created_at']
    list_filter = ['login_method', 'status', 'client_type', 'created_at']
    search_fields = ['user__username', 'user__email', 'email_attempted', 'reg_no_attempted', 'ip_address']
    readonly_fields = [
        'user', 'email_attempted', 'reg_no_attempted', 'login_method',
        'client_type', 'ip_address', 'user_agent', 'device_info',
        'status', 'failure_reason', 'created_at'
    ]

    def get_identifier(self, obj):
        if obj.user:
            return f"@{obj.user.username} ({obj.user.email})"
        return obj.email_attempted or obj.reg_no_attempted or 'Unknown'
    get_identifier.short_description = "Student / Attempt"

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(UserLoginHistory, UserLoginHistoryAdmin)

