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
