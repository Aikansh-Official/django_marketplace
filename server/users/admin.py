from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['username', 'email', 'is_verified_student', 'college_domain', 'trust_score', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        ('LocalTrade Info', {'fields': ('is_verified_student', 'college_domain', 'trust_score', 'profile_picture_url')}),
    )

admin.site.register(CustomUser, CustomUserAdmin)
