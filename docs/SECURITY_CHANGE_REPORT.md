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
