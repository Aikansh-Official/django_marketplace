# 🛒 CampusXChange Client (Student Marketplace) — Master Feature List & Roadmap

> **Complete Feature Registry**: Ye document CampusXChange student-facing marketplace client ka har ek existing feature detail karta hai, aur saath me future enhancements ke suggestions bhi deta hai jo platform ko next level pe le ja sakte hain.

---

## 📌 Feature Summary Overview

| Module # | Module Name | Status | Key Deliverables |
|:--------:|:------------|:------:|:-----------------|
| **Module 1** | **Authentication & Student Onboarding** | ✅ **LIVE** | Multi-step Registration, LPU ID OCR Verification, Face Liveness Selfie, OTP Email Verification, JWT Login |
| **Module 2** | **Homepage & Marketplace Discovery** | ✅ **LIVE** | Category Browsing, Search & Filters, Sort Options, Listing Cards, Saved Items, Animated Background |
| **Module 3** | **Listing Creation & Management** | ✅ **LIVE** | Multi-image Upload, Auto-compress, Category Picker, Condition Grades, Contact Preferences, Sell/Donate Toggle |
| **Module 4** | **Product Detail & Purchase Flow** | ✅ **LIVE** | Image Gallery & Lightbox, Buy Request Modal, Offer System, Seller Contact, Report Listing, Related Items |
| **Module 5** | **QR Handover & Secure Transaction** | ✅ **LIVE** | Seller QR Generation, Buyer Camera Scanner, OTP PIN Verification, Auto-complete on Scan, Deal Cancellation |
| **Module 6** | **Student Profile Dashboard** | ✅ **LIVE** | Personal Info Editor, Orders & Sales Tracker, ID Verification Tab, Saved Items, Upgrade to Seller Modal |
| **Module 7** | **Notifications & Alerts** | ✅ **LIVE** | Push-style Notifications, Broadcast Alerts, Direct Admin Warnings, Urgent Notice Modal, Filter Tabs |
| **Module 8** | **Platform Infrastructure & UX** | ✅ **LIVE** | Announcement Banner, Protected Routes, Animated Theme Background, Custom Scrollbars, Toast System, SEO Pages |
| **Module 9** | **🔮 Future Enhancements** | 🟡 **PLANNED** | Real-time Chat, Price Negotiation, Ratings & Reviews, Search Autocomplete, Dark Mode, PWA, and more |

---

## ═══════════════════════════════════════════════════════
## 🟢 MODULE 1: Authentication & Student Onboarding
## ═══════════════════════════════════════════════════════
- **Status**: ✅ **LIVE**
- **Primary Components**: `client/src/components/AuthModal.jsx`, `client/src/components/auth/RegisterForm.jsx`, `client/src/components/auth/LoginForm.jsx`
- **Registration Steps**: `RegisterStepDetails.jsx`, `RegisterStepIdCard.jsx`, `RegisterStepSelfie.jsx`, `RegisterStepOtp.jsx`, `RegisterStepPassword.jsx`
- **Utilities**: `client/src/utils/idCardVerification.js`, `client/src/utils/faceLivenessDetector.js`, `client/src/utils/compressImage.js`

### 1.1 Multi-Step Student Registration (5-Step Wizard)
- **Step 1 — Personal Details**: Full name, college email (`@lpu.in` / `@lpude.in`), phone number, registration number. Real-time Zod schema validation with `react-hook-form`.
- **Step 2 — Physical LPU ID Card Upload**:
  - Photo upload with client-side **image compression** (canvas-based downscaling to reduce payload).
  - **Tesseract.js OCR Engine** scans the uploaded ID card in real-time.
  - Extracts and cross-validates: Registration Number, Student Name, Programme/Department, and Academic Section from card text.
  - **Image Authenticity Check** (`checkImageAuthenticity`): Validates minimum resolution, aspect ratio consistency, and detects obvious screenshots/digital fakes.
  - Animated scan progress bar with live status messages.
  - Rejection reasons displayed inline (wrong reg number, blurry image, unsupported format).
- **Step 3 — Face Liveness Selfie**:
  - Browser camera access with live preview via `getUserMedia`.
  - **Face Liveness Detection** (`faceLivenessDetector.js`): Validates captured selfie contains a real, centered, well-lit human face using canvas pixel analysis and heuristics.
  - Selfie stored as compressed Base64 data URL.
- **Step 4 — Email OTP Verification**:
  - Server dispatches 6-digit OTP to student's `@lpu.in` college email.
  - Client-side OTP input with countdown resend timer.
  - Rate-limited by server-side daily OTP cap.
