"""Optional durable image storage in the application's existing MongoDB database.

Canonical references are never served directly. The signed media gateway handles reads.
"""
import logging
import os
import re
import secrets

from django.conf import settings
from django.db import DatabaseError, connection
from gridfs import GridFS
from gridfs.errors import NoFile
from pymongo.errors import PyMongoError
from rest_framework.exceptions import APIException, ValidationError

from .image_validation import MAX_IMAGE_BYTES, normalize_image

logger = logging.getLogger(__name__)
REFERENCE_PATTERN = re.compile(r'^/media/mongodb/([a-f0-9]{48})\.webp$')
ALLOWED_FOLDERS = {'campxchange/listings', 'campxchange/profiles',
                   'campxchange/id_cards', 'campxchange/banners'}


class ImageStorageUnavailable(APIException):
    status_code = 503
    default_detail = 'Image storage is unavailable. Please try again later.'


def mongodb_media_enabled():
    return getattr(settings, 'MEDIA_STORAGE_BACKEND',
                   os.environ.get('MEDIA_STORAGE_BACKEND', 'cloudinary')).lower() == 'mongodb'


def is_mongodb_reference(value):
    return isinstance(value, str) and REFERENCE_PATTERN.fullmatch(value) is not None


def _files():
    connection.ensure_connection()
    return GridFS(connection.database, collection='campxchange_media')


def _file_id(reference):
    match = REFERENCE_PATTERN.fullmatch(reference or '')
    if not match:
        raise ValidationError('Invalid uploaded image reference.')
    return match.group(1)


def store_image(value, folder='campxchange/listings', private=False, owner_id=None):
    if folder not in ALLOWED_FOLDERS:
        raise ValidationError('Invalid image storage folder.')
    image = normalize_image(value)
    data = image.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise ValidationError('Normalized image must be at most 5 MB.')
    identity = secrets.token_hex(24)
    try:
        _files().put(data, _id=identity, filename=f'{identity}.webp',
                     contentType='image/webp', metadata={
                         'folder': folder,
                         'private': bool(private or folder == 'campxchange/id_cards'),
                         'owner_id': str(owner_id) if owner_id is not None else None,
                     })
    except (PyMongoError, DatabaseError):
        logger.error('MongoDB image storage write failed')
        raise ImageStorageUnavailable() from None
    return {'url': f'/media/mongodb/{identity}.webp', 'public_id': identity}


def get_image(reference):
    identity = _file_id(reference)
    try:
        image = _files().get(identity)
        if image.content_type != 'image/webp' or image.length > MAX_IMAGE_BYTES:
            raise NoFile('Unsupported stored image')
        return image
    except NoFile:
        raise
    except (PyMongoError, DatabaseError):
        logger.error('MongoDB image storage read failed')
        raise ImageStorageUnavailable() from None


def validate_listing_reference(reference, user, allow_existing=False):
    """An uploaded listing image belongs to its uploader, not anyone holding its URL."""
    try:
        image = get_image(reference)
    except NoFile:
        raise ValidationError('Uploaded image was not found.') from None
    metadata = image.metadata or {}
    if (metadata.get('private', True) or metadata.get('folder') != 'campxchange/listings'
            or not user or not user.is_authenticated
            or (metadata.get('owner_id') != str(user.pk) and not allow_existing)):
        raise ValidationError('Use your own uploaded listing image.')
    return reference


def delete_image(reference):
    identity = _file_id(reference)
    try:
        files = _files()
        image = files.get(identity)
        metadata = image.metadata or {}
        if metadata.get('private', True) or metadata.get('folder') not in (
                'campxchange/listings', 'campxchange/banners'):
            return False
        files.delete(identity)
        return True
    except NoFile:
        return True
    except (PyMongoError, DatabaseError):
        logger.error('MongoDB image storage deletion failed')
        return False


def can_read_private_image(request, reference):
    # This gateway is a Django view, so cookie JWT authentication is explicit here.
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated:
        from users.authentication import CookieJWTAuthentication
        try:
            result = CookieJWTAuthentication().authenticate(request)
        except APIException:
            return False
        user = result[0] if result else None
    if not user or not user.is_authenticated or not getattr(user, 'is_active', False):
        return False
    if user.is_superuser or user.has_admin_permission('students'):
        return True
    return reference in (getattr(user, 'id_card_image', None),
                         getattr(user, 'profile_photo', None),
                         getattr(user, 'profile_picture_url', None))
