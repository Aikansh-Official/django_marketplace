import base64
import hashlib
import hmac
import logging
import time
import urllib.parse
import urllib.request
from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse, HttpResponseForbidden, Http404

logger = logging.getLogger(__name__)

# Fallback SVG returned when an unauthorized user attempts to directly open or share a link
PROTECTED_ASSET_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="badge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
  </defs>
  <rect width="600" height="340" rx="16" fill="url(#bg)"/>
  <circle cx="300" cy="110" r="44" fill="url(#badge)" opacity="0.15"/>
  <circle cx="300" cy="110" r="32" fill="url(#badge)"/>
  <!-- Lock Icon -->
  <path d="M293 103 v-5 a7 7 0 0 1 14 0 v5 m-10 0 h16 a2 2 0 0 1 2 2 v12 a2 2 0 0 1 -2 2 h-16 a2 2 0 0 1 -2 -2 v-12 a2 2 0 0 1 2 -2 z" 
        fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="300" y="195" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700" fill="#f8fafc" text-anchor="middle">
    Protected CampusXChange Asset
  </text>
  <text x="300" y="225" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500" fill="#94a3b8" text-anchor="middle">
    Direct link sharing &amp; external hotlinking are disabled for student privacy.
  </text>
  <text x="300" y="250" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="400" fill="#64748b" text-anchor="middle">
    This image can only be viewed securely within the CampusXChange application.
  </text>