- **Step 5 — Password Creation**:
  - Secure password with minimum 8-character requirement.
  - Confirm password match validation.
  - On successful registration: 🎉 **Confetti celebration animation** (`canvas-confetti`).

### 1.2 Student Login
- **Email + Password Authentication**: JWT token-based login via `POST /api/auth/login/`.
- **Persistent Session**: Access token stored in `localStorage`, auto-injected via Axios request interceptor for all authenticated API calls.
- **Token Refresh**: Automatic refresh token rotation for seamless session continuity.
- **Auth Status Sync**: `GET /api/auth/status/` verifies active session; auto-clears stale tokens if server returns unauthenticated.

### 1.3 Auth Modal (Global Overlay)
- Full-screen glassmorphic modal with dual-panel layout:
  - **Left Panel** (`AuthLeftPanel.jsx`): Animated marketing showcase with rotating feature highlights and campus branding.
  - **Right Panel**: Dynamic form switching between Login and multi-step Register.
- Custom event listener (`open-auth-modal`) enables any component to trigger login/register from anywhere in the app.
- Smooth step transitions and animated stepper progress bar (`RegisterStepper.jsx`).

---

## ═══════════════════════════════════════════════════════
## 🟢 MODULE 2: Homepage & Marketplace Discovery
## ═══════════════════════════════════════════════════════
- **Status**: ✅ **LIVE**
- **Primary Page**: `client/src/pages/Home.jsx`
- **Supporting Components**: `Navbar.jsx`, `CategoryIcon.jsx`, `UniversalLoader.jsx`, `ThemeBackground.jsx`

### 2.1 Category Navigation
- **Dynamic Category Bar**: Horizontal scrolling category chips fetched from `GET /api/marketplace/categories/`. Each chip displays a dynamic Lucide icon (`CategoryIcon.jsx`) and category name.
- **URL-Synced Filters**: Selected category persists in URL query params (`?category=Electronics`), enabling shareable filtered views and browser back/forward navigation.
- **"All" Default**: Shows the full campus marketplace with no category restriction.

### 2.2 Search & Advanced Filtering
- **Instant Text Search**: Real-time search by listing title, description, and seller name with query-param sync (`?search=laptop`).
- **Transaction Type Filter**: Toggle between `All Modes`, `Buy & Sell` (commercial), and `Free Donations` (₹0 goodwill exchanges).
- **Item Condition Filter**: Filter by `New`, `Like New`, `Good`, `Fair`, and `For Parts / Poor`.
- **Sort Options**:
  - `Newest First` (default, reverse chronological)
  - `Price: Low to High` (ascending)
  - `Price: High to Low` (descending)
  - `Most Viewed` (popularity-based sorting)
- **Navbar Global Search**: Integrated search bar in the top navigation with mobile responsive search expansion.

### 2.3 Listing Cards Grid
- Responsive CSS grid layout (`1 col` mobile → `2 col` tablet → `3-4 col` desktop).
- Each card renders: Primary image, title, price badge (₹ or "Free"), campus location pin, condition badge, view count, category icon, seller verification badge, and negotiable tag.
- **Heart / Save Button**: 1-click save to local `savedStore` (localStorage-backed, no auth required). Animated heart fill on toggle.
- **Hover Effects**: Subtle scale and shadow elevation on card hover for interactive feel.
- **Empty State**: Illustrated message when no listings match current filters.
- **Loading Skeleton**: Animated shimmer placeholder cards while API data is loading.

### 2.4 Animated Themed Background
- **`ThemeBackground.jsx`**: Full-viewport GPU-accelerated CSS-animated marketplace background with floating glassmorphic shopping badges, translucent watermarks, swinging price tags, delivery parcels, and twinkling sparkles.
- **Zero CPU overhead**: All animations use CSS `transform` and `opacity` for compositing-only GPU layers.
- Configurable `variant` (`default` / `subtle` / `minimal`) and `intensity` (`normal` / `soft`).

---

## ═══════════════════════════════════════════════════════
## 🟢 MODULE 3: Listing Creation & Management
## ═══════════════════════════════════════════════════════
- **Status**: ✅ **LIVE**
- **Primary Pages**: `client/src/pages/CreateListing.jsx`, `client/src/pages/EditListing.jsx`, `client/src/pages/MyListings.jsx`
- **Supporting**: `client/src/components/profile/UpgradeToSellerModal.jsx`

