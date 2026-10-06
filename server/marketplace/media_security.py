import os
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
    Protected CampXChange Asset
  </text>
  <text x="300" y="225" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500" fill="#94a3b8" text-anchor="middle">
    Direct link sharing &amp; external hotlinking are disabled for student privacy.
  </text>
  <text x="300" y="250" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="400" fill="#64748b" text-anchor="middle">
    This image can only be viewed securely within the CampXChange application.
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
    allowed.add("https://cxc-marketplace.vercel.app")
    allowed.add("http://cxc-marketplace.vercel.app")

    render_host = getattr(settings, 'RENDER_EXTERNAL_HOSTNAME', None)
    if render_host:
        allowed.add(f"https://{render_host}".rstrip('/'))

    return allowed


def extract_raw_source_from_secure_url(url):
    """
    Extract the canonical/raw storage URL (e.g. Cloudinary or local /media/... path)
    from a signed /api/media/secure-image/?src=... gateway URL.
    Handles absolute URLs (localhost, Render, production) or relative URLs.
    """
    if not url or not isinstance(url, str):
        return url

    clean_url = url.strip()
    if '/api/media/secure-image/' in clean_url:
        try:
            parsed = urllib.parse.urlparse(clean_url)
            qs = urllib.parse.parse_qs(parsed.query)
            src_encoded = qs.get('src', [''])[0]
            if src_encoded:
                padding = 4 - (len(src_encoded) % 4)
                if padding != 4:
                    src_encoded += '=' * padding
                decoded = base64.urlsafe_b64decode(src_encoded.encode('ascii')).decode('utf-8')
                if decoded and (decoded.startswith('http://') or decoded.startswith('https://') or decoded.startswith('/media/')):
                    return decoded
        except Exception as e:
            logger.warning(f"Failed to unwrap secure image URL '{clean_url}': {e}")

    return clean_url


def generate_secure_image_url(source_url, ttl_seconds=1800, request=None):
    """
    Generate an HMAC-SHA256 signed, expiring gateway URL for any media/Cloudinary asset.

    Args:
        source_url: Raw Cloudinary URL or relative media URL
        ttl_seconds: Validity lifetime in seconds (default 1800 = 30 minutes)
        request: Optional HttpRequest object to build an absolute URL

    Returns:
        Secure gateway URL string e.g. https://domain/api/media/secure-image/?src=...&exp=...&sig=...
    """
    if not source_url or not isinstance(source_url, str):
        return source_url

    clean_url = source_url.strip()

    # Skip if already a data URI or blob URL
    if clean_url.startswith('data:') or clean_url.startswith('blob:'):
        return clean_url

    # If it is already a secure gateway URL, unwrap to its raw canonical source first
    # This prevents chaining stale/expired signatures or leaking localhost URLs into production
    clean_url = extract_raw_source_from_secure_url(clean_url)

    # Calculate expiration timestamp
    exp = int(time.time()) + int(ttl_seconds)

    # Base64url encode the source URL
    src_encoded = base64.urlsafe_b64encode(clean_url.encode('utf-8')).decode('ascii').rstrip('=')

    # Compute HMAC-SHA256 signature
    secret_key = settings.SECRET_KEY.encode('utf-8')
    message = f"{src_encoded}:{exp}".encode('utf-8')
    signature = hmac.new(secret_key, message, hashlib.sha256).hexdigest()

    rel_path = f"/api/media/secure-image/?src={src_encoded}&exp={exp}&sig={signature}"

    if request:
        try:
            return request.build_absolute_uri(rel_path)
        except Exception:
            pass

    render_host = getattr(settings, 'RENDER_EXTERNAL_HOSTNAME', None)
    if render_host:
        return f"https://{render_host.rstrip('/')}{rel_path}"

    return rel_path


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


def optimize_cloudinary_url(url):
    """Ensure Cloudinary URL requests WebP and auto-quality for optimal speed."""
    if not url or 'res.cloudinary.com' not in url:
        return url
    if '/upload/' in url and '/upload/f_auto' not in url and '/upload/q_auto' not in url:
        return url.replace('/upload/', '/upload/f_auto,q_auto/', 1)
    return url


