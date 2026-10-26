# 🚀 CampusXChange (LPUTrade) — Server Architecture, Tech Stack, Data Models & Setup Guide

> **Document Version**: 2.4.0  
> **Last Updated**: October 2026  
> **Platform**: Django REST Framework + MongoDB Atlas / Local  
> **Target Audience**: Developers, DevOps Engineers, and System Architects  

---

## 📑 Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Complete Directory & File Structure](#2-complete-directory--file-structure)
3. [Technology Stack & Core Libraries](#3-technology-stack--core-libraries)
   - [Core Backend & Framework](#core-backend--framework)
   - [Database Layer (MongoDB)](#database-layer-mongodb)
   - [Authentication & Cryptographic Security](#authentication--cryptographic-security)
   - [Cloud & Third-Party Integrations](#cloud--third-party-integrations)
   - [Production Web Server & Optimization](#production-web-server--optimization)
4. [Data Models & Schema Architecture](#4-data-models--schema-architecture)
   - [User Management & Authentication Models (`users/models.py`)](#user-management--authentication-models)
   - [Marketplace Core Models (`marketplace/models.py`)](#marketplace-core-models)
5. [System Architecture & Request Lifecycle (Flow)](#5-system-architecture--request-lifecycle-flow)
   - [Security Shield & Middleware Flow](#security-shield--middleware-flow)
   - [Dual-Device Session Isolation (Web + Android)](#dual-device-session-isolation-web--android)
   - [AI-Driven Student Verification Flow](#ai-driven-student-verification-flow)
   - [Peer-to-Peer Handover QR / PIN Verification Flow](#peer-to-peer-handover-qr--pin-verification-flow)
   - [Notification Dispatch Architecture](#notification-dispatch-architecture)
6. [API Route Catalog](#6-api-route-catalog)
7. [Environment Variables Reference (`.env`)](#7-environment-variables-reference-env)
8. [Step-by-Step Server Setup & Run Guide](#8-step-by-step-server-setup--run-guide)
   - [Local Development Setup (Step-by-Step)](#local-development-setup-step-by-step)
   - [Docker Deployment](#docker-deployment)
   - [Production Deployment (Gunicorn / Render)](#production-deployment-gunicorn--render)
9. [Diagnostics & Health Monitoring](#9-diagnostics--health-monitoring)

---

## 1. 📌 Platform Overview

**CampusXChange (LPUTrade)** is a high-throughput, security-hardened student-to-student marketplace and community platform built specifically for university campuses. It allows students to:
- Buy, sell, exchange, or donate pre-owned study materials, electronics, bicycles, and hostel supplies.
- Verify student credentials seamlessly via **Google Gemini Vision AI** (extracting and matching student ID card details).
- Conduct fraud-free peer handovers using **cryptographic QR codes and 6-digit dynamic OTP verification**.
- Engage in private real-time peer messaging and receive push alerts via **Firebase Cloud Messaging (FCM)**.
- Enforce strict role-based access control (RBAC) across 12 distinct administrative modules (Super Admin, Content Moderator, Student ID Verifier).

---

## 2. 📂 Complete Directory & File Structure

```text
server/
│
├── server/                             # Core Project Settings & Configurations
│   ├── __init__.py                     # Package initialization
│   ├── apps.py                         # MongoDB ObjectId to DRF serialization mappings & AppConfigs
│   ├── asgi.py                         # ASGI entrypoint for asynchronous gateways
│   ├── crypto.py                       # Fernet AES-CBC/HMAC symmetric cryptographic utility
│   ├── health.py                       # Zero-overhead health check (/health/) & ping (/ping/) probes
│   ├── middleware.py                   # DataSecurityMiddleware (X-App-Security-Key shield)
│   ├── mongo_migrations/               # Custom migrations for MongoDB auth & content types
│   ├── settings.py                     # Master Django settings (Security, DB, CORS, JWT, Resend, FCM)
│   ├── urls.py                         # Master root URL routing
│   └── wsgi.py                         # WSGI production server entrypoint
│
├── users/                              # User Management, Auth & Student Verification App
│   ├── __init__.py
│   ├── admin.py                        # Django admin interface registrations for CustomUser
│   ├── apps.py                         # Users app config
│   ├── authentication.py               # Dual-Device CookieJWTAuthentication (Web + Android isolation)
│   ├── email_service.py                # Resend API email engine (Responsive HTML templates for OTP & Reset)
│   ├── gemini_id_verifier.py           # Google Gemini 1.5/2.0 Vision student ID card AI verification
│   ├── migrations/                     # Database migrations
│   ├── models.py                       # CustomUser, OTPVerification, PasswordResetOTP, UserLoginHistory
│   ├── permissions.py                  # RBAC modular permissions (HasAdminModulePermission, IsSuperAdminUser)
│   ├── serializers.py                  # DRF Serializers for profile, registration, token, and verification
│   ├── tests.py                        # Test suites for authentication, tokens, and verification flows
│   ├── urls.py                         # /api/auth/* endpoint routing
│   └── views.py                        # Controllers for Login, Register, Google OAuth, Sessions, AI Verify
│
├── marketplace/                        # Core Marketplace, P2P Transactions & Communications App
│   ├── __init__.py
│   ├── admin.py                        # Marketplace admin site hooks
│   ├── apps.py                         # Marketplace app config & signal registrations
│   ├── cloudinary_upload.py            # Automated WebP transformation & Cloudinary upload engine
│   ├── media_security.py               # Anti-hotlinking signed image proxy & token validation
│   ├── migrations/                     # Database migrations
│   ├── models.py                       # Listing, Category, Offer, HandoverSession, Review, Chat, etc.
│   ├── serializers.py                  # DRF Serializers for marketplace catalog, offers, and analytics
│   ├── services/
│   │   ├── __init__.py
│   │   └── notification_service.py     # Firebase Cloud Messaging (FCM) & DB in-app notifications
│   ├── signals.py                      # Post-save signals for event handling & trust-score recalculations
│   ├── tests.py                        # Marketplace integration tests
│   ├── urls.py                         # /api/marketplace/* route registry
│   └── views.py                        # Business logic for Listings, Deals, QR Handover, Reports, Banners
│
├── media/                              # Local upload fallback directory (if Cloudinary is bypassed)
├── staticfiles/                        # Compressed production static assets (via WhiteNoise)
├── .dockerignore                       # Exclusions for container builds
├── .env                                # Local environment secrets (DO NOT COMMIT)
├── .env.example                        # Documented template of all required environment variables
├── .gitignore                          # Git tracking exclusions
├── Dockerfile                          # Multi-stage production Docker container configuration
├── Procfile                            # Process configuration for PaaS (Render, Heroku)
├── create_admin.py                     # CLI script to create or update Superadmin credentials securely
├── manage.py                           # Django CLI management entrypoint
├── requirements.txt                    # Python package dependencies & version pins
└── seed_database.py                    # Database bootstrapping script (Categories, Settings, Admin user)
```

---

## 3. 🛠️ Technology Stack & Core Libraries

### Core Backend & Framework
| Library / Technology | Version | Purpose & Usage in Project |
| :--- | :--- | :--- |
| **Python** | `3.12+` | Modern high-performance Python runtime. |
| **Django** | `6.1` | Robust web application framework, providing ORM, middleware, routing, and administrative backends. |
| **Django REST Framework (DRF)** | `3.18.0` | Powers the JSON REST API layer, serializers, request throttles, and permission checks. |
| **asgiref** | `3.12.1` | ASGI/WSGI compatibility standard for Django. |

### Database Layer (MongoDB)
| Library / Technology | Version | Purpose & Usage in Project |
| :--- | :--- | :--- |
| **MongoDB** | `v6.0+ / v7.0+` | NoSQL document database providing dynamic schemas, low latency, and horizontal scalability. |
| **django-mongodb-backend** | `6.1.0` | Official Django database backend enabling Django ORM to communicate natively with MongoDB. |
| **pymongo** | `>=4.7, <5.0` | Low-level Python driver for MongoDB database connections and connection pooling. |
| **dnspython** | `>=2.6.0` | Resilient DNS resolver configured with `1.1.1.1` and `8.8.8.8` to prevent DNS timeouts on campus networks connecting to MongoDB Atlas SRV. |
| **certifi** | `>=2024.0.0` | Curated Mozilla root CA certificates for secure TLS handshakes with MongoDB Atlas. |

### Authentication & Cryptographic Security
| Library / Technology | Version | Purpose & Usage in Project |
| :--- | :--- | :--- |
| **djangorestframework_simplejwt** | `5.5.1` | Issues and rotates stateless JSON Web Tokens (Access Token: 60m, Web Refresh: 30d, Android Refresh: 90d). |
| **PyJWT** | `2.13.0` | Underlying JWT encoding, decoding, and signature verification. |
| **argon2-cffi** & **bindings** | `25.1.0` | RFC 9106 password hashing algorithm—resistant to GPU brute-force attacks. |
| **cryptography** | `50.0.1` | Supplies AES-CBC/HMAC Fernet symmetric cipher used in `server/crypto.py` to encrypt OTP verification codes and sensitive data in MongoDB. |

### Cloud & Third-Party Integrations
| Library / Technology | Version | Purpose & Usage in Project |
| :--- | :--- | :--- |
| **google-genai** | `>=2.33.0` | Official Google GenAI SDK used to interface with **Gemini Vision models** (`gemini-2.5-flash` / `gemini-1.5-flash`) for student ID card optical verification. |
| **pydantic** | `>=2.0.0` | Type enforcement and structured output schemas for Gemini AI responses (`IdCardVerificationSchema`). |
| **resend** | `>=2.47.0` | Modern transactional email API dispatching responsive, branded HTML emails for OTP codes, password resets, and account onboarding. |
| **firebase-admin** | `>=6.5.0` | Google Firebase Admin SDK powering **Firebase Cloud Messaging (FCM)** for cross-platform push notifications (Web + Android). |
| **cloudinary** | `1.41.0` | Cloud media pipeline that resizes images (max 1200x1200), auto-optimizes quality, and converts uploads to next-gen **WebP** format. |
| **Pillow** | `>=10.0.0` | Python Imaging Library used for backend image verification and Base64 stream handling. |

### Production Web Server & Optimization
| Library / Technology | Version | Purpose & Usage in Project |
| :--- | :--- | :--- |
| **gunicorn** | `23.0.0` | Pre-fork WSGI HTTP server running multi-worker processes (`--workers 3 --timeout 120`). |
| **whitenoise** | `6.12.0` | Serves static assets directly with gzip compression and 1-year immutable caching headers (`CompressedManifestStaticFilesStorage`). |
| **django-cors-headers** | `4.9.0` | Strict CORS middleware managing allowed frontend origins and credentials. |
| **python-dotenv** | `1.2.3` | Parses `.env` configuration files for dynamic runtime secret injection. |

---

## 4. 📊 Data Models & Schema Architecture

All models utilize MongoDB's `django_mongodb_backend.fields.ObjectIdAutoField` which maps primary keys (`id`) to 24-character hexadecimal BSON strings.

### User Management & Authentication Models

#### 1. `CustomUser` (extends `AbstractUser`)
- **Core Identity**: `username`, `email` (unique), `full_name`, `phone_number` (unique), `college_domain`.
- **Student Verification**:
  - `is_verified_student` (Boolean): True once college email OTP is verified.
  - `is_id_verified` (Boolean): True once physical student ID card passes AI/Admin validation.
  - `id_card_image` (Text): Base64 or secure Cloudinary URL of uploaded card.
  - `id_card_data` (JSONField): Structured metadata extracted by Gemini AI (Reg No, Batch, Program, Expiry).
- **Gamified Trust Score**: `trust_score` (Integer 0–100): Calculated dynamically via `calculate_trust_score()`:
  - +5 pts: Email verified.
  - +5 pts: Student ID card verified.
  - +3 pts: Live selfie profile photo uploaded.
  - +5 pts per completed peer trade (`Offer` status = `COMPLETED`).
  - Up to +15 pts: High average peer ratings (≥ 4.5★) or penalty for low ratings (< 2.5★).
- **Dual-Device Session Isolation**:
  - Web: `web_session_id`, `web_session_device`, `web_session_created_at`.
  - Android: `android_session_id`, `android_session_device`, `android_session_created_at`.
- **RBAC & Administration**:
  - `role`: `BUYER` or `SELLER`.
  - `admin_role`: `SUPER_ADMIN`, `MODERATOR`, or `ID_VERIFIER`.
  - `admin_permissions`: JSON list specifying granular access to 12 modules (`dashboard`, `listings`, `deals`, `categories`, `banners`, `reports`, `students`, etc.).

#### 2. `OTPVerification`
- `email`: Target student email.
- `otp`: Fernet-encrypted 6-digit verification code (`enc::...`).
- `created_at`: Expiration window (10 minutes).
- `attempts`: Counter to enforce maximum 5 brute-force attempts.
- `is_verified`: Boolean flag.

#### 3. `PasswordResetOTP` & `PasswordResetToken`
- Handles credential resets via either 6-digit cryptographic OTP or time-delimited reset token (15-minute timeout).

#### 4. `UserLoginHistory`
- Comprehensive audit trail recording every login attempt:
  - `user`, `email_attempted`, `reg_no_attempted`, `login_method` (`PASSWORD` vs `GOOGLE`), `client_type` (`web` vs `android`), `ip_address`, `user_agent`, `device_info`, `status` (`SUCCESS` vs `FAILED`), `failure_reason`, `created_at`.

---

### Marketplace Core Models

#### 1. `Category`
- `name`: Category name (e.g. *Books & Notes*, *Laptops & Computers*, *Hostel & Room Essentials*).
- `slug`: Unique URL slug.
- `icon`: Lucide icon descriptor string (e.g. `BookOpen`, `Laptop`, `Home`).

#### 2. `Listing`
- `seller`: Foreign key to `CustomUser`.
- `category`: Foreign key to `Category`.
- `title`, `description`, `price`, `original_price` (MRP).
- `discount_percentage`: Computed property showing savings percentage.
- `transaction_type`: `SELL`, `DONATE`, or `EXCHANGE`.
- `condition`: `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`, or `POOR`.
- `location`: Campus meetup point (e.g., *Block 34*, *BH-4*, *Uni-Mall*, *Law Gate*).
- `contact_preference`: `CHAT`, `WHATSAPP`, `CALL`, `ALL`, or `MEETUP`.
- `status`: `ACTIVE`, `PENDING` (Reserved), `SOLD`, `HIDDEN`.
- `is_trusted`: Verified listing badge granted by moderators.
- `views_count`, `sale_end_time` (Flash deal timer).

#### 3. `ListingImage`
- `listing`: Foreign key to `Listing`.
- `image_url`: Cloudinary secure URL or encrypted storage link.
- `is_primary`: Flag denoting primary thumbnail.

#### 4. `Offer` (Peer-to-Peer Deal)
- `buyer`: Foreign key to `CustomUser`.
- `listing`: Foreign key to `Listing`.
- `offer_amount`, `counter_amount`, `seller_note`, `buyer_message`.
- `is_exchange_offer`: Boolean flag with `exchange_item_title`.
- `status`: `PENDING`, `ACCEPTED`, `REJECTED`, `COUNTERED`, `COMPLETED`, `CANCELLED`.

#### 5. `HandoverSession` (Secure Exchange Engine)
- `offer`: Foreign key to `Offer`.
- `token`: Unique UUID generated for the transaction QR code.
- `pin_code`: 6-digit numeric PIN for offline or manual confirmation.
- `expires_at`: Strict time limit (e.g., 2 hours).
- `status`: `ACTIVE`, `USED`, `EXPIRED`, `CANCELLED`.
- `failed_attempts`: Lockout guard against brute-force guessing.

#### 6. `Review`
- `deal`: Foreign key to `Offer`.
- `listing`: Foreign key to `Listing`.
- `reviewer` & `reviewed_user`: Foreign keys to `CustomUser`.
- `rating`: 1 to 5 stars (`MinValueValidator(1)`, `MaxValueValidator(5)`).
- `comment`: Student feedback text.
- `quick_tags`: JSON array (e.g., *Smooth Handover*, *Punctual*, *Polite*, *Item as Described*).

#### 7. `ChatMessage`
- `listing`: Foreign key to `Listing` (chat context is bound to an item).
- `sender` & `recipient`: Foreign keys to `CustomUser`.
- `message`: Text payload.
- `is_read`: Read receipt indicator.
- `created_at`: Chronological message ordering.

#### 8. `Notification` & `FCMDevice`
- `Notification`: In-app notification queue covering 12 event types (`BUY_REQUEST`, `REQUEST_ACCEPTED`, `HANDOVER_READY`, `ITEM_SOLD`, `BROADCAST`, etc.) with `NORMAL`, `HIGH`, or `URGENT` priority levels.
- `FCMDevice`: Device push registry storing unique FCM `registration_id`, `device_type` (`WEB`, `ANDROID`, `IOS`), and device name.

#### 9. `ListingReport` & `AdminAuditLog`
- `ListingReport`: Student dispute and reporting mechanism with statuses `PENDING`, `RESOLVED`, `DISMISSED`.
- `AdminAuditLog`: Immutable forensic trail logging 26 distinct administrative operations (User Banning, Deal Cancellation, Banned Words updates, Staff promotions) with admin username, IP address, and payload diffs.

#### 10. `Banner` & `PlatformSetting`
- `Banner`: Home screen carousel slides with title, subtitle, badge tag, button CTA, Cloudinary URL, and integer `display_order`.
- `PlatformSetting`: Dynamic configuration key-values stored in DB (`maintenance_mode`, `allow_registrations`, `allowed_domains`).

---

## 5. 🔄 System Architecture & Request Lifecycle (Flow)

```text
       [ Web App (React) ]           [ Android App (Kotlin/MVVM) ]
                 │                                  │
                 └────────────────┬─────────────────┘
                                  ▼
                         [ Reverse Proxy / SSL ]
                         (Render / NGINX / Cloudflare)
                                  │
                                  ▼
                     [ Gunicorn WSGI Web Server ]
                                  │
                                  ▼
                     [ Django Middleware Pipeline ]
                     1. CorsMiddleware (Allowed Origins)
                     2. SecurityMiddleware (HTTPS/HSTS)
                     3. WhiteNoiseMiddleware (Static Assets)
                     4. GZipMiddleware (Payload Compression)
                     5. DataSecurityMiddleware (X-App-Security-Key Check)
                     6. Session & Common Middlewares
                                  │
                                  ▼
                   [ CookieJWTAuthentication Layer ]
                   - Reads HTTP-only Cookie or 'Bearer <token>'
                   - Validates Token Signature & Expiry
                   - Checks Session ID against CustomUser (Device Isolation)
                                  │
                                  ▼
                  [ DRF ViewSets & API Controllers ]
                 (users/views.py & marketplace/views.py)
                     │             │               │
        ┌────────────┘             │               └─────────────┐
        ▼                          ▼                             ▼
[ MongoDB Atlas / Local ]  [ External Cloud Services ]   [ Gemini Vision AI ]
(django_mongodb_backend)   - Cloudinary (WebP Images)    - Student ID OCR
                           - Resend (HTML Emails)        - Crest Detection
                           - Firebase (FCM Push)         - Name/Roll Cross-Match
```

### Security Shield & Middleware Flow
1. Every client request to `/api/*` is intercepted by `DataSecurityMiddleware`.
2. The incoming `X-App-Security-Key` header is compared using constant-time `hmac.compare_digest` against the allowed keys in `.env`.
3. In production, requests lacking this header are rejected with `HTTP 403 Forbidden` before touching views or hitting the database. Local development requests (`localhost`, `10.0.2.2`, local subnets) are granted grace when `DEBUG=True`.

### Dual-Device Session Isolation (Web + Android)
1. When a user logs in via Web, a unique `session_id` (UUID4) is stamped onto `user.web_session_id`.
2. When a user logs in via Android, a separate `session_id` is stamped onto `user.android_session_id`.
3. The JWT payload encodes both `session_id` and `client_type`.
4. On subsequent requests, `CookieJWTAuthentication` verifies that the token's `session_id` matches the user's active session for that specific client type.
5. If another person logs into the account on a second web browser, the previous web session's `session_id` is overwritten, instantly terminating the older web session with `AuthenticationFailed`, while leaving the Android app session completely intact.

### AI-Driven Student Verification Flow
```text
Student Uploads ID Card Image (Base64/JPEG)
               │
               ▼
[ users/gemini_id_verifier.py ]
               │
               ▼
Passes Image + Target Reg Number + Target Name to Google Gemini Vision
               │
               ▼
Gemini Analyzes & Returns Structured Pydantic JSON:
- is_valid_id_card (Authentic physical PVC card)
- is_lpu_card (Contains University seal, logo, or crest)
- extracted_reg_no & reg_matched (Roll number matches account)
- extracted_name & name_matched (Student name matches account)
- batch, valid_upto, program, confidence_score
               │
               ▼
If Confidence Score ≥ 0.85 & Reg Matched:
- Sets user.is_id_verified = True
- Stores metadata in user.id_card_data
- Recalculates user.trust_score (+5 pts)
```

### Peer-to-Peer Handover QR / PIN Verification Flow
1. Buyer submits an offer (`Offer.objects.create(...)`).
2. Seller accepts the offer (`status = 'ACCEPTED'`).
3. Seller clicks **Generate Handover QR**:
   - `GenerateHandoverQRView` creates a `HandoverSession` with a unique UUID `token` and a cryptographically generated 6-digit `pin_code`.
4. When meeting in person on campus:
   - **Method A (Camera Scan)**: Buyer scans Seller's QR code on their device.
   - **Method B (Manual PIN)**: Buyer enters Seller's 6-digit PIN on their screen.
5. `ConfirmHandoverView` verifies that the session is `ACTIVE` and not expired:
   - Updates `Offer.status = 'COMPLETED'`.
   - Updates `Listing.status = 'SOLD'`.
   - Updates `HandoverSession.status = 'USED'`.
   - Re-computes trust scores for both peers (+5 points each).
   - Prompts both students to submit peer reviews.

### Notification Dispatch Architecture
All notification triggers (new offer, offer accepted, deal completed, campus broadcast) call `NotificationService.send_notification(...)`:
1. Creates an in-app `Notification` record in MongoDB.
2. Checks if the recipient has active devices registered in `FCMDevice`.
3. Asynchronously sends high-priority FCM payload to Android devices and Web push service workers via `firebase_admin.messaging.send_each(...)`.
4. Automatically purges expired or invalidated registration tokens (`UnregisteredError`).

---

## 6. 🌐 API Route Catalog

### Authentication & User Routes (`/api/auth/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `send-otp/` | Generates and sends a 6-digit verification code to student email via Resend. |
| `POST` | `verify-otp/` | Validates the email OTP and marks email as verified. |
| `POST` | `register/` | Registers new student account (sets password with Argon2). |
| `POST` | `login/` | Authenticates credentials, generates JWT pair, sets HTTP-only cookies. |
| `POST` | `google/` | Authenticates or registers student via Google OAuth2 ID Token. |
| `POST` | `token/refresh/` | Rotates access token using valid refresh token. |
| `POST` | `logout/` | Invalidates active device session and clears HTTP-only auth cookies. |
| `GET/PUT`| `profile/` | Retrieves or updates current user profile (full name, phone, selfie). |
| `POST` | `verify-id-ai/` | Runs automated Gemini Vision AI analysis on uploaded student ID card. |
| `POST` | `verify-id/` | Saves verified student ID card details and upgrades verification status. |
| `POST` | `upgrade-to-seller/` | Upgrades student account role from `BUYER` to `SELLER`. |
| `POST` | `forgot-password/` | Sends password reset OTP to verified student email. |
| `POST` | `reset-password/` | Sets new account password using verified reset OTP. |
| `GET` | `sessions/` | Returns metadata on active Web and Android sessions. |
| `POST` | `revoke-session/` | Manually terminates active session on a specific device type. |
| `GET` | `login-logs/` | (Admin) View paginated historical login attempts across all users. |
| `GET` | `staff/` | (Super Admin) Lists all administrative staff members. |
| `POST` | `check-availability/`| Real-time validation checking if email, phone, or username is taken. |

### Marketplace Routes (`/api/marketplace/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET/POST`| `listings/` | List active items (with filters, search, sort) or create a new listing. |
| `GET/PUT/DELETE`| `listings/<id>/` | View, update, or remove an existing listing. |
| `POST` | `listings/<id>/status/` | Toggle listing status between `ACTIVE` and `HIDDEN`. |
| `POST` | `listings/<id>/offer/` | Create a purchase or exchange offer on a listing. |
| `GET` | `listings/<id>/offers/` | Seller view of all incoming offers on an item. |
| `POST` | `offers/<id>/respond/` | Seller action to accept, decline, or counter an offer. |
| `POST` | `offers/<id>/generate-qr/` | Generates a 6-digit PIN and UUID QR code for handover. |
| `POST` | `handover/confirm/` | Buyer confirms item handover using QR token or 6-digit PIN. |
| `POST` | `offers/<id>/cancel/` | Cancels an ongoing deal. |
| `POST` | `reviews/` | Submits 1–5 star peer review with quick tags after deal completion. |
| `GET` | `seller/<id>/reviews/` | Fetches all public reviews and star ratings for a seller. |
| `GET/POST`| `chat/<listing_id>/<peer_id>/` | Real-time chat messages between buyer and seller. |
| `GET` | `conversations/` | List all active student chat threads and unread counts. |
| `POST` | `upload-image/` | Direct upload of listing images to Cloudinary (auto-WebP conversion). |
| `GET` | `categories/` | Lists all active categories with Lucide icon descriptors. |
| `GET/POST`| `notifications/` | View in-app notifications or mark notifications as read. |
| `POST` | `notifications/register-device/` | Registers Web/Android FCM token for push notifications. |
| `GET` | `banners/` | Returns active homepage slideshow banners. |
| `POST` | `reports/` | Submits a report against a suspicious listing or abusive user. |

### Administrative Routes (`/api/marketplace/admin/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `admin/dashboard-stats/` | Overview metrics (Total Users, Active Listings, Completed Deals, Volume). |
| `GET` | `admin/analytics/` | Detailed volume charts, growth trends, category breakdowns. |
| `GET/POST`| `admin/categories/` | Create, edit, and organize marketplace categories. |
| `GET` | `admin/deals/` | Monitor peer deals across campus with dispute intervention actions. |
| `POST` | `admin/broadcasts/` | Broadcast campus-wide push and in-app notices to students. |
| `GET/POST`| `admin/banners/` | Manage homepage promotional and informational banner slides. |
| `GET/POST`| `admin/reports/` | Review and resolve student dispute reports. |
| `GET/POST`| `admin/banned-words/` | Update prohibited vocabulary blacklist for automated moderation. |
| `GET` | `admin/audit-logs/` | Immutable log of all administrative actions taken by staff. |
| `GET` | `admin/system-health/` | Real-time diagnostic stats (DB status, cache size, latency). |

---

## 7. 🔑 Environment Variables Reference (`.env`)

Create a `.env` file in the `server/` directory using the following keys:

```env
# ==============================================================================
# DATABASE CONFIGURATION (MongoDB Atlas or Local MongoDB)
# ==============================================================================
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/campxchange?retryWrites=true&w=majority
MONGODB_NAME=campxchange
MONGO_MAX_POOL_SIZE=50
MONGO_MIN_POOL_SIZE=0
MONGO_TIMEOUT_MS=30000

# ==============================================================================
# CORE SECURITY & DJANGO
# ==============================================================================
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(50))"
SECRET_KEY=your_cryptographically_secure_django_secret_key_here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,10.0.2.2,.onrender.com

# API Gateway Security Shield Key (Used by client to send X-App-Security-Key)
DATA_SECURITY_KEY=your_shared_app_security_key_here

# ==============================================================================
# CORS & FRONTEND URLS
# ==============================================================================
FRONTEND_URL=https://cxc.anshuman892494.online
CORS_ALLOWED_ORIGINS=https://cxc.anshuman892494.online,https://cxc-marketplace.vercel.app,http://localhost:5173,http://localhost:5174
CSRF_TRUSTED_ORIGINS=https://cxc.anshuman892494.online,https://cxc-marketplace.vercel.app,http://localhost:5173,http://localhost:5174

# ==============================================================================
# CLOUDINARY MEDIA STORAGE
# ==============================================================================
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# ==============================================================================
# RESEND EMAIL SERVICE
# ==============================================================================
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=CampXChange <noreply@cxc.anshuman892494.online>

# ==============================================================================
# GOOGLE OAUTH & FIREBASE ADMIN (FCM PUSH NOTIFICATIONS)
# ==============================================================================
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
FIREBASE_API_KEY=your_firebase_web_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
# Absolute path or relative path to serviceAccountKey.json:
FIREBASE_SERVICE_ACCOUNT_KEY=serviceAccountKey.json

# ==============================================================================
# GOOGLE GEMINI AI (STUDENT ID CARD OCR & VERIFICATION)
# ==============================================================================
GEMINI_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# ==============================================================================
# DEFAULT SUPERADMIN CREDENTIALS (For seed_database.py / create_admin.py)
# ==============================================================================
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@campxchange.com
ADMIN_PASSWORD=AdminStrongPassword@2026
```

---

## 8. 🏃 Step-by-Step Server Setup & Run Guide

### Local Development Setup (Step-by-Step)

#### Prerequisites
- **Python**: Version `3.12` installed (`python --version`).
- **MongoDB**: Active MongoDB database running locally on `mongodb://localhost:27017` OR a free MongoDB Atlas cloud cluster URI.
- **Git**: Installed.

---

#### Step 1: Open Terminal & Navigate to Server Directory
```powershell
# In Windows PowerShell:
cd "c:\Users\anshu\OneDrive\Desktop\Projects\LPUTrade\server"
```

---

#### Step 2: Create and Activate Virtual Environment
```powershell
# Create virtual environment named 'venv'
python -m venv venv

# Activate on Windows PowerShell:
.\venv\Scripts\Activate.ps1

# (If running on Linux / macOS Bash: source venv/bin/activate)
```

---

#### Step 3: Install All Project Dependencies
```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

#### Step 4: Configure Environment Variables
Copy the `.env.example` file to `.env`:
```powershell
cp .env.example .env
```
Open `.env` in your editor and ensure `SECRET_KEY`, `MONGODB_URI`, and `DATA_SECURITY_KEY` are populated. For a basic local test, you can use:
```env
DEBUG=True
SECRET_KEY=cxc-local-dev-secret-key-32-chars-minimum-length!
MONGODB_URI=mongodb://localhost:27017/campxchange
MONGODB_NAME=campxchange
DATA_SECURITY_KEY=campxchange-secret-key-2026
```

---

#### Step 5: Run Database Migrations
Initialize the custom MongoDB migrations for authentication, content types, users, and marketplace:
```powershell
python manage.py migrate
```
*Output will confirm table/collection generation for `auth`, `contenttypes`, `users`, and `marketplace`.*

---

#### Step 6: Seed Default Data & Superadmin Account
Run the automated seed script to populate default categories (*Books & Notes*, *Laptops*, *Mobiles*, etc.), platform settings, and create your initial Super Admin:
```powershell
python seed_database.py
```
*This will output the username, email, and password for logging into the Administrative Dashboard.*

---

#### Step 7: Launch the Development Server
```powershell
python manage.py runserver 0.0.0.0:8000
```

The server is now live and listening at:
- 🌐 **API Root**: `http://127.0.0.1:8000/`
- 💓 **Health Check**: `http://127.0.0.1:8000/health/`
- ⚡ **Ping Probe**: `http://127.0.0.1:8000/ping`
- 🛠️ **Django Admin**: `http://127.0.0.1:8000/campxchange-admin/`

---

### Docker Deployment

To build and run the entire server inside a production-grade Docker container:

#### 1. Build the Docker Image
```bash
docker build -t campxchange-server .
```

#### 2. Run Container with Environment Variables
```bash
docker run -d \
  --name cxc_backend \
  -p 8000:8000 \
  --env-file .env \
  campxchange-server
```

---

### Production Deployment (Gunicorn / Render)

The server contains a preconfigured [`Procfile`](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/server/Procfile) for zero-downtime PaaS deployments (such as Render or AWS ECS):

```bash
# Executed automatically during release phase:
python manage.py migrate --noinput && python manage.py collectstatic --noinput

# Executed to launch the web process:
gunicorn server.wsgi:application \
  --bind 0.0.0.0:${PORT:-8000} \
  --workers 3 \
  --timeout 120 \
  --keep-alive 5 \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  --forwarded-allow-ips "*" \
  --access-logfile - \
  --error-logfile -
```

---

## 9. 🩺 Diagnostics & Health Monitoring

### Verification Checklist

1. **Verify Root Ping**:
   ```powershell
   curl http://127.0.0.1:8000/ping
   # Expected Output: True (HTTP 200)
   ```

2. **Verify Database Health**:
   ```powershell
   curl http://127.0.0.1:8000/health/
   ```
   **Expected JSON Response:**
   ```json
   {
     "status": "ok",
     "service": "CampXChange API",
     "version": "2.4.0",
     "database": "healthy",
     "environment": "development",
     "timestamp": "2026-10-26T15:45:00.000000+00:00"
   }
   ```

3. **Verify Categories API**:
   ```powershell
   curl -H "X-App-Security-Key: campxchange-secret-key-2026" http://127.0.0.1:8000/api/marketplace/categories/
   ```
   *Returns the list of 8 standard campus trade categories seeded in MongoDB.*

4. **Run Automated Test Suite**:
   ```powershell
   python manage.py test users marketplace
   ```

---

## 🏆 Summary Checklist for Developers

| Step | Action | Command / File | Status |
| :--- | :--- | :--- | :--- |
| **1** | Python Environment | `python -m venv venv && .\venv\Scripts\Activate.ps1` | Required |
| **2** | Dependencies | `pip install -r requirements.txt` | Required |
| **3** | Environment Variables | Create `server/.env` with MongoDB URI & Security Keys | Required |
| **4** | Migrations | `python manage.py migrate` | Required |
| **5** | Data Seeding | `python seed_database.py` | Required |
| **6** | Run Dev Server | `python manage.py runserver 8000` | Ready |
| **7** | Production Probe | Check `http://localhost:8000/health/` | Verified |
