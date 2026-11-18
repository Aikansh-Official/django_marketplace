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
