import io
import os
from types import SimpleNamespace
from unittest import SkipTest
from unittest.mock import patch
from uuid import uuid4

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, SimpleTestCase, override_settings
from gridfs import GridFS
from gridfs.errors import NoFile
from PIL import Image
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory, force_authenticate

from marketplace import mongodb_media
from marketplace.cloudinary_upload import upload_image_to_cloudinary
from marketplace.cloudinary_upload import upload_user_image_to_cloudinary
from marketplace.media_security import generate_secure_image_url, secure_image_proxy_view
from marketplace.serializers import ListingCreateUpdateSerializer
from marketplace.views import UploadImageView


def test_image():
    data = io.BytesIO()
    Image.new('RGB', (8, 8), color='orange').save(data, format='PNG')
    return SimpleUploadedFile('test.png', data.getvalue(), content_type='image/png')


def user(identity, private_reference=None, staff=False):
    return SimpleNamespace(pk=identity, id=identity, is_authenticated=True, is_active=True,
                           is_superuser=staff, has_admin_permission=lambda permission: False,
                           id_card_image=private_reference, profile_photo=None, profile_picture_url=None)


@override_settings(MEDIA_STORAGE_BACKEND='mongodb')
class MongoMediaUnitTests(SimpleTestCase):
    def test_malformed_and_active_content_rejected_before_database_write(self):
        with patch('marketplace.mongodb_media._files') as files:
            for value in ('data:image/png;base64,!!!',
                          SimpleUploadedFile('fake.png', b'<svg onload="attack()"/>')):
                with self.assertRaises(ValidationError):
                    mongodb_media.store_image(value)
            files.assert_not_called()

    def test_storage_failure_has_no_disk_or_base64_fallback(self):
        request = APIRequestFactory().post('/api/marketplace/upload-image/',
                                          {'image': test_image()}, format='multipart')
        force_authenticate(request, user=user('uploader'))
        with patch('marketplace.mongodb_media._files', side_effect=ConnectionFailure('secret-host')), \
                patch('django.core.files.storage.default_storage.save') as disk:
            response = UploadImageView.as_view()(request)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('secret-host', str(response.data))
        disk.assert_not_called()

    def test_listing_base64_failure_does_not_create_listing(self):
        serializer = ListingCreateUpdateSerializer(context={'request': SimpleNamespace(user=user('uploader'))})
        with patch('marketplace.serializers.upload_base64_to_cloudinary',
                   side_effect=mongodb_media.ImageStorageUnavailable()), \
                patch('marketplace.models.Listing.objects.create') as create:
            with self.assertRaises(mongodb_media.ImageStorageUnavailable):
                serializer.create({'seller': user('uploader'), 'uploaded_images': ['data:image/png;base64,test']})
        create.assert_not_called()

    @override_settings(MEDIA_STORAGE_BACKEND='cloudinary')
    def test_default_cloudinary_provider_is_preserved(self):
        with patch('cloudinary.uploader.upload', return_value={'secure_url': 'https://example.test/photo.webp',
                                                             'public_id': 'test'}) as upload:
            result = upload_image_to_cloudinary(test_image())
        self.assertEqual(result['url'], 'https://example.test/photo.webp')
        upload.assert_called_once()


