from rest_framework import serializers
from .models import Listing, ListingImage, Category

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']

class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ['id', 'image_url', 'is_primary']

class ListingSerializer(serializers.ModelSerializer):
    images = ListingImageSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    seller_name = serializers.CharField(source='seller.first_name', read_only=True)

    class Meta:
        model = Listing
        fields = [
            'id', 'title', 'description', 'price', 'transaction_type',
            'condition', 'location', 'status', 'created_at', 'category',
            'images', 'seller_name'
        ]
