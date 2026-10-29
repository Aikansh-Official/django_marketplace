from pathlib import Path
from urllib.parse import unquote, urlsplit
from django.conf import settings
from rest_framework.exceptions import ValidationError


def local_media_path(url):
    """Resolve local image paths without allowing traversal, drive paths or symlinks out."""
    path = unquote(urlsplit(url).path)
    if not path.startswith('/media/') or '\\' in path or ':' in path:
        raise ValidationError('Invalid local image path.')
    root = Path(settings.MEDIA_ROOT).resolve()
    candidate = (root / path[len('/media/'):]).resolve()
    if not candidate.is_relative_to(root) or candidate == root:
        raise ValidationError('Invalid local image path.')
    if candidate.suffix.lower() not in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
        raise ValidationError('Only raster image files are supported.')
    return candidate


def validate_listing_image_url(url):
    """Listing input cannot name private documents or arbitrary server files."""
    parsed = urlsplit(url)
    path = unquote(parsed.path)
    if path.startswith('/media/listings/'):
        local_media_path(url)
        return url
    cloud = getattr(settings, 'CLOUDINARY_CLOUD_NAME', '')
    if (parsed.scheme == 'https' and parsed.hostname == 'res.cloudinary.com'
            and not parsed.username and not parsed.password and cloud
            and path.startswith(f'/{cloud}/image/upload/')
            and '/campxchange/listings/' in path
            and not any(part in ('.', '..') for part in path.split('/'))):
        return url
    raise ValidationError('Use an uploaded listing image from this application.')
