from bson import ObjectId
from django.shortcuts import get_object_or_404
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Listing, Wishlist
from .serializers import CategorySimpleSerializer, ListingImageSerializer, PublicSellerSerializer


class WishlistListingSerializer(serializers.ModelSerializer):
    images = ListingImageSerializer(many=True, read_only=True)
    category = CategorySimpleSerializer(read_only=True)
    seller = PublicSellerSerializer(read_only=True)

    class Meta:
        model = Listing
        fields = ('id', 'title', 'price', 'transaction_type', 'condition',
                  'location', 'status', 'created_at', 'category', 'images', 'seller')


class WishlistView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        entries = Wishlist.objects.filter(user=request.user).select_related(
            'listing', 'listing__seller', 'listing__category'
        ).prefetch_related('listing__images').order_by('-added_at')
        items = [entry.listing for entry in entries]
        return Response(WishlistListingSerializer(items, many=True, context={'request': request}).data)


class WishlistItemView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        if not ObjectId.is_valid(pk):
            return Response({'detail': 'Listing not found.'}, status=status.HTTP_404_NOT_FOUND)
        listing = get_object_or_404(Listing, pk=pk, status='ACTIVE')
        Wishlist.objects.get_or_create(user=request.user, listing=listing)
        return Response(WishlistListingSerializer(listing, context={'request': request}).data)

    def delete(self, request, pk):
        if not ObjectId.is_valid(pk):
            return Response({'detail': 'Listing not found.'}, status=status.HTTP_404_NOT_FOUND)
        Wishlist.objects.filter(user=request.user, listing_id=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
