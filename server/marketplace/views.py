from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q, F
from django.utils.text import slugify
from .models import Listing, ListingImage, Category
from .serializers import (
    ListingSerializer, ListingCreateUpdateSerializer, CategorySerializer
)

class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

class ListingListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.AllowAny]

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
        else: # 'newest' default
            queryset = queryset.order_by('-created_at')

        return queryset

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(seller=self.request.user)
        else:
            serializer.save()

class ListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Listing.objects.all().select_related('seller', 'category').prefetch_related('images')
    permission_classes = [permissions.AllowAny]

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
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        status_filter = self.request.query_params.get('status')
        
        if user.is_authenticated:
            queryset = Listing.objects.filter(seller=user).select_related('seller', 'category').prefetch_related('images').order_by('-created_at')
        else:
            # For testing/demo fallback when not authenticated
            queryset = Listing.objects.all().select_related('seller', 'category').prefetch_related('images').order_by('-created_at')

        if status_filter and status_filter != 'ALL':
            queryset = queryset.filter(status=status_filter)

        return queryset

class ToggleListingStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    def patch(self, request, pk):
        try:
            listing = Listing.objects.get(pk=pk)
        except Listing.DoesNotExist:
            return Response({'error': 'Listing not found'}, status=status.HTTP_404_NOT_FOUND)

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