### 3.1 Create New Listing (Seller-Only)
- **Role Gate**: Buyers attempting to create a listing are prompted with the **Upgrade to Seller Modal** requiring ID card OCR verification + face selfie + email OTP.
- **Multi-Image Upload**: Up to 5 images per listing with drag-and-drop and file input. Client-side **auto-compression** (`compressImage.js`) reduces images before upload.
- **Star Image Selection**: Click to designate any uploaded image as the primary/thumbnail image.
- **Transaction Type Toggle**: `SELL` (set price in ₹, negotiable toggle) or `DONATE` (₹0 free exchange for student goodwill).
- **Category Picker**: Visual grid of dynamic categories with Lucide icons.
- **Item Condition Selector**: 5-grade scale (`Brand New`, `Like New`, `Good`, `Fair`, `For Parts/Poor`) with description.
- **Campus Location Input**: Freeform text for LPU campus meetup spots (BH-1, GH-7, Uni-Mall, Library, etc.).
- **Contact Preferences**: `All Channels`, `WhatsApp Preferred`, `Phone Call Preferred`, `In-App Chat Only`, `Campus Meetup Only`.
- **Description & WhatsApp Number**: Detailed item description textarea and optional WhatsApp contact field.
- **Server-Side Enforcement**: Platform `max_active_listings_per_student` and `min_trust_score_to_sell` validated on the backend.

### 3.2 Edit Existing Listing
- Pre-populated form with all existing listing data.
- Image management: Add new images, remove existing ones, change star/primary selection.
- All fields editable: Title, price, category, condition, location, description, transaction type, contact preference.

### 3.3 My Listings Dashboard (`/my-listings`)
- **Status Filter Tabs**: `All`, `Active`, `Pending/Reserved`, `Sold`, `Hidden`.
- **Listing Cards**: Each card shows image, title, price, campus location, view count, creation date, and status badge.
- **Action Buttons**: View (external link), Edit, Delete (with confirmation modal).
- **Quick Stats**: Total listings count with status breakdown.
- **Role Check**: Buyers are auto-redirected to the Orders tab in their profile.

### 3.4 Upgrade to Seller Modal
- **3-Step In-App Verification Wizard** (available from Profile or Create Listing page):
  - **Step 1**: LPU Physical ID Card upload with Tesseract OCR scanning + registration number cross-validation.
  - **Step 2**: Face Liveness selfie capture (reuses `RegisterStepSelfie` component).
  - **Step 3**: College email OTP verification.
- On success: Role auto-upgraded `BUYER → SELLER`, 🎉 confetti celebration, and profile refresh.

---

## ═══════════════════════════════════════════════════════
## 🟢 MODULE 4: Product Detail & Purchase Flow
## ═══════════════════════════════════════════════════════
- **Status**: ✅ **LIVE**
- **Primary Page**: `client/src/pages/ProductDetail.jsx` (1575 lines — the largest page in the client)

### 4.1 Immersive Product Gallery
- **Multi-Image Carousel**: Horizontal thumbnail strip + large hero image. Click to navigate, arrow key support.
- **Full-Screen Lightbox**: Click any image to open a zoomed full-viewport lightbox with dark overlay and navigation arrows.
- **Image Counter Badge**: `1/5` indicator showing current position in gallery.
- **Fallback Placeholder**: Graceful handling when no images are uploaded.

### 4.2 Product Information Display
- **Primary Details**: Title, price (₹ or "Free"), negotiable badge, category with icon, item condition badge, campus location with map pin.
- **Statistics**: View count, creation timestamp, last updated date.
- **Description**: Full-length item description with rich text rendering.
- **Contact Preferences**: Displayed communication methods the seller prefers.
- **Seller Profile Card**: Seller name, username (`@reg_number`), profile avatar, ID verification badge (✅ Verified Student), trust score indicator, join date.

### 4.3 Purchase Request & Offer System
- **"Buy / Request" Button**: Opens a modal for logged-in buyers to submit a purchase request with optional message/note.
- **Offer Submission**: `POST /api/marketplace/listings/<id>/offers/` creates a pending offer.
- **Existing Offer Tracking**: If the current user has already placed an offer, the UI shows offer status (`Pending`, `Accepted`, `Rejected`, `Completed`, `Cancelled`) instead of a duplicate button.
- **Seller's View**: Sellers see incoming offers on their listing with buyer details, messages, and accept/reject actions.
- **Offer Actions**: Accept offer (moves listing to `PENDING`/Reserved), Reject offer, Cancel deal.

