# 📱 CampusXChange (LPUTrade) — Native Android Implementation Master Suite

> **Complete Android Developer Blueprint**: Ye directory CampusXChange student marketplace ke native Android client ke liye complete, production-ready implementation specifications provide karti hai. Isme architecture, design system, screens, ViewModels, state management, routes, Retrofit APIs, local caching, on-device ML Kit OCR, CameraX aur Firebase Cloud Messaging (FCM) ko cover kiya gaya hai.

---

## 🏛️ Project Summary & Architecture Standard

- **Language**: **Kotlin 2.0+**
- **UI Framework**: **Jetpack Compose + Material 3** (Declarative, Reactive UI)
- **Design System**: CampusXChange Design System (Brand Orange `#F97316`, soft glassmorphic elevation, pill badges, Outfit & Inter typography)
- **Architecture**: **Clean Architecture + MVVM + Unidirectional Data Flow (UDF)**
- **Dependency Injection**: **Dagger Hilt**
- **Networking**: **Retrofit 2 + OkHttp 4** with custom `AuthInterceptor` (JWT injection, `X-Client-Type: android`, `X-App-Security-Key`), and `TokenAuthenticator` (automatic silent token refresh on 401)
- **Data Persistence**: **Jetpack DataStore** (encrypted user session & tokens) + **Room Database** (offline cache for listings, wishlist & chat history)
- **Image Pipeline**: **Coil Compose** with caching & downsampling + custom canvas bitmap compressor
- **Hardware & ML Integrations**:
  - **Google ML Kit Text Recognition** (on-device student ID card OCR for Reg No & Name verification)
  - **Android CameraX** (front selfie camera with custom oval framing cutout, screen flash, and haptic feedback)
  - **ML Kit Barcode Scanning** (instant QR Code handover verification)
  - **ZXing Android Embedded** / Compose QR Code (seller QR generation)
- **Push & Real-Time Sync**: **Firebase Cloud Messaging (FCM)** + lifecycle-aware REST polling engine (3s interval for active chat)

---

## 📂 Documentation Module Directory

Har feature ke liye separate, high-detail `.md` file banayi gayi hai jo UI Composables, ViewModels, StateFlow states, Navigation Routes, aur Retrofit API endpoints ko define karti hai:

| File Name | Feature Module | Highlights |
|:---|:---|:---|
| [00_ANDROID_ARCHITECTURE_AND_SETUP.md](./00_ANDROID_ARCHITECTURE_AND_SETUP.md) | **Core Architecture & Base Setup** | Gradle version catalog (`libs.versions.toml`), package structure, AndroidManifest permissions, Compose Theme tokens, Retrofit client, OkHttp interceptors, and NavHost architecture. |
| [01_AUTHENTICATION_AND_ONBOARDING.md](./01_AUTHENTICATION_AND_ONBOARDING.md) | **Auth, Onboarding & ID Verification** | Splash session check, Login, Dual-path Registration (Buyer 3-step vs Seller 5-step), live debounced availability checks, ML Kit ID OCR, CameraX selfie, Email OTP, and Post-reg upgrade. |
| [02_HOME_AND_DISCOVERY.md](./02_HOME_AND_DISCOVERY.md) | **Homepage & Discovery Feed** | Dynamic category chip strip, real-time search with autocomplete dropdown, Filter/Sort bottom sheet, 2-column listing card grid, animated Compose canvas background, and urgent announcements. |
| [03_LISTING_CREATION_AND_MANAGEMENT.md](./03_LISTING_CREATION_AND_MANAGEMENT.md) | **Listing Creation & Management** | Role gating, multi-image picker with bitmap compression, star primary designation, Sell vs Donate toggle, condition/location/contact preferences, Edit listing, and My Listings dashboard. |
| [04_PRODUCT_DETAIL_AND_PURCHASE_FLOW.md](./04_PRODUCT_DETAIL_AND_PURCHASE_FLOW.md) | **Product Detail & Offer Engine** | HorizontalPager gallery, fullscreen pinch-to-zoom lightbox, DPDP seller reputation card, custom offer bargaining modal, real-time offer status banner, and report listing dialog. |
| [05_QR_HANDOVER_AND_TRANSACTION_VERIFICATION.md](./05_QR_HANDOVER_AND_TRANSACTION_VERIFICATION.md) | **QR Handover & Transaction Security** | Seller vector QR generation + 6-digit OTP PIN copy with completion polling & confetti, and Buyer CameraX barcode scanner with animated laser beam & manual PIN fallback. |
| [06_STUDENT_PROFILE_AND_DASHBOARD.md](./06_STUDENT_PROFILE_AND_DASHBOARD.md) | **Student Profile & Public Reputation** | Personal info editor, dual "My Sales" & "My Orders" sub-tabs, ID verification status & re-upload, offline Room wishlist, and DPDP-compliant public seller profile (`/seller/{id}`). |
| [07_REALTIME_IN_APP_CHAT_AND_MESSAGING.md](./07_REALTIME_IN_APP_CHAT_AND_MESSAGING.md) | **Real-Time In-App Student Chat** | Listing-scoped chat threads `(listing_id, peer_id)`, conversations list, lifecycle-aware 3s polling engine, message bubbles with delivery receipts, privacy contact filter, and Room caching. |
| [08_NOTIFICATIONS_SYSTEM_ALERTS_AND_INFRASTRUCTURE.md](./08_NOTIFICATIONS_SYSTEM_ALERTS_AND_INFRASTRUCTURE.md) | **Notifications, FCM & System Handlers** | Notification feed with filter tabs, FCM background handler, Urgent Notice blocking dialog, 503 Maintenance interceptor, 403 Suspended interceptor, and dual-device session isolation. |
| [09_RATINGS_AND_REVIEWS_ENGINE.md](./09_RATINGS_AND_REVIEWS_ENGINE.md) | **Verified Ratings & Reviews Engine** | Deal-gated review submission, 1-5 interactive star selector with touch animation, preset quick tags, trust score bonus preview, and public seller review feed. |