def is_origin_allowed(base_url, allowed_origins):
    """Check if an origin or referer base URL is permissible."""
    if not base_url:
        return False
    if base_url in allowed_origins:
        return True
    try:
        parsed = urllib.parse.urlparse(base_url)
        hostname = (parsed.hostname or '').lower()
        if (
            hostname.endswith('.anshuman892494.online') or
            hostname == 'anshuman892494.online' or
            hostname.endswith('.onrender.com') or
            hostname.endswith('.vercel.app') or
            hostname in ('localhost', '127.0.0.1')
        ):
            return True
    except Exception:
        pass
    return False


def is_authorized_request(request):
    """
    Validate that the incoming request is originating from our allowed site context
    and not from an external site, bot crawler, or direct browser address-bar copy.
    """
    # 1. Direct address bar navigation check (Sec-Fetch headers)
    sec_fetch_dest = request.META.get('HTTP_SEC_FETCH_DEST', '').lower()
    sec_fetch_mode = request.META.get('HTTP_SEC_FETCH_MODE', '').lower()

    if sec_fetch_dest == 'document' or sec_fetch_mode == 'navigate':
        # Opened directly in a browser tab / window / address bar
        return False, "Direct URL navigation in address bar is blocked. Images can only be viewed within CampXChange."

    # 2. Check Referer header if present
    referer = request.META.get('HTTP_REFERER', '')
    origin = request.META.get('HTTP_ORIGIN', '')
    allowed_origins = get_allowed_origins()

    if referer:
        try:
            parsed_ref = urllib.parse.urlparse(referer)
            ref_base = f"{parsed_ref.scheme}://{parsed_ref.netloc}".rstrip('/')
            if is_origin_allowed(ref_base, allowed_origins):
                return True, None
            else:
                return False, f"Unauthorized external referer: {ref_base}"
        except Exception:
            pass

    # Check Origin match if present
    if origin:
        try:
            parsed_orig = urllib.parse.urlparse(origin)
            orig_base = f"{parsed_orig.scheme}://{parsed_orig.netloc}".rstrip('/')
            if is_origin_allowed(orig_base, allowed_origins):
                return True, None
            else:
                return False, f"Unauthorized external origin: {orig_base}"
        except Exception:
            pass

    # 3. If neither referer nor origin is passed (common in cross-origin <img> tags, mobile browsers, or strict privacy mode):
    # As long as it is a subresource (not document/navigate) and the HMAC signature is cryptographically valid, permit.
    if sec_fetch_dest in ('image', 'empty', '') and sec_fetch_mode in ('no-cors', 'cors', ''):
        return True, None

    return False, "Unauthorized origin or external hotlink detected."


