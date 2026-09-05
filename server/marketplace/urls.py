from django.urls import path
from .views import (
    ListingListCreateView, ListingDetailView, MyListingsView,
    ToggleListingStatusView, AdminListingList, CategoryListView,
    UploadImageView, MyOffersView, CreateOfferView,
    ListingReportCreateView, AdminListingReportListView, AdminListingReportUpdateView,
    AdminPlatformSettingsView, ListingOffersView, RespondOfferView,
    NotificationListView, MarkNotificationReadView, MarkAllNotificationsReadView,
    DeleteNotificationView, ClearAllNotificationsView
)

urlpatterns = [
    path('listings/', ListingListCreateView.as_view(), name='listing-list-create'),
    path('listings/<int:pk>/', ListingDetailView.as_view(), name='listing-detail'),
    path('listings/<int:pk>/status/', ToggleListingStatusView.as_view(), name='toggle-listing-status'),
    path('listings/<int:pk>/offer/', CreateOfferView.as_view(), name='create-offer'),
    path('listings/<int:pk>/offers/', ListingOffersView.as_view(), name='listing-offers'),
    path('offers/<int:pk>/respond/', RespondOfferView.as_view(), name='respond-offer'),
    path('notifications/', NotificationListView.as_view(), name='notifications-list'),
    path('notifications/<int:pk>/read/', MarkNotificationReadView.as_view(), name='mark-notification-read'),
    path('notifications/<int:pk>/delete/', DeleteNotificationView.as_view(), name='delete-notification'),
    path('notifications/clear-all/', ClearAllNotificationsView.as_view(), name='clear-all-notifications'),
    path('notifications/read-all/', MarkAllNotificationsReadView.as_view(), name='mark-all-notifications-read'),
    path('my-listings/', MyListingsView.as_view(), name='my-listings'),
    path('my-offers/', MyOffersView.as_view(), name='my-offers'),
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('reports/', ListingReportCreateView.as_view(), name='create-report'),
    path('admin/listings/', AdminListingList.as_view(), name='admin-listing-list'),
    path('admin/reports/', AdminListingReportListView.as_view(), name='admin-report-list'),
    path('admin/reports/<int:pk>/', AdminListingReportUpdateView.as_view(), name='admin-report-update'),
    path('admin/settings/', AdminPlatformSettingsView.as_view(), name='admin-settings'),
    path('upload-image/', UploadImageView.as_view(), name='upload-image'),
]

