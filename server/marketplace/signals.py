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
    - User updates a Listing and replaces/removes existing images
    - Direct ListingImage deletion via admin or API
    """
    if instance.image_url:
        logger.info(
            f"Cleaning up deleted image for ListingImage #{instance.id} "
            f"(listing #{instance.listing_id}): {instance.image_url}"
        )
        delete_image_from_cloudinary(instance.image_url)
