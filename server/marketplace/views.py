import logging
import random
import datetime
import django
from django.conf import settings
from django.db import transaction, models
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.throttling import ScopedRateThrottle
from django.db.models import Q, F
from django.utils import timezone

logger = logging.getLogger(__name__)
from django.contrib.auth import get_user_model
User = get_user_model()

from .models import (
    Listing, ListingImage, Category, Offer, Wishlist, ListingReport, PlatformSetting, Notification, FCMDevice, HandoverSession, BroadcastLog, AdminAuditLog, Review, ChatMessage, Banner
)
from .serializers import (
    ListingSerializer, ListingCreateUpdateSerializer, AdminListingUpdateSerializer, CategorySerializer,
    AdminCategorySerializer, OfferSerializer, ListingReportSerializer,
    ListingReportCreateSerializer, PlatformSettingSerializer, NotificationSerializer,
    HandoverSessionSerializer, AdminDealSerializer, BroadcastLogSerializer, AdminAuditLogSerializer,
    ReviewSerializer, ChatMessageSerializer, BannerSerializer, FCMDeviceSerializer, FCMTokenRegisterSerializer
)
from .services.notification_service import NotificationService
from users.serializers import PublicSellerProfileSerializer
from users.permissions import HasAdminModulePermission
from .cloudinary_upload import upload_image_to_cloudinary, delete_image_from_cloudinary


def log_admin_action(request, action, target_type='', target_id='', target_repr='', details=None):
    """
    Centralized, fail-safe audit logging utility.
    Captures admin username, action type, target entity, structured JSON details, IP address, and user agent.
    """
    try:
        user = getattr(request, 'user', None)
        admin_username = user.username if (user and user.is_authenticated) else 'system'

        # Extract client IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')

        user_agent = request.META.get('HTTP_USER_AGENT', '')[:250]

        AdminAuditLog.objects.create(
            admin_user=user if (user and user.is_authenticated) else None,
            admin_username=admin_username,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id else '',
            target_repr=str(target_repr)[:255] if target_repr else '',
            details=details or {},
            ip_address=ip if ip and len(ip) <= 45 else None,
            user_agent=user_agent
        )
    except Exception as e:
        logger.warning(f"Failed to record audit log for action '{action}': {e}")


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Custom permission: only the listing owner can edit/delete."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.seller == request.user


class IsVerifiedSeller(permissions.BasePermission):
    """
    Permission check: Only active, verified Sellers (or staff/superusers) can perform seller actions.
    Explicitly denies Buyers.
    """
    message = "Buyers are not permitted to sell items. Please complete Student ID verification to become a Verified Seller."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        user_role = getattr(request.user, 'role', 'BUYER')
        is_id_verified = getattr(request.user, 'is_id_verified', False)
        return user_role == 'SELLER' and is_id_verified


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
    permission_classes = [HasAdminModulePermission('categories')]

    def get_queryset(self):
        from django.db.models import Count, Q
        return Category.objects.annotate(
            annotated_listings_count=Count('listings', filter=Q(listings__status='ACTIVE')),
            annotated_total_listings=Count('listings')
        ).order_by('name')

    def perform_create(self, serializer):
        from django.core.cache import cache
        instance = serializer.save()
        try:
            cache.clear()
        except Exception:
            pass
        log_admin_action(
            self.request,
            action='CATEGORY_CREATE',
            target_type='CATEGORY',
            target_id=instance.id,
            target_repr=instance.name,
            details={'slug': instance.slug}
        )


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminCategorySerializer
    permission_classes = [HasAdminModulePermission('categories')]
    queryset = Category.objects.all()

    def perform_update(self, serializer):
        from django.core.cache import cache
        instance = serializer.save()
        try:
            cache.clear()
        except Exception:
            pass
        log_admin_action(
            self.request,
            action='CATEGORY_UPDATE',
            target_type='CATEGORY',
            target_id=instance.id,
            target_repr=instance.name,
            details={'updated_fields': list(self.request.data.keys())}
        )

    def destroy(self, request, *args, **kwargs):
        from django.core.cache import cache
        from django.shortcuts import get_object_or_404
        instance = self.get_object()
        listing_count = instance.listings.count()
        cat_id = instance.id
        cat_name = instance.name

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
                log_admin_action(
                    request,
                    action='CATEGORY_DELETE',
                    target_type='CATEGORY',
                    target_id=cat_id,
                    target_repr=cat_name,
                    details={'reassigned_to': target_cat.name, 'affected_listings': listing_count}
                )
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
                log_admin_action(
                    request,
                    action='CATEGORY_DELETE',
                    target_type='CATEGORY',
                    target_id=cat_id,
                    target_repr=cat_name,
                    details={'forced': True, 'affected_listings': listing_count}
                )
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
        log_admin_action(
            request,
            action='CATEGORY_DELETE',
            target_type='CATEGORY',
            target_id=cat_id,
            target_repr=cat_name,
            details={'affected_listings': 0}
        )
        return Response({'message': 'Category deleted successfully.'}, status=status.HTTP_200_OK)


