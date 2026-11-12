"""Exercise the real deployment using three existing, explicitly provisioned test accounts.

This creates labelled TEST data: one completed trade and one retained ACTIVE listing.
No existing listings are edited or deleted. Mutations are never retried after a timeout.
Credentials must come from a JSON file outside the repository, never command-line values.
Example: python scripts/test_deployment.py --base-url https://YOUR-SITE.pages.dev \
    --credentials-file C:/private/test-accounts.json
"""
import argparse
from datetime import datetime, timezone
import http.cookiejar
import hashlib
import json
from pathlib import Path
import re
import secrets
import struct
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zlib


ROOT = Path(__file__).resolve().parents[1]


class SmokeFailure(Exception):
    """A deliberately sanitized test failure, safe for console/report output."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        # Never forward credentials automatically to a different origin.
        return None


def origin_and_api(value):
    parsed = urllib.parse.urlsplit(value.rstrip('/'))
    local = parsed.hostname in ('localhost', '127.0.0.1', '::1')
    if (parsed.scheme not in ('https', 'http') or
            (parsed.scheme == 'http' and not local) or
            not parsed.hostname or parsed.username or parsed.password or
            parsed.query or parsed.fragment or parsed.path not in ('', '/', '/api')):
        raise SmokeFailure('Use an HTTPS site origin, or HTTP localhost, without credentials/query parameters.')
    origin = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, '', '', ''))
    return origin, origin + '/api'


def read_credentials(path):
    path = path.expanduser().resolve()
    if path.is_relative_to(ROOT):
        raise SmokeFailure('The credentials file must be outside the repository.')
    try:
        document = json.loads(path.read_text(encoding='utf-8-sig'))
        accounts = document.get('accounts', [])
        roles = {}
        expected_names = {'aikansh': 'admin', '12300001': 'buyer', '12300002': 'seller'}
        for account in accounts:
            role = account.get('role', '').lower()
            if role not in ('admin', 'buyer', 'seller'):
                role = expected_names.get(str(account.get('username', '')).lower())
            if role:
                roles[role] = {'username': str(account['username']), 'password': account['password']}
        if set(roles) != {'admin', 'buyer', 'seller'} or any(not a['password'] for a in roles.values()):
            raise ValueError()
        return roles
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        raise SmokeFailure('Could not read the three test-account credentials from the private JSON file.') from None


def test_png():
    """Create a valid raster fixture with stdlib only; the backend normalizes it to WebP."""
    width = height = 160
    rows = []
    for y in range(height):
        row = bytearray()
        for x in range(width):
            row.extend((255, 111, 15) if ((x // 20 + y // 20) % 2) else (245, 245, 245))
        rows.append(b'\x00' + row)

    def chunk(kind, content):
        return (struct.pack('>I', len(content)) + kind + content +
                struct.pack('>I', zlib.crc32(kind + content) & 0xffffffff))

    return (b'\x89PNG\r\n\x1a\n' +
            chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)) +
            chunk(b'IDAT', zlib.compress(b''.join(rows))) + chunk(b'IEND', b''))


class Api:
    def __init__(self, base_url, role, report, timeout, browser_origin=None):
        self.origin, self.base = origin_and_api(base_url)
        self.browser_origin = origin_and_api(browser_origin)[0] if browser_origin else self.origin
        self.role, self.report, self.timeout = role, report, timeout
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(NoRedirect(), urllib.request.HTTPCookieProcessor(self.cookies))
        self.access = None
        self.csrf = None

    def request(self, name, method, path, payload=None, expected=(200,), *,
                body=None, content_type=None, bearer=True, raw=False, extra_headers=None):
        # Request paths are source-defined API paths, never supplied by remote response data.
        if not path.startswith('/') or path.startswith('//') or '?' in path or '#' in path:
            raise SmokeFailure('Invalid local test route.')
        headers = {'Accept': 'application/json', 'X-Client-Type': 'web',
                   'User-Agent': 'CampXChange-Deployment-Smoke/1.0',
                   'Origin': self.browser_origin, 'Referer': self.browser_origin + '/'}
        if bearer and self.access:
            headers['Authorization'] = 'Bearer ' + self.access
        if self.csrf and method not in ('GET', 'HEAD', 'OPTIONS'):
            headers['X-CSRFToken'] = self.csrf
        if payload is not None:
            body = json.dumps(payload).encode('utf-8')
            headers['Content-Type'] = 'application/json'
        elif content_type:
            headers['Content-Type'] = content_type
        if extra_headers:
            headers.update(extra_headers)
        started = time.monotonic()
        entry = {'check': name, 'role': self.role, 'method': method, 'path': path}
        self.report['checks'].append(entry)
        try:
            request = urllib.request.Request(self.base + path, data=body, headers=headers, method=method)
            try:
                response = self.opener.open(request, timeout=self.timeout)
            except urllib.error.HTTPError as error:
                response = error
            with response:
                status, response_headers, data = response.status, response.headers, response.read(8 * 1024 * 1024)
            entry.update(status=status, seconds=round(time.monotonic() - started, 2),
                         passed=status in expected)
            if status not in expected:
                raise SmokeFailure(f'{name}: unexpected HTTP {status}; expected {expected}.')
            if raw:
                return response_headers, data
            try:
                return json.loads(data) if data else None
            except (ValueError, UnicodeDecodeError):
                raise SmokeFailure(f'{name}: expected a JSON response.') from None
        except SmokeFailure:
            entry['passed'] = False
            raise
        except Exception as error:
            # Do not stringify network/driver errors: they can contain headers or URLs.
            entry.update(passed=False, error_type=type(error).__name__,
                         seconds=round(time.monotonic() - started, 2))
            raise SmokeFailure(f'{name}: request failed ({type(error).__name__}); no mutation retry attempted.') from None

    def login(self, credentials):
        csrf = self.request(f'{self.role}: anonymous CSRF token', 'GET', '/auth/csrf/', bearer=False)
        self.csrf = csrf.get('csrfToken')
        verify(self.report, f'{self.role}: CSRF token returned', isinstance(self.csrf, str) and bool(self.csrf))
        result = self.request(f'{self.role}: password login', 'POST', '/auth/login/', credentials, bearer=False)
        self.access = result.get('access')
        verify(self.report, f'{self.role}: access token returned', isinstance(self.access, str) and bool(self.access))
        # Exercise the actual browser-cookie route as well as bearer-based API access.
        cookie_status = self.request(f'{self.role}: cookie session accepted', 'GET', '/auth/status/', bearer=False)
        verify(self.report, f'{self.role}: cookie session authenticated', cookie_status.get('isAuthenticated') is True)
        token_status = self.request(f'{self.role}: bearer session accepted', 'GET', '/auth/status/')
        verify(self.report, f'{self.role}: bearer session authenticated', token_status.get('isAuthenticated') is True)
        return result.get('user') or token_status.get('user') or {}


def verify(report, name, condition):
    report['checks'].append({'check': name, 'passed': bool(condition)})
    if not condition:
        raise SmokeFailure(name + ': assertion failed.')


def listing_payload(category_id, image_url, label):
    return {
        'title': label,
        'description': 'TEST DATA ONLY. A labelled example listing created by the deployment acceptance test; not a genuine sale.',
        'category': category_id, 'price': '10.00', 'original_price': '20.00',
        'transaction_type': 'SELL', 'condition': 'GOOD', 'location': 'TEST campus meetup',
        'contact_preference': 'CHAT', 'is_negotiable': True,
        'uploaded_images': [image_url], 'primary_image_index': 0,
    }


def read_image(client, image_url, report):
    """Read a signed asset only on the tested origin, without leaking JWTs to a supplied host."""
    parsed = urllib.parse.urlsplit(image_url)
    verify(report, 'Image reference uses expected signed gateway',
           parsed.path == '/api/media/secure-image/' and bool(parsed.query))
    request = urllib.request.Request(client.origin + parsed.path + '?' + parsed.query, headers={
        'Referer': client.browser_origin + '/', 'Origin': client.browser_origin,
        'Sec-Fetch-Dest': 'image', 'Sec-Fetch-Mode': 'no-cors', 'Accept': 'image/webp,image/*',
        'User-Agent': 'CampXChange-Deployment-Smoke/1.0',
    })
    check = {'check': 'Uploaded image retrieval', 'role': client.role, 'method': 'GET',
             'path': parsed.path, 'passed': False}
    report['checks'].append(check)
    try:
        with client.opener.open(request, timeout=client.timeout) as response:
            check['status'] = response.status
            content = response.read(6 * 1024 * 1024)
            check['sha256'] = hashlib.sha256(content).hexdigest()
            check['bytes'] = len(content)
            check['passed'] = response.status == 200 and response.headers.get_content_type() in (
                'image/webp', 'image/jpeg', 'image/png', 'image/gif') and bool(content)
    except urllib.error.HTTPError as error:
        check['status'] = error.code
        check['content_type'] = error.headers.get_content_type()
        check['protected_asset'] = bool(error.headers.get('X-Protected-Asset'))
        raise SmokeFailure(f'Uploaded image retrieval failed with HTTP {error.code}; remote details suppressed.') from None
    except Exception as error:
        check['error_type'] = type(error).__name__
        raise SmokeFailure('Uploaded image retrieval failed; remote error details suppressed.') from None
    if not check['passed']:
        raise SmokeFailure('Uploaded image did not return a valid raster response.')


def read_only(args, report):
    """Check existing public state after deployment/restart without rotating sessions or creating data."""
    public = Api(args.base_url, 'guest', report, args.timeout, args.browser_origin)
    health = public.request('Backend and database health', 'GET', '/health/')
    verify(report, 'Database reports healthy', health.get('database') == 'healthy')
    categories = public.request('Public categories', 'GET', '/marketplace/categories/')
    verify(report, 'Seeded categories available', isinstance(categories, list) and bool(categories))
    if args.admin_base_url:
        admin_public = Api(args.admin_base_url, 'guest-admin', report, args.timeout)
        admin_health = admin_public.request('Admin proxy backend health', 'GET', '/health/')
        verify(report, 'Admin proxy database reports healthy', admin_health.get('database') == 'healthy')
        admin_public.request('Admin proxy public categories', 'GET', '/marketplace/categories/')
    if args.existing_report:
        try:
            prior = json.loads(args.existing_report.read_text(encoding='utf-8'))
            identities = prior['created_test_data']
            expected = [('trade_listing_id', 'SOLD'), ('active_listing_id', 'ACTIVE')]
            if not all(re.fullmatch(r'[a-f0-9]{24}', identities.get(key, '')) for key, _ in expected):
                raise ValueError()
        except (OSError, ValueError, KeyError, TypeError):
            raise SmokeFailure('The existing secret-free report must contain valid test listing IDs.') from None
        for key, status in expected:
            identity = identities[key]
            listing = public.request(f'Existing {status} test listing read', 'GET', f'/marketplace/listings/{identity}/')
            verify(report, f'Existing test listing remains {status}', listing.get('status') == status)
            verify(report, f'Existing {status} listing remains TEST labelled', str(listing.get('title', '')).startswith('TEST '))
            report['created_test_data'][key] = identity
            images = listing.get('images') or []
            verify(report, f'Existing {status} listing has persisted image', bool(images))
            report.setdefault('record_snapshots', []).append({
                'id': identity, 'status': listing.get('status'),
                'title': listing.get('title'), 'price': listing.get('price'),
                'image_ids': [str(image.get('id')) for image in images],
            })
            read_image(public, images[0].get('image_url', ''), report)
    if args.compare_report:
        try:
            previous = json.loads(args.compare_report.read_text(encoding='utf-8'))
            if not previous.get('passed'):
                raise ValueError()
            old_hashes = [check['sha256'] for check in previous['checks'] if check.get('sha256')]
            new_hashes = [check['sha256'] for check in report['checks'] if check.get('sha256')]
            if not old_hashes:
                raise ValueError()
        except (OSError, ValueError, KeyError, TypeError):
            raise SmokeFailure('Comparison requires a prior passed read-only report with image hashes.') from None
        verify(report, 'Existing listing identities unchanged after restart',
               report['created_test_data'] == previous['created_test_data'])
        verify(report, 'Stored image bytes unchanged after restart', new_hashes == old_hashes)
        if previous.get('record_snapshots'):
            verify(report, 'Listing fields and image records unchanged after restart',
                   report.get('record_snapshots') == previous['record_snapshots'])
    return True


def run(args, credentials, report):
    public = Api(args.base_url, 'guest', report, args.timeout, args.browser_origin)
    health = public.request('Backend and database health', 'GET', '/health/')
    verify(report, 'Database reports healthy', health.get('database') == 'healthy')
    categories = public.request('Public categories', 'GET', '/marketplace/categories/')
    verify(report, 'Seeded categories available', isinstance(categories, list) and bool(categories))
    category_id = str(categories[0]['id'])

    clients, users = {}, {}
    for role in ('admin', 'buyer', 'seller'):
        client = Api(args.admin_base_url if role == 'admin' and args.admin_base_url else args.base_url,
                     role, report, args.timeout,
                     None if role == 'admin' and args.admin_base_url else args.browser_origin)
        clients[role] = client
        users[role] = client.login(credentials[role])
    admin, buyer, seller = (clients[role] for role in ('admin', 'buyer', 'seller'))
    verify(report, 'Admin has staff privileges', bool(users['admin'].get('is_staff') or users['admin'].get('is_superuser')))
    verify(report, 'Buyer has buyer role without staff access',
           users['buyer'].get('role') == 'BUYER' and not users['buyer'].get('is_staff'))
    verify(report, 'Seller is verified without staff access', users['seller'].get('role') == 'SELLER' and
           users['seller'].get('is_id_verified') is True and not users['seller'].get('is_staff'))
    for role in ('admin', 'buyer', 'seller'):
        profile = clients[role].request(f'{role}: profile read', 'GET', '/auth/profile/')
        verify(report, f'{role}: profile identity matches', str(profile.get('id')) == str(users[role].get('id')))
    admin.request('Admin dashboard', 'GET', '/marketplace/admin/dashboard-stats/')
    buyer.request('Buyer blocked from admin dashboard', 'GET', '/marketplace/admin/dashboard-stats/', expected=(403,))
    seller.request('Seller blocked from admin dashboard', 'GET', '/marketplace/admin/dashboard-stats/', expected=(403,))
    buyer.request('Buyer blocked from creating a listing', 'POST', '/marketplace/listings/',
                  {'title': 'TEST forbidden buyer listing'}, expected=(403,))

    boundary = 'smoke-' + secrets.token_hex(12)
    image = test_png()
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="test-fixture.png"\r\n'
            'Content-Type: image/png\r\n\r\n').encode('ascii') + image + f'\r\n--{boundary}--\r\n'.encode('ascii')
    upload = seller.request('Seller uploads valid image', 'POST', '/marketplace/upload-image/',
                            body=body, content_type=f'multipart/form-data; boundary={boundary}')
    image_url = upload.get('url') or upload.get('image_url')
    verify(report, 'Image upload returned reference', isinstance(image_url, str) and bool(image_url))
    read_image(seller, image_url, report)

    stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S') + '-' + secrets.token_hex(2)
    trade = seller.request('Seller creates TEST trade listing', 'POST', '/marketplace/listings/',
                           listing_payload(category_id, image_url, 'TEST completed trade ' + stamp), expected=(201,))
    trade_id = str(trade.get('id', ''))
    verify(report, 'Trade listing ID returned', bool(trade_id))
    report['created_test_data']['trade_listing_id'] = trade_id
    active = seller.request('Seller creates retained TEST example listing', 'POST', '/marketplace/listings/',
                            listing_payload(category_id, image_url, 'TEST example book - not a real sale ' + stamp), expected=(201,))
    active_id = str(active.get('id', ''))
    verify(report, 'Retained listing ID returned', bool(active_id))
    report['created_test_data']['active_listing_id'] = active_id
    buyer.request('Buyer cannot edit seller listing', 'PATCH', f'/marketplace/listings/{active_id}/',
                  {'title': 'TEST unauthorized edit'}, expected=(403,))
    listing = buyer.request('Buyer reads retained listing', 'GET', f'/marketplace/listings/{active_id}/')
    verify(report, 'Unauthorized edit left title intact', listing.get('title') == active.get('title'))

    seller_id, buyer_id = str(users['seller']['id']), str(users['buyer']['id'])
    message = buyer.request('Buyer sends real chat message', 'POST', f'/marketplace/chat/{trade_id}/{seller_id}/',
                            {'message': 'TEST deployment conversation; no real transaction.'}, expected=(201,))
    thread = seller.request('Seller reads buyer chat', 'GET', f'/marketplace/chat/{trade_id}/{buyer_id}/')
    verify(report, 'Chat persisted and reached seller', any(str(m.get('id')) == str(message.get('id')) for m in thread.get('messages', [])))
    offer = buyer.request('Buyer submits offer', 'POST', f'/marketplace/listings/{trade_id}/offer/',
                          {'offer_amount': '10.00', 'message': 'TEST deployment offer; no payment.'}, expected=(201,))
    offer_id = str(offer.get('id', ''))
    verify(report, 'Offer persisted as pending', bool(offer_id) and offer.get('status') == 'PENDING')
    report['created_test_data']['offer_id'] = offer_id
    seller.request('Seller accepts offer', 'PATCH', f'/marketplace/offers/{offer_id}/respond/', {'action': 'ACCEPT'})
    reserved = buyer.request('Accepted listing is reserved', 'GET', f'/marketplace/listings/{trade_id}/')
    verify(report, 'Accepted listing status is PENDING', reserved.get('status') == 'PENDING')
    buyer.request('Buyer cannot generate seller handover code', 'POST', f'/marketplace/offers/{offer_id}/generate-qr/', {}, expected=(403,))
    handover = seller.request('Seller generates handover PIN', 'POST', f'/marketplace/offers/{offer_id}/generate-qr/', {}, expected=(201,))
    pin = handover.get('pin_code')
    verify(report, 'Seller received six-digit PIN', isinstance(pin, str) and len(pin) == 6 and pin.isdigit())
    buyer_metadata = buyer.request('Buyer handover metadata excludes secrets', 'GET', f'/marketplace/offers/{offer_id}/generate-qr/')
    verify(report, 'Buyer cannot read seller secret via metadata', buyer_metadata.get('pin_code') is None and buyer_metadata.get('token') is None)
    verified = buyer.request('Buyer verifies seller-provided PIN', 'POST', '/marketplace/handover/verify/', {'pin_code': pin})
    token = verified.get('token')
    verify(report, 'Buyer verification succeeded', verified.get('verified') is True and isinstance(token, str) and bool(token))
    confirmed = buyer.request('Buyer confirms TEST handover', 'POST', '/marketplace/handover/confirm/', {'token': token})
    verify(report, 'Handover confirmation succeeded', confirmed.get('success') is True)
    buyer.request('Repeated handover confirmation rejected', 'POST', '/marketplace/handover/confirm/', {'token': token}, expected=(400,))
    completed = seller.request('Completed trade listing read', 'GET', f'/marketplace/listings/{trade_id}/')
    verify(report, 'Completed trade is SOLD', completed.get('status') == 'SOLD')
    retained = public.request('Retained example listing is publicly readable', 'GET', f'/marketplace/listings/{active_id}/')
    verify(report, 'Retained example listing is ACTIVE with images', retained.get('status') == 'ACTIVE' and bool(retained.get('images')))
    admin.request('Admin can inspect retained TEST listing', 'GET', f'/marketplace/admin/listings/{active_id}/')
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', required=True, help='Site/API origin; /api suffix is accepted.')
    parser.add_argument('--admin-base-url', help='Optional separate admin Pages origin.')
    parser.add_argument('--browser-origin', help='Trusted frontend origin to emulate when testing its backend directly.')
    parser.add_argument('--credentials-file', type=Path)
    parser.add_argument('--read-only', action='store_true', help='Check public APIs and existing data without login/mutations.')
    parser.add_argument('--existing-report', type=Path, help='Prior secret-free successful report, for read-only persisted listing/image checks.')
    parser.add_argument('--compare-report', type=Path, help='Prior read-only report to compare record IDs and image hashes after restart.')
    parser.add_argument('--timeout', type=float, default=100, help='Per-request timeout; no mutation retries.')
    args = parser.parse_args()
    report = {'started_at': datetime.now(timezone.utc).isoformat(), 'passed': False,
              'checks': [], 'created_test_data': {}, 'limits': [
                  'API smoke test; browser rendering and restart durability require separate checks.',
                  'Leaves labelled TEST listings, chat, offer and completed handover records.',
                  'Does not send payments or external email; test accounts must already exist.',
                  'No automatic retry of mutations after errors or timeouts.',
              ]}
    try:
        report['base_url'] = origin_and_api(args.base_url)[0]
        if args.admin_base_url:
            report['admin_base_url'] = origin_and_api(args.admin_base_url)[0]
        if args.browser_origin:
            report['browser_origin'] = origin_and_api(args.browser_origin)[0]
        if not 1 <= args.timeout <= 180:
            raise SmokeFailure('Timeout must be between 1 and 180 seconds.')
        report['read_only'] = args.read_only
        if args.read_only:
            report['limits'] = ['Read-only public API and existing record/image checks; no login or mutation performed.']
            report['passed'] = read_only(args, report)
        else:
            if not args.credentials_file:
                raise SmokeFailure('A private credentials file is required for role lifecycle tests.')
            report['passed'] = run(args, read_credentials(args.credentials_file), report)
    except SmokeFailure as error:
        report['failure'] = str(error)
    except Exception as error:
        report['failure'] = 'Unexpected test failure; details suppressed (' + type(error).__name__ + ').'
    report['finished_at'] = datetime.now(timezone.utc).isoformat()
    directory = ROOT / 'output' / 'deployment-tests'
    directory.mkdir(parents=True, exist_ok=True)
    output = directory / ('smoke-' + datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-%f') + '.json')
    output.write_text(json.dumps(report, indent=2), encoding='utf-8')
    passed = sum(check.get('passed', False) for check in report['checks'])
    print(f'Deployment smoke test: {"PASS" if report["passed"] else "FAIL"}; {passed}/{len(report["checks"])} checks passed.')
    if report.get('failure'):
        print(report['failure'])
    print('Secret-free report: ' + str(output))
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
