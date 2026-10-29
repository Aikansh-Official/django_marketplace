from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from marketplace.models import Listing
from marketplace.views import ChatMessageListCreateView


class ConversationSecurityTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.seller = User.objects.create_user(username='seller', email='seller@example.test')
        self.buyer = User.objects.create_user(username='buyer', email='buyer@example.test')
        self.other = User.objects.create_user(username='other', email='other@example.test')
        self.listing = Listing.objects.create(seller=self.seller, title='Book', price=100)

    def request(self, user, peer):
        request = APIRequestFactory().get('/chat/')
        force_authenticate(request, user=user)
        return ChatMessageListCreateView.as_view()(request, listing_id=self.listing.pk, peer_id=peer.pk)

    def test_unrelated_peer_details_are_not_disclosed(self):
        self.assertEqual(self.request(self.buyer, self.other).status_code, 403)

    def test_buyer_seller_conversation_remains_available(self):
        response = self.request(self.buyer, self.seller)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['messages'], [])
