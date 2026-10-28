from rest_framework import serializers
from django.utils import timezone
from .models import (
    Listing, ListingImage, Category, Offer, Wishlist, ListingReport, PlatformSetting, Notification, FCMDevice, HandoverSession, BroadcastLog, AdminAuditLog, Review, ChatMessage, Banner
)
from .cloudinary_upload import (
    upload_base64_to_cloudinary, is_base64_image, is_url
)
from django.contrib.auth import get_user_model

User = get_user_model()

class CategorySimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon']

class CategorySerializer(serializers.ModelSerializer):
    listings_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'listings_count']

    def get_listings_count(self, obj):
        if hasattr(obj, 'annotated_listings_count'):
            return obj.annotated_listings_count
        return obj.listings.filter(status='ACTIVE').count()


class AdminCategorySerializer(serializers.ModelSerializer):
    listings_count = serializers.SerializerMethodField()
    total_listings_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'listings_count', 'total_listings_count']
        extra_kwargs = {
            'slug': {'required': False}
        }

    def get_listings_count(self, obj):
        if hasattr(obj, 'annotated_listings_count'):
            return obj.annotated_listings_count
        return obj.listings.filter(status='ACTIVE').count()

    def get_total_listings_count(self, obj):
        if hasattr(obj, 'annotated_total_listings'):
            return obj.annotated_total_listings
        return obj.listings.count()

    def create(self, validated_data):
        from django.utils.text import slugify
        if not validated_data.get('slug'):
            base_slug = slugify(validated_data.get('name', 'category'))
            slug = base_slug
            counter = 1
            while Category.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data['slug'] = slug
        return super().create(validated_data)


class ListingImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    raw_url = serializers.SerializerMethodField()

    class Meta:
        model = ListingImage
        fields = ['id', 'image_url', 'raw_url', 'is_primary', 'created_at']

    def get_image_url(self, obj):
        from .media_security import generate_secure_image_url
        request = self.context.get('request') if hasattr(self, 'context') else None
        return generate_secure_image_url(obj.image_url, ttl_seconds=86400, request=request)

    def get_raw_url(self, obj):
        from .media_security import extract_raw_source_from_secure_url
        return extract_raw_source_from_secure_url(obj.image_url)

class SellerSerializer(serializers.ModelSerializer):
    """Full seller info — only used in authenticated contexts (e.g. accepted offers)."""
    full_name = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'full_name',
            'email', 'is_verified_student', 'is_id_verified', 'college_domain',
            'trust_score', 'profile_picture_url', 'profile_photo', 'phone_number'
        ]

    def get_full_name(self, obj):
        return getattr(obj, 'full_name', '') or f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def get_profile_picture_url(self, obj):
        from .media_security import generate_secure_image_url
        request = self.context.get('request') if hasattr(self, 'context') else None
        raw = getattr(obj, 'profile_photo', None) or getattr(obj, 'profile_picture_url', None)
        return generate_secure_image_url(raw, request=request)

    def get_profile_photo(self, obj):
        from .media_security import generate_secure_image_url
        request = self.context.get('request') if hasattr(self, 'context') else None
        raw = getattr(obj, 'profile_photo', None) or getattr(obj, 'profile_picture_url', None)
        return generate_secure_image_url(raw, request=request)

class PublicSellerSerializer(serializers.ModelSerializer):
    """Safe seller info — used in public listing responses. Hides email, phone, and registration number."""
    full_name = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'is_verified_student', 'is_id_verified',
            'college_domain', 'trust_score', 'profile_picture_url', 'profile_photo'
        ]

    def get_full_name(self, obj):
        return getattr(obj, 'full_name', '') or f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def get_profile_picture_url(self, obj):
        from .media_security import generate_secure_image_url
        request = self.context.get('request') if hasattr(self, 'context') else None
        raw = getattr(obj, 'profile_photo', None) or getattr(obj, 'profile_picture_url', None)
        return generate_secure_image_url(raw, request=request)

    def get_profile_photo(self, obj):
        from .media_security import generate_secure_image_url
        request = self.context.get('request') if hasattr(self, 'context') else None
        raw = getattr(obj, 'profile_photo', None) or getattr(obj, 'profile_picture_url', None)
        return generate_secure_image_url(raw, request=request)

