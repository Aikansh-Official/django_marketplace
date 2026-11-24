# Signup OTP security review — 23 November 2026

## Scope and conclusion

Focused differential review of the pending signup and OTP changes against commit `7f4856d`. The reviewed paths are `server/users/serializers.py`, `server/users/views.py`, `server/users/test_security_integration.py`, and `client/src/components/auth/RegisterForm.jsx`; related URL routing, OTP model, throttling settings and history were also inspected. This is not a review of the entire application, identity verification, email deliverability, or deployed configuration.

**Conclusion: conditional.** The change addresses a serious existing signup takeover path by requiring the registering client to present the code that was verified, and adds guarded database operations for the active code and its attempt count. An isolated local MongoDB test run passed, including concurrent attempts. Actual delivery and the deployed signup flow have not been verified.

## Findings

### Fixed in the pending change: signup could use someone else's verified email

At baseline, the public registration endpoint (`server/users/views.py`, `RegisterView`) accepted a verified, unexpired and unlocked OTP record based on its email alone (`server/users/serializers.py`, `UserRegistrationSerializer.validate`). An unauthenticated attacker who knew a victim's address could wait for the victim to verify it, then submit their own registration details before the victim completed signup. The attacker did not need to know the code.

The new registration request must include the six-digit code, which is compared against the verified record. The same still-current, verified, unlocked and unexpired record is then conditionally consumed before account creation. The code is write-only and is not returned in the registration response. The registration and verification checks retain the expiry and lockout protections added in commit `826d11b`.

### Residual availability risk: targeted lockout of a pending signup

The public verification endpoint accepts an email and code, and five incorrect guesses lock the current OTP (`server/users/views.py`, `VerifyOTPView`; `server/users/models.py`, `OTPVerification`). Someone who knows a pending signup address can deliberately submit incorrect codes and force the real user to request another. Signup is throttled per client, but the configured local-memory cache is per process and does not provide a durable shared limit (`server/server/settings.py`). This is an availability issue, not proof that the attacker can learn the code or register the account. A shared rate limiter and recipient-specific abuse controls would reduce repeated or distributed interference.

## Trust boundaries and callers

- `SendOTPView`, `VerifyOTPView` and `RegisterView` are public API endpoints. The signup form is the one production frontend caller found for each of the three endpoints; automated tests also call them.
- OTPs are generated server-side, stored encrypted, expire after ten minutes and are subject to five failures. Email addresses and OTP input come from unauthenticated clients.
- The pending patch uses guarded database-side updates for verification and attempts, and a direct conditional deletion for one-time consumption. The deletion uses a private Django ORM method: future Django or database-backend upgrades must retain the full filter and be tested.
- Account creation happens after consumption. If creation fails, the code is already consumed and the user must request another; this is an availability tradeoff. Media uploads may occur before the conditional consumption and were not audited here.

## Test evidence and limitations

The implementing agent reports that 22 targeted tests passed against an isolated local MongoDB instance. These included a mocked-email send, verify and signup flow; missing and incorrect codes; expiry; resend during validation and verification; one-time consumption; account creation failure; and eight simultaneous incorrect attempts, with exactly five recorded. The email provider was mocked, so this does not establish real delivery. I inspected the implementation and tests, but did not independently rerun the test suite. A deployed signup, actual mailbox delivery, quota exhaustion, and the broader app were not exercised in this review. Local-memory throttling is not a distributed rate limit. Confidence is limited to the reviewed code paths and the test results reported by the implementing agent.
