from django.urls import path
from .views import (
    RegisterView, UserListView, UserProfileView, CheckUsernameView,
    CustomTokenObtainPairView, CustomTokenRefreshView, LogoutView,
    SendOTPView, VerifyOTPView, UserAdminDetailView, AuthStatusView
)

urlpatterns = [
    path('send-otp/', SendOTPView.as_view(), name='send_otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/<int:pk>/', UserAdminDetailView.as_view(), name='user_admin_detail'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('status/', AuthStatusView.as_view(), name='auth_status'),
    path('check-username/', CheckUsernameView.as_view(), name='check_username'),
]
