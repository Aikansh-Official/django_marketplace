# 📱 CampusXChange — Android Native Architecture & Master Specification Index

> **Platform:** Android Native (API Level 26+ / Android 8.0 to Android 15+)  
> **Tech Stack:** Kotlin 2.x, Jetpack Compose, Material 3, Coroutines, StateFlow, Room DB, Retrofit 2, OkHttp 4, Hilt  
> **Backend Integration:** Unified Django REST Framework + MongoDB Atlas  
> **Last Updated:** September 2026

---

## 🏛️ System Architecture Overview

The CampusXChange Android App is engineered to mirror **100% of the features, business logic, security protocols, and visual excellence** of the client web application.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            JETPACK COMPOSE UI LAYER                         │
│  ThemeBackground • MarketplaceFeed • ProductDetail • HandoverQR • ChatDrawer │
└──────────────────────────────────────▲──────────────────────────────────────┘
                                       │ StateFlow<UiState>
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                         VIEWMODEL LAYER (AAC & HILT)                        │
│   MarketplaceViewModel • AuthViewModel • ChatViewModel • HandoverViewModel  │
└──────────────────────────────────────▲──────────────────────────────────────┘
                                       │ Coroutines / Flow
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                              REPOSITORY LAYER                               │
│            Offline-First Caching • Conflict Resolution • Token Sync         │
└───────────────────┬─────────────────────────────────────┬───────────────────┘
                    ▼                                     ▼
      ┌───────────────────────────┐         ┌───────────────────────────┐
      │   ROOM DATABASE & STORE   │         │     RETROFIT NETWORK      │
      │  ChatMessages • Wishlist  │         │  OkHttp Security Shield   │
      │   DataStore JWT Tokens    │         │  X-App-Security-Key / Bearer│
      └───────────────────────────┘         └─────────────┬─────────────┘
                                                          ▼
                                            ┌───────────────────────────┐
                                            │   DJANGO REST BACKEND     │
                                            │ https://cxc.anshuman89... │
                                            └───────────────────────────┘
