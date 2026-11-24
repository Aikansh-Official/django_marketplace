from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from marketplace.models import Listing
from marketplace.views import ChatMessageListCreateView
from marketplace.views import SubscribeFCMTopicView
from marketplace.models import FCMDevice
from unittest.mock import patch


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

    def test_topic_subscription_requires_owned_device_and_public_topic(self):
        token = 'local-test-device-token'
        FCMDevice.objects.create(user=self.other, registration_id=token, is_active=True)
        def subscribe(topics):
            request = APIRequestFactory().post('/subscribe/', {'token': token, 'topics': topics}, format='json')
            force_authenticate(request, user=self.buyer)
            return SubscribeFCMTopicView.as_view()(request)
        with patch('marketplace.services.notification_service.NotificationService.subscribe_device_to_topic', return_value=True) as send:
            self.assertEqual(subscribe(['private-admin']).status_code, 400)
            self.assertEqual(subscribe(['campus_broadcasts']).status_code, 403)
            send.assert_not_called()
            FCMDevice.objects.filter(registration_id=token).update(user=self.buyer)
            self.assertEqual(subscribe(['campus_broadcasts']).status_code, 200)
            send.assert_called_once()
