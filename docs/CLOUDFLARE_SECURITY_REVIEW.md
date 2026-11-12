# Hosting change review

## Executive summary

Scope: changes from `b87055c` for the personal Pages deployment. This is a focused
review of the new proxy, build packaging, API base and touched sign-in/listing paths,
not a new full audit of the application. No confirmed new exploitable vulnerability
was found in that scope. Recommendation: conditional for frontend publication;
**do not accept this as a working full-stack release** until live database, authentication,
authorization and upload checks pass. Four mock-based proxy tests do not establish
end-to-end security. Critical/high/medium/low confirmed new findings: 0/0/0/0.

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

Production login/session renewal, multiple Set-Cookie behavior, cross-user access,
file upload/download, throttling and database persistence still require the deployed
Django server and its actual provider configuration. No penetration testing of any
other user's service or the original/team repositories was performed.
