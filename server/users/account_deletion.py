"""Account deletion cleanup that must run after the database commit."""
import logging
from urllib.parse import urlsplit

from django.conf import settings
from django.db.models import Q

logger = logging.getLogger(__name__)


def _is_owned_media_needing_followup(reference):
    """Identify legacy owned media without treating external avatars as ours."""
    from marketplace.media_security import extract_raw_source_from_secure_url

    raw = extract_raw_source_from_secure_url(reference)
    if '/api/media/secure-image/' in raw:
        # We could not resolve the stored image reference safely.
        return True
    parsed = urlsplit(raw)
    host = (parsed.hostname or '').lower()
    allowed_hosts = {item.lower().lstrip('.') for item in settings.ALLOWED_HOSTS if item != '*'}
    if host == 'res.cloudinary.com':
        return True
    return parsed.path.startswith('/media/') and (not host or host in allowed_hosts)


def cleanup_account_images(references):
    """Remove unshared stored profile/ID images; report incomplete cleanup."""
    from .models import CustomUser
    from marketplace.models import ListingImage
    from marketplace.mongodb_media import is_mongodb_reference, delete_account_image

    success = True
    for reference in set(filter(None, references)):
        if not is_mongodb_reference(reference):
            # Inline image data disappears with the user row; old owned media
            # needs follow-up. An externally hosted avatar is not ours to delete.
            if _is_owned_media_needing_followup(reference):
                success = False
            continue
        try:
            shared = CustomUser.objects.filter(
                Q(id_card_image=reference) | Q(profile_photo=reference)
                | Q(profile_picture_url=reference)
            ).exists() or ListingImage.objects.filter(image_url=reference).exists()
            if not shared and not delete_account_image(reference):
                success = False
        except Exception:
            logger.exception('Could not finish account image cleanup')
            success = False
    return success
