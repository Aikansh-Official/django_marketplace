from django.urls import path
from .views import (
    ListingListCreateView, ListingDetailView, MyListingsView,
    ToggleListingStatusView, AdminListingList, CategoryListView,
    UploadImageView
)

urlpatterns = [
    path('listings/', ListingListCreateView.as_view(), name='listing-list-create'),
    path('listings/<int:pk>/', ListingDetailView.as_view(), name='listing-detail'),
    path('listings/<int:pk>/status/', ToggleListingStatusView.as_view(), name='toggle-listing-status'),
    path('my-listings/', MyListingsView.as_view(), name='my-listings'),
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('admin/listings/', AdminListingList.as_view(), name='admin-listing-list'),
    path('upload-image/', UploadImageView.as_view(), name='upload-image'),
]
