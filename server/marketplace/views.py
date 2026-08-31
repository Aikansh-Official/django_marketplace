from rest_framework import generics
from .models import Listing
from .serializers import ListingSerializer

class ListingList(generics.ListAPIView):
    queryset = Listing.objects.filter(status='ACTIVE').order_by('-created_at')
    serializer_class = ListingSerializer

class AdminListingList(generics.ListAPIView):
    # This endpoint returns ALL listings (Active, Pending, Sold, Hidden)
    queryset = Listing.objects.all().order_by('-created_at')
    serializer_class = ListingSerializer
    # In production, we should set permission_classes = (IsAdminUser,)
