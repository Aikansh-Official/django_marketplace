# 🏪 CampusXChange (CXC Marketplace)

> **Campus-Exclusive Peer-to-Peer Student Marketplace for LPU (Lovely Professional University)**  
> Buy, sell, rent, and donate textbooks, electronics, cycles, lab gear, and hostel essentials within verified campus boundaries.

---

## 📌 Repository Architecture

```text
CampusXChange/
├── client/                     # Web Application (React, Vite, Tailwind CSS, Lucide, Webcams)
├── android/                    # Android Specifications & Native Architecture Blueprints
├── server/                     # Backend REST API (Django, Django REST Framework, SimpleJWT, SQLite/PostgreSQL)
├── admin/                      # Admin Dashboard Application
├── client_features_list.md     # Comprehensive Feature Registry for Student Client
├── admin_features_list.md      # Comprehensive Feature Registry for Admin Dashboard
├── ADMIN_ROADMAP.md            # Governance, Security & RBAC Specifications
├── DESIGN_SYSTEM.md            # Brand Identity, Color Palette, and Design Tokens
└── CampusXChange_Complete_Final_Tech_Stack.md # Complete Platform Technical Stack
```

---

## 📱 Native Android Specifications (`android/`)

Complete production-grade native Kotlin + Jetpack Compose architectural blueprints and API contracts:

1. **[Android Login & Registration Specification](android/ANDROID_LOGIN_REGISTRATION.md)**:
   - Complete Dual-Path Onboarding (Fast 3-Step Buyer vs Verified 5-Step Seller).
   - Pre-flight debounced availability checks (`check-username/`, `check-phone/`, `check-email/`, `check-availability/`).
   - On-Device Student ID Card OCR extraction with Google ML Kit.
   - CameraX live selfie capture with facial framing and trust score bonus (+3).
   - Email OTP verification (10 min expiry, 5 attempt lockout).
   - Password creation & automatic login.
   - Complete Retrofit API Service, Jetpack DataStore TokenManager, OkHttp Authenticator, ViewModels, and Jetpack Compose screens.
2. **[Android Profile & Verification Specification](android/ANDROID_PROFILE_SPECIFICATION.md)**:
   - Dynamic Trust Score Algorithm (+5 Email, +5 ID Card, +3 Selfie, +5 per completed trade, reviews up to +15).
   - Post-registration upgrade to seller (`/api/auth/upgrade-to-seller/`).
   - Update selfie photo modal with CameraX.
3. **[Android Marketplace Specification](android/ANDROID_MARKETPLACE_SPECIFICATION.md)**:
   - Infinite scroll grid, dynamic categories, search, filtering, and wishlist management.
4. **[Android Product Detail Specification](android/ANDROID_PRODUCT_DETAIL_SPECIFICATION.md)**:
   - Item image gallery, seller credibility shield, buy requests, and price offers.
5. **[Android Listing Management Specification](android/ANDROID_LISTING_MANAGEMENT_SPECIFICATION.md)**:
   - CameraX listing multi-image upload, condition grades, sell vs donate toggle.
6. **[Android Offers & QR Handover Specification](android/ANDROID_OFFERS_HANDOVER_SPECIFICATION.md)**:
   - Dynamic QR code generation, CameraX barcode scanning, OTP fallback, and fraud-proof deal finalization.
7. **[Android Chat & Messaging Specification](android/ANDROID_CHAT_MESSAGING_SPECIFICATION.md)**:
   - OkHttp WebSocket real-time messaging, deal negotiation cards, read receipts, and typing indicators.
8. **[Android Notifications Specification](android/ANDROID_NOTIFICATIONS_SPECIFICATION.md)**:
   - Firebase Cloud Messaging (FCM), notification trays, broadcast alerts, and actionable intents.
9. **[Android Server Connection Guide](android/ANDROID_SERVER_CONNECTION_GUIDE.md)**:
   - ADB reverse port tunneling (`adb reverse tcp:8000 tcp:8000`), emulator network routing (`10.0.2.2`), and Windows Firewall troubleshooting.

---

## 🚀 Quick Start

### 1. Django Backend
```bash
cd server
python -m venv venv
# On Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### 2. Web Client
```bash
cd client
npm install
npm run dev
```

### 3. Android Development (Emulator / Device)
To bridge Android Emulator or USB device to local Django server without firewall issues:
```powershell
adb reverse tcp:8000 tcp:8000
```
Then configure Retrofit `BASE_URL` to `http://127.0.0.1:8000/`.

---

## 🔒 Security Highlights
- **Rate-Limited Auth Endpoints:** Scoped rate throttles (`5/min` for signup/OTP, `10/min` for login).
- **Encrypted Database OTPs:** OTPs are symmetrically encrypted at rest with Fernet cryptography before database insertion.
- **Strict Role Gating:** Buyer accounts cannot list items until completing physical ID card OCR scan and live selfie verification.
