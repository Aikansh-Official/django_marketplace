from django.urls import path
from .views import ListingList

urlpatterns = [
    path('listings/', ListingList.as_view(), name='listing-list'),
]