class ListingListCreateView(generics.ListCreateAPIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsVerifiedSeller()]
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

        # Transaction type filter (SELL, DONATE, EXCHANGE)
        transaction_type = self.request.query_params.get('transaction_type')
        if transaction_type and transaction_type != 'ALL':
            if transaction_type == 'EXCHANGE':
                queryset = queryset.filter(Q(transaction_type='EXCHANGE') | Q(is_exchange_allowed=True))
            else:
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

    def list(self, request, *args, **kwargs):
        from django.core.cache import cache
        qp = request.query_params
        is_default_feed = (
            not request.user.is_authenticated and
            not qp.get('search') and
            (not qp.get('category') or qp.get('category') == 'ALL') and
            (not qp.get('condition') or qp.get('condition') == 'ALL') and
            (not qp.get('transaction_type') or qp.get('transaction_type') == 'ALL') and
            (not qp.get('location') or qp.get('location') == 'ALL') and
            not qp.get('min_price') and
            not qp.get('max_price') and
            qp.get('sort', 'newest') == 'newest'
        )

        cache_key = 'cxc_public_default_active_listings_v2'

        if is_default_feed:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data)

        response = super().list(request, *args, **kwargs)

        if is_default_feed and response.status_code == 200:
            cache.set(cache_key, response.data, 15)

        return response

    def post(self, request, *args, **kwargs):
        user = request.user

        # 1. Maintenance Mode Enforcement
        setting_maint = PlatformSetting.objects.filter(key='maintenance_mode').first()
        if setting_maint and setting_maint.value.lower() in ('true', '1') and not (user.is_staff or user.is_superuser):
            msg_setting = PlatformSetting.objects.filter(key='maintenance_message').first()
            msg = msg_setting.value if msg_setting else 'CampXChange is currently undergoing scheduled maintenance. Please check back shortly.'
            return Response({'error': msg, 'maintenance_mode': True}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # 2. Strict Seller Verification Check (Forbid Buyers)
        user_role = getattr(user, 'role', 'BUYER')
        is_seller = (user_role == 'SELLER' and getattr(user, 'is_id_verified', False)) or user.is_staff or user.is_superuser
        if not is_seller or user_role == 'BUYER':
            return Response(
                {
                    'error': 'Buyers are not allowed to post items for sale. Only verified Sellers can sell items. Please complete Student ID verification to become a Seller.',
                    'role': user_role,
                    'can_sell': False,
                    'requires_seller_upgrade': True,
                    'requires_id_verification': not getattr(user, 'is_id_verified', False)
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # 3. Minimum Trust Score Constraint
        setting_min_score = PlatformSetting.objects.filter(key='min_trust_score_to_sell').first()
        min_score = int(setting_min_score.value) if (setting_min_score and setting_min_score.value.isdigit()) else 0
        if min_score > 0 and getattr(user, 'trust_score', 0) < min_score and not (user.is_staff or user.is_superuser):
            return Response({
                'error': f'A minimum trust score of {min_score} is required to post listings on CampXChange. Your current trust score is {getattr(user, "trust_score", 0)}.',
                'current_trust_score': getattr(user, 'trust_score', 0),
                'min_required': min_score
            }, status=status.HTTP_403_FORBIDDEN)

        # 4. Maximum Active Listings Limit
        setting_max = PlatformSetting.objects.filter(key='max_active_listings_per_student').first()
        max_limit = int(setting_max.value) if (setting_max and setting_max.value.isdigit()) else 10
        if max_limit > 0 and not (user.is_staff or user.is_superuser):
            active_count = Listing.objects.filter(seller=user, status='ACTIVE').count()
            if active_count >= max_limit:
                return Response({
                    'error': f'You have reached your maximum active listings limit of {max_limit}. Please complete or close existing listings before posting a new item.',
                    'active_count': active_count,
                    'max_limit': max_limit
                }, status=status.HTTP_400_BAD_REQUEST)

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
        return [permissions.IsAuthenticated(), IsVerifiedSeller(), IsOwnerOrReadOnly()]

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
                instance.views_count = (instance.views_count or 0) + 1
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
    permission_classes = [permissions.IsAuthenticated, IsVerifiedSeller]

    def post(self, request, pk):
        return self.patch(request, pk)

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

        if request.user.is_staff:
            log_admin_action(
                request,
                action='LISTING_HIDE' if new_status == 'HIDDEN' else ('LISTING_ACTIVATE' if new_status == 'ACTIVE' else 'LISTING_UPDATE'),
                target_type='LISTING',
                target_id=listing.id,
                target_repr=listing.title,
                details={'new_status': new_status, 'seller': listing.seller.username if listing.seller else ''}
            )

        serializer = ListingSerializer(listing, context={'request': request})
        return Response(serializer.data)


class AdminListingList(generics.ListAPIView):
    queryset = Listing.objects.all().select_related('seller', 'category').prefetch_related('images').order_by('-created_at')
    serializer_class = ListingSerializer
    permission_classes = [HasAdminModulePermission('listings')]


class AdminListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin view to retrieve, update any field, or delete any listing."""
    queryset = Listing.objects.all().select_related('seller', 'category').prefetch_related('images')
    permission_classes = [HasAdminModulePermission('listings')]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return AdminListingUpdateSerializer
        return ListingSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(ListingSerializer(instance, context={'request': request}).data)

    def perform_update(self, serializer):
        instance = serializer.save()
        log_admin_action(
            self.request,
            action='LISTING_UPDATE',
            target_type='LISTING',
            target_id=instance.id,
            target_repr=instance.title,
            details={'updated_fields': list(self.request.data.keys())}
        )

    def perform_destroy(self, instance):
        listing_id = instance.id
        listing_title = instance.title
        seller_username = instance.seller.username if instance.seller else 'unknown'
        super().perform_destroy(instance)
        log_admin_action(
            self.request,
            action='LISTING_DELETE',
            target_type='LISTING',
            target_id=listing_id,
            target_repr=listing_title,
            details={'seller': seller_username}
        )


class AdminDashboardStatsView(APIView):
    """
    Consolidated single-roundtrip dashboard stats endpoint.
    Runs counts in 1 SQL query and returns only top 5 recent items instead of transferring entire tables.
    """
    permission_classes = [HasAdminModulePermission('dashboard')]

    def get(self, request):
        from django.core.cache import cache
        cache_key = 'admin_dashboard_stats_data'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        from django.contrib.auth import get_user_model
        from users.serializers import UserDashboardSummarySerializer
        User = get_user_model()

        total_students = User.objects.filter(is_staff=False, is_superuser=False).count()
        verified_students = User.objects.filter(is_staff=False, is_superuser=False, is_verified_student=True).count()
        active_listings = Listing.objects.filter(status='ACTIVE').count()
        total_listings = Listing.objects.count()
        completed_deals = Listing.objects.filter(status='SOLD').count()
        pending_reports = ListingReport.objects.filter(status='PENDING').count()

        # Fetch only the top 5 recent listings and students with minimal fields
        recent_listings_qs = Listing.objects.select_related('seller', 'category').prefetch_related('images').order_by('-created_at')[:5]
        recent_students_qs = User.objects.filter(is_staff=False, is_superuser=False).only(
            'id', 'username', 'full_name', 'email', 'is_verified_student', 'trust_score', 'profile_photo', 'profile_picture_url'
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
            uploaded_url = result.get('url')
            if not uploaded_url:
                raise ValueError("Cloudinary upload failed to produce a valid URL")
            return Response({
                'url': uploaded_url,
                'image_url': uploaded_url,
                'public_id': result.get('public_id', ''),
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
                    'image_url': file_url,
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

        # Price logic: negotiable items allow custom proposed amount
        custom_amount = request.data.get('offer_amount')
        if listing.transaction_type == 'DONATE':
            offer_amount = 0
        elif listing.is_negotiable and custom_amount is not None and str(custom_amount).strip() != '':
            try:
                offer_amount = float(custom_amount)
                if offer_amount <= 0:
                    raise ValueError()
            except (ValueError, TypeError):
                return Response({'error': 'Please enter a valid positive offer amount.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            offer_amount = listing.price
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

        NotificationService.send_notification(
            recipient=listing.seller,
            sender=request.user,
            notification_type='BUY_REQUEST',
            priority='HIGH',
            title=f"New Purchase Request for '{listing.title}'",
            message=notif_msg,
            listing=listing,
            link=f"/profile?tab=my-sales&offer={offer.id}",
            extra_data={
                'offer_id': str(offer.id),
                'listing_id': str(listing.id),
                'action': 'BUY_REQUEST',
                'offered_price': str(offer.offer_amount)
            }
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

    def post(self, request, pk):
        return self.patch(request, pk)

    def patch(self, request, pk):
        try:
            offer = Offer.objects.select_related('listing', 'listing__seller', 'buyer').get(pk=pk)
        except Offer.DoesNotExist:
            return Response({'error': 'Purchase request not found'}, status=status.HTTP_404_NOT_FOUND)

        listing = offer.listing
        if listing.seller != request.user:
            return Response({'error': 'Only the seller can respond to purchase requests.'}, status=status.HTTP_403_FORBIDDEN)

        action = request.data.get('action')
        if action not in ['ACCEPT', 'REJECT', 'COUNTER']:
            return Response({'error': 'Action must be ACCEPT, REJECT, or COUNTER.'}, status=status.HTTP_400_BAD_REQUEST)

        seller_display = getattr(request.user, 'full_name', '') or request.user.username

        if action == 'ACCEPT':
            offer.status = 'ACCEPTED'
            offer.save()

            # Reserve the listing
            listing.status = 'PENDING'
            listing.save()

            # Notify the accepted buyer
            NotificationService.send_notification(
                recipient=offer.buyer,
                sender=request.user,
                notification_type='REQUEST_ACCEPTED',
                priority='HIGH',
                title=f"Request Accepted for '{listing.title}'!",
                message=f"{seller_display} accepted your request for '{listing.title}'. Contact the seller to finalize campus pickup.",
                listing=listing,
                link=f"/profile?tab=my-orders&offer={offer.id}"
            )

            # Decline other pending requests for this listing
            other_offers = Offer.objects.filter(listing=listing, status='PENDING').exclude(pk=offer.pk)
            for oth in other_offers:
                oth.status = 'REJECTED'
                oth.save()
                NotificationService.send_notification(
                    recipient=oth.buyer,
                    sender=request.user,
                    notification_type='REQUEST_REJECTED',
                    priority='NORMAL',
                    title=f"Item Reserved: '{listing.title}'",
                    message=f"Another student's request was accepted for '{listing.title}'.",
                    listing=listing,
                    link=f"/product/{listing.id}"
                )

        elif action == 'REJECT':
            offer.status = 'REJECTED'
            offer.save()

            NotificationService.send_notification(
                recipient=offer.buyer,
                sender=request.user,
                notification_type='REQUEST_REJECTED',
                priority='NORMAL',
                title=f"Request Declined for '{listing.title}'",
                message=f"{seller_display} declined your purchase request for '{listing.title}'.",
                listing=listing,
                link=f"/product/{listing.id}"
            )

        elif action == 'COUNTER':
            counter_amount = request.data.get('counter_amount')
            seller_note = request.data.get('seller_note', '').strip()
            if not counter_amount:
                return Response({'error': 'Counter-offer amount is required.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                counter_amount = float(counter_amount)
                if counter_amount <= 0:
                    raise ValueError()
            except (ValueError, TypeError):
                return Response({'error': 'Please enter a valid positive counter amount.'}, status=status.HTTP_400_BAD_REQUEST)

            offer.counter_amount = counter_amount
            offer.seller_note = seller_note
            offer.status = 'COUNTERED'
            offer.save()

            NotificationService.send_notification(
                recipient=offer.buyer,
                sender=request.user,
                notification_type='OFFER_COUNTERED',
                priority='HIGH',
                title=f"Counter-Offer: Rs {counter_amount} for '{listing.title}'",
                message=f"{seller_display} proposed a counter price of Rs {counter_amount} for '{listing.title}'.{f' Note: \"{seller_note}\"' if seller_note else ''}",
                listing=listing,
                link=f"/profile?tab=my-orders&offer={offer.id}",
                extra_data={
                    'offer_id': str(offer.id),
                    'listing_id': str(listing.id),
                    'counter_amount': str(counter_amount),
                    'action': 'OFFER_COUNTERED'
                }
            )

        serializer = OfferSerializer(offer)
        return Response(serializer.data)


class BuyerCounterRespondView(APIView):
    """Buyer accepts or rejects the seller's counter-offer."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            offer = Offer.objects.select_related('listing', 'listing__seller', 'buyer').get(pk=pk)
        except Offer.DoesNotExist:
            return Response({'error': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        if offer.buyer != request.user:
            return Response({'error': 'Only the buyer who made this request can respond.'}, status=status.HTTP_403_FORBIDDEN)

        if offer.status != 'COUNTERED':
            return Response({'error': f'Offer is currently in {offer.status} state, not COUNTERED.'}, status=status.HTTP_400_BAD_REQUEST)

        action = request.data.get('action')
        if action not in ['ACCEPT', 'REJECT']:
            return Response({'error': 'Action must be ACCEPT or REJECT.'}, status=status.HTTP_400_BAD_REQUEST)

        buyer_display = getattr(request.user, 'full_name', '') or request.user.username
        listing = offer.listing

        if action == 'ACCEPT':
            offer.offer_amount = offer.counter_amount
            offer.status = 'ACCEPTED'
            offer.save()

            listing.status = 'PENDING'
            listing.save()

            # Notify seller
            NotificationService.send_notification(
                recipient=listing.seller,
                sender=request.user,
                notification_type='REQUEST_ACCEPTED',
                priority='HIGH',
                title=f"Counter-Offer Accepted for '{listing.title}'!",
                message=f"{buyer_display} accepted your counter-offer of Rs {offer.offer_amount}. Meet on campus to finalize handover.",
                listing=listing,
                link=f"/profile?tab=my-sales&offer={offer.id}"
            )

            # Decline other pending requests for this listing
            other_offers = Offer.objects.filter(listing=listing, status='PENDING').exclude(pk=offer.pk)
            for oth in other_offers:
                oth.status = 'REJECTED'
                oth.save()
        else:
            offer.status = 'REJECTED'
            offer.save()

            NotificationService.send_notification(
                recipient=listing.seller,
                sender=request.user,
                notification_type='REQUEST_REJECTED',
                priority='NORMAL',
                title=f"Counter-Offer Declined for '{listing.title}'",
                message=f"{buyer_display} declined your counter-offer for '{listing.title}'.",
                listing=listing,
                link=f"/profile?tab=my-sales&offer={offer.id}"
            )

        return Response(OfferSerializer(offer).data)


class ReviewCreateView(APIView):
    """Submit a peer review for a completed transaction."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        deal_id = request.data.get('deal_id')
        listing_title = request.data.get('listing_title') or request.data.get('item_title')
        rating = request.data.get('rating')
        comment = request.data.get('comment', '').strip()
        quick_tags = request.data.get('quick_tags', [])

        if not rating:
            return Response({'error': 'Rating is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({'error': 'Rating must be an integer between 1 and 5.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Resolve deal: First try deal_id if valid 24-character ObjectId
        deal = None
        if deal_id and isinstance(deal_id, str) and len(str(deal_id)) == 24:
            try:
                int(str(deal_id), 16)
                deal = Offer.objects.select_related('listing', 'listing__seller', 'buyer').filter(pk=deal_id).first()
            except (ValueError, Exception):
                deal = None

        # 2. Fallback: Search among user's completed deals by listing title or most recent
        if not deal:
            completed_deals = Offer.objects.select_related('listing', 'listing__seller', 'buyer').filter(
                Q(buyer=request.user) | Q(listing__seller=request.user),
                status='COMPLETED'
            ).order_by('-updated_at', '-created_at')

            if listing_title and str(listing_title).strip():
                clean_title = str(listing_title).strip()
                deal = completed_deals.filter(listing__title__iexact=clean_title).first()
                if not deal:
                    deal = completed_deals.filter(listing__title__icontains=clean_title).first()

            if not deal:
                deal = completed_deals.first()

        if not deal:
            return Response({'error': 'Completed trade deal not found for review.'}, status=status.HTTP_404_NOT_FOUND)

        if deal.status != 'COMPLETED':
            return Response({'error': 'Reviews can only be submitted for completed transactions.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in (deal.buyer, deal.listing.seller):
            return Response({'error': 'You can only review deals you participated in.'}, status=status.HTTP_403_FORBIDDEN)

        reviewed_user = deal.listing.seller if request.user == deal.buyer else deal.buyer

        # If review already exists for this deal, update it gracefully
        existing_review = Review.objects.filter(deal=deal, reviewer=request.user).first()
        if existing_review:
            existing_review.rating = rating
            existing_review.comment = comment
            existing_review.quick_tags = quick_tags if isinstance(quick_tags, list) else []
            existing_review.save()
            return Response(ReviewSerializer(existing_review).data, status=status.HTTP_200_OK)

        review = Review.objects.create(
            deal=deal,
            listing=deal.listing,
            reviewer=request.user,
            reviewed_user=reviewed_user,
            rating=rating,
            comment=comment,
            quick_tags=quick_tags if isinstance(quick_tags, list) else []
        )

        # Recalculate recipient's trust score
        reviewed_user.trust_score = reviewed_user.calculate_trust_score()
        reviewed_user.save(update_fields=['trust_score'])

        # Notify reviewed user
        reviewer_display = getattr(request.user, 'full_name', '') or request.user.username
        NotificationService.send_notification(
            recipient=reviewed_user,
            sender=request.user,
            notification_type='NEW_REVIEW',
            priority='NORMAL',
            title=f"New {rating}★ Review from {reviewer_display}",
            message=f'{reviewer_display} left a review for "{deal.listing.title}": "{comment or "Great trade!"}"',
            listing=deal.listing,
            link=f"/profile?tab=reviews"
        )

        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class SellerReviewsListView(generics.ListAPIView):
    """List reviews received by a seller (DPDP compliant: masked reviewer display)."""
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        seller_id = self.kwargs['pk']
        return Review.objects.filter(reviewed_user_id=seller_id).select_related('reviewer', 'listing').order_by('-created_at')


class PublicSellerProfileView(APIView):
    """
    DPDP Act (2023) Compliant Public Seller Profile View.
    Returns sanitized student trader profile + active listings without exposing PII.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            seller = User.objects.get(pk=pk, is_active=True)
        except User.DoesNotExist:
            return Response({'error': 'Seller not found or account is deactivated.'}, status=status.HTTP_404_NOT_FOUND)

        profile_data = PublicSellerProfileSerializer(seller).data

        # Active listings by this seller
        active_listings = Listing.objects.filter(
            seller=seller,
            status='ACTIVE'
        ).select_related('category').prefetch_related('images').order_by('-created_at')

        listings_data = ListingSerializer(active_listings, many=True, context={'request': request}).data

        # DPDP Act (2023) Compliance: Sanitize any nested seller PII in listing objects
        sanitized_seller_stub = {
            'id': profile_data['id'],
            'display_name': profile_data['display_name'],
            'is_verified_student': profile_data.get('is_verified_student', False),
            'trust_score': profile_data.get('trust_score', 0)
        }
        for item in listings_data:
            item['seller'] = sanitized_seller_stub
            item.pop('contact_phone', None)
            item.pop('contact_whatsapp', None)

        # Recent reviews for this seller
        recent_reviews = Review.objects.filter(reviewed_user=seller).select_related('reviewer', 'listing').order_by('-created_at')[:6]
        reviews_data = ReviewSerializer(recent_reviews, many=True).data

        return Response({
            'seller': profile_data,
            'listings': listings_data,
            'active_listings_count': active_listings.count(),
            'recent_reviews': reviews_data
        })


class ChatMessageListCreateView(APIView):
    """
    Real-time student in-app chat thread between buyer and seller.
    Login-gated & listing-scoped for student safety and privacy.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, listing_id, peer_id):
        try:
            listing = Listing.objects.get(pk=listing_id)
            peer = User.objects.get(pk=peer_id, is_active=True)
        except (Listing.DoesNotExist, User.DoesNotExist, Exception):
            return Response({'error': 'Listing or peer user not found.'}, status=status.HTTP_404_NOT_FOUND)

        messages = ChatMessage.objects.filter(
            listing=listing
        ).filter(
            (Q(sender=request.user) & Q(recipient=peer)) |
            (Q(sender=peer) & Q(recipient=request.user))
        ).select_related('sender', 'recipient').order_by('created_at')

        # Mark unread incoming messages as read
        ChatMessage.objects.filter(
            listing=listing,
            sender=peer,
            recipient=request.user,
            is_read=False
        ).update(is_read=True)

        serializer = ChatMessageSerializer(messages, many=True, context={'request': request})
        primary_img = listing.images.filter(is_primary=True).first() or listing.images.first()

        peer_name = (getattr(peer, 'full_name', '') or getattr(peer, 'first_name', '') or peer.username).strip()
        from .media_security import generate_secure_image_url
        raw_peer_photo = getattr(peer, 'profile_photo', None) or getattr(peer, 'profile_picture_url', None)
        peer_avatar = generate_secure_image_url(raw_peer_photo, request=request) if raw_peer_photo else None

        return Response({
            'listing': {
                'id': listing.id,
                'title': listing.title,
                'price': str(listing.price),
                'transaction_type': listing.transaction_type,
                'image': primary_img.image_url if primary_img else None,
                'seller_id': listing.seller_id
            },
            'peer': {
                'id': peer.id,
                'name': peer_name,
                'email': peer.email,
                'avatar': peer_avatar,
                'is_verified': getattr(peer, 'is_id_verified', False)
            },
            'messages': serializer.data
        })

    def post(self, request, listing_id, peer_id):
        try:
            listing = Listing.objects.get(pk=listing_id)
            peer = User.objects.get(pk=peer_id, is_active=True)
        except (Listing.DoesNotExist, User.DoesNotExist, Exception):
            return Response({'error': 'Listing or peer user not found.'}, status=status.HTTP_404_NOT_FOUND)

        message_text = request.data.get('message', '').strip()
        if not message_text:
            return Response({'error': 'Message cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user == peer:
            return Response({'error': 'Cannot send messages to yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        msg = ChatMessage.objects.create(
            listing=listing,
            sender=request.user,
            recipient=peer,
            message=message_text,
            is_read=False
        )

        sender_name = (getattr(request.user, 'full_name', '') or getattr(request.user, 'first_name', '') or request.user.username).strip()

        NotificationService.send_notification(
            recipient=peer,
            sender=request.user,
            notification_type='NEW_CHAT_MESSAGE',
            priority='NORMAL',
            title=f"Message from {sender_name}",
            message=f'Re: "{listing.title}" — {message_text[:80]}',
            listing=listing,
            link=f"/chat/{listing.id}/{request.user.id}",
            extra_data={
                'listing_id': str(listing.id),
                'peer_id': str(request.user.id),
                'sender_id': str(request.user.id),
                'deep_link_type': 'NEW_CHAT_MESSAGE'
            }
        )
        try:
            from django.core.cache import cache
            cache.delete(f"cxc_user_conversations_{request.user.id}")
            cache.delete(f"cxc_user_conversations_{peer.id}")
        except Exception:
            pass

        return Response(ChatMessageSerializer(msg, context={'request': request}).data, status=status.HTTP_201_CREATED)


class UserConversationsView(APIView):
    """Lists all active chat threads for current student."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        from django.core.cache import cache
        cache_key = f"cxc_user_conversations_{user.id}"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        recent_msgs = ChatMessage.objects.filter(
            Q(sender=user) | Q(recipient=user)
        ).select_related('listing', 'sender', 'recipient').order_by('-created_at')

        # Group by (listing_id, peer_id)
        seen = set()
        conversations = []
        for msg in recent_msgs:
            peer = msg.recipient if msg.sender_id == user.id else msg.sender
            key = (msg.listing_id, peer.id)
            if key not in seen:
                seen.add(key)
                primary_img = msg.listing.images.filter(is_primary=True).first() or msg.listing.images.first()
                unread_count = ChatMessage.objects.filter(
                    listing=msg.listing,
                    sender=peer,
                    recipient=user,
                    is_read=False
                ).count()
                peer_name = (getattr(peer, 'full_name', '') or getattr(peer, 'first_name', '') or peer.username).strip()
                from .media_security import generate_secure_image_url
                raw_peer_photo = getattr(peer, 'profile_photo', None) or getattr(peer, 'profile_picture_url', None)
                peer_avatar = generate_secure_image_url(raw_peer_photo, request=request) if raw_peer_photo else None

                conversations.append({
                    'listing_id': msg.listing_id,
                    'listing_title': msg.listing.title,
                    'listing_price': str(msg.listing.price),
                    'listing_image': primary_img.image_url if primary_img else None,
                    'peer_id': peer.id,
                    'peer_name': peer_name,
                    'peer_email': peer.email,
                    'peer_avatar': peer_avatar,
                    'last_message': msg.message,
                    'last_message_time': msg.created_at,
                    'unread_count': unread_count
                })

        cache.set(cache_key, conversations, 10)
        return Response(conversations)


class SearchSuggestionsView(APIView):
    """Real-time autocomplete search suggestions dropdown."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query or len(query) < 2:
            return Response({'listings': [], 'categories': []})

        matched_listings = Listing.objects.filter(
            status='ACTIVE'
        ).filter(
            Q(title__icontains=query) | Q(description__icontains=query) | Q(location__icontains=query)
        ).select_related('category')[:5]

        listings_data = []
        for item in matched_listings:
            img = item.images.filter(is_primary=True).first() or item.images.first()
            listings_data.append({
                'id': item.id,
                'title': item.title,
                'price': str(item.price),
                'transaction_type': item.transaction_type,
                'category': item.category.name if item.category else None,
                'location': item.location,
                'image': img.image_url if img else None
            })

        matched_cats = Category.objects.filter(
            Q(name__icontains=query) | Q(slug__icontains=query)
        )[:4]
        categories_data = [{'id': c.id, 'name': c.name, 'slug': c.slug, 'icon': c.icon} for c in matched_cats]

        return Response({
            'listings': listings_data,
            'categories': categories_data
        })


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Merge personal notifications and global campus announcements
        qs = Notification.objects.filter(
            models.Q(recipient=self.request.user) | models.Q(recipient__isnull=True)
        ).select_related('listing', 'sender').order_by('-created_at')

        tab = self.request.query_params.get('tab', '').upper().strip()
        search = self.request.query_params.get('search', '').strip()

        if tab == 'UNREAD':
            # Personal unread OR global announcements not yet marked read by this student
            qs = qs.filter(
                models.Q(recipient=self.request.user, is_read=False) |
                (models.Q(recipient__isnull=True) & ~models.Q(read_by=self.request.user))
            )
        elif tab in ['OFFERS', 'DEALS']:
            qs = qs.filter(notification_type__in=[
                'BUY_REQUEST', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED',
                'OFFER_COUNTERED', 'HANDOVER_READY', 'ITEM_SOLD', 'DEAL_CANCELLED'
            ])
        elif tab == 'BROADCAST':
            qs = qs.filter(notification_type__in=['BROADCAST', 'DIRECT_WARNING'])
        elif tab == 'CHATS':
            qs = qs.filter(notification_type='NEW_CHAT_MESSAGE')

        if search:
            qs = qs.filter(models.Q(title__icontains=search) | models.Q(message__icontains=search))

        return qs


class UnreadNotificationCountView(APIView):
    """
    Lightweight endpoint returning the accurate total unread notifications count
    for the authenticated student (personal unread + global campus announcements).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        personal_unread = Notification.objects.filter(recipient=request.user, is_read=False).count()
        global_unread = Notification.objects.filter(recipient__isnull=True).exclude(read_by=request.user).count()
        return Response({'unread_count': personal_unread + global_unread})


class RegisterFCMDeviceView(APIView):
    """
    Registers or updates an FCM device token for the authenticated student.
    Compatible with both Web Push VAPID and Android Native FCM payloads.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = FCMTokenRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data['token']
        device_type = serializer.validated_data.get('device_type', 'WEB')
        device_name = serializer.validated_data.get('name', '')

        # Prevent cross-user push leakage when switching accounts on the same device
        FCMDevice.objects.filter(registration_id=token).exclude(user=request.user).update(is_active=False)

        device, created = FCMDevice.objects.update_or_create(
            registration_id=token,
            defaults={
                'user': request.user,
                'device_type': device_type,
                'device_name': device_name,
                'is_active': True,
            }
        )

        logger.info(f"FCM Device {'registered' if created else 'updated'} for user {request.user.email} ({device_type})")
        return Response({
            'success': True,
            'message': 'FCM device registered successfully.',
            'device_id': device.id,
            'device_type': device.device_type,
            'is_active': device.is_active
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class UnregisterFCMDeviceView(APIView):
    """
    Deactivates an FCM device token (e.g., on logout) so the student
    does not receive push notifications on a shared/public browser or device.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = request.data.get('registration_id') or request.data.get('fcm_token')
        if token:
            count = FCMDevice.objects.filter(registration_id=token.strip(), user=request.user).update(is_active=False)
            return Response({'success': True, 'message': f'FCM device token deactivated ({count} device).'})

        # If no token passed, deactivate all web devices for this user
        device_type = request.data.get('device_type', 'WEB')
        count = FCMDevice.objects.filter(user=request.user, device_type=device_type).update(is_active=False)
        return Response({'success': True, 'message': f'FCM devices deactivated ({count} devices).'})


class TestFCMPushView(APIView):
    """
    Test endpoint allowing authenticated users to verify their browser FCM push setup.
    Sends a push notification to all active devices registered for this user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .services.notification_service import get_firebase_app
        is_ready = get_firebase_app()
        devices = list(FCMDevice.objects.filter(user=request.user, is_active=True))
        device_count = len(devices)

        title = request.data.get('title', '🧪 CampXChange Test Alert')
        message = request.data.get('message', 'FCM Push Notifications are working properly in your browser!')
        link = request.data.get('link', '/notifications')

        notif = NotificationService.send_notification(
            recipient=request.user,
            title=title,
            message=message,
            notification_type='GENERAL',
            priority='NORMAL',
            link=link,
            send_push=True
        )

        return Response({
            'success': True,
            'firebase_admin_initialized': is_ready,
            'active_devices_count': device_count,
            'devices': [{'id': d.id, 'device_type': d.device_type, 'name': d.device_name} for d in devices],
            'notification_id': notif.id if notif else None,
            'mode': 'REAL_FCM' if is_ready else 'FALLBACK_SIMULATED',
            'message': 'Test push notification dispatched!' if is_ready else 'Notification saved to DB. Note: Firebase Admin is running in Fallback mode (missing service account credentials).'
        })


class MarkNotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            notif = Notification.objects.get(
                models.Q(pk=pk) & (models.Q(recipient=request.user) | models.Q(recipient__isnull=True))
            )
            if notif.recipient is None:
                notif.read_by.add(request.user)
            else:
                notif.is_read = True
                notif.save(update_fields=['is_read'])
            return Response({'success': True})
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)


class MarkAllNotificationsReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # 1. Mark personal unread notifications
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        # 2. Add student to read_by of all unread global announcements
        global_unread = Notification.objects.filter(recipient__isnull=True).exclude(read_by=request.user)
        for g_notif in global_unread:
            g_notif.read_by.add(request.user)
        return Response({'success': True})


class DeleteNotificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            notif = Notification.objects.get(
                models.Q(pk=pk) & (models.Q(recipient=request.user) | models.Q(recipient__isnull=True))
            )
            if notif.recipient is None:
                # Global announcement: student dismisses it (marks read)
                notif.read_by.add(request.user)
                return Response({'success': True, 'message': 'Announcement dismissed'})
            notif.delete()
            return Response({'success': True})
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)


class ClearAllNotificationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        # Delete all personal notifications
        Notification.objects.filter(recipient=request.user).delete()
        # Dismiss all unread global announcements
        global_notifs = Notification.objects.filter(recipient__isnull=True).exclude(read_by=request.user)
        for g_notif in global_notifs:
            g_notif.read_by.add(request.user)
        return Response({'success': True})


class SubscribeFCMTopicView(APIView):
    """
    Subscribes the authenticated student's device token to specific topics
    (e.g., 'campus_broadcasts') for high-throughput broadcast push notifications.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = request.data.get('token')
        topics = request.data.get('topics', ['campus_broadcasts'])
        if not token:
            return Response({'error': 'FCM token is required'}, status=status.HTTP_400_BAD_REQUEST)

        if isinstance(topics, str):
            topics = [topics]

        from .services.notification_service import NotificationService
        subscribed = []
        for topic in topics:
            res = NotificationService.subscribe_device_to_topic(token.strip(), topic.strip())
            if res:
                subscribed.append(topic)

        return Response({
            'success': True,
            'message': f'Subscribed to {len(subscribed)} topic(s)',
            'subscribed_topics': subscribed
        })


class NotificationPreferencesView(APIView):
    """
    Retrieve or update granular notification preferences for the authenticated student.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import UserNotificationPreference
        from .serializers import UserNotificationPreferenceSerializer
        pref, _ = UserNotificationPreference.objects.get_or_create(user=request.user)
        return Response(UserNotificationPreferenceSerializer(pref).data)

    def patch(self, request):
        from .models import UserNotificationPreference
        from .serializers import UserNotificationPreferenceSerializer
        pref, _ = UserNotificationPreference.objects.get_or_create(user=request.user)
        serializer = UserNotificationPreferenceSerializer(pref, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ListingReportCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ListingReportCreateSerializer(data=request.data)
        if serializer.is_valid():
            report = serializer.save(reporter=request.user)
            return Response(ListingReportSerializer(report).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StudentMyReportsListView(generics.ListAPIView):
    """
    Returns reports submitted by the authenticated student.
    Allows students to track the status (PENDING, RESOLVED, DISMISSED) of their reports.
    """
    serializer_class = ListingReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ListingReport.objects.filter(reporter=self.request.user).select_related(
            'listing', 'listing__seller', 'reported_user', 'reporter'
        ).order_by('-created_at')


class AdminListingReportListView(generics.ListAPIView):
    queryset = ListingReport.objects.all().select_related('reporter', 'listing', 'listing__seller').order_by('-created_at')
    serializer_class = ListingReportSerializer
    permission_classes = [HasAdminModulePermission('reports')]


class AdminListingReportUpdateView(APIView):
    permission_classes = [HasAdminModulePermission('reports')]

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
                    f"CampXChange Moderation Notice: Your listing '{report.listing.title}' received a community violation report "
                    f"for: '{report.reason}'. Please review university guidelines to keep your selling privileges active."
                )
                NotificationService.send_notification(
                    recipient=report.listing.seller,
                    sender=request.user if request.user.is_authenticated else None,
                    notification_type='GENERAL',
                    priority='HIGH',
                    title='⚠️ Official Moderation Warning',
                    message=warn_msg,
                    listing=report.listing,
                    link='/notifications'
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
                    NotificationService.send_notification(
                        recipient=report.listing.seller,
                        sender=request.user if request.user.is_authenticated else None,
                        notification_type='GENERAL',
                        priority='HIGH',
                        title='Listing Taken Down (Hidden)',
                        message=f"Your listing '{report.listing.title}' has been temporarily hidden by administrators following a moderation review.",
                        listing=report.listing,
                        link='/profile?tab=my-listings'
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
                    NotificationService.send_notification(
                        recipient=seller,
                        sender=request.user if request.user.is_authenticated else None,
                        notification_type='GENERAL',
                        priority='HIGH',
                        title='Listing Removed by Moderation',
                        message=f"Your listing '{title}' was removed by campus administrators due to policy violations.",
                        link='/notifications'
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
    permission_classes = [HasAdminModulePermission('reports')]

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

        log_admin_action(
            request,
            action='BANNED_WORDS_UPDATE',
            target_type='SETTING',
            target_id='banned_words',
            target_repr="Keyword Blacklist",
            details={'keywords_count': len(unique_words)}
        )

        return Response({
            'message': f'Banned words list updated successfully ({len(unique_words)} active keywords).',
            'words': unique_words
        })


class AdminPlatformSettingsView(APIView):
    permission_classes = [HasAdminModulePermission('settings')]

    DEFAULT_SETTINGS = {
        'maintenance_mode': 'false',
        'maintenance_message': 'CampXChange is currently undergoing scheduled campus maintenance. Please check back shortly.',
        'allow_registrations': 'true',
        'allowed_domains': '',
        'max_active_listings_per_student': '10',
        'min_trust_score_to_sell': '0',
        'handover_qr_expiry_minutes': '30',
        'otp_daily_limit': '5',
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
        if not (request.user.is_superuser or request.user.effective_admin_role == 'SUPER_ADMIN'):
            return Response({'error': 'Only Super Administrators can modify platform settings.'}, status=status.HTTP_403_FORBIDDEN)

        from django.core.cache import cache
        data = request.data
        for key, value in data.items():
            PlatformSetting.objects.update_or_create(
                key=key,
                defaults={'value': str(value)}
            )
        try:
            cache.delete('public_announcement_data')
            cache.delete('public_platform_config')
            cache.delete('student_community_hub_data')
        except Exception:
            pass

        log_admin_action(
            request,
            action='SETTINGS_UPDATE',
            target_type='SETTING',
            target_id='platform_settings',
            target_repr="Platform Configuration",
            details={'keys_updated': list(data.keys())}
        )

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
            cache.set('public_announcement_data', payload, 300)
        except Exception:
            pass
        return Response(payload)


class PublicPlatformConfigView(APIView):
    """
    Public platform configuration endpoint consumed by client web & mobile apps.
    Synchronizes maintenance mode, listing limits, minimum trust score requirements,
    registration status, and announcement data.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.core.cache import cache
        cached_data = cache.get('public_platform_config')
        if cached_data is not None:
            return Response(cached_data)

        settings_map = dict(AdminPlatformSettingsView.DEFAULT_SETTINGS)
        for s in PlatformSetting.objects.all():
            settings_map[s.key] = s.value

        def to_int(val, default):
            try:
                return int(val)
            except (ValueError, TypeError):
                return default

        payload = {
            'maintenance_mode': str(settings_map.get('maintenance_mode', '')).lower() in ('true', '1'),
            'maintenance_message': settings_map.get('maintenance_message', 'CampXChange is currently undergoing scheduled campus maintenance. Please check back shortly.'),
            'allow_registrations': str(settings_map.get('allow_registrations', 'true')).lower() in ('true', '1'),
            'max_active_listings_per_student': to_int(settings_map.get('max_active_listings_per_student', 10), 10),
            'min_trust_score_to_sell': to_int(settings_map.get('min_trust_score_to_sell', 0), 0),
            'handover_qr_expiry_minutes': to_int(settings_map.get('handover_qr_expiry_minutes', 30), 30),
            'allowed_domains': settings_map.get('allowed_domains', 'lpu.in'),
            'otp_daily_limit': to_int(settings_map.get('otp_daily_limit', 5), 5),
            'version': getattr(settings, 'APP_VERSION', '2.4.0'),
            'announcement': {
                'enabled': str(settings_map.get('announcement_enabled', '')).lower() in ('true', '1'),
                'text': settings_map.get('announcement_text', ''),
                'type': settings_map.get('announcement_type', 'INFO').upper(),
                'link': settings_map.get('announcement_link', ''),
                'dismissible': str(settings_map.get('announcement_dismissible', '')).lower() not in ('false', '0'),
            }
        }
        try:
            cache.set('public_platform_config', payload, 300)
        except Exception:
            pass
        return Response(payload)


class CommunityHubView(APIView):
    """
    Student-facing Community Hub & Leaderboard endpoint.
    Exposes Top Verified Sellers, Campus Meetup Hotspots, and Safe Trading Milestones.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.core.cache import cache
        from django.db.models import Count, Q
        cached_data = cache.get('student_community_hub_data')
        if cached_data is not None:
            return Response(cached_data)

        top_sellers_qs = User.objects.filter(is_staff=False, is_superuser=False).annotate(
            total_listings=Count('listings', distinct=True),
            sold_listings=Count('listings', filter=Q(listings__status='SOLD'), distinct=True),
            completed_deals=Count('listings__offers', filter=Q(listings__offers__status='COMPLETED'), distinct=True)
        ).order_by('-completed_deals', '-trust_score', '-sold_listings')[:10]

        top_sellers = []
        for rank, seller in enumerate(top_sellers_qs, 1):
            prof_photo = getattr(seller, 'profile_photo', None) or ''
            photo_url = getattr(seller, 'profile_picture_url', None) or (
                prof_photo if prof_photo.startswith('http') else None
            )
            top_sellers.append({
                'rank': rank,
                'id': seller.id,
                'username': seller.username,
                'full_name': getattr(seller, 'full_name', None) or seller.get_full_name() or seller.username,
                'trust_score': getattr(seller, 'trust_score', 0),
                'is_verified': getattr(seller, 'is_verified_student', False) or getattr(seller, 'is_id_verified', False),
                'completed_deals': seller.completed_deals,
                'sold_listings': seller.sold_listings,
                'profile_photo': photo_url
            })

        hotspots_raw = Listing.objects.exclude(location__isnull=True).exclude(location__exact='').values('location').annotate(
            total=Count('id'),
            sold=Count('id', filter=Q(status='SOLD'))
        ).order_by('-total')[:6]

        campus_hotspots = [
            {
                'location': h['location'],
                'total_listings': h['total'],
                'sold_listings': h['sold']
            }
            for h in hotspots_raw
        ]

        total_students = User.objects.filter(is_staff=False, is_superuser=False).count()
        total_completed = Offer.objects.filter(status='COMPLETED').count()
        active_listings = Listing.objects.filter(status='ACTIVE').count()

        payload = {
            'top_sellers': top_sellers,
            'hotspots': campus_hotspots,
            'stats': {
                'total_students': total_students,
                'completed_deals': total_completed,
                'active_listings': active_listings
            }
        }
        try:
            cache.set('student_community_hub_data', payload, 60)
        except Exception:
            pass
        return Response(payload)


class GenerateHandoverQRView(APIView):
    """Seller generates dynamic QR code & 6-digit PIN for physical handover."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            offer = Offer.objects.select_related('listing', 'listing__seller', 'buyer').get(pk=pk)
        except Offer.DoesNotExist:
            return Response({'error': 'Deal / Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        if offer.listing.seller != request.user and offer.buyer != request.user:
            return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        session = HandoverSession.objects.filter(offer=offer).order_by('-created_at').first()
        if not session:
            return Response({'error': 'No handover session found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = HandoverSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_200_OK)

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

        # Generate a unique 6-digit pin and configurable TTL
        pin_code = f"{random.randint(100000, 999999)}"
        setting_expiry = PlatformSetting.objects.filter(key='handover_qr_expiry_minutes').first()
        expiry_minutes = int(setting_expiry.value) if (setting_expiry and setting_expiry.value.isdigit()) else 30
        expires_at = timezone.now() + datetime.timedelta(minutes=expiry_minutes)

        session = HandoverSession.objects.create(
            offer=offer,
            pin_code=pin_code,
            expires_at=expires_at,
            status='ACTIVE'
        )

        # Notify buyer
        seller_name = getattr(request.user, 'full_name', '') or request.user.username
        NotificationService.send_notification(
            recipient=offer.buyer,
            sender=request.user,
            notification_type='HANDOVER_READY',
            priority='HIGH',
            title=f"Handover QR Ready for '{offer.listing.title}'",
            message=f"{seller_name} has generated the Handover QR & PIN. Scan or enter PIN to complete your purchase!",
            listing=offer.listing,
            link=f"/profile?tab=my-orders&offer={offer.id}",
            extra_data={
                'deal_id': str(offer.id),
                'offer_id': str(offer.id),
                'listing_id': str(offer.listing.id),
                'deep_link_type': 'HANDOVER_READY'
            }
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
            NotificationService.send_notification(
                recipient=listing.seller,
                sender=request.user,
                notification_type='ITEM_SOLD',
                priority='HIGH',
                title=f"Deal Complete! '{listing.title}' Marked as Sold 🎉",
                message=f"{buyer_name} verified product receipt and confirmed payment. Your item is marked as Sold.",
                listing=listing,
                link=f"/profile?tab=my-sales&offer={offer.id}",
                extra_data={
                    'deal_id': str(offer.id),
                    'offer_id': str(offer.id),
                    'listing_id': str(listing.id),
                    'deep_link_type': 'ITEM_SOLD'
                }
            )

            # 6. Notify Buyer
            NotificationService.send_notification(
                recipient=request.user,
                sender=listing.seller,
                notification_type='ITEM_SOLD',
                priority='HIGH',
                title=f"Purchase Verified for '{listing.title}' 🎉",
                message=f"You completed purchase of '{listing.title}' from {seller_name}. The item is logged in your Purchases.",
                listing=listing,
                link=f"/profile?tab=my-orders&offer={offer.id}",
                extra_data={
                    'deal_id': str(offer.id),
                    'offer_id': str(offer.id),
                    'listing_id': str(listing.id),
                    'deep_link_type': 'ITEM_SOLD'
                }
            )

            return Response({
                'success': True,
                'message': 'Handover successfully verified and confirmed! Listing marked as SOLD.',
                'listing_id': str(listing.id),
                'listing_title': listing.title,
                'deal_id': str(offer.id),
                'trader_name': seller_name
            })


class CancelDealView(APIView):
    """Allows either buyer or seller to cancel an accepted deal or withdraw a pending/countered request, restoring listing to ACTIVE."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            offer = Offer.objects.select_related('listing', 'listing__seller', 'buyer').get(pk=pk)
        except Offer.DoesNotExist:
            return Response({'error': 'Deal not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_seller = (offer.listing.seller == request.user)
        is_buyer = (offer.buyer == request.user)

        if not (is_seller or is_buyer):
            return Response({'error': 'You are not authorized to cancel this request.'}, status=status.HTTP_403_FORBIDDEN)

        if offer.status not in ('ACCEPTED', 'PENDING', 'COUNTERED'):
            return Response({'error': f'Cannot cancel request in {offer.status} status.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            was_accepted = (offer.status == 'ACCEPTED')

            # Invalidate all handover sessions if any exist
            HandoverSession.objects.filter(offer=offer, status='ACTIVE').update(status='CANCELLED')

            offer.status = 'CANCELLED'
            offer.save()

            # Unlock listing back to ACTIVE if it was reserved/pending due to this accepted deal
            listing = offer.listing
            if was_accepted and listing.status == 'PENDING':
                listing.status = 'ACTIVE'
                listing.save()

            canceller_name = getattr(request.user, 'full_name', '') or request.user.username
            recipient = offer.buyer if is_seller else listing.seller

            if was_accepted:
                notif_title = f"Campus Deal Cancelled for '{listing.title}'"
                notif_msg = f"{canceller_name} cancelled the campus deal. The listing is now available again."
            else:
                notif_title = f"Purchase Request Withdrawn for '{listing.title}'"
                notif_msg = f"{canceller_name} has withdrawn their purchase request."

            NotificationService.send_notification(
                recipient=recipient,
                sender=request.user,
                notification_type='DEAL_CANCELLED',
                priority='NORMAL',
                title=notif_title,
                message=notif_msg,
                listing=listing,
                link=f"/product/{listing.id}",
                extra_data={
                    'deal_id': str(offer.id),
                    'offer_id': str(offer.id),
                    'listing_id': str(listing.id),
                    'deep_link_type': 'DEAL_CANCELLED'
                }
            )

        success_msg = 'Deal cancelled and listing restored to Active.' if was_accepted else 'Purchase request withdrawn successfully.'
        return Response({
            'success': True,
            'message': success_msg
        })


class AdminDealListView(generics.ListAPIView):
    """
    Administrator endpoint to monitor all campus deals and offers.
    Supports filtering by status (ALL, PENDING, ACCEPTED, COMPLETED, CANCELLED, REJECTED)
    and searching by buyer, seller, or listing title.
    """
    serializer_class = AdminDealSerializer
    permission_classes = [HasAdminModulePermission('deals')]

    def get_queryset(self):
        queryset = Offer.objects.select_related(
            'listing', 'listing__seller', 'listing__category', 'buyer'
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
    permission_classes = [HasAdminModulePermission('deals')]

    def post(self, request, pk):
        action = request.data.get('action', '').strip().upper()
        reason = request.data.get('reason', '').strip()

        try:
            offer = Offer.objects.select_related(
                'listing', 'listing__seller', 'buyer'
            ).get(pk=pk)
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
                NotificationService.send_notification(
                    recipient=buyer,
                    sender=request.user,
                    notification_type='DEAL_CANCELLED',
                    priority='NORMAL',
                    title=f"Campus Deal Cancelled by Admin: '{listing.title}'",
                    message=f"Campus Administration cancelled deal #{offer.id} for '{listing.title}'.{reason_msg}",
                    listing=listing,
                    link=f"/product/{listing.id}",
                    extra_data={
                        'deal_id': str(offer.id),
                        'offer_id': str(offer.id),
                        'listing_id': str(listing.id),
                        'deep_link_type': 'DEAL_CANCELLED'
                    }
                )
                NotificationService.send_notification(
                    recipient=seller,
                    sender=request.user,
                    notification_type='DEAL_CANCELLED',
                    priority='NORMAL',
                    title=f"Campus Deal Cancelled by Admin: '{listing.title}'",
                    message=f"Campus Administration cancelled deal #{offer.id} for '{listing.title}'. The listing has been restored to Active marketplace.{reason_msg}",
                    listing=listing,
                    link=f"/product/{listing.id}",
                    extra_data={
                        'deal_id': str(offer.id),
                        'offer_id': str(offer.id),
                        'listing_id': str(listing.id),
                        'deep_link_type': 'DEAL_CANCELLED'
                    }
                )

            serializer = AdminDealSerializer(offer)
            log_admin_action(
                request,
                action='DEAL_FORCE_CANCEL',
                target_type='DEAL',
                target_id=offer.id,
                target_repr=f"Deal #{offer.id} ({listing.title})",
                details={'reason': reason, 'buyer': buyer.username, 'seller': seller.username}
            )
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
                NotificationService.send_notification(
                    recipient=seller,
                    sender=request.user,
                    notification_type='ITEM_SOLD',
                    priority='HIGH',
                    title=f"Deal Verified & Completed: '{listing.title}' 🎉",
                    message=f"Campus Administration manually verified and completed handover for '{listing.title}'. Item is marked as SOLD.{reason_msg}",
                    listing=listing,
                    link=f"/profile?tab=my-sales&offer={offer.id}",
                    extra_data={
                        'deal_id': str(offer.id),
                        'offer_id': str(offer.id),
                        'listing_id': str(listing.id),
                        'deep_link_type': 'ITEM_SOLD'
                    }
                )
                NotificationService.send_notification(
                    recipient=buyer,
                    sender=request.user,
                    notification_type='ITEM_SOLD',
                    priority='HIGH',
                    title=f"Purchase Verified & Completed: '{listing.title}' 🎉",
                    message=f"Campus Administration verified handover for '{listing.title}'. The transaction is marked as COMPLETED.{reason_msg}",
                    listing=listing,
                    link=f"/profile?tab=my-orders&offer={offer.id}",
                    extra_data={
                        'deal_id': str(offer.id),
                        'offer_id': str(offer.id),
                        'listing_id': str(listing.id),
                        'deep_link_type': 'ITEM_SOLD'
                    }
                )

            serializer = AdminDealSerializer(offer)
            log_admin_action(
                request,
                action='DEAL_FORCE_COMPLETE',
                target_type='DEAL',
                target_id=offer.id,
                target_repr=f"Deal #{offer.id} ({listing.title})",
                details={'reason': reason, 'buyer': buyer.username, 'seller': seller.username}
            )
            return Response({
                'success': True,
                'message': f"Deal #{offer.id} manually verified and completed. Listing marked as SOLD.",
                'deal': serializer.data
            })

        else:
            return Response({'error': f"Unknown action '{action}'. Allowed actions: FORCE_CANCEL, FORCE_COMPLETE."}, status=status.HTTP_400_BAD_REQUEST)


class AdminBroadcastNotificationView(APIView):
    """
    Administrator endpoint to dispatch campus-wide or role-targeted broadcast announcements,
    and retrieve past broadcast audit logs.
    """
    permission_classes = [HasAdminModulePermission('notifications')]

    def get(self, request):
        logs = BroadcastLog.objects.select_related('sender').order_by('-created_at')[:100]
        serializer = BroadcastLogSerializer(logs, many=True)
        return Response(serializer.data)

    def post(self, request):
        target_audience = request.data.get('target_audience', 'ALL').strip().upper()
        priority = request.data.get('priority', 'NORMAL').strip().upper()
        title = request.data.get('title', '').strip()
        message = request.data.get('message', '').strip()
        link = request.data.get('link', '').strip()

        if not title or not message:
            return Response({'error': 'Title and Message body are required.'}, status=status.HTTP_400_BAD_REQUEST)

        valid_audiences = ['ALL', 'SELLERS', 'BUYERS', 'UNVERIFIED']
        if target_audience not in valid_audiences:
            target_audience = 'ALL'

        valid_priorities = ['NORMAL', 'HIGH', 'URGENT']
        if priority not in valid_priorities:
            priority = 'NORMAL'

        # Filter recipient students based on target audience
        recipients = User.objects.filter(is_active=True)
        if target_audience == 'SELLERS':
            recipients = recipients.filter(role='SELLER')
        elif target_audience == 'BUYERS':
            recipients = recipients.filter(role='BUYER')
        elif target_audience == 'UNVERIFIED':
            recipients = recipients.filter(is_id_verified=False)

        recipients_count = recipients.count()
        if recipients_count == 0:
            return Response({'error': 'No active students found in the selected target audience.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # 1. Create Broadcast Log
            log = BroadcastLog.objects.create(
                sender=request.user,
                target_audience=target_audience,
                priority=priority,
                title=title,
                message=message,
                link=link,
                recipients_count=recipients_count
            )

            # 2. If target audience is ALL, use ExamPoint's single-row Global Campus Broadcast
            if target_audience == 'ALL':
                NotificationService.send_campus_broadcast(
                    title=title,
                    message=message,
                    priority=priority,
                    link=link or '/notifications',
                    sender=request.user,
                    extra_data={'target_audience': target_audience}
                )
            else:
                NotificationService.send_broadcast(
                    recipients=list(recipients),
                    title=title,
                    message=message,
                    priority=priority,
                    link=link or '/notifications',
                    sender=request.user,
                    extra_data={'target_audience': target_audience}
                )

        log_admin_action(
            request,
            action='BROADCAST_SENT',
            target_type='BROADCAST',
            target_id=log.id,
            target_repr=title,
            details={'target_audience': target_audience, 'priority': priority, 'recipients_count': recipients_count}
        )

        serializer = BroadcastLogSerializer(log)
        return Response({
            'success': True,
            'message': f"Broadcast successfully dispatched to {recipients_count} students.",
            'broadcast': serializer.data
        }, status=status.HTTP_201_CREATED)


class AdminDirectNotificationView(APIView):
    """
    Administrator endpoint to dispatch official direct warnings or individual notices
    directly to a specific student account.
    """
    permission_classes = [HasAdminModulePermission('notifications')]

    def post(self, request):
        recipient_id = request.data.get('recipient_id')
        title = request.data.get('title', '').strip()
        message = request.data.get('message', '').strip()
        priority = request.data.get('priority', 'HIGH').strip().upper()
        link = request.data.get('link', '').strip()

        if not recipient_id:
            return Response({'error': 'Recipient student ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not title or not message:
            return Response({'error': 'Title and Message are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student = User.objects.get(pk=recipient_id)
        except User.DoesNotExist:
            return Response({'error': 'Student user not found.'}, status=status.HTTP_404_NOT_FOUND)

        valid_priorities = ['NORMAL', 'HIGH', 'URGENT']
        if priority not in valid_priorities:
            priority = 'HIGH'

        notif = NotificationService.send_notification(
            recipient=student,
            sender=request.user,
            notification_type='DIRECT_WARNING',
            priority=priority,
            title=title,
            message=message,
            link=link or '/notifications'
        )

        log_admin_action(
            request,
            action='DIRECT_NOTICE_SENT',
            target_type='USER',
            target_id=student.id,
            target_repr=f"@{student.username} ({student.full_name or student.username})",
            details={'title': title, 'priority': priority}
        )

        serializer = NotificationSerializer(notif)
        recipient_name = student.full_name or student.username
        return Response({
            'success': True,
            'message': f"Official notice successfully delivered to {recipient_name} (@{student.username}).",
            'notification': serializer.data
        }, status=status.HTTP_201_CREATED)


class AdminNotificationStatsView(APIView):
    """
    Administrator endpoint to fetch notification metrics and audience counts.
    """
    permission_classes = [HasAdminModulePermission('notifications')]

    def get(self, request):
        total_broadcasts = BroadcastLog.objects.count()
        total_students_reached = sum(BroadcastLog.objects.values_list('recipients_count', flat=True)) or 0
        urgent_broadcasts = BroadcastLog.objects.filter(priority='URGENT').count()
        direct_notices_sent = Notification.objects.filter(notification_type='DIRECT_WARNING').count()

        audience_counts = {
            'ALL': User.objects.filter(is_active=True).count(),
            'SELLERS': User.objects.filter(is_active=True, role='SELLER').count(),
            'BUYERS': User.objects.filter(is_active=True, role='BUYER').count(),
            'UNVERIFIED': User.objects.filter(is_active=True, is_id_verified=False).count(),
        }

        return Response({
            'total_broadcasts': total_broadcasts,
            'total_students_reached': total_students_reached,
            'urgent_broadcasts': urgent_broadcasts,
            'direct_notices_sent': direct_notices_sent,
            'audience_counts': audience_counts
        })


class UrgentNotificationView(APIView):
    """
    Endpoint for authenticated student users to check if there is an unread urgent
    administrative alert or campus broadcast requiring immediate modal acknowledgment.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        urgent_notif = Notification.objects.filter(
            models.Q(recipient=request.user, priority='URGENT', is_read=False) |
            (models.Q(recipient__isnull=True, priority='URGENT') & ~models.Q(read_by=request.user))
        ).select_related('sender').order_by('-created_at').first()

        if urgent_notif:
            return Response({
                'urgent': NotificationSerializer(urgent_notif, context={'request': request}).data
            })
        return Response({'urgent': None})


class AdminAnalyticsView(APIView):
    """
    Consolidated Business Intelligence & Analytics Engine for CampXChange Admins.
    Provides KPIs, dual-metric time-series (GMV turnover & deal count),
    student acquisition curve, category breakdown, sell vs donation ratio,
    campus location hotspots, price benchmarks, and top sellers leaderboard.
    """
    permission_classes = [HasAdminModulePermission('analytics')]

    def get(self, request):
        from django.db.models import Count, Sum, Avg, Min, Max, Q
        from datetime import timedelta

        timeframe = request.query_params.get('timeframe', '30d').lower()
        now = timezone.now()

        if timeframe == '7d':
            days_count = 7
            start_date = now - timedelta(days=7)
        elif timeframe == '90d':
            days_count = 90
            start_date = now - timedelta(days=90)
        elif timeframe == 'all':
            days_count = 365
            start_date = None
        else:
            timeframe = '30d'
            days_count = 30
            start_date = now - timedelta(days=30)

        # 1. High-Level Global & Timeframe KPIs
        all_completed_offers = Offer.objects.filter(status='COMPLETED')
        total_all_time_gmv = all_completed_offers.aggregate(total=Sum('offer_amount'))['total'] or 0
        total_all_time_deals = all_completed_offers.count()

        tf_completed_offers = all_completed_offers
        tf_new_students = User.objects.filter(is_staff=False, is_superuser=False)
        tf_listings = Listing.objects.all()

        if start_date:
            tf_completed_offers = tf_completed_offers.filter(created_at__gte=start_date)
            tf_new_students = tf_new_students.filter(date_joined__gte=start_date)
            tf_listings = tf_listings.filter(created_at__gte=start_date)

        tf_gmv = tf_completed_offers.aggregate(total=Sum('offer_amount'))['total'] or 0
        tf_deals = tf_completed_offers.count()
        avg_deal_value = round(float(tf_gmv) / tf_deals, 2) if tf_deals > 0 else (
            round(float(total_all_time_gmv) / total_all_time_deals, 2) if total_all_time_deals > 0 else 0
        )

        total_students_count = User.objects.filter(is_staff=False, is_superuser=False).count()
        verified_students_count = User.objects.filter(is_staff=False, is_superuser=False, is_verified_student=True).count()
        verification_rate = round((verified_students_count / total_students_count * 100), 1) if total_students_count > 0 else 0

        active_listings_count = Listing.objects.filter(status='ACTIVE').count()
        total_listings_count = Listing.objects.count()
        sold_listings_count = Listing.objects.filter(status='SOLD').count()

        # 2. Daily Time Series Generation (for line, bar & area charts)
        series_days = []
        cur_date = (now - timedelta(days=days_count - 1)).date()
        end_date = now.date()
        while cur_date <= end_date:
            series_days.append(cur_date)
            cur_date += timedelta(days=1)

        deals_by_date = {}
        for row in (all_completed_offers.filter(created_at__date__gte=series_days[0])
                    .values('created_at__date')
                    .annotate(count=Count('id'), total_val=Sum('offer_amount'))):
            deals_by_date[row['created_at__date']] = {
                'deals': row['count'],
                'turnover': float(row['total_val'] or 0)
            }

        signups_by_date = {}
        for row in (User.objects.filter(is_staff=False, is_superuser=False, date_joined__date__gte=series_days[0])
                    .values('date_joined__date')
                    .annotate(count=Count('id'))):
            signups_by_date[row['date_joined__date']] = row['count']

        timeline_data = []
        for d in series_days:
            deal_info = deals_by_date.get(d, {'deals': 0, 'turnover': 0})
            signup_count = signups_by_date.get(d, 0)
            timeline_data.append({
                'date': d.strftime('%Y-%m-%d'),
                'label': d.strftime('%d %b'),
                'deals': deal_info['deals'],
                'turnover': deal_info['turnover'],
                'signups': signup_count
            })

        # 3. Category Breakdown
        categories_qs = Category.objects.annotate(
            listing_count=Count('listings', distinct=True),
            active_count=Count('listings', filter=Q(listings__status='ACTIVE'), distinct=True),
            sold_count=Count('listings', filter=Q(listings__status='SOLD'), distinct=True),
            avg_price=Avg('listings__price')
        )
        total_cat_listings = sum(c.listing_count for c in categories_qs) or 1
        category_breakdown = []
        for cat in categories_qs:
            share = round((cat.listing_count / total_cat_listings) * 100, 1)
            category_breakdown.append({
                'id': cat.id,
                'name': cat.name,
                'slug': cat.slug,
                'icon': cat.icon or '',
                'listing_count': cat.listing_count,
                'active_count': cat.active_count,
                'sold_count': cat.sold_count,
                'share_percentage': share,
                'avg_price': round(float(cat.avg_price or 0), 2)
            })
        category_breakdown.sort(key=lambda x: x['listing_count'], reverse=True)

        # 4. Sell vs Donation Distribution
        sell_count = Listing.objects.filter(transaction_type='SELL').count()
        donate_count = Listing.objects.filter(transaction_type='DONATE').count()
        total_types = (sell_count + donate_count) or 1
        sell_vs_donation = {
            'sell_count': sell_count,
            'donate_count': donate_count,
            'sell_percentage': round((sell_count / total_types) * 100, 1),
            'donate_percentage': round((donate_count / total_types) * 100, 1),
            'total_listings': total_listings_count
        }

        # 5. Campus Location Hotspots
        hotspots_raw = Listing.objects.exclude(location__isnull=True).exclude(location__exact='').values('location').annotate(
            total=Count('id'),
            sold=Count('id', filter=Q(status='SOLD'))
        ).order_by('-total')[:8]

        total_location_items = sum(h['total'] for h in hotspots_raw) or 1
        campus_hotspots = []
        for h in hotspots_raw:
            campus_hotspots.append({
                'location': h['location'],
                'total_listings': h['total'],
                'sold_listings': h['sold'],
                'share_percentage': round((h['total'] / total_location_items) * 100, 1)
            })

        # 6. Top Sellers Leaderboard (Ranked Top 10)
        top_sellers_qs = User.objects.filter(is_staff=False, is_superuser=False).annotate(
            total_listings=Count('listings', distinct=True),
            sold_listings=Count('listings', filter=Q(listings__status='SOLD'), distinct=True),
            completed_deals=Count('listings__offers', filter=Q(listings__offers__status='COMPLETED'), distinct=True)
        ).order_by('-completed_deals', '-trust_score', '-sold_listings')[:10]

        top_sellers = []
        for rank, seller in enumerate(top_sellers_qs, 1):
            photo_url = None
            if hasattr(seller, 'profile_picture_url') and seller.profile_picture_url:
                photo_url = seller.profile_picture_url
            elif hasattr(seller, 'profile_photo') and seller.profile_photo and seller.profile_photo.startswith('http'):
                photo_url = seller.profile_photo

            top_sellers.append({
                'rank': rank,
                'id': seller.id,
                'username': seller.username,
                'full_name': seller.full_name or seller.username,
                'email': seller.email,
                'profile_photo': photo_url,
                'trust_score': seller.trust_score,
                'is_verified_student': seller.is_verified_student,
                'is_id_verified': seller.is_id_verified,
                'total_listings': seller.total_listings,
                'sold_listings': seller.sold_listings,
                'completed_deals': seller.completed_deals
            })

        # 7. Category Price Benchmarks
        price_benchmarks = []
        for cat in categories_qs:
            priced_listings = Listing.objects.filter(category=cat, price__gt=0)
            if priced_listings.exists():
                stats = priced_listings.aggregate(
                    min_p=Min('price'),
                    max_p=Max('price'),
                    avg_p=Avg('price')
                )
                price_benchmarks.append({
                    'category_name': cat.name,
                    'min_price': float(stats['min_p'] or 0),
                    'max_price': float(stats['max_p'] or 0),
                    'avg_price': round(float(stats['avg_p'] or 0), 2)
                })

        return Response({
            'timeframe': timeframe,
            'kpis': {
                'total_gmv': float(total_all_time_gmv),
                'timeframe_gmv': float(tf_gmv),
                'total_completed_deals': total_all_time_deals,
                'timeframe_completed_deals': tf_deals,
                'avg_deal_value': avg_deal_value,
                'total_students': total_students_count,
                'verified_students': verified_students_count,
                'verification_rate': verification_rate,
                'active_listings': active_listings_count,
                'total_listings': total_listings_count,
                'sold_listings': sold_listings_count,
                'new_students_timeframe': tf_new_students.count(),
            },
            'timeline': timeline_data,
            'category_breakdown': category_breakdown,
            'sell_vs_donation': sell_vs_donation,
            'campus_hotspots': campus_hotspots,
            'top_sellers': top_sellers,
            'price_benchmarks': price_benchmarks
        })


class AdminAuditLogListView(APIView):
    """
    Query and filter the immutable administrative audit trail.
    Supports filtering by action, admin_username, target_type, date range, and text search.
    Also returns aggregate summary statistics.
    """
    permission_classes = [HasAdminModulePermission('audit_logs')]

    def get(self, request):
        from datetime import timedelta
        qs = AdminAuditLog.objects.select_related('admin_user').all()

        action = request.query_params.get('action')
        admin_username = request.query_params.get('admin_username')
        target_type = request.query_params.get('target_type')
        search = request.query_params.get('search')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if action and action != 'ALL':
            qs = qs.filter(action=action)

        if admin_username:
            qs = qs.filter(admin_username__icontains=admin_username)

        if target_type and target_type != 'ALL':
            qs = qs.filter(target_type=target_type)

        if search:
            qs = qs.filter(
                Q(admin_username__icontains=search) |
                Q(target_repr__icontains=search) |
                Q(target_id__icontains=search) |
                Q(ip_address__icontains=search)
            )

        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        total_count = qs.count()

        # Summary statistics
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        count_24h = AdminAuditLog.objects.filter(created_at__gte=last_24h).count()
        critical_count = AdminAuditLog.objects.filter(
            action__in=['USER_BAN', 'LISTING_DELETE', 'DEAL_FORCE_CANCEL']
        ).count()
        unique_admins = AdminAuditLog.objects.values('admin_username').distinct().count()

        # Paginate / limit to 100 recent entries for performance
        logs = qs.order_by('-created_at')[:100]
        serializer = AdminAuditLogSerializer(logs, many=True)

        return Response({
            'total_count': total_count,
            'count_24h': count_24h,
            'critical_count': critical_count,
            'unique_admins': unique_admins,
            'logs': serializer.data
        })


class AdminSystemHealthView(APIView):
    """
    Real-time System Health, Performance Benchmarking & Security Diagnostics.
    Returns database ping latency, cache latency, storage status, security posture audit,
    and platform risk indicators.
    """
    permission_classes = [HasAdminModulePermission('system_health')]

    def get(self, request):
        import time
        import sys
        import platform
        from datetime import timedelta
        from django.db import connection
        from django.core.cache import cache
        from django.conf import settings

        # 1. Database Ping & Latency Benchmark
        db_start = time.perf_counter()
        db_healthy = True
        db_error = None
        try:
            connection.ensure_connection()
            if hasattr(connection, 'connection') and hasattr(connection.connection, 'admin'):
                connection.connection.admin.command('ping')
            db_latency_ms = round((time.perf_counter() - db_start) * 1000, 2)
        except Exception as e:
            db_healthy = False
            db_error = str(e)
            db_latency_ms = -1

        db_engine = settings.DATABASES['default']['ENGINE'].split('.')[-1]

        # 2. Cache Engine & Benchmark
        cache_start = time.perf_counter()
        cache_healthy = True
        try:
            test_key = '_cxc_health_ping'
            cache.set(test_key, 'pong', 5)
            cache.get(test_key)
            cache_latency_ms = round((time.perf_counter() - cache_start) * 1000, 2)
        except Exception:
            cache_healthy = False
            cache_latency_ms = -1

        # 3. Security Posture Audit
        security_posture = {
            'debug_mode': settings.DEBUG,
            'debug_status': 'SECURE (Off)' if not settings.DEBUG else 'WARNING (Active in Dev)',
            'data_security_middleware': hasattr(settings, 'DATA_SECURITY_KEY') and bool(getattr(settings, 'DATA_SECURITY_KEY', None)),
            'httponly_cookies': getattr(settings, 'SESSION_COOKIE_HTTPONLY', True),
            'rate_limiting_active': True,
            'cors_origins_configured': bool(getattr(settings, 'CORS_ALLOWED_ORIGINS', None) or getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False)),
        }

        # 4. Active Security & Operational Counters
        banned_users_count = User.objects.filter(is_active=False).count()
        unresolved_reports_count = ListingReport.objects.filter(status='PENDING').count()
        banned_words_count = len(get_banned_words())
        recent_admin_actions = AdminAuditLog.objects.filter(created_at__gte=timezone.now() - timedelta(hours=24)).count()

        # Overall Status
        if db_healthy and cache_healthy and db_latency_ms < 200:
            overall_status = 'HEALTHY'
        elif db_healthy:
            overall_status = 'DEGRADED'
        else:
            overall_status = 'CRITICAL'

        return Response({
            'status': overall_status,
            'timestamp': timezone.now().isoformat(),
            'database': {
                'healthy': db_healthy,
                'engine': db_engine,
                'latency_ms': db_latency_ms,
                'error': db_error
            },
            'cache': {
                'healthy': cache_healthy,
                'latency_ms': cache_latency_ms,
            },
            'security': security_posture,
            'metrics': {
                'banned_users_count': banned_users_count,
                'unresolved_reports_count': unresolved_reports_count,
                'banned_words_count': banned_words_count,
                'recent_admin_actions_24h': recent_admin_actions
            },
            'environment': {
                'platform_version': getattr(settings, 'APP_VERSION', '2.4.0'),
                'python_version': sys.version.split()[0],
                'django_version': django.get_version(),
                'os_platform': platform.system(),
                'environment': 'development' if settings.DEBUG else 'production'
            }
        })


# =====================================================================
# BANNER MANAGEMENT SYSTEM (SLIDESHOW CAROUSEL & ADMIN CONTROLS)
# =====================================================================

class PublicBannerListView(generics.ListAPIView):
    """
    Public API consumed by Client Web & Mobile App for Homepage Slideshow.
    Returns all active banners ordered by display_order, then newest first.
    Cached for high-speed dashboard loading.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = BannerSerializer

    def list(self, request, *args, **kwargs):
        from django.core.cache import cache
        cache_key = 'cxc_public_active_banners'
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        queryset = Banner.objects.filter(is_active=True).order_by('display_order', '-created_at')
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        cache.set(cache_key, data, 600)  # 10 minutes cache
        return Response(data)


class AdminBannerListCreateView(APIView):
    """
    Administrative API to view all banners and create new banners.
    Images uploaded via file or base64 are stored directly to Cloudinary (folder='campxchange/banners').
    """
    permission_classes = [HasAdminModulePermission('banners')]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        banners = Banner.objects.all().order_by('display_order', '-created_at')
        serializer = BannerSerializer(banners, many=True)
        return Response(serializer.data)

    def post(self, request):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        image_file = request.FILES.get('image') or request.FILES.get('file')

        if image_file:
            try:
                upload_res = upload_image_to_cloudinary(image_file, folder="campxchange/banners")
                data['image_url'] = upload_res['url']
            except Exception as e:
                logger.error(f"Cloudinary banner upload failed: {e}")
                try:
                    import uuid
                    from django.core.files.storage import default_storage
                    from django.conf import settings
                    ext = image_file.name.split('.')[-1] if (hasattr(image_file, 'name') and '.' in image_file.name) else 'webp'
                    filename = f"banners/{uuid.uuid4().hex}.{ext}"
                    saved_path = default_storage.save(filename, image_file)
                    data['image_url'] = f"{settings.MEDIA_URL}{saved_path}"
                except Exception:
                    return Response({'error': f"Failed to upload image: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
            # Remove file references from data dictionary so serializer doesn't attempt CharField validation
            data.pop('image', None)
            data.pop('file', None)

        # Normalize is_active if string
        if 'is_active' in data:
            if isinstance(data['is_active'], str):
                data['is_active'] = data['is_active'].lower() in ('true', '1', 'yes')

        # Normalize display_order
        if 'display_order' in data:
            try:
                data['display_order'] = int(data['display_order'])
            except (ValueError, TypeError):
                data['display_order'] = 1

        serializer = BannerSerializer(data=data)
        if serializer.is_valid():
            banner = serializer.save()
            log_admin_action(
                request,
                action='BANNER_CREATE',
                target_type='BANNER',
                target_id=banner.id,
                target_repr=banner.title,
                details={
                    'title': banner.title,
                    'image_url': banner.image_url,
                    'link_url': banner.link_url,
                    'is_active': banner.is_active,
                    'display_order': banner.display_order
                }
            )
            return Response(BannerSerializer(banner).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminBannerDetailView(APIView):
    """
    Administrative API to inspect, update (with Cloudinary image replacement),
    toggle active status, or delete a banner.
    """
    permission_classes = [HasAdminModulePermission('banners')]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        banner = get_object_or_404(Banner, pk=pk)
        return Response(BannerSerializer(banner).data)

    def put(self, request, pk):
        return self.patch(request, pk)

    def patch(self, request, pk):
        banner = get_object_or_404(Banner, pk=pk)
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        image_file = request.FILES.get('image') or request.FILES.get('file')

        old_image_url = banner.image_url

        if image_file:
            try:
                upload_res = upload_image_to_cloudinary(image_file, folder="campxchange/banners")
                data['image_url'] = upload_res['url']
                if old_image_url and old_image_url != upload_res['url']:
                    delete_image_from_cloudinary(old_image_url)
            except Exception as e:
                logger.error(f"Cloudinary banner replacement failed: {e}")
                try:
                    import uuid
                    from django.core.files.storage import default_storage
                    from django.conf import settings
                    ext = image_file.name.split('.')[-1] if (hasattr(image_file, 'name') and '.' in image_file.name) else 'webp'
                    filename = f"banners/{uuid.uuid4().hex}.{ext}"
                    saved_path = default_storage.save(filename, image_file)
                    data['image_url'] = f"{settings.MEDIA_URL}{saved_path}"
                except Exception:
                    return Response({'error': f"Failed to upload replacement image: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
            data.pop('image', None)
            data.pop('file', None)

        if 'is_active' in data:
            if isinstance(data['is_active'], str):
                data['is_active'] = data['is_active'].lower() in ('true', '1', 'yes')

        if 'display_order' in data:
            try:
                data['display_order'] = int(data['display_order'])
            except (ValueError, TypeError):
                data['display_order'] = 1

        serializer = BannerSerializer(banner, data=data, partial=True)
        if serializer.is_valid():
            updated_banner = serializer.save()
            if 'image' in data and updated_banner.image_url != old_image_url and old_image_url:
                delete_image_from_cloudinary(old_image_url)

            log_admin_action(
                request,
                action='BANNER_UPDATE',
                target_type='BANNER',
                target_id=banner.id,
                target_repr=banner.title,
                details={
                    'title': updated_banner.title,
                    'is_active': updated_banner.is_active,
                    'display_order': updated_banner.display_order,
                    'updated_fields': list(data.keys())
                }
            )
            return Response(BannerSerializer(updated_banner).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        banner = get_object_or_404(Banner, pk=pk)
        banner_title = banner.title
        banner_image_url = banner.image_url

        if banner_image_url:
            try:
                delete_image_from_cloudinary(banner_image_url)
            except Exception as e:
                logger.warning(f"Failed to delete Cloudinary banner image {banner_image_url}: {e}")

        banner.delete()

        log_admin_action(
            request,
            action='BANNER_DELETE',
            target_type='BANNER',
            target_id=pk,
            target_repr=banner_title,
            details={'deleted_title': banner_title, 'deleted_image_url': banner_image_url}
        )
        return Response({'message': 'Banner deleted successfully'}, status=status.HTTP_200_OK)


# ── Automatic Performance Cache Invalidation Signals ───────────
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

@receiver([post_save, post_delete], sender=Banner)
def invalidate_banner_cache(sender, **kwargs):
    try:
        from django.core.cache import cache
        cache.delete('cxc_public_active_banners')
    except Exception:
        pass

@receiver([post_save, post_delete], sender=Listing)
def invalidate_listing_cache(sender, **kwargs):
    try:
        from django.core.cache import cache
        cache.delete('cxc_public_default_active_listings_v2')
    except Exception:
        pass