class ListingSerializer(serializers.ModelSerializer):
    images = ListingImageSerializer(many=True, read_only=True)
    category = CategorySimpleSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False, allow_null=True
    )
    seller = serializers.SerializerMethodField()
    is_seller = serializers.SerializerMethodField()
    is_buyer = serializers.SerializerMethodField()
    offers_count = serializers.SerializerMethodField()
    total_offers_count = serializers.SerializerMethodField()
    completed_offer = serializers.SerializerMethodField()

    discount_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Listing
        fields = [
            'id', 'title', 'description', 'price', 'original_price', 'sale_end_time',
            'discount_percentage', 'is_trusted', 'is_negotiable',
            'transaction_type', 'is_exchange_allowed', 'exchange_preferences',
            'rent_period', 'condition', 'location',
            'contact_preference', 'contact_phone', 'contact_whatsapp',
            'status', 'views_count', 'created_at', 'updated_at',
            'category', 'category_id', 'images', 'seller', 'is_seller', 'is_buyer',
            'offers_count', 'total_offers_count', 'completed_offer'
        ]
        read_only_fields = ['views_count', 'created_at', 'updated_at', 'seller', 'is_seller', 'is_buyer', 'offers_count', 'total_offers_count', 'completed_offer', 'discount_percentage', 'is_trusted']

    def get_seller(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            return SellerSerializer(obj.seller, context=self.context).data
        return PublicSellerSerializer(obj.seller, context=self.context).data

    def get_is_seller(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            return obj.seller_id == user.id
        return False

    def get_is_buyer(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            return obj.offers.filter(buyer=user, status__in=['COMPLETED', 'ACCEPTED']).exists()
        return False

    def get_offers_count(self, obj):
        if hasattr(obj, 'annotated_offers_count'):
            return obj.annotated_offers_count
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and user.is_authenticated and obj.seller_id == user.id:
            return obj.offers.filter(status='PENDING').count()
        return 0

    def get_total_offers_count(self, obj):
        return obj.offers.count()

    def get_completed_offer(self, obj):
        if obj.status == 'SOLD':
            completed = obj.offers.filter(status='COMPLETED').order_by('-created_at').first()
            if completed:
                request = self.context.get('request')
                from .media_security import generate_secure_image_url
                raw_photo = getattr(completed.buyer, 'profile_photo', None) or getattr(completed.buyer, 'profile_picture_url', None)
                return {
                    'id': str(completed.id),
                    'buyer_id': str(completed.buyer.id),
                    'buyer_name': completed.buyer.full_name or completed.buyer.username,
                    'buyer_reg': completed.buyer.username,
                    'buyer_trust_score': completed.buyer.trust_score,
                    'buyer_photo': generate_secure_image_url(raw_photo, request=request),
                    'amount': str(completed.counter_amount or completed.offer_amount or obj.price),
                    'is_exchange_offer': completed.is_exchange_offer,
                    'exchange_item_title': completed.exchange_item_title,
                    'created_at': completed.created_at.isoformat() if completed.created_at else None,
                }
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        is_owner_or_staff = bool(user and user.is_authenticated and (user.is_staff or user.id == instance.seller_id))
        if not is_owner_or_staff:
            data['contact_phone'] = None
            data['contact_whatsapp'] = None
        return data

class ListingCreateUpdateSerializer(serializers.ModelSerializer):
    uploaded_images = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
        help_text="List of image URLs or Base64 data strings"
    )
    primary_image_index = serializers.IntegerField(write_only=True, required=False, default=0)

    class Meta:
        model = Listing
        fields = [
            'id', 'title', 'description', 'price', 'original_price', 'sale_end_time', 'is_negotiable',
            'transaction_type', 'is_exchange_allowed', 'exchange_preferences',
            'rent_period', 'condition', 'location',
            'contact_preference', 'contact_phone', 'contact_whatsapp',
            'status', 'category', 'uploaded_images', 'primary_image_index'
        ]

    def to_internal_value(self, data):
        # Resolve category if passed as integer index (1-8), slug, or name
        if isinstance(data, dict) or hasattr(data, 'get'):
            mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
            cat_val = mutable_data.get('category')
            if cat_val is not None:
                # Check if it's already a 24-character hex ObjectId
                is_valid_oid = False
                if isinstance(cat_val, str) and len(cat_val) == 24:
                    try:
                        int(cat_val, 16)
                        is_valid_oid = True
                    except ValueError:
                        is_valid_oid = False

                if not is_valid_oid:
                    int_mapping = {
                        1: 'books-notes',
                        2: 'fashion-lifestyle',
                        3: 'hostel-room-essentials',
                        4: 'laptops-computers',
                        5: 'mobiles-electronics',
                        6: 'others',
                        7: 'sports-fitness',
                        8: 'stationery-lab-gear',
                    }
                    cat_obj = None
                    try:
                        cat_int = int(cat_val)
                        if cat_int in int_mapping:
                            cat_obj = Category.objects.filter(slug=int_mapping[cat_int]).first()
                    except (ValueError, TypeError):
                        pass

                    if not cat_obj and isinstance(cat_val, str):
                        cat_obj = (
                            Category.objects.filter(slug=cat_val).first() or
                            Category.objects.filter(name__iexact=cat_val).first()
                        )

                    if cat_obj:
                        mutable_data['category'] = str(cat_obj.id)
            data = mutable_data
        return super().to_internal_value(data)

    def validate_uploaded_images(self, value):
        if value and len(value) > 4:
            raise serializers.ValidationError("A maximum of 4 images is allowed per listing.")
        return value

    def validate(self, attrs):
        transaction_type = attrs.get('transaction_type', getattr(self.instance, 'transaction_type', 'SELL'))
        price = attrs.get('price', getattr(self.instance, 'price', 0))

        if transaction_type == 'DONATE':
            attrs['price'] = 0
            attrs['is_negotiable'] = False
        elif transaction_type == 'EXCHANGE':
            attrs['is_exchange_allowed'] = True
            if price is None or price == '' or float(price) < 0:
                attrs['price'] = 0
        elif price is not None and float(price) < 0:
            raise serializers.ValidationError({"price": "Price cannot be negative."})

        original_price = attrs.get('original_price', getattr(self.instance, 'original_price', None))
        if original_price is not None and original_price != '':
            try:
                if float(original_price) < 0:
                    raise serializers.ValidationError({"original_price": "Original price cannot be negative."})
                if price is not None and float(price) > float(original_price) > 0:
                    raise serializers.ValidationError({"original_price": "Original price (MRP) should be greater than or equal to the selling price."})
            except (ValueError, TypeError):
                pass

        return attrs

    def _process_image(self, img_data):
        """
        Process a single image entry:
        - If it's a base64 data URI -> upload to Cloudinary, return the secure URL
        - If it's a local media URL -> upload existing local disk file to Cloudinary if available
        - If it's a regular URL -> unwrap secure proxy to canonical URL and return
        """
        if is_base64_image(img_data):
            try:
                result = upload_base64_to_cloudinary(img_data)
                return result['url']
            except Exception as e:
                # Fallback: decode base64 and save to local storage
                try:
                    import base64
                    import uuid
                    from django.core.files.base import ContentFile
                    from django.core.files.storage import default_storage
                    from django.conf import settings

                    header, data = img_data.split(';base64,')
                    ext = header.split('/')[-1].split('+')[0]
                    file_content = base64.b64decode(data)
                    filename = f"listings/{uuid.uuid4().hex}.{ext}"
                    saved_path = default_storage.save(filename, ContentFile(file_content))
                    return f"{settings.MEDIA_URL}{saved_path}"
                except Exception:
                    # Store base64 data URI directly if local save fails
                    return img_data
        elif is_url(img_data):
            import os
            from django.conf import settings
            from .media_security import extract_raw_source_from_secure_url
            raw_url = extract_raw_source_from_secure_url(img_data)

            # Auto-migrate local /media/ or localhost images to Cloudinary if file exists on disk
            if ('/media/listings/' in raw_url or 'localhost:8000/media/' in raw_url or '127.0.0.1:8000/media/' in raw_url):
                try:
                    from django.core.files.uploadedfile import SimpleUploadedFile
                    from .cloudinary_upload import upload_image_to_cloudinary

                    rel_path = raw_url.split('/media/', 1)[1].split('?')[0]
                    local_disk_path = os.path.join(settings.MEDIA_ROOT, rel_path.replace('/', os.sep))
                    if os.path.isfile(local_disk_path):
                        with open(local_disk_path, 'rb') as f:
                            fname = os.path.basename(local_disk_path)
                            c_type = 'image/png' if fname.endswith('.png') else 'image/webp' if fname.endswith('.webp') else 'image/jpeg'
                            up_file = SimpleUploadedFile(fname, f.read(), content_type=c_type)
                            up_res = upload_image_to_cloudinary(up_file)
                            if up_res and up_res.get('url'):
                                return up_res['url']
                except Exception:
                    pass

            return raw_url
        else:
            raise serializers.ValidationError(
                "Invalid image data. Provide a valid URL or base64 data URI."
            )

    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        primary_index = validated_data.pop('primary_image_index', 0)

        # Seller is set by the view (authenticated user required)
        request = self.context.get('request')
        if not validated_data.get('seller'):
            if not request or not request.user or not request.user.is_authenticated:
                raise serializers.ValidationError("Authentication required to create a listing.")
            validated_data['seller'] = request.user

        # Default fallback contacts from seller profile if left blank
        seller = validated_data['seller']
        if not validated_data.get('contact_phone') and getattr(seller, 'phone_number', None):
            validated_data['contact_phone'] = seller.phone_number
        if not validated_data.get('contact_whatsapp') and getattr(seller, 'phone_number', None):
            validated_data['contact_whatsapp'] = seller.phone_number

        listing = Listing.objects.create(**validated_data)

        # Process and create images
        for index, img_data in enumerate(uploaded_images):
            image_url = self._process_image(img_data)
            ListingImage.objects.create(
                listing=listing,
                image_url=image_url,
                is_primary=(index == primary_index)
            )

        return listing

    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', None)
        primary_index = validated_data.pop('primary_image_index', 0)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if uploaded_images is not None:
            from .media_security import extract_raw_source_from_secure_url
            from .cloudinary_upload import extract_cloudinary_public_id

            # 1. Process and un-wrap incoming images to canonical storage URLs
            canonical_urls = [self._process_image(img_data) for img_data in uploaded_images if img_data]
            if not canonical_urls:
                return instance

            if primary_index >= len(canonical_urls) or primary_index < 0:
                primary_index = 0

            def get_image_key(url):
                """Helper to get unique asset key for comparison (public_id for Cloudinary, normalized path for local)."""
                if not url:
                    return ''
                raw = extract_raw_source_from_secure_url(url)
                pid = extract_cloudinary_public_id(raw)
                if pid:
                    return f"cloudinary:{pid}"
                clean = raw.split('?')[0].replace('http://', 'https://').rstrip('/')
                return f"url:{clean}"

            # Map incoming items to keys
            incoming_keys = [get_image_key(u) for u in canonical_urls]
            incoming_key_set = set(incoming_keys)

            # 2. Inspect existing images attached to this listing
            existing_images = list(instance.images.all())

            # 3. For any existing image NOT retained by user, delete record (triggers Cloudinary cleanup)
            #    For retained images: KEEP THEM in database, DO NOT DELETE!
            retained_existing_by_key = {}
            for old_img in existing_images:
                old_key = get_image_key(old_img.image_url)
                if old_key not in incoming_key_set:
                    # User explicitly removed this image
                    old_img.delete()
                else:
                    # Preserve existing record to avoid destructive delete/recreate cycles
                    retained_existing_by_key[old_key] = old_img

            # 4. Synchronize records for incoming images:
            #    - Retained images: update is_primary and canonical URL in-place
            #    - Newly added images: create new ListingImage record
            for index, clean_url in enumerate(canonical_urls):
                key = incoming_keys[index]
                is_prim = (index == primary_index)
                if key in retained_existing_by_key:
                    existing_record = retained_existing_by_key[key]
                    existing_record.is_primary = is_prim
                    existing_record.image_url = clean_url
                    existing_record.save(update_fields=['is_primary', 'image_url'])
                else:
                    new_record = ListingImage.objects.create(
                        listing=instance,
                        image_url=clean_url,
                        is_primary=is_prim
                    )
                    retained_existing_by_key[key] = new_record

        return instance


class AdminListingUpdateSerializer(ListingCreateUpdateSerializer):
    class Meta(ListingCreateUpdateSerializer.Meta):
        fields = ListingCreateUpdateSerializer.Meta.fields + ['is_trusted']


class HandoverSessionSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source='offer.listing.seller.full_name', read_only=True)
    seller_reg = serializers.CharField(source='offer.listing.seller.username', read_only=True)
    buyer_name = serializers.CharField(source='offer.buyer.full_name', read_only=True)
    buyer_reg = serializers.CharField(source='offer.buyer.username', read_only=True)
    listing_id = serializers.CharField(source='offer.listing.id', read_only=True)
    listing_title = serializers.CharField(source='offer.listing.title', read_only=True)
    listing_price = serializers.DecimalField(source='offer.offer_amount', max_digits=10, decimal_places=2, read_only=True)
    remaining_seconds = serializers.SerializerMethodField()
    offer_status = serializers.CharField(source='offer.status', read_only=True)
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = HandoverSession
        fields = [
            'id', 'offer', 'token', 'pin_code', 'status',
            'expires_at', 'remaining_seconds', 'created_at', 'completed_at',
            'seller_name', 'seller_reg', 'buyer_name', 'buyer_reg',
            'listing_id', 'listing_title', 'listing_price',
            'offer_status', 'is_completed'
        ]
        read_only_fields = fields

    def get_is_completed(self, obj):
        return obj.status == 'USED' or (obj.offer and obj.offer.status == 'COMPLETED') or bool(obj.completed_at)

    def get_remaining_seconds(self, obj):
        if obj.status != 'ACTIVE':
            return 0
        diff = (obj.expires_at - timezone.now()).total_seconds()
        return max(0, int(diff))


class OfferSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    listing_price = serializers.DecimalField(source='listing.price', max_digits=10, decimal_places=2, read_only=True)
    seller_id = serializers.CharField(source='listing.seller.id', read_only=True)
    seller_name = serializers.CharField(source='listing.seller.full_name', read_only=True)
    seller_reg = serializers.CharField(source='listing.seller.username', read_only=True)
    seller_phone = serializers.CharField(source='listing.contact_phone', read_only=True)
    seller_whatsapp = serializers.CharField(source='listing.contact_whatsapp', read_only=True)
    buyer_name = serializers.CharField(source='buyer.full_name', read_only=True)
    buyer_reg = serializers.CharField(source='buyer.username', read_only=True)
    buyer_trust_score = serializers.IntegerField(source='buyer.trust_score', read_only=True)
    buyer_photo = serializers.SerializerMethodField()
    meetup_location = serializers.CharField(source='listing.location', read_only=True)
    listing_image = serializers.SerializerMethodField()
    active_handover = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            'id', 'listing', 'listing_title', 'listing_price', 'listing_image',
            'offer_amount', 'counter_amount', 'seller_note', 'buyer_message',
            'is_exchange_offer', 'exchange_item_title',
            'status', 'created_at',
            'buyer', 'buyer_name', 'buyer_reg', 'buyer_trust_score', 'buyer_photo',
            'seller_id', 'seller_name', 'seller_reg', 'seller_phone', 'seller_whatsapp',
            'meetup_location', 'active_handover'
        ]
        read_only_fields = ['status', 'created_at']

    def get_buyer_photo(self, obj):
        from .media_security import generate_secure_image_url
        request = self.context.get('request') if hasattr(self, 'context') else None
        raw = getattr(obj.buyer, 'profile_photo', None) or getattr(obj.buyer, 'profile_picture_url', None)
        return generate_secure_image_url(raw, request=request)

    def get_listing_image(self, obj):
        img = obj.listing.images.filter(is_primary=True).first() or obj.listing.images.first()
        return img.image_url if img else None

    def get_active_handover(self, obj):
        if obj.status == 'ACCEPTED':
            session = obj.handover_sessions.filter(status='ACTIVE', expires_at__gt=timezone.now()).first()
            if session:
                return HandoverSessionSerializer(session).data
        return None


class NotificationSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    listing_image = serializers.SerializerMethodField()
    sender_name = serializers.CharField(source='sender.full_name', read_only=True, default='')
    sender_username = serializers.CharField(source='sender.username', read_only=True, default='')
    sender_is_staff = serializers.BooleanField(source='sender.is_staff', read_only=True, default=False)
    is_global = serializers.SerializerMethodField()
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'priority', 'title', 'message', 'link',
            'listing', 'listing_title', 'listing_image',
            'sender', 'sender_name', 'sender_username', 'sender_is_staff',
            'extra_data', 'is_global', 'is_read', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_is_global(self, obj):
        return obj.recipient is None

    def get_is_read(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if not user or not user.is_authenticated:
            return obj.is_read
        if obj.recipient is not None:
            return obj.is_read
        return obj.read_by.filter(id=user.id).exists()

    def get_listing_image(self, obj):
        if obj.listing:
            img = obj.listing.images.filter(is_primary=True).first() or obj.listing.images.first()
            return img.image_url if img else None
        return None


class UserNotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import UserNotificationPreference
        model = UserNotificationPreference
        fields = [
            'notify_offers',
            'notify_chats',
            'notify_handover',
            'notify_broadcasts',
            'notify_price_drops',
            'sound_enabled',
            'updated_at'
        ]
        read_only_fields = ['updated_at']


class FCMDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = FCMDevice
        fields = ['id', 'registration_id', 'device_type', 'device_name', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class FCMTokenRegisterSerializer(serializers.Serializer):
    # Support both registration_id and fcm_token parameter names
    registration_id = serializers.CharField(required=False, allow_blank=True)
    fcm_token = serializers.CharField(required=False, allow_blank=True)
    device_type = serializers.ChoiceField(choices=['WEB', 'ANDROID', 'IOS'], default='WEB')
    device_name = serializers.CharField(required=False, allow_blank=True, default='')
    device_model = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        token = attrs.get('registration_id') or attrs.get('fcm_token')
        if not token or not token.strip():
            raise serializers.ValidationError({"token": "Either 'registration_id' or 'fcm_token' is required."})
        attrs['token'] = token.strip()
        attrs['name'] = attrs.get('device_name') or attrs.get('device_model') or ''
        return attrs


class BroadcastLogSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True, default='')
    sender_username = serializers.CharField(source='sender.username', read_only=True, default='')

    class Meta:
        model = BroadcastLog
        fields = [
            'id', 'sender', 'sender_name', 'sender_username',
            'target_audience', 'priority', 'title', 'message', 'link',
            'recipients_count', 'created_at'
        ]
        read_only_fields = fields



class ListingReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.CharField(source='reporter.username', read_only=True)
    reporter_email = serializers.CharField(source='reporter.email', read_only=True)
    reporter_full_name = serializers.CharField(source='reporter.full_name', read_only=True, default='')

    listing_title = serializers.CharField(source='listing.title', read_only=True, default='')
    listing_price = serializers.DecimalField(source='listing.price', max_digits=10, decimal_places=2, read_only=True, default=0)
    listing_status = serializers.CharField(source='listing.status', read_only=True, default='')
    listing_condition = serializers.CharField(source='listing.condition', read_only=True, default='')
    listing_location = serializers.CharField(source='listing.location', read_only=True, default='')
    listing_description = serializers.CharField(source='listing.description', read_only=True, default='')
    listing_image_url = serializers.SerializerMethodField()

    seller_id = serializers.CharField(source='listing.seller.id', read_only=True, default=None)
    seller_username = serializers.CharField(source='listing.seller.username', read_only=True, default='')
    seller_full_name = serializers.CharField(source='listing.seller.full_name', read_only=True, default='')
    seller_email = serializers.CharField(source='listing.seller.email', read_only=True, default='')
    seller_phone = serializers.CharField(source='listing.seller.phone_number', read_only=True, default='')
    seller_trust_score = serializers.IntegerField(source='listing.seller.trust_score', read_only=True, default=0)
    seller_is_active = serializers.BooleanField(source='listing.seller.is_active', read_only=True, default=True)

    reported_user_id = serializers.CharField(source='reported_user.id', read_only=True, default=None)
    reported_user_username = serializers.CharField(source='reported_user.username', read_only=True, default='')
    reported_user_name = serializers.CharField(source='reported_user.get_full_name', read_only=True, default='')

    class Meta:
        model = ListingReport
        fields = [
            'id', 'reporter', 'reporter_username', 'reporter_email', 'reporter_full_name',
            'listing', 'listing_title', 'listing_price', 'listing_status', 'listing_condition',
            'listing_location', 'listing_description', 'listing_image_url',
            'seller_id', 'seller_username', 'seller_full_name', 'seller_email',
            'seller_phone', 'seller_trust_score', 'seller_is_active',
            'reported_user', 'reported_user_id', 'reported_user_username', 'reported_user_name',
            'reason', 'details', 'status', 'created_at', 'resolved_at'
        ]
        read_only_fields = ['reporter', 'created_at', 'resolved_at']

    def get_listing_image_url(self, obj):
        if obj.listing:
            img = obj.listing.images.filter(is_primary=True).first() or obj.listing.images.first()
            return img.image_url if img else None
        return None


class ListingReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingReport
        fields = ['listing', 'reported_user', 'reason', 'details']
        extra_kwargs = {
            'listing': {'required': False, 'allow_null': True},
            'reported_user': {'required': False, 'allow_null': True},
        }

    def validate(self, attrs):
        if not attrs.get('listing') and not attrs.get('reported_user'):
            raise serializers.ValidationError("Either a listing or a reported user must be specified.")
        return attrs


class PlatformSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSetting
        fields = ['key', 'value', 'updated_at']


class AdminDealSerializer(serializers.ModelSerializer):
    listing_id = serializers.CharField(source='listing.id', read_only=True)
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    listing_price = serializers.DecimalField(source='listing.price', max_digits=10, decimal_places=2, read_only=True)
    listing_status = serializers.CharField(source='listing.status', read_only=True)
    listing_condition = serializers.CharField(source='listing.condition', read_only=True)
    listing_location = serializers.CharField(source='listing.location', read_only=True)
    listing_category = serializers.CharField(source='listing.category.name', read_only=True, default='General')
    listing_image = serializers.SerializerMethodField()

    buyer_id = serializers.CharField(source='buyer.id', read_only=True)
    buyer_username = serializers.CharField(source='buyer.username', read_only=True)
    buyer_full_name = serializers.CharField(source='buyer.full_name', read_only=True, default='')
    buyer_email = serializers.CharField(source='buyer.email', read_only=True)
    buyer_phone = serializers.CharField(source='buyer.phone_number', read_only=True, default='')
    buyer_trust_score = serializers.IntegerField(source='buyer.trust_score', read_only=True, default=0)
    buyer_is_verified = serializers.BooleanField(source='buyer.is_id_verified', read_only=True, default=False)
    buyer_is_active = serializers.BooleanField(source='buyer.is_active', read_only=True, default=True)

    seller_id = serializers.CharField(source='listing.seller.id', read_only=True)
    seller_username = serializers.CharField(source='listing.seller.username', read_only=True)
    seller_full_name = serializers.CharField(source='listing.seller.full_name', read_only=True, default='')
    seller_email = serializers.CharField(source='listing.seller.email', read_only=True)
    seller_phone = serializers.SerializerMethodField()
    seller_trust_score = serializers.IntegerField(source='listing.seller.trust_score', read_only=True, default=0)
    seller_is_verified = serializers.BooleanField(source='listing.seller.is_id_verified', read_only=True, default=False)
    seller_is_active = serializers.BooleanField(source='listing.seller.is_active', read_only=True, default=True)

    active_handover = serializers.SerializerMethodField()
    latest_handover = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            'id', 'offer_amount', 'buyer_message', 'status', 'created_at', 'updated_at',
            'listing_id', 'listing_title', 'listing_price', 'listing_status', 'listing_condition',
            'listing_location', 'listing_category', 'listing_image',
            'buyer_id', 'buyer_username', 'buyer_full_name', 'buyer_email', 'buyer_phone',
            'buyer_trust_score', 'buyer_is_verified', 'buyer_is_active',
            'seller_id', 'seller_username', 'seller_full_name', 'seller_email', 'seller_phone',
            'seller_trust_score', 'seller_is_verified', 'seller_is_active',
            'active_handover', 'latest_handover'
        ]
        read_only_fields = fields

    def get_listing_image(self, obj):
        if obj.listing:
            img = obj.listing.images.filter(is_primary=True).first() or obj.listing.images.first()
            return img.image_url if img else None
        return None

    def get_seller_phone(self, obj):
        if not obj.listing:
            return ''
        return obj.listing.contact_phone or getattr(obj.listing.seller, 'phone_number', '') or ''

    def get_active_handover(self, obj):
        session = obj.handover_sessions.filter(status='ACTIVE', expires_at__gt=timezone.now()).first()
        if session:
            return HandoverSessionSerializer(session).data
        return None

    def get_latest_handover(self, obj):
        session = obj.handover_sessions.order_by('-created_at').first()
        if session:
            return HandoverSessionSerializer(session).data
        return None


