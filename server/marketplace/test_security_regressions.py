from types import SimpleNamespace
from unittest.mock import patch
from django.test import SimpleTestCase
from django.core.cache import cache
from rest_framework.response import Response
from marketplace.views import ListingListCreateView


class ListingCacheSecurityTests(SimpleTestCase):
    def test_authenticated_response_never_enters_public_cache(self):
        cache.clear()
        view = ListingListCreateView()
        member = SimpleNamespace(query_params={}, user=SimpleNamespace(is_authenticated=True))
        guest = SimpleNamespace(query_params={}, user=SimpleNamespace(is_authenticated=False))
        with patch('rest_framework.generics.ListCreateAPIView.list', side_effect=[
            Response({'seller_email': 'private@example.test'}), Response({'public': True}),
        ]) as render:
            self.assertIn('seller_email', view.list(member).data)
            self.assertEqual(view.list(guest).data, {'public': True})
            self.assertEqual(view.list(guest).data, {'public': True})
            self.assertEqual(render.call_count, 2)

    def test_member_does_not_receive_cached_guest_response(self):
        cache.set('cxc_public_default_active_listings_v2', {'public': True})
        member = SimpleNamespace(query_params={}, user=SimpleNamespace(is_authenticated=True))
        with patch('rest_framework.generics.ListCreateAPIView.list', return_value=Response({'is_seller': True})):
            self.assertEqual(ListingListCreateView().list(member).data, {'is_seller': True})