### 4.4 QR Handover Triggers (From Product Detail)
- **Seller**: "Generate Handover QR" button appears for accepted offers — launches the `HandoverQRModal`.
- **Buyer**: "Scan Handover QR" button appears — launches the `HandoverScannerModal`.
- **Cancel Deal**: Buyer can cancel an accepted offer, restoring the listing to `ACTIVE`.

### 4.5 Report Listing
- **Report Modal**: Pre-defined report reasons (`Duplicate / Spam`, `Prohibited Item`, `Misleading / Fraudulent`, `Inappropriate Content`, custom).
- **Detail Input**: Additional details textarea for elaboration.
- **Submission**: `POST /api/marketplace/listings/<id>/report/` files the report in the admin moderation queue.
- **Auth Gate**: Login required to submit reports.

### 4.6 Related Listings
- Automatically fetches and displays listings from the same category at the bottom of the page.
- Clickable cards navigating to other product detail pages.

### 4.7 Owner Controls (Seller's Own Listing)
- **Edit Button**: Navigate to `/edit-listing/:id`.
- **Delete Button**: Confirmation modal with permanent deletion.
- **Status Toggle**: Mark as `SOLD`, `HIDDEN`, or restore to `ACTIVE`.

---

## ═══════════════════════════════════════════════════════
## 🟢 MODULE 5: QR Handover & Secure Campus Transaction
## ═══════════════════════════════════════════════════════
- **Status**: ✅ **LIVE**
- **Primary Components**: `client/src/components/handover/HandoverQRModal.jsx`, `client/src/components/handover/HandoverScannerModal.jsx`

### 5.1 Seller — QR Code Generation (`HandoverQRModal.jsx`)
- **One-Click QR Generation**: `POST /api/marketplace/offers/<id>/generate-qr/` creates a secure handover session with a unique UUID token and 6-digit OTP PIN.
- **Live QR Code Rendering**: `QRCodeSVG` (from `qrcode.react`) renders a scannable QR code containing the handover verification URL.
- **6-Digit OTP PIN Display**: Large monospaced PIN code with 1-click clipboard copy for voice/text sharing fallback.
- **Countdown Timer**: Real-time countdown showing remaining seconds until QR/PIN expiry (configurable via admin settings: 10-60 mins).
- **Auto-Polling for Completion**: Interval-based polling checks if the buyer has scanned the QR. On successful scan:
  - 🎉 **Confetti celebration animation** fires.
  - Deal status atomically updates to `COMPLETED`.
  - Listing marked as `SOLD`.
  - Both parties awarded +5 Trust Score points.
  - Success notification dispatched.
- **Regenerate QR**: If expired, seller can regenerate a fresh QR/OTP.
- **Session Details Card**: Displays listing title, buyer name, agreed price, and campus meetup location.

### 5.2 Buyer — QR Scanner (`HandoverScannerModal.jsx`)
- **Camera Access**: Requests device camera via `getUserMedia` with rear-camera preference.
- **Real-Time QR Scanning**: Continuous video frame analysis to detect and decode QR codes.
- **OTP Fallback**: Manual 6-digit PIN input field if camera scanning fails (network issues, low battery, broken camera).
- **Verification**: `POST /api/marketplace/handover/verify/` validates the scanned token + OTP combination.
- **Success Flow**: Same as seller side — confetti, deal completion, trust score awards, and listing sold status.
- **Error Handling**: Invalid QR, expired session, already-used token, and network failure states all gracefully handled with toast alerts.

---

## ═══════════════════════════════════════════════════════
## 🟢 MODULE 6: Student Profile Dashboard
## ═══════════════════════════════════════════════════════
- **Status**: ✅ **LIVE**
- **Primary Page**: `client/src/pages/Profile.jsx`
- **Tab Components**: `ProfileSidebar.jsx`, `PersonalInfoTab.jsx`, `OrdersSellsTab.jsx`, `IdVerificationTab.jsx`, `SavedItemsTab.jsx`, `LogoutModal.jsx`

### 6.1 Profile Sidebar (`ProfileSidebar.jsx`)
- Student avatar (profile photo or initials), full name, `@registration_number`, college email.
- Role badge (`Buyer` / `Seller`), ID verification status badge, Trust Score display.
- Navigation tabs: `Personal Info`, `Orders & Sales`, `ID Verification` (seller-only), `Saved Items`.
- Quick action: `Upgrade to Seller` button for buyers.
- Logout button with confirmation modal.

