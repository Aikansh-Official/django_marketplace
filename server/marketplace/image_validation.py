import base64
import binascii
import io
import warnings
from PIL import Image, UnidentifiedImageError
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.exceptions import ValidationError

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 16_000_000


def normalize_image(value):
    """Decode bounded raster input and re-encode it to remove active payloads/metadata."""
    if isinstance(value, str):
        if len(value) > (MAX_IMAGE_BYTES * 4 // 3) + 1024:
            raise ValidationError('Image must be at most 5 MB.')
        encoded = value
        if value.startswith('data:'):
            header, separator, encoded = value.partition(',')
            if not separator or header not in (
                'data:image/jpeg;base64', 'data:image/png;base64',
                'data:image/webp;base64', 'data:image/gif;base64',
            ):
                raise ValidationError('Use a JPEG, PNG, WebP or GIF image.')
        try:
            data = base64.b64decode(encoded, validate=True)
        except (binascii.Error, ValueError):
            raise ValidationError('Invalid image encoding.')
    else:
        value.seek(0)
        data = value.read(MAX_IMAGE_BYTES + 1)
        value.seek(0)
    if not data or len(data) > MAX_IMAGE_BYTES:
        raise ValidationError('Image must be nonempty and at most 5 MB.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                if image.format not in ('JPEG', 'PNG', 'WEBP', 'GIF'):
                    raise ValidationError('Unsupported image format.')
                if image.width * image.height > MAX_IMAGE_PIXELS:
                    raise ValidationError('Image dimensions are too large.')
                image.load()
                output = io.BytesIO()
                image.convert('RGB').save(output, format='WEBP', quality=90)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ValidationError('Invalid or oversized image.')
    return SimpleUploadedFile('image.webp', output.getvalue(), content_type='image/webp')


def normalized_data_uri(value):
    image = normalize_image(value)
    return 'data:image/webp;base64,' + base64.b64encode(image.read()).decode('ascii')
