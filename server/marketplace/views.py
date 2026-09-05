import logging
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import ScopedRateThrottle
from django.db.models import Q, F
from django.utils import timezone

logger = logging.getLogger(__name__)
from .models import (
    Listing, ListingImage, Category, Offer, Wishlist, ListingReport, PlatformSetting, Notification
)
from .serializers import (
    ListingSerializer, ListingCreateUpdateSerializer, CategorySerializer,
    OfferSerializer, ListingReportSerializer, ListingReportCreateSerializer,
    PlatformSettingSerializer, NotificationSerializer
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
        # Prevent seller from inflating their own views
        is_seller = request.user.is_authenticated and request.user.id == instance.seller_id
        if not is_seller:
            # Deduplicate views: track viewer by user ID or IP with a 2-hour cooldown
            viewer_id = request.user.id if request.user.is_authenticated else request.META.get('REMOTE_ADDR', 'anon')
            cache_key = f'viewed_listing_{instance.pk}_{viewer_id}'
            from django.core.cache import cache
            if not cache.get(cache_key):
                Listing.objects.filter(pk=instance.pk).update(views_count=F('views_count') + 1)
                cache.set(cache_key, True, 7200)  # 2 hours
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
    permission_classes = [permissions.IsAdminUser]


class UploadImageView(APIView):
    """
    Upload an image file to Cloudinary.
    Accepts multipart/form-data with an 'image' field.
    Returns the Cloudinary secure URL.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'image_upload'

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
            # Fallback to local storage if Cloudinary fails or credentials mismatch
            try:
                import uuid
                import os
                from django.core.files.storage import default_storage
                from django.conf import settings

                image_file.seek(0)
                ext = os.path.splitext(image_file.name)[1].lower() or '.jpg'
                filename = f"listings/{uuid.uuid4().hex}{ext}"
                saved_path = default_storage.save(filename, image_file)
                file_url = request.build_absolute_uri(f"{settings.MEDIA_URL}{saved_path}")
                return Response({
                    'url': file_url,
                    'public_id': saved_path,
                }, status=status.HTTP_200_OK)
            except Exception as fallback_err:
                logger.error(f'Image upload failed. Cloudinary: {e}, Local fallback: {fallback_err}')
                return Response(
                    {'error': 'Image upload failed. Please try again later.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )


class MyOffersView(generics.ListAPIView):
    serializer_class = OfferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Offer.objects.filter(buyer=self.request.user).select_related('listing', 'listing__seller').order_by('-created_at')


class CreateOfferView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            listing = Listing.objects.get(pk=pk)
        except Listing.DoesNotExist:
            return Response({'error': 'Listing not found'}, status=status.HTTP_404_NOT_FOUND)

        if listing.seller == request.user:
            return Response({'error': 'You cannot buy your own listing.'}, status=status.HTTP_400_BAD_REQUEST)

        if listing.status != 'ACTIVE':
            return Response(
                {'error': f'This item is currently {listing.status.lower()} and not available.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Direct price logic: locked to listed price (or 0 for donate)
        offer_amount = listing.price if listing.transaction_type != 'DONATE' else 0
        buyer_message = request.data.get('message', '').strip()

        # Prevent duplicate pending requests from same buyer
        existing = Offer.objects.filter(buyer=request.user, listing=listing, status='PENDING').first()
        if existing:
            return Response(
                {'error': 'You already have an active pending purchase request for this item.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        offer = Offer.objects.create(
            buyer=request.user,
            listing=listing,
            offer_amount=offer_amount,
            buyer_message=buyer_message,
            status='PENDING'
        )

        # Create real backend Notification for seller
        buyer_display = getattr(request.user, 'full_name', '') or request.user.username
        price_display = f"Rs {listing.price}" if listing.transaction_type != 'DONATE' else "Free (Donation)"
        notif_msg = f"{buyer_display} (@{request.user.username}) requested to buy your item for {price_display}."
        if buyer_message:
            notif_msg += f' Note: "{buyer_message}"'

        Notification.objects.create(
            recipient=listing.seller,
            sender=request.user,
            notification_type='BUY_REQUEST',
            title=f"New Purchase Request for '{listing.title}'",
            message=notif_msg,
            listing=listing
        )

        serializer = OfferSerializer(offer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ListingOffersView(APIView):
    """View all incoming purchase requests for a specific listing (seller only)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            listing = Listing.objects.get(pk=pk)
        except Listing.DoesNotExist:
            return Response({'error': 'Listing not found'}, status=status.HTTP_404_NOT_FOUND)

        if listing.seller != request.user:
            return Response({'error': 'Only the seller can view incoming requests.'}, status=status.HTTP_403_FORBIDDEN)

        offers = Offer.objects.filter(listing=listing).select_related('buyer', 'listing').order_by('-created_at')
        serializer = OfferSerializer(offers, many=True)
        return Response(serializer.data)


class RespondOfferView(APIView):
    """Seller accepts or declines an incoming purchase request."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            offer = Offer.objects.select_related('listing', 'listing__seller', 'buyer').get(pk=pk)
        except Offer.DoesNotExist:
            return Response({'error': 'Purchase request not found'}, status=status.HTTP_404_NOT_FOUND)

        listing = offer.listing
        if listing.seller != request.user:
            return Response({'error': 'Only the seller can respond to purchase requests.'}, status=status.HTTP_403_FORBIDDEN)

        action = request.data.get('action')
        if action not in ['ACCEPT', 'REJECT']:
            return Response({'error': 'Action must be ACCEPT or REJECT.'}, status=status.HTTP_400_BAD_REQUEST)

        seller_display = getattr(request.user, 'full_name', '') or request.user.username

        if action == 'ACCEPT':
            offer.status = 'ACCEPTED'
            offer.save()

            # Reserve the listing
            listing.status = 'PENDING'
            listing.save()

            # Notify the accepted buyer
            Notification.objects.create(
                recipient=offer.buyer,
                sender=request.user,
                notification_type='REQUEST_ACCEPTED',
                title=f"Request Accepted for '{listing.title}'!",
                message=f"{seller_display} accepted your request for '{listing.title}'. Contact the seller to finalize campus pickup.",
                listing=listing
            )

            # Decline other pending requests for this listing
            other_offers = Offer.objects.filter(listing=listing, status='PENDING').exclude(pk=offer.pk)
            for oth in other_offers:
                oth.status = 'REJECTED'
                oth.save()
                Notification.objects.create(
                    recipient=oth.buyer,
                    sender=request.user,
                    notification_type='REQUEST_REJECTED',
                    title=f"Item Reserved: '{listing.title}'",
                    message=f"Another student's request was accepted for '{listing.title}'.",
                    listing=listing
                )

        elif action == 'REJECT':
            offer.status = 'REJECTED'
            offer.save()

            Notification.objects.create(
                recipient=offer.buyer,
                sender=request.user,
                notification_type='REQUEST_REJECTED',
                title=f"Request Declined for '{listing.title}'",
                message=f"{seller_display} declined your purchase request for '{listing.title}'.",
                listing=listing
            )

        serializer = OfferSerializer(offer)
        return Response(serializer.data)


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).select_related('listing').prefetch_related('listing__images').order_by('-created_at')


class MarkNotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, recipient=request.user)
            notif.is_read = True
            notif.save()
            return Response({'success': True})
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)


class MarkAllNotificationsReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'success': True})


class DeleteNotificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, recipient=request.user)
            notif.delete()
            return Response({'success': True})
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)


class ClearAllNotificationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        Notification.objects.filter(recipient=request.user).delete()
        return Response({'success': True})


class ListingReportCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ListingReportCreateSerializer(data=request.data)
        if serializer.is_valid():
            report = serializer.save(reporter=request.user)
            return Response(ListingReportSerializer(report).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminListingReportListView(generics.ListAPIView):
    queryset = ListingReport.objects.all().select_related('reporter', 'listing', 'listing__seller').order_by('-created_at')
    serializer_class = ListingReportSerializer
    permission_classes = [permissions.IsAdminUser]


class AdminListingReportUpdateView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, pk):
        try:
            report = ListingReport.objects.get(pk=pk)
        except ListingReport.DoesNotExist:
            return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status in ['RESOLVED', 'DISMISSED', 'PENDING']:
            report.status = new_status
            if new_status == 'RESOLVED':
                report.resolved_at = timezone.now()
            report.save()

            if request.data.get('delete_listing') and report.listing:
                report.listing.delete()

            return Response(ListingReportSerializer(report).data)
        return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)


class AdminPlatformSettingsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    DEFAULT_SETTINGS = {
        'maintenance_mode': 'false',
        'allow_registrations': 'true',
        'allowed_domains': 'lpu.in, lpu.co.in',
    }

    def get(self, request):
        settings_map = dict(self.DEFAULT_SETTINGS)
        for s in PlatformSetting.objects.all():
            settings_map[s.key] = s.value
        return Response(settings_map)

    def post(self, request):
        data = request.data
        for key, value in data.items():
            PlatformSetting.objects.update_or_create(
                key=key,
                defaults={'value': str(value)}
            )
        return Response({'message': 'Settings updated successfully', 'settings': request.data})