### 6.2 Personal Info Tab (`PersonalInfoTab.jsx`)
- **Editable Fields**: Full name, phone number, WhatsApp number, profile photo.
- **Read-Only Fields**: Email, registration number, role, trust score, join date.
- **Profile Photo Upload**: Image upload with client-side compression and preview.
- **Save Changes**: `PATCH /api/auth/profile/` updates student profile.
- **Password Change**: Current password + new password form.

### 6.3 Orders & Sales Tab (`OrdersSellsTab.jsx`)
- **Dual Sub-Tabs**:
  - **"My Sales" (Sellers)**: Active listings grid with status badges, view counts, edit/delete actions, and "Generate Handover QR" for accepted offers.
  - **"My Orders" (Buyers)**: All purchase requests sent, with status tracking (`Pending`, `Accepted`, `Rejected`, `Completed`, `Cancelled`), buyer note display, and "Scan QR" button for accepted deals.
- **Handover Integration**: Direct launch of QR Generation and Scanner modals from within the orders tab.
- **Status Filter**: Filter orders/listings by status.
- **Empty States**: Illustrated empty states with call-to-action links.

### 6.4 ID Verification Tab (`IdVerificationTab.jsx`)
- **For Verified Sellers**: Displays current verification status, ID card preview, extracted OCR data (Reg No, Name, Programme, Section), selfie preview, trust score badge, and verification timestamp.
- **Re-Upload ID Card**: Option to re-upload with fresh Tesseract OCR scan and registration number cross-validation.
- **Intelligent OCR Matching** (`matchRegistrationNumber`): Handles exact matches, whitespace/dash stripping, and common OCR confusions (`O ↔ 0`, `I/l ↔ 1`, `S ↔ 5`, `B ↔ 8`).

### 6.5 Saved Items Tab (`SavedItemsTab.jsx`)
- **Persistent Local Storage**: Saved items stored in `localStorage` via `savedStore.js`, no authentication required.
- **Grid View**: Listing image, title, price, campus location, condition.
- **Remove Item**: 1-click unsave with instant UI update.
- **Navigate to Listing**: Click card to view full product detail page.

### 6.6 Logout Modal (`LogoutModal.jsx`)
- Confirmation dialog before session termination.
- Clears JWT tokens, user data, and redirects to homepage.

---

## ═══════════════════════════════════════════════════════
## 🟢 MODULE 7: Notifications & Alerts System
## ═══════════════════════════════════════════════════════
- **Status**: ✅ **LIVE**
- **Primary Page**: `client/src/pages/Notifications.jsx`
- **Supporting Components**: `client/src/components/UrgentNoticeModal.jsx`, `client/src/utils/notificationStore.js`

### 7.1 Notifications Page (`/notifications`)
- **Filter Tabs**: `All Alerts`, `Unread`, `Campus Broadcasts`, `Purchase Requests`.
- **Notification Types & Badges**:
  - 📦 **Offer / Purchase Request**: New buyer offers, accepted/rejected/cancelled offers.
  - 📢 **Campus Broadcast** (indigo megaphone badge): Admin-dispatched campus-wide announcements.
  - 🛡️ **Direct Admin Warning** (amber shield badge): Personal warnings, compliance notices, ID re-upload requests.
  - 🔴 **Urgent Priority**: Pulsing red badge with high-contrast border for critical alerts.
- **Action Deep Links**: Each notification can contain a link directing students to relevant pages (`/profile`, `/my-listings`, `/guidelines`, `/listing/:id`).
- **Mark as Read**: 1-click mark individual notifications as read.
- **Delete Notification**: Individual deletion with confirmation.
- **Clear All**: Bulk clear all read notifications.

### 7.2 Navbar Notification Badge
- **Unread Counter**: Real-time unread count badge on the Bell icon in the navigation bar.
- **Polling**: Periodic fetch of unread notification count to keep badge updated.

### 7.3 Urgent Notice Modal (`UrgentNoticeModal.jsx`)
- **Auto-Trigger on Login**: Checks for unread `priority='URGENT'` admin notifications.
- **Full-Screen Alert Overlay**: High-priority bounce-animated modal with critical warning shield icon, message body, action button, and "I Acknowledge & Understand" dismiss button.
- **Non-Dismissible Until Acknowledged**: Forces student to read and explicitly acknowledge critical campus safety or compliance alerts.

---

## ═══════════════════════════════════════════════════════
## 🟢 MODULE 8: Platform Infrastructure & UX
## ═══════════════════════════════════════════════════════
- **Status**: ✅ **LIVE**

