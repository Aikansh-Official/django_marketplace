from rest_framework import serializers
from django.utils import timezone
from .models import (
    Listing, ListingImage, Category, Offer, Wishlist, ListingReport, PlatformSetting, Notification, HandoverSession
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
    class Meta:
        model = ListingImage
        fields = ['id', 'image_url', 'is_primary', 'created_at']

class SellerSerializer(serializers.ModelSerializer):
    """Full seller info — only used in authenticated contexts (e.g. accepted offers)."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'full_name',
            'email', 'is_verified_student', 'is_id_verified', 'college_domain',
            'trust_score', 'profile_picture_url', 'phone_number'
        ]

    def get_full_name(self, obj):
        return getattr(obj, 'full_name', '') or f"{obj.first_name} {obj.last_name}".strip() or obj.username

class PublicSellerSerializer(serializers.ModelSerializer):
    """Safe seller info — used in public listing responses. Hides email, phone, and registration number."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'is_verified_student', 'is_id_verified',
            'college_domain', 'trust_score', 'profile_picture_url'
        ]

    def get_full_name(self, obj):
        return getattr(obj, 'full_name', '') or f"{obj.first_name} {obj.last_name}".strip() or obj.username

class ListingSerializer(serializers.ModelSerializer):
    images = ListingImageSerializer(many=True, read_only=True)
    category = CategorySimpleSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False, allow_null=True
    )
    seller = serializers.SerializerMethodField()
    is_seller = serializers.SerializerMethodField()
    offers_count = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            'id', 'title', 'description', 'price', 'is_negotiable',
            'transaction_type', 'rent_period', 'condition', 'location',
            'contact_preference', 'contact_phone', 'contact_whatsapp',
            'status', 'views_count', 'created_at', 'updated_at',
            'category', 'category_id', 'images', 'seller', 'is_seller',
            'offers_count'
        ]
        read_only_fields = ['views_count', 'created_at', 'updated_at', 'seller', 'offers_count']

    def get_seller(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return SellerSerializer(obj.seller).data
        return PublicSellerSerializer(obj.seller).data

    def get_is_seller(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.seller_id == request.user.id
        return False

    def get_offers_count(self, obj):
        if hasattr(obj, 'annotated_offers_count'):
            return obj.annotated_offers_count
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated and obj.seller_id == request.user.id:
            return obj.offers.filter(status='PENDING').count()
        return 0

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        is_auth = bool(request and request.user and request.user.is_authenticated)
        if not is_auth:
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
            'id', 'title', 'description', 'price', 'is_negotiable',
            'transaction_type', 'rent_period', 'condition', 'location',
            'contact_preference', 'contact_phone', 'contact_whatsapp',
            'status', 'category', 'uploaded_images', 'primary_image_index'
        ]

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
        elif price is not None and float(price) < 0:
            raise serializers.ValidationError({"price": "Price cannot be negative."})

        return attrs

    def _process_image(self, img_data):
        """
        Process a single image entry:
        - If it's a base64 data URI → upload to Cloudinary, return the URL
        - If it's a regular URL → return as-is
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
            return img_data
        else:
            raise serializers.ValidationError(
                "Invalid image data. Provide a valid URL or base64 data URI."
            )

    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        primary_index = validated_data.pop('primary_image_index', 0)

        # Seller is set by the view (authenticated user required)
        request = self.context.get('request')
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
            # If new images provided, replace existing images
            instance.images.all().delete()
            for index, img_data in enumerate(uploaded_images):
                image_url = self._process_image(img_data)
                ListingImage.objects.create(
                    listing=instance,
                    image_url=image_url,
                    is_primary=(index == primary_index)
                )

        return instance


class HandoverSessionSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source='offer.listing.seller.full_name', read_only=True)
    seller_reg = serializers.CharField(source='offer.listing.seller.username', read_only=True)
    buyer_name = serializers.CharField(source='offer.buyer.full_name', read_only=True)
    buyer_reg = serializers.CharField(source='offer.buyer.username', read_only=True)
    listing_id = serializers.IntegerField(source='offer.listing.id', read_only=True)
    listing_title = serializers.CharField(source='offer.listing.title', read_only=True)
    listing_price = serializers.DecimalField(source='offer.offer_amount', max_digits=10, decimal_places=2, read_only=True)
    remaining_seconds = serializers.SerializerMethodField()

    class Meta:
        model = HandoverSession
        fields = [
            'id', 'offer', 'token', 'pin_code', 'status',
            'expires_at', 'remaining_seconds', 'created_at', 'completed_at',
            'seller_name', 'seller_reg', 'buyer_name', 'buyer_reg',
            'listing_id', 'listing_title', 'listing_price'
        ]
        read_only_fields = fields

    def get_remaining_seconds(self, obj):
        if obj.status != 'ACTIVE':
            return 0
        diff = (obj.expires_at - timezone.now()).total_seconds()
        return max(0, int(diff))


class OfferSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    listing_price = serializers.DecimalField(source='listing.price', max_digits=10, decimal_places=2, read_only=True)
    seller_id = serializers.IntegerField(source='listing.seller.id', read_only=True)
    seller_name = serializers.CharField(source='listing.seller.full_name', read_only=True)
    seller_reg = serializers.CharField(source='listing.seller.username', read_only=True)
    seller_phone = serializers.CharField(source='listing.contact_phone', read_only=True)
    seller_whatsapp = serializers.CharField(source='listing.contact_whatsapp', read_only=True)
    buyer_name = serializers.CharField(source='buyer.full_name', read_only=True)
    buyer_reg = serializers.CharField(source='buyer.username', read_only=True)
    buyer_trust_score = serializers.IntegerField(source='buyer.trust_score', read_only=True)
    meetup_location = serializers.CharField(source='listing.location', read_only=True)
    listing_image = serializers.SerializerMethodField()
    active_handover = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            'id', 'listing', 'listing_title', 'listing_price', 'listing_image',
            'offer_amount', 'buyer_message', 'status', 'created_at',
            'buyer', 'buyer_name', 'buyer_reg', 'buyer_trust_score',
            'seller_id', 'seller_name', 'seller_reg', 'seller_phone', 'seller_whatsapp',
            'meetup_location', 'active_handover'
        ]
        read_only_fields = ['status', 'created_at']

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

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message',
            'listing', 'listing_title', 'listing_image', 'is_read', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_listing_image(self, obj):
        if obj.listing:
            img = obj.listing.images.filter(is_primary=True).first() or obj.listing.images.first()
            return img.image_url if img else None
        return None


class ListingReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.CharField(source='reporter.username', read_only=True)
    reporter_email = serializers.CharField(source='reporter.email', read_only=True)
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    listing_seller = serializers.CharField(source='listing.seller.username', read_only=True)

    class Meta:
        model = ListingReport
        fields = [
            'id', 'reporter', 'reporter_username', 'reporter_email',
            'listing', 'listing_title', 'listing_seller',
            'reason', 'details', 'status', 'created_at', 'resolved_at'
        ]
        read_only_fields = ['reporter', 'created_at', 'resolved_at']


class ListingReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingReport
        fields = ['listing', 'reason', 'details']


class PlatformSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSetting
        fields = ['key', 'value', 'updated_at']
