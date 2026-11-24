# Architecture

- `client/`: React/Vite marketplace, account, listing, messaging and notification UI.
- `admin/`: separate React/Vite administration UI, using the same Django API.
- `server/users/`: accounts, authentication, email and identity verification.
- `server/marketplace/`: listings, trades, messages, notifications and image handling.
- `server/server/`: Django configuration, middleware and MongoDB connection.
- `deploy/`, `scripts/`: deployment and maintenance helpers.

The browser calls Django over HTTP; Django authenticates and authorizes requests and
persists records in MongoDB. Optional providers supply email, Google identity,
Gemini ID verification, Firebase push and Cloudinary storage. `mongodb` media mode
stores images in the configured MongoDB database. Details and configuration are in
[personal setup](PERSONAL_SETUP.md) and [server guide](../SERVER_ARCHITECTURE_AND_SETUP.md).
Provider configuration belongs on the server except public Firebase web settings.

Signed-in wishlists use the existing `Wishlist` records in MongoDB and the
authenticated `/api/marketplace/wishlist/` endpoints. Records are scoped to the
account ID, so an upgrade preserves them and they are available on other devices.
Guest bookmarks remain in the current browser. Earlier unscoped browser bookmarks
are left untouched but not imported because their account owner is unknown.

Account deletion starts in `client/src/components/profile/DeleteAccountSection.jsx`
and calls `DELETE /api/auth/account/`. `DeleteAccountView` in `server/users/views.py`
authenticates the user, checks the current password and confirmation, and deletes
that user's record and related data. `server/users/account_deletion.py` handles
unshared account images after the database commit. Related listing images use the
`server/marketplace/signals.py` cleanup. Image cleanup can fail independently of
the committed account deletion; the API reports incomplete account-image cleanup.