### 8.1 Campus Announcement Banner (`AnnouncementBanner.jsx`)
- **Sticky Glassmorphic Top Banner**: Fetches active announcement from `GET /api/marketplace/announcement/`.
- **4 Visual Severity Themes**: `INFO` (blue), `WARNING` (amber), `ALERT` (red with animated beacon), `PROMO` (emerald).
- **Session-Based Dismissal**: Dismissed banners are tracked via `sessionStorage` — won't reappear during the same browser session.
- **Optional Action Link**: "Learn More →" CTA linking to campus notices or external resources.

### 8.2 Navigation Bar (`Navbar.jsx`)
- **Desktop**: Logo, global search bar, category-aware search, "Sell" CTA button, notification bell with badge, saved items heart with count, profile dropdown menu.
- **Mobile**: Hamburger menu with full-screen drawer, mobile search expansion, bottom-aligned action buttons.
- **Profile Dropdown**: Quick links to Profile, My Listings, Orders, Notifications, and Logout.
- **Auth Triggers**: Login/Register buttons for unauthenticated visitors.

### 8.3 Saved Items Drawer (`SavedItemsDrawer.jsx`)
- **Slide-In Right Drawer**: Triggered by clicking the heart icon in the navbar.
- **Saved Items List**: Image, title, price, location, condition badge, and remove button.
- **Navigate to Listing**: Click to view full product detail.
- **Backdrop Overlay**: Click-outside-to-close and Escape key dismiss.

### 8.4 Protected Routes (`ProtectedRoute.jsx`)
- Higher-order wrapper component checking `localStorage` for valid JWT access token.
- Redirects unauthenticated users to homepage with login modal trigger.

### 8.5 Global Loading & Toast System
- **`LoadingContext.jsx`**: Global React context providing app-wide loading state management.
- **`UniversalLoader.jsx`**: Full-viewport animated loading overlay with branded spinner.
- **`BufferingView.jsx`**: Inline content buffering/skeleton state.
- **`react-hot-toast`**: Bottom-right positioned toast notifications for success, error, info, and warning messages.

### 8.6 Custom Thin Scrollbars (`index.css`)
- **Webkit (Chrome, Edge, Safari)**: 4px ultra-thin scrollbar with `#cbd5e1` thumb, transparent track, smooth hover transition.
- **Firefox**: `scrollbar-width: thin` with matching color scheme.
- Utility classes: `.scrollbar-none` / `.no-scrollbar` for hiding scrollbars on horizontal scroll strips.

### 8.7 SEO & Legal Pages
- **About Page** (`/about`): Platform mission, team information, and campus community values.
- **Guidelines Page** (`/guidelines`): Student marketplace usage rules, prohibited items, and community standards.
- **Privacy Policy** (`/privacy`): Data collection, usage, and student privacy protections.
- **Terms of Service** (`/terms`): Platform terms and conditions for student traders.
- **404 Not Found** (`/404`): Custom branded 404 page with navigation back to homepage.

### 8.8 Footer (`Footer.jsx`)
- 4-column responsive footer with brand info, quick links (Browse categories, Sell an Item, About, Guidelines), legal links (Privacy, Terms), and copyright.
- Conditionally rendered: visible on Home, Product Detail, and public pages; hidden on action/dashboard pages.

### 8.9 Auto Scroll-to-Top (`ScrollToTop.jsx`)
- Automatically scrolls to top on route navigation for smooth page transitions.

---

## ═══════════════════════════════════════════════════════
## 🟢 MODULE 9: Peer Trust, Communications & Negotiation Engine
## ═══════════════════════════════════════════════════════
- **Status**: ✅ **LIVE**
- **DPDP Act (2023) Compliance**: Strict data minimization across all public surfaces (no raw registration numbers, emails, phone numbers, or physical ID cards exposed).
- **Primary Pages & Components**:
  - `client/src/pages/SellerProfile.jsx` (`/seller/:id`)
  - `client/src/components/chat/ChatDrawer.jsx`
  - `client/src/components/reviews/ReviewModal.jsx`
  - `client/src/components/Navbar.jsx` (Search Autocomplete)
  - `client/src/pages/ProductDetail.jsx` (Lightbox Zoom & Counter-Offer Modal)
  - `client/src/components/profile/OrdersSellsTab.jsx` (Review Trigger & Counter Response)

