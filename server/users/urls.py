from django.urls import path
from .views import (
    RegisterView, UserListView, UserProfileView, CheckUsernameView,
    CheckPhoneView, CheckEmailView, CheckAvailabilityView,
    CustomTokenObtainPairView, CustomTokenRefreshView, LogoutView,
    SendOTPView, VerifyOTPView, UserAdminDetailView, AuthStatusView,
    CompleteIdVerificationView, UpgradeToSellerView,
    AdminStaffListView, AdminStaffDetailView,
    ForgotPasswordRequestView, ForgotPasswordResetView,
    UserActiveSessionsView, RevokeSessionView
)

urlpatterns = [
    path('send-otp/', SendOTPView.as_view(), name='send_otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('sessions/', UserActiveSessionsView.as_view(), name='user_active_sessions'),
    path('revoke-session/', RevokeSessionView.as_view(), name='revoke_session'),
    path('forgot-password/', ForgotPasswordRequestView.as_view(), name='forgot_password'),
    path('reset-password/', ForgotPasswordResetView.as_view(), name='reset_password'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/<str:pk>/', UserAdminDetailView.as_view(), name='user_admin_detail'),
    path('staff/', AdminStaffListView.as_view(), name='admin_staff_list'),
    path('staff/<str:pk>/', AdminStaffDetailView.as_view(), name='admin_staff_detail'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('verify-id/', CompleteIdVerificationView.as_view(), name='verify_id'),
    path('upgrade-to-seller/', UpgradeToSellerView.as_view(), name='upgrade_to_seller'),
    path('status/', AuthStatusView.as_view(), name='auth_status'),
    path('check-username/', CheckUsernameView.as_view(), name='check_username'),
    path('check-phone/', CheckPhoneView.as_view(), name='check_phone'),
    path('check-email/', CheckEmailView.as_view(), name='check_email'),
    path('check-availability/', CheckAvailabilityView.as_view(), name='check_availability'),
]

