from rest_framework import generics
from .models import Listing
from .serializers import ListingSerializer

class ListingList(generics.ListAPIView):
    queryset = Listing.objects.filter(status='ACTIVE').order_by('-created_at')
    serializer_class = ListingSerializer
