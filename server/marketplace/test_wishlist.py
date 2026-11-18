from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Category, Listing, Wishlist


class WishlistIsolationTests(TestCase):
    def setUp(self):
        user = get_user_model()
        self.alice = user.objects.create_user(username='10001001', email='alice@example.test', password='test-only')
        self.bob = user.objects.create_user(username='10001002', email='bob@example.test', password='test-only')
        category = Category.objects.create(name='Test Books', slug='test-books')
        self.listing = Listing.objects.create(title='Example', description='Test', price=100, condition='GOOD',
            location='Campus', seller=self.bob, category=category, status='ACTIVE')
        self.client = APIClient()
        self.path = f'/api/marketplace/wishlist/{self.listing.pk}/'

    def test_anonymous_users_cannot_read_or_modify_account_wishlists(self):
        for response in (self.client.get('/api/marketplace/wishlist/'), self.client.put(self.path), self.client.delete(self.path)):
            self.assertIn(response.status_code, (401, 403))

    def test_users_are_isolated_and_upgrade_retains_same_account_wishlist(self):
        self.client.force_authenticate(self.alice)
        self.assertEqual(self.client.put(self.path).status_code, 200)
        self.assertEqual(self.client.put(self.path).status_code, 200)
        self.assertEqual(Wishlist.objects.filter(user=self.alice).count(), 1)
        self.alice.role = 'SELLER'
        self.alice.save(update_fields=['role'])
        self.assertEqual(len(self.client.get('/api/marketplace/wishlist/').data), 1)
        self.client.force_authenticate(self.bob)
        self.assertEqual(len(self.client.get('/api/marketplace/wishlist/').data), 0)
        self.assertEqual(self.client.delete(self.path).status_code, 204)
        self.assertTrue(Wishlist.objects.filter(user=self.alice, listing=self.listing).exists())
        self.client.force_authenticate(self.alice)
        self.assertEqual(self.client.delete(self.path).status_code, 204)
        self.assertEqual(len(self.client.get('/api/marketplace/wishlist/').data), 0)

    def test_invalid_or_inactive_listings_cannot_be_saved(self):
        self.client.force_authenticate(self.alice)
        self.assertEqual(self.client.put('/api/marketplace/wishlist/not-an-id/').status_code, 404)
        self.listing.status = 'SOLD'
        self.listing.save(update_fields=['status'])
        self.assertEqual(self.client.put(self.path).status_code, 404)
