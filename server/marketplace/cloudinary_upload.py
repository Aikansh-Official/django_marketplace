import cloudinary
import cloudinary.uploader
from django.conf import settings


def configure_cloudinary():
    """Configure Cloudinary with credentials from Django settings."""
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def upload_image_to_cloudinary(image_file, folder="lputrade/listings"):
    """
    Upload an image file to Cloudinary.

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
        transformation=[
            {"width": 1200, "height": 1200, "crop": "limit", "quality": "auto:good"}
        ],
    )

    return {
        "url": result.get("secure_url"),
        "public_id": result.get("public_id"),
    }


def upload_base64_to_cloudinary(base64_data, folder="lputrade/listings"):
    """
    Upload a base64-encoded image string to Cloudinary.

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
        transformation=[
            {"width": 1200, "height": 1200, "crop": "limit", "quality": "auto:good"}
        ],
    )

    return {
        "url": result.get("secure_url"),
        "public_id": result.get("public_id"),
    }


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