```

---

## 📑 Complete Specification Directory (All 16 Modules)

| # | Specification Document | Key Scope & Coverage |
|:---:|:---|:---|
| 01 | [**ANDROID_SERVER_CONNECTION_GUIDE.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_SERVER_CONNECTION_GUIDE.md) | **Network & Security**: Production & Dev URLs, OkHttp interceptor with `X-App-Security-Key`, automatic JWT token rotation, ADB tunnel, network security config. |
| 02 | [**ANDROID_THEME_AND_DESIGN_SYSTEM.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_THEME_AND_DESIGN_SYSTEM.md) | **Theme & Background**: Jetpack Compose color palette, Dark/Light modes, Glassmorphism card modifiers, floating particle GPU Canvas animation mirroring `ThemeBackground.jsx`, typography scale. |
| 03 | [**ANDROID_SESSION_LOGIN_REGISTER_SPECIFICATION.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_SESSION_LOGIN_REGISTER_SPECIFICATION.md) | **Session, Login & Registration**: Dual-device session isolation (`android_session_id`, 90-day refresh, cross-device termination alerts), hardware Keystore `SessionManager`, thread-safe OkHttp Mutex refresh, Biometric quick login, and 3-step Buyer / 5-step ML Kit Seller onboarding. |
| 04 | [**ANDROID_PROFILE_SPECIFICATION.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_PROFILE_SPECIFICATION.md) | **Student Identity**: Personal info editor, ID card verification tab, trust score, upgrade to seller modal flow, cleaned header (`Member since [Date]`), DPDP compliance. |
| 05 | [**ANDROID_MARKETPLACE_SPECIFICATION.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_MARKETPLACE_SPECIFICATION.md) | **Marketplace**: Dynamic category chips, debounced search, condition & transaction type filters, 2-column listing grid, saved wishlist sync. |
| 06 | [**ANDROID_PRODUCT_DETAIL_SPECIFICATION.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_PRODUCT_DETAIL_SPECIFICATION.md) | **Listing Details**: Multi-image carousel, pinch-to-zoom inspection, buy request modal, seller profile card, related listings, report listing modal. |
| 07 | [**ANDROID_LISTING_MANAGEMENT_SPECIFICATION.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_LISTING_MANAGEMENT_SPECIFICATION.md) | **Listing Creation**: Create & edit forms, Bitmap client compression, primary thumbnail selector, platform constraints (`max_active_listings`), my listings dashboard. |
| 08 | [**ANDROID_OFFERS_HANDOVER_SPECIFICATION.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_OFFERS_HANDOVER_SPECIFICATION.md) | **QR Handover**: Seller QR generation, CameraX barcode scanner, 6-digit OTP PIN fallback, polling for completion, celebration animation, trust score awards. |
| 09 | [**ANDROID_CHAT_MESSAGING_SPECIFICATION.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_CHAT_MESSAGING_SPECIFICATION.md) | **Peer Chat**: In-app peer chat drawer, 3-second REST polling lifecycle, message delivery, unread counter badge, item context header. |
| 10 | [**ANDROID_NOTIFICATIONS_SPECIFICATION.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_NOTIFICATIONS_SPECIFICATION.md) | **Alerts**: In-app notifications list, broadcast megaphone badges, offer alerts, urgent modal trigger, unread badges, deep-linking. |
| 11 | [**ANDROID_REVIEWS_AND_RATINGS_SPECIFICATION.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_REVIEWS_AND_RATINGS_SPECIFICATION.md) | **Peer Reviews**: Verified deal review modal, 1-5 interactive stars, preset tags (*"Punctual"*, *"Item as Described"*), anti-spam duplicate guards, trust score recalculation. |
| 12 | [**ANDROID_NEGOTIATION_AND_COUNTER_OFFER_SPECIFICATION.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_NEGOTIATION_AND_COUNTER_OFFER_SPECIFICATION.md) | **Negotiation Engine**: Bargaining engine: Buyer custom offer, seller decline/accept/counter-offer with note, buyer decision dialog, automatic deal lock upon acceptance. |
| 13 | [**ANDROID_ANNOUNCEMENTS_AND_ALERTS_SPECIFICATION.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_ANNOUNCEMENTS_AND_ALERTS_SPECIFICATION.md) | **Banners & Modals**: Campus top announcement banner (4 themes), session dismissal state, full-screen mandatory `UrgentNoticeModal` overlay on login. |
| 14 | [**ANDROID_BANNER_CAROUSEL_SPECIFICATION.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_BANNER_CAROUSEL_SPECIFICATION.md) | **Marketing Banners**: Dynamic hero banner carousel, auto-scroll timer (5s), touch swipe gestures, multi-layer gradient scrims, Coil image loader, deep-link router (internal/external). |
| 15 | [**ANDROID_LEGAL_AND_SAFETY_SPECIFICATION.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_LEGAL_AND_SAFETY_SPECIFICATION.md) | **Compliance**: DPDP Act (2023) privacy protections, campus safety tips, prohibited items checklist, Terms of Service, Guidelines, Trader Report modal. |
| 16 | [**ANDROID_CURVED_BOTTOM_NAVIGATION_SPECIFICATION.md**](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/android/ANDROID_CURVED_BOTTOM_NAVIGATION_SPECIFICATION.md) | **Navigation & Dashboards**: Floating curved cradle pill bar, Cubic Bezier concave notch, dynamic context-aware hero action (WTB vs. Handover alert), active orange dot (`•`), adaptive TopBar, and live Buyer/Seller dashboards with 100% Web parity. |

---

## 🔒 Master Network & Security Standard

All Android network operations must adhere to this standard configuration:

```kotlin
object NetworkConstants {
    // Primary Production Endpoint
    const val BASE_URL_PROD = "https://cxc.anshuman892494.online/"
    
    // Local Debugging Endpoints
    const val BASE_URL_EMULATOR = "http://10.0.2.2:8000/"
    const val BASE_URL_ADB_REVERSE = "http://127.0.0.1:8000/"

    // Enforced Security Shield Key
    const val DATA_SECURITY_KEY = "campusXchange_secure_key_2026_@nshuman892494"
}
```