### 9.1 Verified Deal Ratings & Reviews System
- **Deal-Gated Submission**: Reviews can only be submitted for completed transactions (`HandoverSession` completed with PIN / QR verification).
- **1-5 Star Interactive Selector**: Hover and click star picker with contextual feedback labels (*Poor*, *Fair*, *Good*, *Very Good*, *Excellent*).
- **Quick-Tag Chips**: 1-click preset feedback tags: *"Punctual"*, *"Item as Described"*, *"Polite"*, *"Quick Response"*, *"Fair Pricing"*.
- **Trust Score Integration**: Recalculates recipient's trust score automatically upon review submission (bonuses for ratings >= 4.5, penalties for ratings < 2.5).
- **Anti-Spam / Single Review Enforcement**: Unique composite key `('deal', 'reviewer')` prevents duplicate reviews.

### 9.2 Real-Time In-App Student Chat Drawer
- **Zero Third-Party Dependency**: Lightweight REST polling (3s interval) with no external WebSockets/ASGI/Redis required.
- **Listing & Deal Scoped**: Chat threads are bound directly to the item context, showing item thumbnail, title, and price in the drawer header.
- **Privacy & Safety Shield**: No phone numbers exchanged; communicates solely via internal student IDs with automated sanitization.
- **Real-Time Read Receipts**: Unread message tracking and automatic mark-as-read when drawer is opened.
- **UX Polish**: Floating right-side slide-over drawer, auto-scroll to bottom, send on Enter, disabled state when sending.

### 9.3 Price Negotiation & Counter-Offer Engine
- **Dynamic Bargaining**: Allows buyers to propose a custom offer amount on negotiable items.
- **Seller Counter Proposal**: Sellers can decline, accept, or respond with a `COUNTER` offer specifying counter amount and an optional note (e.g., *"I can do ₹450 minimum"*).
- **Buyer Decision Cycle**: Buyer receives instant in-app notification and can `Accept` or `Decline` the counter-offer directly from their Orders tab or Product page.
- **Automatic Deal Lock**: Accepting a counter-offer updates agreed price and automatically reserves the item, transitioning status to `ACCEPTED`.

### 9.4 Search Autocomplete & Instant Dropdown Suggestions
- **Debounced Instant Search**: 200ms debounced queries against `/api/marketplace/search-suggestions/?q=...`.
- **Hybrid Matching**: Returns matching listing titles (with category tag and price) alongside category suggestions with icons.
- **Keyboard & Click Navigation**: Smooth click navigation to listing detail or filtered catalog views with outside-click dismissal.

### 9.5 High-Resolution Product Image Lightbox & Inspection Zoom
- **Interactive Lightbox Modal**: Fullscreen high-resolution inspection modal triggered by clicking any product image.
- **Magnification Controls**: Zoom In, Zoom Out (1x to 3x), and Reset Zoom controls with mouse-drag panning support.
- **Multi-Image Carousel**: Thumbnail navigation strip inside the lightbox for multi-image listings.

### 9.6 DPDP Act (2023) Compliant Public Seller Profile (`/seller/:id`)
- **Data Minimization By Design**: Strictly excludes student registration numbers, institutional emails, phone numbers, and physical ID card photos.
- **Sanitized Display Names**: Displays privacy-safe names (e.g., *"Rohan S."*) and masked college domains (e.g., *"lpu.in"*).
- **Reputation Hub**: Shows Trust Score radial badge, completed deals counter, average peer star rating, and member since date.
- **Active Listings Showcase**: Clean grid of active items sold by this student with direct item navigation.
- **Peer Feedback Feed**: Public list of verified student reviews with quick tags and ratings.
- **Direct Chat Trigger**: 1-click button to open the in-app chat drawer with the seller.

---

## ═══════════════════════════════════════════════════════
## 🟡 MODULE 10: Future Roadmap & Pipeline
## ═══════════════════════════════════════════════════════

> Remaining roadmap items prioritized for subsequent releases.

### ⚡ REMAINING ENHANCEMENTS

| # | Feature | Description | Status |
|:-:|:--------|:------------|:------:|
| 1 | **Dark Mode** | System-preference-aware dark theme toggle with CSS tokens. | 🟡 Planned |
| 2 | **PWA (Progressive Web App)** | Service Worker, offline caching, "Add to Home Screen" prompt. | 🟡 Planned |
| 3 | **Listing Boost / Featured Placement** | Trust-score-gated spotlight placement at top of catalog. | 🟡 Planned |
| 4 | **Campus Location Map** | Interactive LPU campus map with meetup spot markers. | 🟡 Planned |
| 5 | **Wishlist Price Drop Alerts** | Automated notification when a saved item price drops. | 🟡 Planned |
| 6 | **Multi-Language Support (i18n)** | Hindi / English UI toggle. | 🟡 Planned |
| 7 | **AI-Powered Smart Pricing** | Pricing recommendations based on past completed deal averages. | 🟡 Planned |

