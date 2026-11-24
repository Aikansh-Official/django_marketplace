from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TransactionTestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from marketplace.models import Listing, ListingImage, Offer, Wishlist
from users.models import OTPVerification, PasswordResetToken


@override_settings(ALLOWED_HOSTS=['example.org', 'localhost'])
class AccountImageReferenceTests(SimpleTestCase):
    def test_legacy_local_and_owned_urls_require_followup(self):
        from .account_deletion import _is_owned_media_needing_followup
        self.assertTrue(_is_owned_media_needing_followup('/media/profiles/old.webp'))
        self.assertTrue(_is_owned_media_needing_followup('https://example.org/media/profiles/old.webp'))
        self.assertTrue(_is_owned_media_needing_followup('https://res.cloudinary.com/example/image/upload/old.webp'))

    def test_external_avatar_and_inline_data_do_not_trigger_warning(self):
        from .account_deletion import _is_owned_media_needing_followup
        self.assertFalse(_is_owned_media_needing_followup('https://avatar.example.net/media/avatar.png'))
        self.assertFalse(_is_owned_media_needing_followup('data:image/png;base64,YQ=='))


class DeleteAccountTests(TransactionTestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='12345678', email='delete-test@example.org', password='StrongPassword!123',
            web_session_id='test-web-session')
        self.other = get_user_model().objects.create_user(
            username='87654321', email='other-test@example.org', password='StrongPassword!123')
        self.listing = Listing.objects.create(
            seller=self.other, title='Other seller listing', description='Test listing', location='Campus')
        self.own_listing = Listing.objects.create(
            seller=self.user, title='Own listing', description='Test listing', location='Campus')
        self.saved = Wishlist.objects.create(user=self.user, listing=self.listing)
        self.other_saved = Wishlist.objects.create(user=self.other, listing=self.listing)
        self.offer = Offer.objects.create(buyer=self.user, listing=self.listing, offer_amount=1)
        self.client = APIClient()

    def delete(self, payload):
        return self.client.delete('/api/auth/account/', payload, format='json')

    def test_anonymous_is_denied(self):
        response = self.delete({'password': 'StrongPassword!123', 'confirmation': 'DELETE'})
        self.assertIn(response.status_code, (401, 403))
        self.assertTrue(get_user_model().objects.filter(pk=self.user.pk).exists())

    def test_wrong_password_or_confirmation_cannot_delete(self):
        self.client.force_authenticate(self.user)
        for payload in ({'password': 'wrong', 'confirmation': 'DELETE'},
                        {'password': 'StrongPassword!123', 'confirmation': 'delete'},
                        {'password': '', 'confirmation': 'DELETE'}):
            self.assertEqual(self.delete(payload).status_code, 400)
        self.assertTrue(get_user_model().objects.filter(pk=self.user.pk).exists())
        self.assertTrue(Listing.objects.filter(pk=self.own_listing.pk).exists())

    def test_database_failure_rolls_back_earlier_cleanup(self):
        OTPVerification.objects.create(email=self.user.email, otp='irrelevant')
        self.client.force_authenticate(self.user)
        with patch.object(get_user_model(), 'delete', side_effect=RuntimeError('simulated failure')):
            response = self.delete({'password': 'StrongPassword!123', 'confirmation': 'DELETE'})
        self.assertEqual(response.status_code, 503)
        self.assertTrue(get_user_model().objects.filter(pk=self.user.pk).exists())
        self.assertTrue(OTPVerification.objects.filter(email=self.user.email).exists())

    def test_rollback_preserves_listing_and_its_stored_image(self):
        from marketplace.mongodb_media import _files
        files = _files()
        key = 'd' * 48
        files.put(b'listing-test', _id=key,
                  metadata={'folder': 'campxchange/listings', 'private': False})
        listing_image = ListingImage.objects.create(
            listing=self.own_listing, image_url=f'/media/mongodb/{key}.webp')
        self.client.force_authenticate(self.user)
        original_delete = get_user_model().delete

        def delete_then_fail(user, *args, **kwargs):
            original_delete(user, *args, **kwargs)
            raise RuntimeError('simulated failure after cascade')

        with patch.object(get_user_model(), 'delete', delete_then_fail):
            response = self.delete({'password': 'StrongPassword!123', 'confirmation': 'DELETE'})
        self.assertEqual(response.status_code, 503)
        self.assertTrue(ListingImage.objects.filter(pk=listing_image.pk).exists())
        self.assertEqual(files.get(key).read(), b'listing-test')

    def test_rollback_preserves_private_images_after_user_delete(self):
        from marketplace.mongodb_media import _files
        files = _files()
        key = 'f' * 48
        files.put(b'private-id-test', _id=key,
                  metadata={'folder': 'campxchange/id_cards', 'private': True})
        self.user.id_card_image = f'/media/mongodb/{key}.webp'
        self.user.save(update_fields=['id_card_image'])
        self.client.force_authenticate(self.user)
        original_delete = get_user_model().delete

        def delete_then_fail(user, *args, **kwargs):
            original_delete(user, *args, **kwargs)
            raise RuntimeError('simulated failure after account cascade')

        with patch.object(get_user_model(), 'delete', delete_then_fail):
            response = self.delete({'password': 'StrongPassword!123', 'confirmation': 'DELETE'})
        self.assertEqual(response.status_code, 503)
        self.assertEqual(files.get(key).read(), b'private-id-test')
        self.assertTrue(get_user_model().objects.filter(email=self.user.email).exists())

    def test_owned_listing_image_is_removed_after_successful_commit(self):
        from gridfs.errors import NoFile
        from marketplace.mongodb_media import _files
        files = _files()
        key = 'e' * 48
        files.put(b'listing-test', _id=key,
                  metadata={'folder': 'campxchange/listings', 'private': False})
        ListingImage.objects.create(listing=self.own_listing, image_url=f'/media/mongodb/{key}.webp')
        self.client.force_authenticate(self.user)
        response = self.delete({'password': 'StrongPassword!123', 'confirmation': 'DELETE'})
        self.assertEqual(response.status_code, 200, response.data)
        with self.assertRaises(NoFile):
            files.get(key)

    @patch('marketplace.signals.delete_image_from_cloudinary', return_value=False)
    def test_listing_storage_failure_is_reported(self, storage_delete):
        key = '1' * 48
        ListingImage.objects.create(listing=self.own_listing, image_url=f'/media/mongodb/{key}.webp')
        self.client.force_authenticate(self.user)
        response = self.delete({'password': 'StrongPassword!123', 'confirmation': 'DELETE'})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn('warning', response.data)
        storage_delete.assert_called_once()

    def test_shared_listing_image_is_preserved_without_warning(self):
        from marketplace.mongodb_media import _files
        files = _files()
        key = '2' * 48
        reference = f'/media/mongodb/{key}.webp'
        files.put(b'shared-listing-test', _id=key,
                  metadata={'folder': 'campxchange/listings', 'private': False})
        ListingImage.objects.create(listing=self.own_listing, image_url=reference)
        ListingImage.objects.create(listing=self.listing, image_url=reference)
        self.client.force_authenticate(self.user)
        response = self.delete({'password': 'StrongPassword!123', 'confirmation': 'DELETE'})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn('warning', response.data)
        self.assertEqual(files.get(key).read(), b'shared-listing-test')

    def test_missing_listing_image_does_not_report_failure(self):
        key = '3' * 48
        ListingImage.objects.create(listing=self.own_listing, image_url=f'/media/mongodb/{key}.webp')
        self.client.force_authenticate(self.user)
        response = self.delete({'password': 'StrongPassword!123', 'confirmation': 'DELETE'})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn('warning', response.data)

    @patch('users.account_deletion.cleanup_account_images', return_value=True)
    def test_deletes_only_self_and_related_records_and_invalidates_tokens(self, cleanup):
        token = RefreshToken.for_user(self.user)
        token['client_type'] = 'web'
        token['session_id'] = 'test-web-session'
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
        OTPVerification.objects.create(email=self.user.email, otp='irrelevant')
        PasswordResetToken.objects.create(email=self.user.email, token='delete-test-token')
        response = self.delete({'password': 'StrongPassword!123', 'confirmation': 'DELETE',
                                'user_id': str(self.other.pk)})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(get_user_model().objects.filter(pk=self.user.pk).exists())
        self.assertTrue(get_user_model().objects.filter(pk=self.other.pk).exists())
        self.assertFalse(Listing.objects.filter(pk=self.own_listing.pk).exists())
        self.assertTrue(Listing.objects.filter(pk=self.listing.pk).exists())
        self.assertFalse(Wishlist.objects.filter(pk=self.saved.pk).exists())
        self.assertTrue(Wishlist.objects.filter(pk=self.other_saved.pk).exists())
        self.assertFalse(Offer.objects.filter(pk=self.offer.pk).exists())
        self.assertFalse(OTPVerification.objects.filter(email=self.user.email).exists())
        self.assertFalse(PasswordResetToken.objects.filter(email=self.user.email).exists())
        cleanup.assert_called_once()
        self.assertIn(self.client.post('/api/auth/token/refresh/', {'refresh': str(token)}, format='json').status_code,
                      (401, 403))

    @patch('users.account_deletion.cleanup_account_images', return_value=False)
    def test_reports_when_storage_cleanup_is_incomplete(self, cleanup):
        self.client.force_authenticate(self.user)
        response = self.delete({'password': 'StrongPassword!123', 'confirmation': 'DELETE'})
        self.assertEqual(response.status_code, 200)
        self.assertIn('warning', response.data)
        cleanup.assert_called_once()

    def test_removes_private_id_and_profile_images_from_gridfs(self):
        from gridfs.errors import NoFile
        from marketplace.mongodb_media import _files
        files = _files()
        id_key, photo_key = 'a' * 48, 'b' * 48
        files.put(b'private-id-test', _id=id_key, metadata={'folder': 'campxchange/id_cards', 'private': True})
        files.put(b'profile-test', _id=photo_key, metadata={'folder': 'campxchange/profiles', 'private': False})
        self.user.id_card_image = f'/media/mongodb/{id_key}.webp'
        self.user.profile_photo = f'/media/mongodb/{photo_key}.webp'
        self.user.save(update_fields=['id_card_image', 'profile_photo'])
        self.client.force_authenticate(self.user)
        response = self.delete({'password': 'StrongPassword!123', 'confirmation': 'DELETE'})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn('warning', response.data)
        with self.assertRaises(NoFile):
            files.get(id_key)
        with self.assertRaises(NoFile):
            files.get(photo_key)

    def test_shared_image_is_preserved_for_the_other_user(self):
        from marketplace.mongodb_media import _files
        files = _files()
        key = 'c' * 48
        reference = f'/media/mongodb/{key}.webp'
        files.put(b'shared-test', _id=key, metadata={'folder': 'campxchange/profiles', 'private': False})
        self.user.profile_photo = reference
        self.user.save(update_fields=['profile_photo'])
        self.other.profile_photo = reference
        self.other.save(update_fields=['profile_photo'])
        self.client.force_authenticate(self.user)
        response = self.delete({'password': 'StrongPassword!123', 'confirmation': 'DELETE'})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(files.get(key).read(), b'shared-test')