@override_settings(MEDIA_STORAGE_BACKEND='mongodb', CORS_ALLOWED_ORIGINS=['https://example.test'])
class MongoMediaLiveTests(SimpleTestCase):
    """Explicit opt-in, localhost-only integration tests with a disposable database."""
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        if os.environ.get('RUN_MONGODB_MEDIA_TESTS') != '1':
            raise SkipTest('Set RUN_MONGODB_MEDIA_TESTS=1 for isolated local MongoDB tests.')
        cls.mongo = MongoClient('mongodb://127.0.0.1:27017/', serverSelectionTimeoutMS=2000)
        cls.mongo.admin.command('ping')
        cls.database_name = 'codex_media_test_' + uuid4().hex
        cls.files = GridFS(cls.mongo[cls.database_name], collection='campxchange_media')
        cls.files_patch = patch('marketplace.mongodb_media._files', return_value=cls.files)
        cls.files_patch.start()

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, 'files_patch'):
            cls.files_patch.stop()
            assert cls.database_name.startswith('codex_media_test_')
            cls.mongo.drop_database(cls.database_name)
            cls.mongo.close()
        super().tearDownClass()

    def gateway(self, reference, identity=None):
        request = RequestFactory().get(generate_secure_image_url(reference),
                                       HTTP_REFERER='https://example.test/', HTTP_SEC_FETCH_DEST='image')
        request.user = identity or SimpleNamespace(is_authenticated=False)
        return secure_image_proxy_view(request)

    def test_real_upload_read_delete_and_opaque_identity(self):
        result = mongodb_media.store_image(test_image(), owner_id='seller')
        self.assertRegex(result['public_id'], r'^[a-f0-9]{48}$')
        stored = mongodb_media.get_image(result['url'])
        self.assertEqual(stored.metadata['owner_id'], 'seller')
        self.assertEqual(stored.content_type, 'image/webp')
        response = self.gateway(result['url'])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Cache-Control'], 'no-store')
        Image.open(io.BytesIO(response.content)).verify()
        self.assertTrue(mongodb_media.delete_image(result['url']))
        with self.assertRaises(NoFile):
            mongodb_media.get_image(result['url'])

    def test_listing_cannot_reference_other_uploaders_or_private_documents(self):
        result = mongodb_media.store_image(test_image(), owner_id='seller')
        reference = result['url']
        self.assertEqual(mongodb_media.validate_listing_reference(reference, user('seller')), reference)
        with self.assertRaises(ValidationError):
            mongodb_media.validate_listing_reference(reference, user('buyer'))
        private = mongodb_media.store_image(test_image(), folder='campxchange/id_cards', owner_id='seller')['url']
        with self.assertRaises(ValidationError):
            mongodb_media.validate_listing_reference(private, user('seller'))

    def test_authorized_admin_can_retain_but_not_attach_another_sellers_image(self):
        reference = mongodb_media.store_image(test_image(), owner_id='seller')['url']
        existing_images = SimpleNamespace(filter=lambda **kwargs: SimpleNamespace(
            exists=lambda: kwargs.get('image_url') == reference))
        instance = SimpleNamespace(seller_id='seller', images=existing_images)
        serializer = ListingCreateUpdateSerializer(instance=instance,
            context={'request': SimpleNamespace(user=user('admin', staff=True))})
        self.assertEqual(serializer.validate_uploaded_images([reference]), [reference])
        foreign = mongodb_media.store_image(test_image(), owner_id='other')['url']
        with self.assertRaises(ValidationError):
            serializer.validate_uploaded_images([foreign])
        outsider = ListingCreateUpdateSerializer(instance=instance,
            context={'request': SimpleNamespace(user=user('outsider'))})
        with self.assertRaises(ValidationError):
            outsider.validate_uploaded_images([reference])

    def test_absolute_or_malformed_mongo_references_cannot_bypass_validation(self):
        reference = mongodb_media.store_image(test_image(), owner_id='seller')['url']
        serializer = ListingCreateUpdateSerializer(
            context={'request': SimpleNamespace(user=user('seller'))})
        for invalid in ('https://attacker.test' + reference, reference + '?public=true',
                        reference.replace('.webp', '.svg'), '/media/mongodb/../secret.webp'):
            with self.assertRaises(ValidationError):
                serializer.validate_uploaded_images([invalid])

    def test_upload_endpoint_preview_is_signed_and_retains_uploader(self):
        from marketplace.media_security import extract_raw_source_from_secure_url
        request = APIRequestFactory().post('/api/marketplace/upload-image/',
                                          {'image': test_image()}, format='multipart')
        force_authenticate(request, user=user('seller'))
        response = UploadImageView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['url'].startswith('/api/media/secure-image/'))
        reference = extract_raw_source_from_secure_url(response.data['url'])
        self.assertEqual(mongodb_media.get_image(reference).metadata['owner_id'], 'seller')
        self.assertEqual(self.gateway(reference).status_code, 200)

    def test_avatar_is_durable_and_private_document_cannot_be_used_as_avatar(self):
        reference = upload_user_image_to_cloudinary(test_image())
        self.assertEqual(self.gateway(reference).status_code, 200)
        self.assertEqual(upload_user_image_to_cloudinary(reference), reference)
        private = upload_user_image_to_cloudinary(test_image(), folder='campxchange/id_cards')
        with self.assertRaises(ValidationError):
            upload_user_image_to_cloudinary(private)

    def test_banner_url_is_signed_and_private_reference_is_rejected(self):
        from marketplace.serializers import BannerSerializer
        image_url = mongodb_media.store_image(test_image(), folder='campxchange/banners')['url']
        instance = SimpleNamespace(id='test', title='Test', subtitle='', badge_text='', image_url=image_url,
                                   link_url='', button_text='', is_active=True, display_order=1,
                                   created_at=None, updated_at=None)
        self.assertTrue(BannerSerializer(instance).data['image_url'].startswith('/api/media/secure-image/'))
        private = mongodb_media.store_image(test_image(), folder='campxchange/id_cards')['url']
        with self.assertRaises(ValidationError):
            BannerSerializer().validate({'image_url': private})

    def test_private_gateway_requires_owner_or_student_admin_even_with_signed_url(self):
        reference = mongodb_media.store_image(test_image(), folder='campxchange/id_cards')['url']
        self.assertEqual(self.gateway(reference, user('owner', reference)).status_code, 200)
        self.assertEqual(self.gateway(reference, user('admin', staff=True)).status_code, 200)
        self.assertEqual(self.gateway(reference, user('other')).status_code, 403)
        with patch('users.authentication.CookieJWTAuthentication.authenticate', return_value=None):
            self.assertEqual(self.gateway(reference).status_code, 403)
        self.assertFalse(mongodb_media.delete_image(reference))

    def test_unsigned_raw_route_is_not_exposed(self):
        from django.http import Http404
        from django.urls import Resolver404, resolve
        reference = mongodb_media.store_image(test_image(), owner_id='seller')['url']
        try:
            route = resolve(reference)
        except Resolver404:
            return
        # DEBUG's pre-existing local-file view cannot resolve a GridFS reference.
        with patch('marketplace.mongodb_media._files') as files, self.assertRaises(Http404):
            route.func(RequestFactory().get(reference), **route.kwargs)
        files.assert_not_called()