---

## 🔧 Backend API Endpoints (Currently Used by Client)

### Authentication (`/api/auth/`)
| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `POST` | `/api/auth/register/` | Multi-step student registration |
| `POST` | `/api/auth/login/` | JWT token login |
| `POST` | `/api/auth/token/refresh/` | Refresh JWT access token |
| `GET` | `/api/auth/status/` | Check auth status + user profile |
| `GET` | `/api/auth/profile/` | Fetch full profile |
| `PATCH` | `/api/auth/profile/` | Update profile fields |
| `POST` | `/api/auth/send-otp/` | Send email OTP |
| `POST` | `/api/auth/verify-otp/` | Verify email OTP |
| `POST` | `/api/auth/upgrade-to-seller/` | Buyer → Seller upgrade |

### Marketplace (`/api/marketplace/`)
| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `GET` | `/api/marketplace/categories/` | List all categories |
| `GET` | `/api/marketplace/listings/` | Browse active listings (with filters) |
| `POST` | `/api/marketplace/listings/` | Create new listing |
| `GET` | `/api/marketplace/listings/<id>/` | Get listing detail |
| `PATCH` | `/api/marketplace/listings/<id>/` | Update listing |
| `DELETE` | `/api/marketplace/listings/<id>/` | Delete listing |
| `GET` | `/api/marketplace/my-listings/` | My listings |
| `POST` | `/api/marketplace/listings/<id>/offer/` | Submit purchase/counter request |
| `GET` | `/api/marketplace/listings/<id>/offers/` | Get offers for a listing |
| `PATCH` | `/api/marketplace/offers/<id>/respond/` | Accept/Reject/Counter offer |
| `POST` | `/api/marketplace/offers/<id>/counter-respond/` | Buyer accept/decline counter-offer |
| `POST` | `/api/marketplace/offers/<id>/generate-qr/` | Generate handover QR |
| `POST` | `/api/marketplace/handover/verify/` | Verify QR scan / PIN |
| `POST` | `/api/marketplace/reviews/` | Submit peer review for completed deal |
| `GET` | `/api/marketplace/seller/<id>/` | DPDP-compliant public seller profile |
| `GET` | `/api/marketplace/seller/<id>/reviews/` | List peer reviews for seller |
| `GET, POST` | `/api/marketplace/chat/<listing_id>/<peer_id>/` | Real-time in-app chat thread |
| `GET` | `/api/marketplace/conversations/` | List user's active chat conversations |
| `GET` | `/api/marketplace/search-suggestions/` | Autocomplete search suggestions |
| `POST` | `/api/marketplace/listings/<id>/report/` | Report listing |
| `GET` | `/api/marketplace/notifications/` | Get notifications |
| `PATCH` | `/api/marketplace/notifications/<id>/read/` | Mark notification read |
| `DELETE` | `/api/marketplace/notifications/<id>/` | Delete notification |
| `DELETE` | `/api/marketplace/notifications/clear-all/` | Clear all notifications |
| `GET` | `/api/marketplace/announcement/` | Get active announcement |

---

## 📊 Tech Stack Summary

| Layer | Technology |
|:------|:-----------|
| **Framework** | React 18+ (Vite) |
| **Routing** | React Router v6 (`BrowserRouter`) |
| **State** | React hooks (`useState`, `useEffect`, `useContext`) |
| **Forms** | `react-hook-form` + `zod` validation schemas |
| **HTTP** | Axios with JWT interceptors |
| **Styling** | TailwindCSS + Custom `index.css` |
| **Icons** | Lucide React |
| **OCR** | Tesseract.js (client-side) |
| **QR** | `qrcode.react` (generation) + native camera (scanning) |
| **Toasts** | `react-hot-toast` |
| **Animations** | CSS keyframes, `canvas-confetti` |
| **Local Storage** | `savedStore.js` (wishlist), `notificationStore.js` |
| **Image Processing** | Canvas-based compression (`compressImage.js`) |
| **Face Detection** | Custom heuristics (`faceLivenessDetector.js`) |
| **Fonts** | Inter (body), Outfit (display) via Google Fonts |

---

## 🔄 Tracking & Update Protocol
1. **Har naya feature add hone par**: Is file me uska module, components, aur endpoints update honge.
2. **Future enhancement pick hone par**: Status `🟡 PLANNED` se `🔄 IN PROGRESS` aur phir `✅ LIVE` mark hoga.
3. **Breaking changes ya major refactors**: Is document me clearly noted honge with migration steps.
