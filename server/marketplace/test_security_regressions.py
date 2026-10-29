from types import SimpleNamespace
from unittest.mock import patch
from django.test import SimpleTestCase
from django.core.cache import cache
from rest_framework.response import Response
from marketplace.views import ListingListCreateView
from django.test import override_settings
from rest_framework.exceptions import ValidationError
from marketplace.media_paths import local_media_path, validate_listing_image_url


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


@override_settings(CLOUDINARY_CLOUD_NAME='test-cloud')
class MediaPathSecurityTests(SimpleTestCase):
    def test_traversal_and_non_images_rejected(self):
        for url in ('/media/../../secret.png', '/media/%2e%2e/secret.png',
                    '/media/listings/../../.env', '/media/C:/secret.png',
                    '/media/listings/test.html', '/media/listings/..\\secret.png'):
            with self.assertRaises(ValidationError):
                local_media_path(url)

    def test_listing_cannot_reference_private_or_foreign_assets(self):
        for url in ('https://res.cloudinary.com/test-cloud/image/authenticated/id_cards/a.webp',
                    'https://res.cloudinary.com/other/image/upload/campxchange/listings/a.webp',
                    'https://attacker.test/media/../../secret.png',
                    '/media/id_cards/a.webp'):
            with self.assertRaises(ValidationError):
                validate_listing_image_url(url)

    def test_existing_upload_formats_are_accepted(self):
        for url in ('/media/listings/a.webp', 'http://localhost:8000/media/listings/a.jpg',
                    'https://res.cloudinary.com/test-cloud/image/upload/v123/campxchange/listings/a.webp'):
            self.assertEqual(validate_listing_image_url(url), url)