</svg>"""


def get_allowed_origins():
    """Retrieve all authorized frontend origins from settings."""
    allowed = set()
    cors_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
    for origin in cors_origins:
        if origin:
            allowed.add(origin.strip().rstrip('/'))

    # Include local dev defaults
    allowed.add("http://localhost:5173")
    allowed.add("http://127.0.0.1:5173")
    allowed.add("http://localhost:5174")
    allowed.add("http://127.0.0.1:5174")
    allowed.add("http://localhost:5175")
    allowed.add("http://127.0.0.1:5175")
    allowed.add("http://localhost:3000")
    allowed.add("http://127.0.0.1:3000")
    allowed.add("https://cxc.anshuman892494.online")
    allowed.add("http://cxc.anshuman892494.online")

    render_host = getattr(settings, 'RENDER_EXTERNAL_HOSTNAME', None)
    if render_host:
        allowed.add(f"https://{render_host}".rstrip('/'))

    return allowed


def generate_secure_image_url(source_url, ttl_seconds=1800):
    """
    Generate an HMAC-SHA256 signed, expiring gateway URL for any media/Cloudinary asset.

    Args:
        source_url: Raw Cloudinary URL or relative media URL
        ttl_seconds: Validity lifetime in seconds (default 1800 = 30 minutes)

    Returns:
        Secure gateway URL string e.g. /api/media/secure-image/?src=...&exp=...&sig=...
    """
    if not source_url or not isinstance(source_url, str):
        return source_url

    clean_url = source_url.strip()

    # Skip if already a data URI or blob URL
    if clean_url.startswith('data:') or clean_url.startswith('blob:'):
        return clean_url

    # Skip if already a secure image gateway URL
    if '/api/media/secure-image/' in clean_url:
        return clean_url

    # Calculate expiration timestamp
    exp = int(time.time()) + int(ttl_seconds)

    # Base64url encode the source URL
    src_encoded = base64.urlsafe_b64encode(clean_url.encode('utf-8')).decode('ascii').rstrip('=')

    # Compute HMAC-SHA256 signature
    secret_key = settings.SECRET_KEY.encode('utf-8')
    message = f"{src_encoded}:{exp}".encode('utf-8')
    signature = hmac.new(secret_key, message, hashlib.sha256).hexdigest()

    return f"/api/media/secure-image/?src={src_encoded}&exp={exp}&sig={signature}"


def validate_secure_token(src_encoded, exp_str, signature):
    """
    Verify HMAC signature and timestamp expiry.
    Returns (is_valid, decoded_url, error_message)
    """
    if not src_encoded or not exp_str or not signature:
        return False, None, "Missing authentication parameters."

    # 1. Validate expiration
    try:
        exp = int(exp_str)
    except (ValueError, TypeError):
        return False, None, "Invalid expiration format."

    if time.time() > exp:
        return False, None, "Link has expired. Please refresh the page to obtain a fresh security token."

    # 2. Validate HMAC signature
    secret_key = settings.SECRET_KEY.encode('utf-8')
    message = f"{src_encoded}:{exp}".encode('utf-8')
    expected_sig = hmac.new(secret_key, message, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(signature, expected_sig):
        return False, None, "Invalid security signature."

    # 3. Decode source URL
    try:
        # Re-add padding for base64url decode
        padding = 4 - (len(src_encoded) % 4)
        if padding != 4:
            src_encoded += '=' * padding
        decoded_url = base64.urlsafe_b64decode(src_encoded.encode('ascii')).decode('utf-8')
    except Exception as e:
        logger.warning(f"Failed to base64 decode secure image URL: {e}")
        return False, None, "Malformed source URL encoding."

    return True, decoded_url, None


def is_authorized_request(request):
    """
    Validate that the incoming request is originating from our allowed site context
    and not from an external site, bot crawler, or direct browser address-bar copy.
    """
    # 1. Direct address bar navigation check (Sec-Fetch headers)
    sec_fetch_dest = request.META.get('HTTP_SEC_FETCH_DEST', '').lower()
    sec_fetch_mode = request.META.get('HTTP_SEC_FETCH_MODE', '').lower()

    if sec_fetch_dest == 'document' or sec_fetch_mode == 'navigate':
        # Opened directly in a browser tab / window
        return False, "Direct URL navigation in address bar is blocked. Images can only be viewed within CampusXChange."

    # 2. Check Referer header
    referer = request.META.get('HTTP_REFERER', '')
    origin = request.META.get('HTTP_ORIGIN', '')

    allowed_origins = get_allowed_origins()

    # Check Referer match
    if referer:
        parsed_ref = urllib.parse.urlparse(referer)
        ref_base = f"{parsed_ref.scheme}://{parsed_ref.netloc}".rstrip('/')
        if ref_base in allowed_origins:
            return True, None

    # Check Origin match
    if origin:
        parsed_orig = urllib.parse.urlparse(origin)
        orig_base = f"{parsed_orig.scheme}://{parsed_orig.netloc}".rstrip('/')
        if orig_base in allowed_origins:
            return True, None

    # If DEBUG is True and referer is missing but destination is image, permit for local debugging
    if settings.DEBUG and not referer and sec_fetch_dest in ('image', 'empty', ''):
        return True, None

    return False, "Unauthorized origin or external hotlink detected."


def secure_image_proxy_view(request):
    """
    Secure Image Gateway Endpoint:
    GET /api/media/secure-image/?src=...&exp=...&sig=...

    Validates:
      1. Origin & Referer headers
      2. Cryptographic HMAC signature
      3. Expiration timestamp
    Then streams the WebP asset with strict anti-caching & anti-sniffing headers.
    """
    src_encoded = request.GET.get('src', '')
    exp_str = request.GET.get('exp', '')
    sig = request.GET.get('sig', '')

    # Check request authorization (Referer / Origin / Direct address bar access)
    is_auth_req, req_err = is_authorized_request(request)
    if not is_auth_req:
        logger.warning(f"Secure image gateway blocked unauthorized request: {req_err} (Referer: {request.META.get('HTTP_REFERER')})")
        # Return protective SVG response with 403 status
        resp = HttpResponse(PROTECTED_ASSET_SVG, content_type='image/svg+xml', status=403)
        resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        resp['X-Protected-Asset'] = 'CampusXChange-Secured'
        return resp

    # Validate HMAC signature and token expiration
    is_valid, decoded_url, token_err = validate_secure_token(src_encoded, exp_str, sig)
    if not is_valid:
        logger.warning(f"Secure image token validation failed: {token_err}")
        resp = HttpResponse(PROTECTED_ASSET_SVG, content_type='image/svg+xml', status=403)
        resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return resp

    # Check cache first (locmem / Redis cache)
    cache_key = f"cxc_sec_img_{hashlib.md5(decoded_url.encode()).hexdigest()}"
    cached = cache.get(cache_key)
    if cached:
        content_type, image_bytes = cached
        resp = HttpResponse(image_bytes, content_type=content_type)
        resp['Cache-Control'] = 'private, no-cache, no-store, must-revalidate'
        resp['X-Content-Type-Options'] = 'nosniff'
        resp['X-Protected-Asset'] = 'CampusXChange-Secured'
        return resp

    # Fetch asset bytes
    try:
        final_url_to_fetch = decoded_url

        # If it is a Cloudinary authenticated asset, sign it with server credentials
        if 'res.cloudinary.com' in decoded_url and '/image/authenticated/' in decoded_url:
            try:
                import cloudinary.utils
                from .cloudinary_upload import configure_cloudinary
                configure_cloudinary()

                # Extract public_id from authenticated URL
                # e.g. https://res.cloudinary.com/dom8rkqq8/image/authenticated/.../campusxchange/id_cards/xyz.webp
                parts = decoded_url.split('/image/authenticated/')
                if len(parts) > 1:
                    subpath = parts[1]
                    # strip signature or version if present
                    subparts = subpath.split('/')
                    # find starting segment like 'campusxchange'
                    clean_parts = [p for p in subparts if not p.startswith('s--') and not p.startswith('v1')]
                    public_id = '/'.join(clean_parts).rsplit('.', 1)[0]
                    signed_url, _ = cloudinary.utils.cloudinary_url(
                        public_id,
                        type='authenticated',
                        sign_url=True,
                        format='webp'
                    )
                    final_url_to_fetch = signed_url
            except Exception as sign_err:
                logger.warning(f"Error signing authenticated Cloudinary asset: {sign_err}")

        # Fetch from source
        req = urllib.request.Request(
            final_url_to_fetch,
            headers={'User-Agent': 'CampusXChange-SecureMediaProxy/1.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as upstream:
            status_code = upstream.status
            if status_code != 200:
                return HttpResponse(PROTECTED_ASSET_SVG, content_type='image/svg+xml', status=status_code)

            content_type = upstream.headers.get('Content-Type', 'image/webp')
            image_bytes = upstream.read()

        # Cache in memory for up to 10 minutes (600s)
        cache.set(cache_key, (content_type, image_bytes), timeout=600)

        response = HttpResponse(image_bytes, content_type=content_type)
        response['Cache-Control'] = 'private, no-cache, no-store, must-revalidate'
        response['X-Content-Type-Options'] = 'nosniff'
        response['Content-Disposition'] = 'inline'
        response['X-Protected-Asset'] = 'CampusXChange-Secured'
        return response

    except Exception as fetch_err:
        logger.error(f"Error proxying secure image ({decoded_url}): {fetch_err}")
        return HttpResponse(PROTECTED_ASSET_SVG, content_type='image/svg+xml', status=404)
