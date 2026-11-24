import logging
from contextvars import ContextVar
from django.db.models.signals import post_delete
from django.db import transaction
from django.dispatch import receiver
from .models import ListingImage
from .cloudinary_upload import delete_image_from_cloudinary

logger = logging.getLogger(__name__)

# Optional request-local collector used by account deletion to report media
# cleanup failures after the database transaction commits.
listing_cleanup_results = ContextVar('listing_cleanup_results', default=None)


@receiver(post_delete, sender=ListingImage)
def cleanup_listing_image_on_delete(sender, instance, **kwargs):
    """
    Triggered when a ListingImage record is deleted from the database.
    This handles:
    - User/Admin deletes a Listing (cascade deletes all related ListingImages)
    - User updates a Listing and explicitly removes specific images
    - Direct ListingImage deletion via admin or API
    """
    # 1. Skip cleanup if explicitly marked (e.g. during listing edit/update where images are retained)
    if getattr(instance, '_skip_cloudinary_cleanup', False):
        return

    raw_url = instance.image_url
    if not raw_url:
        return

    # A database rollback must not leave an existing listing without its image.
    results = listing_cleanup_results.get()

    def cleanup(url=raw_url, image_id=instance.id, listing_id=instance.listing_id):
        try:
            success = _cleanup_listing_image(url, image_id, listing_id)
        except Exception:
            logger.exception('Listing image cleanup failed')
            success = False
        if results is not None:
            results.append(success)

    transaction.on_commit(cleanup, robust=True)


def _cleanup_listing_image(raw_url, image_id, listing_id):

    # Inline data disappears with the database row and needs no storage call.
    if raw_url.startswith('data:image/'):
        return True

    # 2. Extract canonical storage URL (unwraps secure-image gateway if needed)
    from .media_security import extract_raw_source_from_secure_url
    clean_url = extract_raw_source_from_secure_url(raw_url)

    # 3. Do not attempt deletion if it's still a gateway URL without real source
    if '/api/media/secure-image/' in clean_url:
        return False

    # 4. Verify no other ListingImage record still references this image or Cloudinary public_id
    try:
        from .cloudinary_upload import extract_cloudinary_public_id
        target_pid = extract_cloudinary_public_id(clean_url)
        if target_pid:
            for other_img in ListingImage.objects.exclude(id=image_id):
                if extract_cloudinary_public_id(other_img.image_url) == target_pid:
                    logger.info(
                        f"Skipping Cloudinary deletion for {clean_url}: public_id '{target_pid}' is still referenced by ListingImage #{other_img.id}."
                    )
                    return True
        elif ListingImage.objects.filter(image_url=clean_url).exclude(id=image_id).exists():
            logger.info(
                f"Skipping Cloudinary deletion for {clean_url}: image is still referenced by another record."
            )
            return True
    except Exception:
        logger.warning('Could not check image references; leaving stored image intact.')
        return False

    logger.info(
        f"Cleaning up deleted image for ListingImage #{image_id} "
        f"(listing #{listing_id})"
    )
    return delete_image_from_cloudinary(clean_url)
