from django.urls import path
from .views import ListingList, AdminListingList

urlpatterns = [
    path('listings/', ListingList.as_view(), name='listing-list'),
    path('admin/listings/', AdminListingList.as_view(), name='admin-listing-list'),
]