def secure_image_proxy_view(request):
    """
    Secure Image Gateway Endpoint:
    GET /api/media/secure-image/?src=...&exp=...&sig=...

    Validates:
      1. Origin & Referer headers (blocks address-bar copy-pasting & external hotlinking)
      2. Cryptographic HMAC signature
      3. Expiration timestamp
    Then streams the optimized WebP asset with strict anti-caching & anti-sniffing headers.
    """
    src_encoded = request.GET.get('src', '')
    exp_str = request.GET.get('exp', '')
    sig = request.GET.get('sig', '')

    # Check request authorization (Referer / Origin / Direct address bar access)
    is_auth_req, req_err = is_authorized_request(request)
    if not is_auth_req:
        logger.warning(f"Secure image gateway blocked unauthorized request: {req_err} (Referer: {request.META.get('HTTP_REFERER')})")
        resp = HttpResponse(PROTECTED_ASSET_SVG, content_type='image/svg+xml', status=403)
        resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        resp['X-Protected-Asset'] = 'CampXChange-Secured'
        resp['Access-Control-Allow-Origin'] = '*'
        return resp

    # Validate HMAC signature and token expiration
    is_valid, decoded_url, token_err = validate_secure_token(src_encoded, exp_str, sig)
    if not is_valid:
        logger.warning(f"Secure image token validation failed: {token_err}")
        resp = HttpResponse(PROTECTED_ASSET_SVG, content_type='image/svg+xml', status=403)
        resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        resp['Access-Control-Allow-Origin'] = '*'
        return resp

    # Check cache first (locmem / Redis cache)
    cache_key = f"cxc_sec_img_{hashlib.md5(decoded_url.encode()).hexdigest()}"
    cached = cache.get(cache_key)
    if cached:
        content_type, image_bytes = cached
        resp = HttpResponse(image_bytes, content_type=content_type)
        resp['Cache-Control'] = 'private, max-age=86400, stale-while-revalidate=3600'
        resp['X-Content-Type-Options'] = 'nosniff'
        resp['Cross-Origin-Resource-Policy'] = 'cross-origin'
        resp['Access-Control-Allow-Origin'] = '*'
        resp['X-Protected-Asset'] = 'CampXChange-Secured'
        return resp

    # Fetch asset bytes or issue fast CDN redirect
    try:
        content_type = None
        image_bytes = None

        # A. If it's a local media path (e.g. /media/listings/... or http://localhost:8000/media/...)
        if '/media/' in decoded_url or decoded_url.startswith('/media/'):
            rel_media_path = decoded_url.split('/media/', 1)[1]
            clean_rel_path = rel_media_path.split('?')[0]
            local_file_path = os.path.join(settings.MEDIA_ROOT, clean_rel_path.replace('/', os.sep))
            if os.path.isfile(local_file_path):
                import mimetypes
                guessed_type, _ = mimetypes.guess_type(local_file_path)
                content_type = guessed_type or 'image/jpeg'
                with open(local_file_path, 'rb') as f:
                    image_bytes = f.read()

        # B. If external CDN / Cloudinary URL: Redirect directly to edge CDN (zero WSGI blocking)
        if image_bytes is None:
            # If pointing to localhost on production where local disk file is absent
            if ('localhost:8000' in decoded_url or '127.0.0.1:8000' in decoded_url) and not getattr(settings, 'DEBUG', False):
                resp = HttpResponse(PROTECTED_ASSET_SVG, content_type='image/svg+xml', status=200)
                resp['Cache-Control'] = 'public, max-age=3600'
                resp['Access-Control-Allow-Origin'] = '*'
                return resp

            final_url_to_fetch = optimize_cloudinary_url(decoded_url)

            # If it is a Cloudinary authenticated asset, sign it with server credentials
            if 'res.cloudinary.com' in decoded_url and '/image/authenticated/' in decoded_url:
                try:
                    import cloudinary.utils
                    from .cloudinary_upload import configure_cloudinary
                    configure_cloudinary()

                    parts = decoded_url.split('/image/authenticated/')
                    if len(parts) > 1:
                        subpath = parts[1]
                        subparts = subpath.split('/')
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

            if final_url_to_fetch.startswith('http://') or final_url_to_fetch.startswith('https://'):
                from django.http import HttpResponseRedirect
                redirect_resp = HttpResponseRedirect(final_url_to_fetch)
                redirect_resp['Cache-Control'] = 'private, max-age=86400, stale-while-revalidate=3600'
                redirect_resp['X-Content-Type-Options'] = 'nosniff'
                redirect_resp['Cross-Origin-Resource-Policy'] = 'cross-origin'
                redirect_resp['Access-Control-Allow-Origin'] = '*'
                redirect_resp['X-Protected-Asset'] = 'CampXChange-Secured'
                return redirect_resp

        # Cache in memory if local disk bytes were loaded
        if content_type and image_bytes:
            cache.set(cache_key, (content_type, image_bytes), timeout=3600)

        if not image_bytes:
            resp = HttpResponse(PROTECTED_ASSET_SVG, content_type='image/svg+xml', status=200)
            resp['Cache-Control'] = 'public, max-age=300'
            resp['Access-Control-Allow-Origin'] = '*'
            return resp

        response = HttpResponse(image_bytes, content_type=content_type or 'image/jpeg')
        response['Cache-Control'] = 'private, max-age=86400, stale-while-revalidate=3600'
        response['X-Content-Type-Options'] = 'nosniff'
        response['Cross-Origin-Resource-Policy'] = 'cross-origin'
        response['Access-Control-Allow-Origin'] = '*'
        response['Content-Disposition'] = 'inline'
        response['X-Protected-Asset'] = 'CampXChange-Secured'
        return response

    except Exception as fetch_err:
        logger.error(f"Error proxying secure image ({decoded_url}): {fetch_err}")
        resp = HttpResponse(PROTECTED_ASSET_SVG, content_type='image/svg+xml', status=200)
        resp['Cache-Control'] = 'public, max-age=300'
        resp['Access-Control-Allow-Origin'] = '*'
        return resp
