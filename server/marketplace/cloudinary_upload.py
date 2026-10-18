import logging
import cloudinary
import cloudinary.uploader
from django.conf import settings
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)


def configure_cloudinary():
    """Configure Cloudinary with credentials from Django settings."""
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def upload_image_to_cloudinary(image_file, folder="campxchange/listings"):
    """
    Upload an image file to Cloudinary in .webp format.

    Args:
        image_file: A Django UploadedFile (InMemoryUploadedFile or TemporaryUploadedFile)
        folder: The Cloudinary folder to store the image in

    Returns:
        dict with 'url' (secure URL) and 'public_id'
    """
    configure_cloudinary()

    result = cloudinary.uploader.upload(
        image_file,
        folder=folder,
        resource_type="image",
        format="webp",
        transformation=[
            {"width": 1200, "height": 1200, "crop": "limit", "quality": "auto:good", "fetch_format": "webp"}
        ],
    )

    return {
        "url": result.get("secure_url") or result.get("url"),
        "public_id": result.get("public_id"),
    }


def upload_base64_to_cloudinary(base64_data, folder="campxchange/listings"):
    """
    Upload a base64-encoded image string to Cloudinary in .webp format.

    Args:
        base64_data: A base64-encoded image string (data:image/...;base64,...)
        folder: The Cloudinary folder to store the image in

    Returns:
        dict with 'url' (secure URL) and 'public_id'
    """
    configure_cloudinary()

    result = cloudinary.uploader.upload(
        base64_data,
        folder=folder,
        resource_type="image",
        format="webp",
        transformation=[
            {"width": 1200, "height": 1200, "crop": "limit", "quality": "auto:good", "fetch_format": "webp"}
        ],
    )

    return {
        "url": result.get("secure_url"),
        "public_id": result.get("public_id"),
    }


def upload_user_image_to_cloudinary(image_data, folder="campxchange/profiles", is_private=False):
    """
    Universal helper to upload user images (profile photos, ID cards) to Cloudinary in .webp format.
    Accepts base64 data URIs or existing URLs. If already a URL, returns as-is.
    For sensitive documents (ID cards), uploads as type='authenticated' so direct CDN access is blocked.
    Returns the secure Cloudinary HTTPS WebP URL.
    """
    if not image_data or not isinstance(image_data, str):
        return image_data

    # If already a hosted URL, return as-is
    if is_url(image_data):
        return image_data

    is_id_card = ("id_cards" in folder) or is_private

    # If it's a base64 string
    if is_base64_image(image_data) or len(image_data) > 100:
        try:
            configure_cloudinary()
            upload_kwargs = {
                "folder": folder,
                "resource_type": "image",
                "format": "webp",
                "transformation": [
                    {"width": 1200, "height": 1200, "crop": "limit", "quality": "auto:good", "fetch_format": "webp"}
                ],
            }
            if is_id_card:
                upload_kwargs["type"] = "authenticated"

            result = cloudinary.uploader.upload(image_data, **upload_kwargs)
            secure_url = result.get("secure_url")
            if secure_url:
                logger.info(f"Successfully uploaded user image to Cloudinary ({folder}, type={'authenticated' if is_id_card else 'upload'}): {secure_url}")
                return secure_url
        except Exception as e:
            logger.error(f"Failed to upload user image to Cloudinary ({folder}): {e}")

    return image_data


def extract_cloudinary_public_id(image_url):
    """
    Extract public_id from a Cloudinary URL, including folder path and excluding version/transformations/extension.
    Example:
    https://res.cloudinary.com/cloud/image/upload/v12345/campxchange/listings/abc123.jpg -> 'campxchange/listings/abc123'
    """
    if not image_url or not isinstance(image_url, str):
        return None
    if "cloudinary.com" not in image_url:
        return None

    try:
        parts = image_url.split('/upload/')
        if len(parts) < 2:
            return None
        path = parts[1]
        segments = path.split('/')

        # Find version segment v<digits>
        version_idx = -1
        for idx, seg in enumerate(segments):
            if seg.startswith('v') and seg[1:].isdigit():
                version_idx = idx
                break

        if version_idx != -1:
            public_id_segments = segments[version_idx + 1:]
        else:
            # Check for folder 'campxchange'
            folder_idx = -1
            for idx, seg in enumerate(segments):
                if seg in ('campxchange',):
                    folder_idx = idx
                    break
            if folder_idx != -1:
                public_id_segments = segments[folder_idx:]
            else:
                public_id_segments = segments

        public_id_with_ext = '/'.join(public_id_segments)
        # Strip file extension (.jpg, .png, etc.)
        public_id = public_id_with_ext.rsplit('.', 1)[0]
        return public_id
    except Exception as e:
        logger.error(f"Error extracting public_id from Cloudinary URL: {e}")
        return None


def delete_image_from_cloudinary(image_url):
    """
    Delete an image from Cloudinary or local media storage.
    Safe to call: catches exceptions and returns boolean status.
    """
    if not image_url or not isinstance(image_url, str):
        return False

    # 1. Handle local media file fallback (e.g. /media/listings/...)
    try:
        media_url = getattr(settings, 'MEDIA_URL', '/media/')
        if image_url.startswith(media_url) or image_url.startswith('/media/'):
            rel_path = image_url.replace(media_url, '', 1).lstrip('/')
            if default_storage.exists(rel_path):
                default_storage.delete(rel_path)
                logger.info(f"Deleted local media file: {rel_path}")
                return True
    except Exception as e:
        logger.warning(f"Error deleting local media file {image_url}: {e}")

    # 2. Handle Cloudinary
    if "cloudinary.com" in image_url:
        public_id = extract_cloudinary_public_id(image_url)
        if not public_id:
            logger.warning(f"Could not determine public_id for Cloudinary deletion: {image_url}")
            return False

        try:
            configure_cloudinary()
            res = cloudinary.uploader.destroy(public_id, invalidate=True)
            result = res.get('result')
            logger.info(f"Deleted image '{public_id}' from Cloudinary: {result}")
            return result in ['ok', 'not found']
        except Exception as e:
            logger.error(f"Failed to delete '{public_id}' from Cloudinary: {e}")
            return False

    return False


def is_base64_image(data_string):
    """Check if a string is a base64-encoded image data URI."""
    if isinstance(data_string, str):
        return data_string.startswith("data:image/")
    return False


def is_url(data_string):
    """Check if a string is a regular URL (not base64)."""
    if isinstance(data_string, str):
        return (
            data_string.startswith("http://")
            or data_string.startswith("https://")
            or data_string.startswith("/")
        )
    return False
