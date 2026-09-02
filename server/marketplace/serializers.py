from rest_framework import serializers
from .models import Listing, ListingImage, Category
from django.contrib.auth import get_user_model

User = get_user_model()

class CategorySerializer(serializers.ModelSerializer):
    listings_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'listings_count']

    def get_listings_count(self, obj):
        return obj.listings.filter(status='ACTIVE').count()

class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ['id', 'image_url', 'is_primary', 'created_at']

class SellerSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'full_name',
            'email', 'is_verified_student', 'college_domain',
            'trust_score', 'profile_picture_url', 'phone_number'
        ]

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.username

class ListingSerializer(serializers.ModelSerializer):
    images = ListingImageSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False, allow_null=True
    )
    seller = SellerSerializer(read_only=True)
    is_seller = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            'id', 'title', 'description', 'price', 'is_negotiable',
            'transaction_type', 'rent_period', 'condition', 'location',
            'contact_preference', 'contact_phone', 'contact_whatsapp',
            'status', 'views_count', 'created_at', 'updated_at',
            'category', 'category_id', 'images', 'seller', 'is_seller'
        ]
        read_only_fields = ['views_count', 'created_at', 'updated_at', 'seller']

    def get_is_seller(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.seller_id == request.user.id
        return False

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

    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        primary_index = validated_data.pop('primary_image_index', 0)
        
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['seller'] = request.user
        else:
            # Fallback to first user for dev/testing if unauthenticated
            first_user = User.objects.first()
            if not first_user:
                first_user = User.objects.create_user(
                    username='lpu_student',
                    email='student@lpu.in',
                    first_name='Anshuman',
                    is_verified_student=True,
                    college_domain='lpu.in'
                )
            validated_data['seller'] = first_user

        # Default fallback contacts from seller profile if left blank
        seller = validated_data['seller']
        if not validated_data.get('contact_phone') and getattr(seller, 'phone_number', None):
            validated_data['contact_phone'] = seller.phone_number
        if not validated_data.get('contact_whatsapp') and getattr(seller, 'phone_number', None):
            validated_data['contact_whatsapp'] = seller.phone_number

        listing = Listing.objects.create(**validated_data)

        # Create images
        for index, img_data in enumerate(uploaded_images):
            ListingImage.objects.create(
                listing=listing,
                image_url=img_data,
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
                ListingImage.objects.create(
                    listing=instance,
                    image_url=img_data,
                    is_primary=(index == primary_index)
                )

        return instance
