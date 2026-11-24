# Main flows

```mermaid
flowchart LR
  Student[Student browser] --> Client[React marketplace]
  Staff[Staff browser] --> Admin[React admin]
  Client --> API[Django API]
  Admin --> API
  API --> DB[(MongoDB)]
  API --> Mail[Configured email provider]
  API --> Gemini[Gemini ID verification]
  API --> Firebase[Firebase identity and push]
  API --> Storage[MongoDB media or Cloudinary]
```

```mermaid
sequenceDiagram
  participant U as Student
  participant C as Client
  participant A as Django API
  participant M as Email provider
  U->>C: Enter signup or reset details
  C->>A: Request a code
  A->>M: Send the code
  M-->>A: Accept or reject delivery
  A-->>C: Report outcome
  U->>C: Enter received code
  C->>A: Verify code and continue
```

For signup, the client submits the verified code again with the final registration
request. The API checks that the same code is still valid and unlocked, then consumes
its record once before creating the account. A resend replaces the previous code.
An email provider accepting a request does not guarantee inbox delivery. Password
reset has a separate code and flow.

```mermaid
sequenceDiagram
  participant U as Student
  participant C as Client
  participant A as Django API
  participant G as Gemini
  U->>C: Capture ID image and enter details
  C->>A: Submit image and account details
  A->>G: Request verification
  G-->>A: Verification result
  A-->>C: Result or unavailable error
```

Actual access and persistence also depend on server-side validation and the chosen
provider's configuration. See [personal setup](PERSONAL_SETUP.md).

An authenticated buyer can upgrade the same account by submitting an ID card.
The server checks the card against the account's registration number and name and
checks the university through the configured verification service. The upgrade
does not request a new password, selfie or fresh email code. It preserves the
existing profile photo; initial seller signup remains a separate flow.

```mermaid
sequenceDiagram
  participant U as Student
  participant C as Profile page
  participant A as Django API
  participant D as MongoDB
  participant S as Image storage
  U->>C: Choose delete account
  U->>C: Enter password and type DELETE
  C->>A: DELETE account with confirmation
  A->>A: Authenticate and check password
  A->>D: Delete own account and related records
  A->>S: Remove unshared account images after commit
  A-->>C: Confirm deletion or report incomplete image cleanup
  C->>C: Clear session and return to marketplace
```

The removal includes the user's listings, saved items, messages and offers,
including conversations and offers involving other users. A wrong password or
missing confirmation leaves the account intact. Stored image cleanup runs after
the database commit and may require support if it cannot complete.
