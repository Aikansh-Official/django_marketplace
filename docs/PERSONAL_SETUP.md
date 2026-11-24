# Personal setup and integrations

The checkout contains a Django API, a React student client and a React admin client.
Keep actual credentials in local environment files or your hosting provider's private
settings. The example files contain names and local-development defaults only. Do
not replace an existing `.env` blindly; add the missing entries to your own file.

## Local startup

1. Install Python 3.12 or later and MongoDB, then install `server/requirements.txt`
   in a virtual environment. Copy `server/.env.example` to `server/.env` only if
   that file does not already exist. Set a new `SECRET_KEY` and the desired
   `MONGODB_URI` and `MONGODB_NAME`. Use a separate database for testing.
2. From `server`, run `python manage.py migrate` and `python manage.py runserver`.
   Migration changes the configured database; do not point it at another person's
   database. The example's debug and HTTP settings are for local development only.
3. In both `client` and `admin`, install dependencies with `npm ci`. Copy their
   respective `.env.example` to `.env.local` only if absent, and run `npm run dev`.
   Their local Vite proxies send `/api` to `127.0.0.1:8000`.
4. For a hosted deployment, set `DEBUG=False`, a strong unique secret, exact hosts
   and exact client/admin origins, HTTPS and secure cookie settings. Configure the
   hosted frontend proxy or set `VITE_API_BASE_URL` to the personal API URL.
   See [deployment guide](CLOUDFLARE_DEPLOYMENT.md).

The Django settings currently load `server/.env` with override enabled. On a machine
with that file, its entries take priority over process environment entries with the
same names. Frontend `VITE_` values are included in the browser build; never put a
private key or mailbox password there. `DATA_SECURITY_KEY` / `VITE_APP_SECURITY_KEY`
is an optional shared client-visible gate, not a substitute for authentication.

## What each integration needs

| Feature | Backend (`server/.env`) | Student client (`client/.env.local`) |
| --- | --- | --- |
| Data and accounts | `MONGODB_URI`, `MONGODB_NAME`, `SECRET_KEY` | `VITE_API_BASE_URL` if not using `/api` proxy |
| Signup and reset email | Choose `EMAIL_PROVIDER=brevo` and configure `BREVO_*`, `EMAIL_PROVIDER=resend` and configure `RESEND_*`, or `EMAIL_PROVIDER=smtp` and configure `SMTP_*`; set `FRONTEND_URL` | No private mail credentials |
| ID-card verification | `GEMINI_API_KEY`; optionally `GEMINI_MODEL` | Camera permission and a supported browser |
| Google sign-in | `FIREBASE_API_KEY` for Firebase ID-token lookup; `GOOGLE_CLIENT_ID` for direct Google OAuth ID tokens | `VITE_FIREBASE_*` web app values for the same Firebase project |
| Browser push | `FIREBASE_SERVICE_ACCOUNT_KEY`, `FIREBASE_PROJECT_ID`, `FRONTEND_URL` | Matching Firebase web app values and `VITE_FIREBASE_VAPID_KEY` |
| Listing images | `MEDIA_STORAGE_BACKEND=mongodb` for GridFS, or Cloudinary credentials | No private storage credentials |

Brevo's HTTPS transactional API works without an SMTP connection. Create a free
Brevo account, activate transactional email if requested, verify a sender, then set
`EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `BREVO_FROM_EMAIL` and `BREVO_FROM_NAME`
in the backend's private environment. Brevo controls activation and delivery and
may substitute its own compliant sender address when a personal email is used;
an authenticated domain is recommended. Check its current free limits and sender
requirements before use. For a hosted API, set these on the hosting service too;
editing a local `.env` does not change the hosted service.

Hostinger SMTP requires a real mailbox. Set `SMTP_USER` to its full email address,
`SMTP_PASSWORD` to its mailbox password, and `SMTP_FROM_EMAIL` to an authorized
sender. The usual encrypted settings are `smtp.hostinger.com`, port `465`,
`SMTP_USE_SSL=True` and `SMTP_USE_TLS=False`; alternatively port `587` with SSL
false and TLS true. Verify the settings for your account in Hostinger. Render's
free web services block outgoing SMTP ports 25, 465 and 587; use Brevo or Resend's
HTTPS API on that plan. Hostinger's server-side PHP mail is a separate feature
that runs on Hostinger hosting, not the Django service on Render. Resend is
an alternative; sending to arbitrary recipients requires an appropriately verified
sender domain. Provider acceptance is not proof that a message reached an inbox.

Firebase web configuration and VAPID public key are intended for the browser. The
Firebase Admin service account is private: keep its JSON outside source control and
point `FIREBASE_SERVICE_ACCOUNT_KEY` to its private path, or use your host's secret
configuration. Google sign-in also requires enabling its provider and authorizing
the actual frontend domains in the Firebase console. Web push requires browser
permission and a secure context (HTTPS or localhost). Gemini availability, model
access and quotas depend on the configured Google account. ID images sent to Gemini
are processed by that external service.

An existing buyer upgrades the same account by verifying their student ID; the
existing password and profile photo remain unchanged. No new selfie or email code
is required for this upgrade. Initial signup still requires email verification.

A successful build does not establish provider delivery, production configuration,
or account permissions. Verify OTP receipt and expiry, sign-in, scan and push using
personal test accounts after supplying credentials. Do not share environment-file
contents, service-account keys or passwords in chat or commit them to Git.
