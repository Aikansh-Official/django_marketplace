import logging
import random
import datetime
from django.db import transaction
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import ScopedRateThrottle
from django.db.models import Q, F
from django.utils import timezone

logger = logging.getLogger(__name__)
from .models import (
    Listing, ListingImage, Category, Offer, Wishlist, ListingReport, PlatformSetting, Notification, HandoverSession
)
from .serializers import (
    ListingSerializer, ListingCreateUpdateSerializer, CategorySerializer,
    AdminCategorySerializer, OfferSerializer, ListingReportSerializer,
    ListingReportCreateSerializer, PlatformSettingSerializer, NotificationSerializer,
    HandoverSessionSerializer, AdminDealSerializer
)
from .cloudinary_upload import upload_image_to_cloudinary


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Custom permission: only the listing owner can edit/delete."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.seller == request.user


DEFAULT_BANNED_WORDS = [
    'vape', 'weed', 'alcohol', 'beer', 'vodka', 'whiskey', 'drugs', 'ganja',
    'cigarette', 'weapon', 'gun', 'knife', 'porn', 'escort', 'sex', 'cheat',
    'exam paper', 'leaked paper', 'proxy attendance', 'counterfeit', 'fake id',
    'duplicate certificate'
]

def get_banned_words():
    from django.core.cache import cache
    cached = cache.get('cxc_banned_words_list')
    if cached is not None:
        return cached

    setting = PlatformSetting.objects.filter(key='banned_words').first()
    if setting and setting.value:
        words = [w.strip().lower() for w in setting.value.split(',') if w.strip()]
    else:
        words = list(DEFAULT_BANNED_WORDS)

    cache.set('cxc_banned_words_list', words, 300)
    return words

def check_text_for_banned_words(text):
    if not text:
        return []
    import re
    text_lower = text.lower()
    banned_words = get_banned_words()
    matched = []
    for word in banned_words:
        if ' ' in word:
            if word in text_lower:
                matched.append(word)
        else:
            if re.search(rf'\b{re.escape(word)}\b', text_lower):
                matched.append(word)
    return matched


from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

@method_decorator(cache_page(60 * 5), name='dispatch')
class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        from django.db.models import Count, Q
        return Category.objects.annotate(
            annotated_listings_count=Count('listings', filter=Q(listings__status='ACTIVE'))
        ).order_by('name')


class AdminCategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminCategorySerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        from django.db.models import Count, Q
        return Category.objects.annotate(
            annotated_listings_count=Count('listings', filter=Q(listings__status='ACTIVE')),
            annotated_total_listings=Count('listings')
        ).order_by('name')

    def perform_create(self, serializer):
        from django.core.cache import cache
        serializer.save()
        try:
            cache.clear()
        except Exception:
            pass


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminCategorySerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Category.objects.all()

    def perform_update(self, serializer):
        from django.core.cache import cache
        serializer.save()
        try:
            cache.clear()
        except Exception:
            pass

    def destroy(self, request, *args, **kwargs):
        from django.core.cache import cache
        from django.shortcuts import get_object_or_404
        instance = self.get_object()
        listing_count = instance.listings.count()

        reassign_to = request.data.get('reassign_to') or request.query_params.get('reassign_to')
        force = request.data.get('force') or request.query_params.get('force') in ('true', '1')

        if listing_count > 0:
            if reassign_to:
                target_cat = get_object_or_404(Category, pk=reassign_to)
                if target_cat.id == instance.id:
                    return Response({'error': 'Cannot reassign listings to the category being deleted.'}, status=status.HTTP_400_BAD_REQUEST)
                instance.listings.all().update(category=target_cat)
                instance.delete()
                try:
                    cache.clear()
                except Exception:
                    pass
                return Response({
                    'message': f'Category deleted and {listing_count} listings reassigned to {target_cat.name}.'
                }, status=status.HTTP_200_OK)
            elif force:
                instance.listings.all().update(category=None)
                instance.delete()
                try:
                    cache.clear()
                except Exception:
                    pass
                return Response({
                    'message': f'Category deleted. {listing_count} listings are now uncategorized.'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': f'Category contains {listing_count} listings. Please choose an alternative category to reassign them to or force delete.',
                    'listings_count': listing_count
                }, status=status.HTTP_400_BAD_REQUEST)

        instance.delete()
        try:
            cache.clear()
        except Exception:
            pass
        return Response({'message': 'Category deleted successfully.'}, status=status.HTTP_200_OK)


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

        # Transaction type filter (SELL, DONATE)
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

    def post(self, request, *args, **kwargs):
        user = request.user
        is_seller = getattr(user, 'role', 'BUYER') == 'SELLER' or getattr(user, 'is_id_verified', False) or user.is_staff or user.is_superuser
        if not is_seller:
            return Response(
                {
                    'error': 'Only verified Sellers can post items for sale. Please complete your Student ID verification to become a Seller.',
                    'requires_id_verification': True
                },
                status=status.HTTP_403_FORBIDDEN
            )
        return super().post(request, *args, **kwargs)

    def perform_create(self, serializer):
        listing = serializer.save(seller=self.request.user)
        matched = check_text_for_banned_words(f"{listing.title} {listing.description}")
        if matched:
            listing.status = 'HIDDEN'
            listing.save(update_fields=['status'])
            ListingReport.objects.create(
                reporter=self.request.user,
                listing=listing,
                reason="Automated Content Policy Flag",
                details=f"System auto-flagged prohibited keyword(s): {', '.join(matched)}. Item has been automatically hidden from public view.",
                status='PENDING'
            )


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

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == 'SOLD' and not request.user.is_staff:
            return Response(
                {'error': 'This item has already been marked as Sold and cannot be edited.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        listing = serializer.save()
        matched = check_text_for_banned_words(f"{listing.title} {listing.description}")
        if matched:
            listing.status = 'HIDDEN'
            listing.save(update_fields=['status'])
            ListingReport.objects.create(
                reporter=self.request.user,
                listing=listing,
                reason="Automated Content Policy Flag",
                details=f"System auto-flagged prohibited keyword(s): {', '.join(matched)}. Item has been automatically hidden from public view.",
                status='PENDING'
            )

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

        # Only the owner or staff can toggle status
        if listing.seller != request.user and not request.user.is_staff:
            return Response({'error': 'You are not the owner of this listing.'}, status=status.HTTP_403_FORBIDDEN)

        # Do not allow modifying a deal that has already been verified and SOLD
        if listing.status == 'SOLD' and not request.user.is_staff:
            return Response(
                {'error': 'This item has already been marked as Sold and its status cannot be changed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

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


class AdminListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin view to retrieve, update any field, or delete any listing."""
    queryset = Listing.objects.all().select_related('seller', 'category').prefetch_related('images')
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ListingCreateUpdateSerializer
        return ListingSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(ListingSerializer(instance, context={'request': request}).data)


class AdminDashboardStatsView(APIView):
    """
    Consolidated single-roundtrip dashboard stats endpoint.
    Runs counts in 1 SQL query and returns only top 5 recent items instead of transferring entire tables.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from django.core.cache import cache
        cache_key = 'admin_dashboard_stats_data'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        from django.db import connection
        from django.contrib.auth import get_user_model
        from users.serializers import UserDashboardSummarySerializer
        User = get_user_model()

        # Run single SQL query to get all counts in ONE network round-trip to Supabase
        with connection.cursor() as cur:
            cur.execute("""
                SELECT 
                    (SELECT count(*) FROM users_customuser WHERE is_staff=false AND is_superuser=false),
                    (SELECT count(*) FROM users_customuser WHERE is_staff=false AND is_superuser=false AND is_verified_student=true),
                    (SELECT count(*) FROM marketplace_listing WHERE status='ACTIVE'),
                    (SELECT count(*) FROM marketplace_listing),
                    (SELECT count(*) FROM marketplace_listing WHERE status='SOLD'),
                    (SELECT count(*) FROM marketplace_listingreport WHERE status='PENDING')
            """)
            row = cur.fetchone()

        total_students, verified_students, active_listings, total_listings, completed_deals, pending_reports = row

        # Fetch only the top 5 recent listings and students with minimal fields
        recent_listings_qs = Listing.objects.select_related('seller', 'category').prefetch_related('images').order_by('-created_at')[:5]
        recent_students_qs = User.objects.filter(is_staff=False, is_superuser=False).only(
            'id', 'username', 'full_name', 'email', 'is_verified_student', 'trust_score', 'profile_photo'
        ).order_by('-date_joined')[:5]

        recent_listings = ListingSerializer(recent_listings_qs, many=True, context={'request': request}).data
        recent_students = UserDashboardSummarySerializer(recent_students_qs, many=True).data

        payload = {
            'stats': {
                'total_students': total_students or 0,
                'verified_students': verified_students or 0,
                'active_listings': active_listings or 0,
                'total_listings': total_listings or 0,
                'completed_deals': completed_deals or 0,
                'pending_reports': pending_reports or 0,
            },
            'recent_listings': recent_listings,
            'recent_students': recent_students
        }
        cache.set(cache_key, payload, 60)
        return Response(payload)


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
            report = ListingReport.objects.select_related('listing', 'listing__seller', 'reporter').get(pk=pk)
        except ListingReport.DoesNotExist:
            return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')  # 'DISMISS', 'RESOLVE', 'WARN_SELLER', 'HIDE_LISTING', 'DELETE_LISTING', 'BAN_SELLER'
        new_status = request.data.get('status')
        custom_note = request.data.get('admin_note', '').strip()

        # Action: WARN_SELLER
        if action == 'WARN_SELLER':
            if report.listing and report.listing.seller:
                warn_msg = request.data.get('warning_message') or (
                    f"CampusXChange Moderation Notice: Your listing '{report.listing.title}' received a community violation report "
                    f"for: '{report.reason}'. Please review university guidelines to keep your selling privileges active."
                )
                Notification.objects.create(
                    recipient=report.listing.seller,
                    notification_type='GENERAL',
                    title='⚠️ Official Moderation Warning',
                    message=warn_msg,
                    listing=report.listing
                )
            report.status = 'RESOLVED'
            report.resolved_at = timezone.now()
            report.save()
            return Response({
                'message': 'Official warning dispatched to student seller and report marked as resolved.',
                'report': ListingReportSerializer(report).data
            })

        # Action: HIDE_LISTING
        if action == 'HIDE_LISTING':
            if report.listing:
                report.listing.status = 'HIDDEN'
                report.listing.save(update_fields=['status'])
                if report.listing.seller:
                    Notification.objects.create(
                        recipient=report.listing.seller,
                        notification_type='GENERAL',
                        title='Listing Taken Down (Hidden)',
                        message=f"Your listing '{report.listing.title}' has been temporarily hidden by administrators following a moderation review.",
                        listing=report.listing
                    )
            report.status = 'RESOLVED'
            report.resolved_at = timezone.now()
            report.save()
            return Response({
                'message': 'Listing hidden from marketplace and report marked as resolved.',
                'report': ListingReportSerializer(report).data
            })

        # Action: BAN_SELLER
        if action == 'BAN_SELLER':
            if report.listing and report.listing.seller:
                seller = report.listing.seller
                seller.is_active = False
                seller.save(update_fields=['is_active'])
                # Hide all active listings from this banned seller
                Listing.objects.filter(seller=seller, status='ACTIVE').update(status='HIDDEN')
                report.status = 'RESOLVED'
                report.resolved_at = timezone.now()
                report.save()
                return Response({
                    'message': f'Seller @{seller.username} has been suspended/banned and their listings taken down.',
                    'report': ListingReportSerializer(report).data
                })
            return Response({'error': 'No seller associated with this report.'}, status=status.HTTP_400_BAD_REQUEST)

        # Action: DELETE_LISTING
        if action == 'DELETE_LISTING' or request.data.get('delete_listing'):
            if report.listing:
                seller = report.listing.seller
                title = report.listing.title
                report.listing.delete()
                if seller:
                    Notification.objects.create(
                        recipient=seller,
                        notification_type='GENERAL',
                        title='Listing Removed by Moderation',
                        message=f"Your listing '{title}' was removed by campus administrators due to policy violations."
                    )
            report.status = 'RESOLVED'
            report.resolved_at = timezone.now()
            report.save()
            return Response({
                'message': 'Listing permanently removed and report marked as resolved.',
                'report': ListingReportSerializer(report).data
            })

        # Action: DISMISS
        if action == 'DISMISS' or new_status == 'DISMISSED':
            report.status = 'DISMISSED'
            report.resolved_at = timezone.now()
            report.save()
            return Response({
                'message': 'Report dismissed (no violation found).',
                'report': ListingReportSerializer(report).data
            })

        # Standard Status Update
        if new_status in ['RESOLVED', 'PENDING']:
            report.status = new_status
            if new_status == 'RESOLVED':
                report.resolved_at = timezone.now()
            report.save()
            return Response({
                'message': f'Report marked as {new_status}.',
                'report': ListingReportSerializer(report).data
            })

        return Response({'error': 'Invalid moderation action or status.'}, status=status.HTTP_400_BAD_REQUEST)


class AdminBannedWordsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        words = get_banned_words()
        return Response({'words': words})

    def post(self, request):
        from django.core.cache import cache
        raw_words = request.data.get('words', [])
        if isinstance(raw_words, str):
            words = [w.strip().lower() for w in raw_words.split(',') if w.strip()]
        elif isinstance(raw_words, list):
            words = [str(w).strip().lower() for w in raw_words if str(w).strip()]
        else:
            words = list(DEFAULT_BANNED_WORDS)

        # De-duplicate while preserving sorted order
        unique_words = sorted(list(set(words)))

        PlatformSetting.objects.update_or_create(
            key='banned_words',
            defaults={'value': ','.join(unique_words)}
        )
        try:
            cache.delete('cxc_banned_words_list')
        except Exception:
            pass

        return Response({
            'message': f'Banned words list updated successfully ({len(unique_words)} active keywords).',
            'words': unique_words
        })


class AdminPlatformSettingsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    DEFAULT_SETTINGS = {
        'maintenance_mode': 'false',
        'allow_registrations': 'true',
        'allowed_domains': '',
        'announcement_enabled': 'false',
        'announcement_text': '',
        'announcement_type': 'INFO',
        'announcement_link': '',
        'announcement_dismissible': 'true',
    }

    def get(self, request):
        settings_map = dict(self.DEFAULT_SETTINGS)
        for s in PlatformSetting.objects.all():
            settings_map[s.key] = s.value
        return Response(settings_map)

    def post(self, request):
        from django.core.cache import cache
        data = request.data
        for key, value in data.items():
            PlatformSetting.objects.update_or_create(
                key=key,
                defaults={'value': str(value)}
            )
        try:
            cache.delete('public_announcement_data')
        except Exception:
            pass
        return Response({'message': 'Settings updated successfully', 'settings': request.data})


class PublicAnnouncementView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.core.cache import cache
        cached_data = cache.get('public_announcement_data')
        if cached_data is not None:
            return Response(cached_data)

        settings_map = dict(AdminPlatformSettingsView.DEFAULT_SETTINGS)
        for s in PlatformSetting.objects.filter(key__startswith='announcement_'):
            settings_map[s.key] = s.value

        payload = {
            'enabled': str(settings_map.get('announcement_enabled', '')).lower() in ('true', '1'),
            'text': settings_map.get('announcement_text', ''),
            'type': settings_map.get('announcement_type', 'INFO').upper(),
            'link': settings_map.get('announcement_link', ''),
            'dismissible': str(settings_map.get('announcement_dismissible', '')).lower() not in ('false', '0'),
        }
        try:
            cache.set('public_announcement_data', payload, 60)
        except Exception:
            pass
        return Response(payload)


class GenerateHandoverQRView(APIView):
    """Seller generates dynamic QR code & 6-digit PIN for physical handover."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            offer = Offer.objects.select_related('listing', 'listing__seller', 'buyer').get(pk=pk)
        except Offer.DoesNotExist:
            return Response({'error': 'Deal / Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        if offer.listing.seller != request.user:
            return Response({'error': 'Only the seller can generate the handover code.'}, status=status.HTTP_403_FORBIDDEN)

        if offer.status != 'ACCEPTED' or offer.listing.status != 'PENDING':
            return Response(
                {'error': f'Cannot generate handover code. Deal status is {offer.status} and item is {offer.listing.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Invalidate any prior active sessions for this offer
        HandoverSession.objects.filter(offer=offer, status='ACTIVE').update(status='EXPIRED')

        # Generate a unique 6-digit pin and 5-min TTL
        pin_code = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + datetime.timedelta(minutes=5)

        session = HandoverSession.objects.create(
            offer=offer,
            pin_code=pin_code,
            expires_at=expires_at,
            status='ACTIVE'
        )

        # Notify buyer
        seller_name = getattr(request.user, 'full_name', '') or request.user.username
        Notification.objects.create(
            recipient=offer.buyer,
            sender=request.user,
            notification_type='HANDOVER_READY',
            title=f"Handover QR Ready for '{offer.listing.title}'",
            message=f"{seller_name} has generated the Handover QR & PIN. Scan or enter PIN to complete your purchase!",
            listing=offer.listing
        )

        serializer = HandoverSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VerifyHandoverView(APIView):
    """Buyer scans QR or submits 6-digit PIN to verify handover details before final confirmation."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = request.data.get('token', '').strip()
        pin_code = request.data.get('pin_code', '').strip()

        if not token and not pin_code:
            return Response({'error': 'Provide either a QR token or a 6-digit PIN code.'}, status=status.HTTP_400_BAD_REQUEST)

        session = None
        if token:
            session = HandoverSession.objects.select_related('offer', 'offer__listing', 'offer__listing__seller', 'offer__buyer').filter(token=token).first()
        elif pin_code:
            session = HandoverSession.objects.select_related('offer', 'offer__listing', 'offer__listing__seller', 'offer__buyer').filter(
                pin_code=pin_code,
                status='ACTIVE',
                expires_at__gt=timezone.now()
            ).first()

        if not session:
            return Response({'error': 'Invalid or expired QR code / PIN.'}, status=status.HTTP_400_BAD_REQUEST)

        if not session.is_valid():
            return Response({'error': 'This handover session has expired or was already used.'}, status=status.HTTP_400_BAD_REQUEST)

        if session.failed_attempts >= 3:
            session.status = 'EXPIRED'
            session.save(update_fields=['status'])
            return Response({'error': 'Too many failed verification attempts. Please ask the seller to generate a new QR.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify buyer identity
        if session.offer.buyer != request.user:
            session.failed_attempts += 1
            session.save(update_fields=['failed_attempts'])
            return Response({'error': 'This handover code is reserved for a different buyer.'}, status=status.HTTP_403_FORBIDDEN)

        if session.offer.status != 'ACCEPTED' or session.offer.listing.status != 'PENDING':
            return Response({'error': 'This deal is no longer active or has already been completed.'}, status=status.HTTP_400_BAD_REQUEST)

        listing = session.offer.listing
        primary_img = listing.images.filter(is_primary=True).first() or listing.images.first()

        return Response({
            'session_id': session.id,
            'token': str(session.token),
            'listing_id': listing.id,
            'listing_title': listing.title,
            'listing_price': str(session.offer.offer_amount),
            'listing_image': primary_img.image_url if primary_img else None,
            'seller_id': listing.seller.id,
            'seller_name': listing.seller.full_name or listing.seller.username,
            'seller_reg': listing.seller.username,
            'meetup_location': listing.location,
            'verified': True
        })


class ConfirmHandoverView(APIView):
    """Buyer gives final confirmation after physical handover; atomically marks listing SOLD."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = request.data.get('token', '').strip()
        if not token:
            return Response({'error': 'Handover token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                session = HandoverSession.objects.select_for_update().select_related(
                    'offer', 'offer__listing', 'offer__listing__seller', 'offer__buyer'
                ).get(token=token)
            except HandoverSession.DoesNotExist:
                return Response({'error': 'Handover session not found.'}, status=status.HTTP_404_NOT_FOUND)

            if not session.is_valid():
                return Response({'error': 'This handover session has expired or is no longer valid.'}, status=status.HTTP_400_BAD_REQUEST)

            if session.offer.buyer != request.user:
                return Response({'error': 'Unauthorized. You are not the designated buyer.'}, status=status.HTTP_403_FORBIDDEN)

            offer = session.offer
            listing = offer.listing

            # 1. Update HandoverSession
            session.status = 'USED'
            session.completed_at = timezone.now()
            session.save()

            # 2. Update Offer
            offer.status = 'COMPLETED'
            offer.save()

            # 3. Update Listing
            listing.status = 'SOLD'
            listing.save()

            # Award +5 Peer Trade Trust Score points to both buyer and seller
            try:
                request.user.trust_score = request.user.calculate_trust_score()
                request.user.save(update_fields=['trust_score'])

                listing.seller.trust_score = listing.seller.calculate_trust_score()
                listing.seller.save(update_fields=['trust_score'])
            except Exception as e:
                pass

            # 4. Invalidate any other handover sessions for this offer
            HandoverSession.objects.filter(offer=offer, status='ACTIVE').exclude(pk=session.pk).update(status='EXPIRED')

            buyer_name = getattr(request.user, 'full_name', '') or request.user.username
            seller_name = getattr(listing.seller, 'full_name', '') or listing.seller.username

            # 5. Notify Seller
            Notification.objects.create(
                recipient=listing.seller,
                sender=request.user,
                notification_type='ITEM_SOLD',
                title=f"Deal Complete! '{listing.title}' Marked as Sold 🎉",
                message=f"{buyer_name} verified product receipt and confirmed payment. Your item is marked as Sold.",
                listing=listing
            )

            # 6. Notify Buyer
            Notification.objects.create(
                recipient=request.user,
                sender=listing.seller,
                notification_type='ITEM_SOLD',
                title=f"Purchase Verified for '{listing.title}' 🎉",
                message=f"You completed purchase of '{listing.title}' from {seller_name}. The item is logged in your Purchases.",
                listing=listing
            )

            return Response({
                'success': True,
                'message': 'Handover successfully verified and confirmed! Listing marked as SOLD.',
                'listing_id': listing.id,
                'listing_title': listing.title
            })


class CancelDealView(APIView):
    """Allows either buyer or seller to cancel an accepted deal before handover, restoring listing to ACTIVE."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            offer = Offer.objects.select_related('listing', 'listing__seller', 'buyer').get(pk=pk)
        except Offer.DoesNotExist:
            return Response({'error': 'Deal not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_seller = (offer.listing.seller == request.user)
        is_buyer = (offer.buyer == request.user)

        if not (is_seller or is_buyer):
            return Response({'error': 'You are not authorized to cancel this deal.'}, status=status.HTTP_403_FORBIDDEN)

        if offer.status != 'ACCEPTED':
            return Response({'error': f'Cannot cancel deal in {offer.status} status.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Invalidate all handover sessions
            HandoverSession.objects.filter(offer=offer, status='ACTIVE').update(status='CANCELLED')

            offer.status = 'CANCELLED'
            offer.save()

            # Unlock listing back to ACTIVE
            listing = offer.listing
            listing.status = 'ACTIVE'
            listing.save()

            canceller_name = getattr(request.user, 'full_name', '') or request.user.username
            recipient = offer.buyer if is_seller else listing.seller

            Notification.objects.create(
                recipient=recipient,
                sender=request.user,
                notification_type='DEAL_CANCELLED',
                title=f"Campus Deal Cancelled for '{listing.title}'",
                message=f"{canceller_name} cancelled the campus deal. The listing is now available again.",
                listing=listing
            )

        return Response({
            'success': True,
            'message': 'Deal cancelled and listing restored to Active.'
        })


class AdminDealListView(generics.ListAPIView):
    """
    Administrator endpoint to monitor all campus deals and offers.
    Supports filtering by status (ALL, PENDING, ACCEPTED, COMPLETED, CANCELLED, REJECTED)
    and searching by buyer, seller, or listing title.
    """
    serializer_class = AdminDealSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        queryset = Offer.objects.select_related(
            'listing', 'listing__seller', 'listing__category', 'buyer'
        ).prefetch_related(
            'listing__images', 'handover_sessions'
        ).order_by('-created_at')

        status_param = self.request.query_params.get('status', 'ALL').strip().upper()
        if status_param and status_param != 'ALL':
            queryset = queryset.filter(status=status_param)

        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(listing__title__icontains=search) |
                Q(buyer__username__icontains=search) |
                Q(buyer__full_name__icontains=search) |
                Q(buyer__email__icontains=search) |
                Q(listing__seller__username__icontains=search) |
                Q(listing__seller__full_name__icontains=search) |
                Q(listing__seller__email__icontains=search)
            )

        return queryset


class AdminDealActionView(APIView):
    """
    Administrator intervention endpoint for stalled deals or disputes:
    - FORCE_CANCEL: Cancels offer, restores listing to ACTIVE, cancels pending handover session,
                    and sends official in-app notifications to both students.
    - FORCE_COMPLETE: Force completes deal, marks listing SOLD, verifies handover session,
                      awards trust points, and sends completion notifications.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        action = request.data.get('action', '').strip().upper()
        reason = request.data.get('reason', '').strip()

        try:
            offer = Offer.objects.select_related(
                'listing', 'listing__seller', 'buyer'
            ).prefetch_related('handover_sessions').get(pk=pk)
        except Offer.DoesNotExist:
            return Response({'error': 'Deal / Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        listing = offer.listing
        buyer = offer.buyer
        seller = listing.seller

        if action == 'FORCE_CANCEL':
            if offer.status == 'CANCELLED':
                return Response({'error': 'This deal is already cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                # 1. Invalidate any active handover sessions
                HandoverSession.objects.filter(offer=offer, status='ACTIVE').update(status='CANCELLED')

                # 2. Mark offer CANCELLED
                offer.status = 'CANCELLED'
                offer.save(update_fields=['status', 'updated_at'])

                # 3. Restore listing to ACTIVE if it was reserved/pending
                if listing.status in ['PENDING', 'ACTIVE']:
                    listing.status = 'ACTIVE'
                    listing.save(update_fields=['status', 'updated_at'])

                # 4. Notify both parties
                reason_msg = f" Reason: {reason}" if reason else ""
                Notification.objects.create(
                    recipient=buyer,
                    sender=request.user,
                    notification_type='DEAL_CANCELLED',
                    title=f"Campus Deal Cancelled by Admin: '{listing.title}'",
                    message=f"Campus Administration cancelled deal #{offer.id} for '{listing.title}'.{reason_msg}",
                    listing=listing
                )
                Notification.objects.create(
                    recipient=seller,
                    sender=request.user,
                    notification_type='DEAL_CANCELLED',
                    title=f"Campus Deal Cancelled by Admin: '{listing.title}'",
                    message=f"Campus Administration cancelled deal #{offer.id} for '{listing.title}'. The listing has been restored to Active marketplace.{reason_msg}",
                    listing=listing
                )

            serializer = AdminDealSerializer(offer)
            return Response({
                'success': True,
                'message': f"Deal #{offer.id} cancelled successfully and listing restored to Active.",
                'deal': serializer.data
            })

        elif action == 'FORCE_COMPLETE':
            if offer.status == 'COMPLETED':
                return Response({'error': 'This deal is already marked as completed.'}, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                # 1. Update latest or active HandoverSession
                active_session = offer.handover_sessions.filter(status='ACTIVE').first()
                if not active_session:
                    active_session = offer.handover_sessions.order_by('-created_at').first()

                now = timezone.now()
                if active_session:
                    active_session.status = 'USED'
                    active_session.completed_at = now
                    active_session.save(update_fields=['status', 'completed_at'])

                # Invalidate any other active sessions
                HandoverSession.objects.filter(offer=offer, status='ACTIVE').exclude(pk=getattr(active_session, 'pk', None)).update(status='EXPIRED')

                # 2. Mark offer as COMPLETED
                offer.status = 'COMPLETED'
                offer.save(update_fields=['status', 'updated_at'])

                # 3. Mark listing as SOLD
                listing.status = 'SOLD'
                listing.save(update_fields=['status', 'updated_at'])

                # 4. Award trust points
                try:
                    buyer.trust_score = buyer.calculate_trust_score()
                    buyer.save(update_fields=['trust_score'])
                    seller.trust_score = seller.calculate_trust_score()
                    seller.save(update_fields=['trust_score'])
                except Exception:
                    pass

                # 5. Notify both parties
                reason_msg = f" Note: {reason}" if reason else ""
                Notification.objects.create(
                    recipient=seller,
                    sender=request.user,
                    notification_type='ITEM_SOLD',
                    title=f"Deal Verified & Completed: '{listing.title}' 🎉",
                    message=f"Campus Administration manually verified and completed handover for '{listing.title}'. Item is marked as SOLD.{reason_msg}",
                    listing=listing
                )
                Notification.objects.create(
                    recipient=buyer,
                    sender=request.user,
                    notification_type='ITEM_SOLD',
                    title=f"Purchase Verified & Completed: '{listing.title}' 🎉",
                    message=f"Campus Administration verified handover for '{listing.title}'. The transaction is marked as COMPLETED.{reason_msg}",
                    listing=listing
                )

            serializer = AdminDealSerializer(offer)
            return Response({
                'success': True,
                'message': f"Deal #{offer.id} manually verified and completed. Listing marked as SOLD.",
                'deal': serializer.data
            })

        else:
            return Response({'error': f"Unknown action '{action}'. Allowed actions: FORCE_CANCEL, FORCE_COMPLETE."}, status=status.HTTP_400_BAD_REQUEST)