---

## 🗺️ High-Level Component & Navigation Flow

```text
                        ┌────────────────────────┐
                        │      SplashScreen      │
                        │ (Session & Token Check)│
                        └───────────┬────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │ (Authenticated)               │ (Guest / Unauthenticated)
                    ▼                               ▼
       ┌────────────────────────┐      ┌────────────────────────┐
       │   MainAppScaffold      │      │   AuthNavigationGraph  │
       │   (Bottom Nav Bar)     │      │   - LoginScreen        │
       └────────────┬───────────┘      │   - Buyer Register (3) │
                    │                  │   - Seller Register(5) │
    ┌───────────────┼───────────────┐  │   - Forgot Password    │
    ▼               ▼               ▼  └────────────────────────┘
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  HomeScreen  │ │ MyListings   │ │ MessagesList │ │ ProfileScreen│
│  (Catalog &  │ │ (Active/Sold │ │ (Conversations│ │ (Info/Orders│
│  Discovery)  │ │  Dashboard)  │ │  & Chat)     │ │  /Wishlist)  │
└───────┬──────┘ └──────────────┘ └──────────────┘ └───────┬──────┘
        │                                                  │
        ├──────────────────────────┐                       │
        ▼                          ▼                       ▼
┌──────────────┐          ┌──────────────────┐    ┌─────────────────┐
│ ProductDetail│          │  CreateListing   │    │  SellerProfile  │
│ - Lightbox   │          │  - Multi-image   │    │  (Public DPDP   │
│ - Buy Offer  │          │  - Details       │    │   Reputation)   │
│ - QR Trigger │          │  - Compression   │    └─────────────────┘
└───────┬──────┘          └──────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│     Handover Transaction        │
│ ┌──────────────┬──────────────┐ │
│ │ Seller QR    │ Buyer Scanner│ │
│ │ Generation   │ CameraX Scan │ │
│ └──────────────┴──────────────┘ │
└─────────────────────────────────┘
```

---

## 🚀 Recommended Android Studio Setup & Quickstart

1. **Prerequisites**:
   - **Android Studio Ladybug (2024.2+)** or **Koala Feature Drop**
   - **JDK 17** or **JDK 21** configured in Gradle
   - **Android SDK 35** installed via SDK Manager
2. **Project Creation**:
   - Select **"Empty Activity (Compose)"**
   - Package name: `com.campusxchange.app`
   - Minimum SDK: `24`
   - Build Configuration Language: `Kotlin DSL (build.gradle.kts)` with `libs.versions.toml`
3. **Configuration**:
   - Replace `libs.versions.toml` and `build.gradle.kts` with the dependencies listed in [00_ANDROID_ARCHITECTURE_AND_SETUP.md](./00_ANDROID_ARCHITECTURE_AND_SETUP.md).
   - Configure local `debug` / `release` build configs with backend base URL (`http://10.0.2.2:8000/api` for emulator or physical IP).
   - Add `google-services.json` to the `/app` folder for Firebase Cloud Messaging.