class SeedDataView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        return self.seed()

    def get(self, request):
        return self.seed()

    def seed(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        # 1. Create or get standard categories
        categories_data = [
            {'name': 'Books & Notes', 'slug': 'books-notes', 'icon': 'BookOpen'},
            {'name': 'Laptops & Computers', 'slug': 'laptops-computers', 'icon': 'Laptop'},
            {'name': 'Mobiles & Electronics', 'slug': 'mobiles-electronics', 'icon': 'Smartphone'},
            {'name': 'Cycles & Mobility', 'slug': 'cycles-mobility', 'icon': 'Bike'},
            {'name': 'Hostel & Room Essentials', 'slug': 'hostel-room-essentials', 'icon': 'Home'},
            {'name': 'Fashion & Lifestyle', 'slug': 'fashion-lifestyle', 'icon': 'Shirt'},
            {'name': 'Stationery & Lab Gear', 'slug': 'stationery-lab-gear', 'icon': 'PenTool'},
            {'name': 'Sports & Fitness', 'slug': 'sports-fitness', 'icon': 'Trophy'},
            {'name': 'Others', 'slug': 'others', 'icon': 'Package'},
        ]

        created_categories = {}
        for cat in categories_data:
            category_obj, _ = Category.objects.update_or_create(
                slug=cat['slug'],
                defaults={'name': cat['name'], 'icon': cat['icon']}
            )
            created_categories[cat['slug']] = category_obj

        # 2. Get or create demo student user
        student, _ = User.objects.get_or_create(
            username='anshuman_lpu',
            defaults={
                'email': 'anshuman.singh@lpu.in',
                'first_name': 'Anshuman',
                'last_name': 'Singh',
                'is_verified_student': True,
                'college_domain': 'lpu.in',
                'trust_score': 95,
                'phone_number': '+919876543210',
            }
        )

        student2, _ = User.objects.get_or_create(
            username='priya_sharma',
            defaults={
                'email': 'priya.sharma@lpu.in',
                'first_name': 'Priya',
                'last_name': 'Sharma',
                'is_verified_student': True,
                'college_domain': 'lpu.in',
                'trust_score': 88,
                'phone_number': '+919812345678',
            }
        )

        # 3. Seed listings if count is low
        sample_listings = [
            {
                'seller': student,
                'category': created_categories['cycles-mobility'],
                'title': 'Hero Sprint Pro 21-Speed Gear Cycle',
                'description': 'Excellent condition gear cycle with front suspension, mudguards, and a strong steel lock included. Used for 1 semester to commute from BH-4 to Block 34. Smooth shifting gears and new brake pads.',
                'price': 3800.00,
                'is_negotiable': True,
                'transaction_type': 'SELL',
                'condition': 'LIKE_NEW',
                'location': 'BH-4 Boys Hostel, LPU',
                'contact_preference': 'ALL',
                'contact_phone': '+919876543210',
                'contact_whatsapp': '+919876543210',
                'status': 'ACTIVE',
                'images': [
                    'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=800&q=80'
                ]
            },
            {
                'seller': student2,
                'category': created_categories['books-notes'],
                'title': 'Higher Engineering Mathematics - BS Grewal (44th Edition)',
                'description': 'Official textbook for MTH108 & MTH166 courses. Complete book in crisp condition with clear handwritten formula cheat-sheets included for free inside. No torn pages.',
                'price': 450.00,
                'is_negotiable': False,
                'transaction_type': 'SELL',
                'condition': 'GOOD',
                'location': 'GH-2 Girls Hostel, LPU',
                'contact_preference': 'WHATSAPP',
                'contact_phone': '+919812345678',
                'contact_whatsapp': '+919812345678',
                'status': 'ACTIVE',
                'images': [
                    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80'
                ]
            },
            {
                'seller': student,
                'category': created_categories['mobiles-electronics'],
                'title': 'Casio FX-991EX Classwiz Scientific Calculator',
                'description': 'Original non-programmable Casio scientific calculator approved for all LPU mid-term and end-term exams. High resolution LCD screen, solar + battery powered. Box and manual included.',
                'price': 900.00,
                'is_negotiable': True,
                'transaction_type': 'SELL',
                'condition': 'LIKE_NEW',
                'location': 'Block 34 (Computer Science Dept)',
                'contact_preference': 'ALL',
                'contact_phone': '+919876543210',
                'contact_whatsapp': '+919876543210',
                'status': 'ACTIVE',
                'images': [
                    'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80'
                ]
            },
            {
                'seller': student2,
                'category': created_categories['hostel-room-essentials'],
                'title': 'Bajaj 25L Personal Air Cooler for Hostel Room',
                'description': 'Powerful room cooler with honeycomb cooling pads, 3-speed control, and castors for easy moving. Kept in GH-2, gives chill cooling during summer terms. Selling because graduating.',
                'price': 2200.00,
                'is_negotiable': True,
                'transaction_type': 'SELL',
                'condition': 'GOOD',
                'location': 'GH-2 Girls Hostel, LPU',
                'contact_preference': 'CALL',
                'contact_phone': '+919812345678',
                'contact_whatsapp': '+919812345678',
                'status': 'ACTIVE',
                'images': [
                    'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80'
                ]
            },
            {
                'seller': student,
                'category': created_categories['stationery-lab-gear'],
                'title': 'Mechanical Engineering Mini Drafter & Drawing Sheet Container',
                'description': 'Omega mini-drafter with compass set and waterproof black drawing tube for Engineering Graphics / ED lab. Clean scales and smooth rotation lock.',
                'price': 350.00,
                'is_negotiable': False,
                'transaction_type': 'SELL',
                'condition': 'GOOD',
                'location': 'Uni-Mall / Central Library',
                'contact_preference': 'MEETUP',
                'contact_phone': '+919876543210',
                'contact_whatsapp': '+919876543210',
                'status': 'ACTIVE',
                'images': [
                    'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80'
                ]
            },
            {
                'seller': student2,
                'category': created_categories['laptops-computers'],
                'title': 'Logitech K380 Multi-Device Bluetooth Wireless Keyboard',
                'description': 'Compact wireless keyboard that connects up to 3 devices simultaneously (Laptop, iPad, Phone). Easy switch buttons. Super long 2-year battery life with fresh AAA batteries.',
                'price': 1400.00,
                'is_negotiable': True,
                'transaction_type': 'SELL',
                'condition': 'LIKE_NEW',
                'location': 'Law Gate, LPU',
                'contact_preference': 'ALL',
                'contact_phone': '+919812345678',
                'contact_whatsapp': '+919812345678',
                'status': 'ACTIVE',
                'images': [
                    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80'
                ]
            }
        ]

        # Seed listings if no active listings exist
        if Listing.objects.count() < 3:
            for item in sample_listings:
                images = item.pop('images')
                listing = Listing.objects.create(**item)
                for i, img in enumerate(images):
                    ListingImage.objects.create(
                        listing=listing,
                        image_url=img,
                        is_primary=(i == 0)
                    )

        return Response({
            'status': 'success',
            'categories_count': Category.objects.count(),
            'listings_count': Listing.objects.count()
        })
