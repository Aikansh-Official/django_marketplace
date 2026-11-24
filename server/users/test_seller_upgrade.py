from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.test import APIRequestFactory, force_authenticate

from .views import UpgradeToSellerView


class SellerUpgradeTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = SimpleNamespace(
            pk='buyer1', id='buyer1', is_authenticated=True, role='BUYER',
            username='12345678', full_name='Test Buyer', password='existing-hash',
            profile_photo='existing-photo', profile_picture_url='existing-url',
            calculate_trust_score=Mock(return_value=5), save=Mock(),
        )
        self.image = 'data:image/jpeg;base64,' + 'a' * 150

    def request(self, payload, authenticated=True):
        req = self.factory.post('/api/auth/upgrade-to-seller/', payload, format='json')
        if authenticated:
            force_authenticate(req, user=self.user)
        with patch.object(UpgradeToSellerView, 'throttle_classes', []):
            return UpgradeToSellerView.as_view()(req)

    @patch('users.views.UserListSerializer')
    @patch('marketplace.cloudinary_upload.upload_user_image_to_cloudinary', return_value='private-id-reference')
    @patch('users.identity_verification.require_verified_identity', return_value={'extracted_reg_no': '12345678'})
    def test_authenticated_id_only_upgrade_preserves_account_password_and_photo(self, verify, upload, serializer):
        serializer.return_value.data = {'role': 'SELLER'}
        response = self.request({'id_card_image': self.image})
        self.assertEqual(response.status_code, 200)
        verify.assert_called_once_with(self.image, '12345678', 'Test Buyer')
        upload.assert_called_once_with(self.image, folder='campxchange/id_cards')
        self.assertEqual(self.user.role, 'SELLER')
        self.assertTrue(self.user.is_id_verified)
        self.assertEqual(self.user.password, 'existing-hash')
        self.assertEqual(self.user.profile_photo, 'existing-photo')
        self.assertEqual(self.user.profile_picture_url, 'existing-url')
        self.user.save.assert_called_once()

    @patch('users.identity_verification.require_verified_identity')
    def test_mismatched_account_registration_is_rejected_before_verification(self, verify):
        response = self.request({'reg_no': '87654321', 'id_card_image': self.image})
        self.assertEqual(response.status_code, 400)
        verify.assert_not_called()
        self.user.save.assert_not_called()

    @patch('marketplace.cloudinary_upload.upload_user_image_to_cloudinary')
    @patch('users.identity_verification.require_verified_identity', side_effect=ValidationError('ID mismatch'))
    def test_invalid_id_does_not_upgrade_or_upload(self, verify, upload):
        response = self.request({'id_card_image': self.image})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.user.role, 'BUYER')
        self.user.save.assert_not_called()
        upload.assert_not_called()

    @patch('users.identity_verification.require_verified_identity')
    def test_unavailable_identity_service_does_not_upgrade(self, verify):
        error = APIException('Service unavailable')
        error.status_code = 503
        verify.side_effect = error
        response = self.request({'id_card_image': self.image})
        self.assertEqual(response.status_code, 503)
        self.assertEqual(self.user.role, 'BUYER')
        self.user.save.assert_not_called()

    def test_anonymous_user_cannot_upgrade(self):
        response = self.request({'id_card_image': self.image}, authenticated=False)
        self.assertIn(response.status_code, (401, 403))
        self.user.save.assert_not_called()