class AdminAuditLogSerializer(serializers.ModelSerializer):
    admin_name = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AdminAuditLog
        fields = [
            'id', 'admin_user', 'admin_username', 'admin_name',
            'action', 'action_display', 'target_type', 'target_id',
            'target_repr', 'details', 'ip_address', 'user_agent', 'created_at'
        ]
        read_only_fields = fields

    def get_admin_name(self, obj):
        if obj.admin_user:
            return obj.admin_user.full_name or obj.admin_user.username
        return obj.admin_username


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    deal_id = serializers.CharField(source='deal.id', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'deal', 'deal_id', 'listing', 'listing_title',
            'reviewer', 'reviewer_name', 'reviewed_user',
            'rating', 'comment', 'quick_tags', 'created_at'
        ]
        read_only_fields = ['id', 'reviewer', 'reviewed_user', 'listing', 'created_at']

    def get_reviewer_name(self, obj):
        name = (getattr(obj.reviewer, 'full_name', '') or getattr(obj.reviewer, 'first_name', '')).strip()
        if not name:
            return "Campus Trader"
        parts = name.split()
        if len(parts) >= 2:
            return f"{parts[0]} {parts[1][0]}."
        return parts[0]


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'listing', 'sender', 'sender_name',
            'recipient', 'recipient_name', 'message',
            'is_read', 'created_at', 'is_mine'
        ]
        read_only_fields = ['id', 'sender', 'recipient', 'is_read', 'created_at']

    def get_sender_name(self, obj):
        name = (getattr(obj.sender, 'full_name', '') or getattr(obj.sender, 'first_name', '')).strip()
        if not name:
            return f"Student #{obj.sender_id}"
        parts = name.split()
        if len(parts) >= 2:
            return f"{parts[0]} {parts[1][0]}."
        return parts[0]

    def get_recipient_name(self, obj):
        name = (getattr(obj.recipient, 'full_name', '') or getattr(obj.recipient, 'first_name', '')).strip()
        if not name:
            return f"Student #{obj.recipient_id}"
        parts = name.split()
        if len(parts) >= 2:
            return f"{parts[0]} {parts[1][0]}."
        return parts[0]

    def get_is_mine(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.sender_id == request.user.id
        return False


class BannerSerializer(serializers.ModelSerializer):
    image = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Banner
        fields = [
            'id', 'title', 'subtitle', 'badge_text',
            'image_url', 'image', 'link_url', 'button_text',
            'is_active', 'display_order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'image_url': {'required': False, 'allow_blank': True},
        }

    def to_internal_value(self, data):
        # Prevent CharField validation errors when an UploadedFile is passed in 'image'
        if hasattr(data, 'copy'):
            mutable_data = data.copy()
        else:
            mutable_data = dict(data)

        raw_image = mutable_data.get('image')
        if raw_image and not isinstance(raw_image, str):
            mutable_data.pop('image', None)

        return super().to_internal_value(mutable_data)

    def validate(self, attrs):
        image_input = attrs.pop('image', None)
        if image_input:
            if is_base64_image(image_input):
                try:
                    result = upload_base64_to_cloudinary(image_input, folder="campxchange/banners")
                    attrs['image_url'] = result['url']
                except Exception:
                    try:
                        import base64
                        import uuid
                        from django.core.files.base import ContentFile
                        from django.core.files.storage import default_storage
                        from django.conf import settings

                        header, data = image_input.split(';base64,')
                        ext = header.split('/')[-1].split('+')[0]
                        file_content = base64.b64decode(data)
                        filename = f"banners/{uuid.uuid4().hex}.{ext}"
                        saved_path = default_storage.save(filename, ContentFile(file_content))
                        attrs['image_url'] = f"{settings.MEDIA_URL}{saved_path}"
                    except Exception:
                        attrs['image_url'] = image_input
            elif is_url(image_input):
                attrs['image_url'] = image_input

        # Verify image_url is populated either from attrs or existing instance
        if not attrs.get('image_url') and not (self.instance and self.instance.image_url):
            raise serializers.ValidationError({'image': 'Banner image is required. Please upload an image or provide an image URL.'})

        return attrs

