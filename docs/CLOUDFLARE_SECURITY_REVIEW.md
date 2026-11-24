# Hosting change review

## Executive summary

Scope: changes from `b87055c` for the personal Pages deployment. This is a focused
review of the new proxy, build packaging, API base and touched sign-in/listing paths,
not a new full audit of the application. No confirmed new exploitable vulnerability
was found in that scope. Recommendation: conditional for frontend publication;
Live deployment verification now supplements the original source review: 76 backend
integration checks passed, including database persistence, three-role authentication,
authorization failures, images, chat, offers and handover. Both Pages proxies also
passed read-only checks. These results do not establish complete application security.
Critical/high/medium/low confirmed new findings in this review: 0/0/0/0.

## Changes and history

The prior API default pointed at the visitor's `localhost:8000` (`git blame` attributes
the original fallback to `e315e370`). The fallback now uses `/api`, preserving Vite's
existing local proxy and the deployed same-origin proxy. Thirty-three client source
files import the API module; image URL resolution also reads `API_BASE`. Both frontend
builds passed. Admin source remains unchanged and is built with the same `/api` value.

`pages-worker.js` is a new external-request boundary shared by two deployment targets.
Its callers are the public `/api` and `/media` routes, constrained by `_routes.json`.
`Home.jsx` now rejects a non-array listing payload and correctly calls Retry without
passing a click event as an AbortSignal. Optional Firebase initialization and sign-in
errors fail visibly instead of crashing or implying an unavailable provider succeeded.

## Controls checked

- `deploy/cloudflare/pages-worker.js:18`: the upstream is administrator configuration,
  not a query parameter; only HTTPS origins without credentials or paths are accepted.
  An attacker cannot select an upstream through a request URL.
- `pages-worker.js:30`: client-supplied forwarding headers are removed. The original
  Origin is preserved for Django's trusted-origin/CSRF enforcement.
- `pages-worker.js:41`: upstream redirects are not followed with credentials. Same-host
  redirects are rewritten to the current frontend origin.
- `pages-worker.js:46`: API and private-media responses are not cached. Missing backend
  configuration and connection failures return generic 503 JSON without internal errors.
- `scripts/build_pages.mjs:14`: both builds explicitly select `/api`; packaging takes
  only generated frontend output. No `.env`, password or database URI was uploaded.
- No authentication, authorization, CSRF, certificate or upload validation was disabled.

## Tests and limitations

Four tests cover static-route separation, rejected/missing upstream configuration,
fixed-host proxying with authentication/Origin preservation, redirect handling,
request-body forwarding, private response caching and sanitized connection failure.
Client/admin builds and live Chrome checks are recorded in `CLOUDFLARE_DEPLOYMENT.md`.

Production login, cookie/bearer authentication, cross-role access failures, image
upload/read, offer/chat persistence and sequential duplicate handover rejection were
exercised against the personal Render/Atlas deployment. Multiple Set-Cookie headers
also passed a focused local proxy check. This was not concurrency/load testing;
email signup/reset, external identity providers and rate-limit exhaustion remain
outside the successful role-flow evidence. No penetration testing of any other user's
service or the original/team repositories was performed.

## Durable media addition

`server/marketplace/mongodb_media.py` stores normalized WebP images in GridFS only
when `MEDIA_STORAGE_BACKEND=mongodb`. Existing Cloudinary behavior remains the default.
Opaque 192-bit references are served through the signed gateway, not a raw file route.
New listing references must belong to the uploader; private IDs additionally require
an active authenticated owner or student-management administrator. Storage failure
does not silently fall back to ephemeral disk in MongoDB mode. Twenty-six focused
tests passed, including nine real isolated local GridFS checks. The deployed image
upload and read also passed. Atlas free storage is shared by records and images;
capacity monitoring remains necessary.

## Availability changes

The Render-only loop calls a fixed public `/api/ready/` on the current service,
validates TLS and a bounded `ready: true` response, refuses redirects and cleans up
on worker shutdown. The new public endpoint does not read the database or user
session; exact middleware exemptions leave protected API paths unchanged. Nineteen
heartbeat/readiness checks passed, and a successful automatic heartbeat was observed
after deployment. The real database-health probe remains separate.

Read recovery applies only to GET/HEAD transport or 502/503/504 failures within a
60-second budget. It does not replay login, messaging, offer or listing mutations,
authentication errors, rate limits or explicit maintenance. Six focused tests and a
temporary browser-only network-failure/recovery check passed. No security protection
was disabled and the temporary test block was removed.
