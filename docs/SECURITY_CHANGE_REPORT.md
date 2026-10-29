# Security changes - 29 October 2026

Repository: Anshuman892494/CXC_Marketplace. Branch: main. Author: Aikansh.

## 1. Student administration permissions

Student-management access previously allowed changing administrative roles and
permissions, including assigning SUPER_ADMIN. It also allowed editing or deleting
staff accounts through the student endpoint. Administrative fields are now
read-only in that serializer, staff accounts are excluded from student management,
and super-admin permission requires an active staff account or superuser.

Validation: regression tests cover blocked role assignment, staff-only super-admin
access, inactive accounts, and the student endpoint's staff exclusion.

## 2. Marketplace feed cache privacy

The default feed shared one cache entry between guests and signed-in users,
allowing private seller contact data and owner-specific fields to reach another
visitor. Only anonymous responses now use the shared cache. A new cache key avoids
serving previously cached private responses after deployment.

Validation: tests exercise member-to-guest leakage, guest cache reuse, and a member
request after a guest response has been cached.

## 3. Browser origin trust

Production CORS, CSRF and image-origin rules trusted every Vercel and Render
tenant. These rules now trust exact configured application origins. The two
existing HTTPS client origins remain enabled. Local development origins remain
available with DEBUG=True. Extra admin or preview origins must be listed in
CORS_ALLOWED_ORIGINS and CSRF_TRUSTED_ORIGINS. The Render hostname is still
accepted when supplied by the hosting environment, without trusting all tenants.

Validation: middleware tests reject unrelated hosting tenants and accept the
existing application origin.

## 4. Session revocation and password recovery

Access and refresh tokens now require an active account and matching web or
Android session claims. Missing claims cannot bypass logout or session revocation.
Password reset clears both platform sessions. Refresh rotation preserves the
original expiry instead of indefinitely extending a stolen session. Invalid
refresh responses no longer expose internal exception text.

Validation: tests cover valid web/Android sessions, cross-platform claims, missing
claims, revoked sessions and suspended accounts. Legacy tokens without session
claims require signing in again. Refresh-token replay within an otherwise active
session remains a limitation until persistent token-family tracking is introduced.

## 5. Cookie request forgery protection

Cookie-authenticated writes and cookie-only refresh now enforce Django CSRF
validation. Both frontends fetch a CSRF token for writes without a bearer token;
bearer requests used by the web and Android clients remain supported. The student
client's refresh request now also sends the configured application header,
preventing refresh failures when that header is required by the server.

Validation: tests reject an unprotected cookie write, accept a matching CSRF token,
and preserve bearer authentication. A no-cache CSRF bootstrap endpoint supports
browser clients hosted separately from the API.

## 6. Media path and asset boundaries

User-supplied listing image paths could escape the media directory during local
file migration or signed-image delivery. Paths now resolve within MEDIA_ROOT and
must have a supported raster extension. Listing URLs are restricted to uploaded
listing assets, excluding private ID-card URLs and unrelated Cloudinary accounts.
Cloudinary deletion also checks the exact account and listing folder.

Validation: traversal, encoded traversal, Windows drive paths, non-image files,
private assets and foreign cloud accounts are rejected; existing local listing
URLs and the configured Cloudinary listing format remain accepted.

## 7. Handover verification

Offer and handover-status responses exposed the QR token and PIN to buyers,
allowing completion without receiving the seller's code. Secrets now appear only
in seller responses; buyers still receive status information. PIN lookup is scoped
to the intended buyer and rate-limited. PINs use cryptographic randomness, and
confirmation rechecks that the offer and listing still represent an active deal.

Validation: serializer tests preserve seller secrets and redact them for buyers
and unrelated users while retaining status fields. Database transaction behavior
is checked separately; production physical handover is not part of this review.
