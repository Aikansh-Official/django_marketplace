from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q, F
from .models import Listing, ListingImage, Category
from .serializers import (
    ListingSerializer, ListingCreateUpdateSerializer, CategorySerializer
)
from .cloudinary_upload import upload_image_to_cloudinary


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Custom permission: only the listing owner can edit/delete."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.seller == request.user


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class ListingListCreateView(generics.ListCreateAPIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ListingCreateUpdateSerializer
        return ListingSerializer

    def get_queryset(self):
        queryset = Listing.objects.filter(status='ACTIVE').select_related('seller', 'category').prefetch_related('images')

        # Search query (title, description, location)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(location__icontains=search)
            )

        # Category filter
        category = self.request.query_params.get('category')
        if category:
            if category.isdigit():
                queryset = queryset.filter(category_id=category)
            else:
                queryset = queryset.filter(category__slug=category)

        # Condition filter
        condition = self.request.query_params.get('condition')
        if condition and condition != 'ALL':
            queryset = queryset.filter(condition=condition)

        # Transaction type filter (SELL, RENT, DONATE)
        transaction_type = self.request.query_params.get('transaction_type')
        if transaction_type and transaction_type != 'ALL':
            queryset = queryset.filter(transaction_type=transaction_type)

        # Campus location filter
        location = self.request.query_params.get('location')
        if location and location != 'ALL':
            queryset = queryset.filter(location__icontains=location)

        # Price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        # Sorting
        sort = self.request.query_params.get('sort', 'newest')
        if sort == 'price_asc':
            queryset = queryset.order_by('price')
        elif sort == 'price_desc':
            queryset = queryset.order_by('-price')
        elif sort == 'popular':
            queryset = queryset.order_by('-views_count', '-created_at')
        else:  # 'newest' default
            queryset = queryset.order_by('-created_at')

        return queryset

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)


class ListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Listing.objects.all().select_related('seller', 'category').prefetch_related('images')

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ListingCreateUpdateSerializer
        return ListingSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment views count safely using F expression
        Listing.objects.filter(pk=instance.pk).update(views_count=F('views_count') + 1)
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class MyListingsView(generics.ListAPIView):
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Listing.objects.filter(seller=user).select_related('seller', 'category').prefetch_related('images').order_by('-created_at')

        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'ALL':
            queryset = queryset.filter(status=status_filter)

        return queryset


class ToggleListingStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            listing = Listing.objects.get(pk=pk)
        except Listing.DoesNotExist:
            return Response({'error': 'Listing not found'}, status=status.HTTP_404_NOT_FOUND)

        # Only the owner can toggle status
        if listing.seller != request.user:
            return Response({'error': 'You are not the owner of this listing.'}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get('status')
        valid_statuses = dict(Listing.STATUS_CHOICES).keys()

        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Allowed values are: {list(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        listing.status = new_status
        listing.save()
        serializer = ListingSerializer(listing, context={'request': request})
        return Response(serializer.data)


class AdminListingList(generics.ListAPIView):
    queryset = Listing.objects.all().select_related('seller', 'category').prefetch_related('images').order_by('-created_at')
    serializer_class = ListingSerializer
    permission_classes = [permissions.AllowAny]


class UploadImageView(APIView):
    """
    Upload an image file to Cloudinary.
    Accepts multipart/form-data with an 'image' field.
    Returns the Cloudinary secure URL.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image_file = request.FILES.get('image')
        if not image_file:
            return Response(
                {'error': 'No image file provided. Send a file in the "image" field.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if image_file.content_type not in allowed_types:
            return Response(
                {'error': f'Invalid file type: {image_file.content_type}. Allowed: {", ".join(allowed_types)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024
        if image_file.size > max_size:
            return Response(
                {'error': 'File too large. Maximum size is 5MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            result = upload_image_to_cloudinary(image_file)
            return Response({
                'url': result['url'],
                'public_id': result['public_id'],
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Failed to upload image: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
