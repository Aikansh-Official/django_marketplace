from django.urls import path
from .views import (
    RegisterView, UserListView, UserProfileView, CheckUsernameView,
    CustomTokenObtainPairView, CustomTokenRefreshView, LogoutView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('check-username/', CheckUsernameView.as_view(), name='check_username'),
]
