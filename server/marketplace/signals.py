import logging
from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import ListingImage
from .cloudinary_upload import delete_image_from_cloudinary

logger = logging.getLogger(__name__)


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

    # 2. Extract canonical storage URL (unwraps secure-image gateway if needed)
    from .media_security import extract_raw_source_from_secure_url
    clean_url = extract_raw_source_from_secure_url(raw_url)

    # 3. Do not attempt deletion if it's still a gateway URL without real source
    if '/api/media/secure-image/' in clean_url:
        return

    # 4. Verify no other ListingImage record still references this image
    try:
        if ListingImage.objects.filter(image_url=clean_url).exclude(id=instance.id).exists():
            logger.info(
                f"Skipping Cloudinary deletion for {clean_url}: image is still referenced by another record."
            )
            return
    except Exception:
        pass

    logger.info(
        f"Cleaning up deleted image for ListingImage #{instance.id} "
        f"(listing #{instance.listing_id}): {clean_url}"
    )
    delete_image_from_cloudinary(clean_url)
