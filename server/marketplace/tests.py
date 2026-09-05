from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Listing, Category, Offer

User = get_user_model()

class MarketplaceSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(
            username='11111111',
            email='seller@lpu.in',
            password='Password123!',
            full_name='Seller Person',
            phone_number='9876543211'
        )
        self.buyer = User.objects.create_user(
            username='22222222',
            email='buyer@lpu.in',
            password='Password123!',
            full_name='Buyer Person',
            phone_number='9876543222'
        )
        self.admin = User.objects.create_superuser(
            username='99999999',
            email='admin@lpu.in',
            password='AdminPassword123!'
        )
        self.category = Category.objects.create(name='Electronics', slug='electronics')
        self.listing = Listing.objects.create(
            title='Scientific Calculator',
            description='Casio fx-991EX in great condition',
            price=800,
            condition='LIKE_NEW',
            location='BH-1',
            seller=self.seller,
            category=self.category,
            status='ACTIVE'
        )

    def test_admin_listings_forbidden_for_anonymous(self):
        res = self.client.get('/api/marketplace/admin/listings/')
        self.assertIn(res.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_admin_listings_forbidden_for_regular_user(self):
        self.client.force_authenticate(user=self.buyer)
        res = self.client.get('/api/marketplace/admin/listings/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_listings_allowed_for_admin(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/marketplace/admin/listings/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_admin_reports_forbidden_for_anonymous(self):
        res = self.client.get('/api/marketplace/admin/reports/')
        self.assertIn(res.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_admin_settings_forbidden_for_anonymous(self):
        res = self.client.get('/api/marketplace/admin/settings/')
        self.assertIn(res.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_public_listing_hides_seller_pii_for_anonymous(self):
        res = self.client.get(f'/api/marketplace/listings/{self.listing.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        seller_data = res.data.get('seller', {})
        # Anonymous users must NOT see phone number or email
        self.assertNotIn('email', seller_data)
        self.assertNotIn('phone_number', seller_data)
        # But should see public fields
        self.assertIn('full_name', seller_data)

    def test_listing_shows_seller_pii_for_authenticated_users(self):
        self.client.force_authenticate(user=self.buyer)
        res = self.client.get(f'/api/marketplace/listings/{self.listing.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        seller_data = res.data.get('seller', {})
        self.assertIn('email', seller_data)
        self.assertIn('phone_number', seller_data)

    def test_cannot_buy_own_listing(self):
        self.client.force_authenticate(user=self.seller)
        res = self.client.post(f'/api/marketplace/listings/{self.listing.id}/offer/', {'message': 'Buying my own item'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot buy your own listing', res.data.get('error', '').lower())
