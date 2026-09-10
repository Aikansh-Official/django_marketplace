# 🛡️ CampusXChange Admin Panel — Master Implementation Roadmap

> **Master Execution Plan**: Har phase ko number wise divide kiya gaya hai. Jaise-jaise ek-ek phase complete hota jayega, is file mein uska status, endpoints, aur controls update hote rahenge.

---

## 📌 Roadmap Progress Overview

| Phase # | Phase Name | Status | Key Deliverables |
|:-------:|:-----------|:------:|:-----------------|
| **Phase 1** | **Core User & Listing Controls** | ✅ **COMPLETED** | Ban/Unban, ID Card Inspection Lightbox, Role Switch, Listing Editor, Latency Optimization |
| **Phase 2** | **Category Management & Campus Notice Banner** | ✅ **COMPLETED** | Add/Edit/Delete Categories, Icon picker, Listings safeguard, Live Announcement Banner |
| **Phase 3** | **Content Moderation & Reports Resolution** | ✅ **COMPLETED** | Banned Words auto-flag, Moderation Queue, Warn/Ban seller, Dismiss/Resolve |
| **Phase 4** | **Offers, QR Handovers & Deal Disputes** | ⏳ **UP NEXT** | View all live offers, Handover QR session monitor, Force cancel/complete deals |
| **Phase 5** | **Broadcast Notifications & Direct Messaging** | 📋 **PENDING** | Send broadcast alerts to all students, Direct admin notice to individual user, Templates |
| **Phase 6** | **Advanced Analytics & Leaderboards** | 📋 **PENDING** | Visual charts (deals over time, category pie, user growth), Top Sellers, Location Heatmap |
| **Phase 7** | **Platform Security & Admin Audit Logs** | 📋 **PENDING** | Immutable admin action logs (who banned/edited what), Login history, Error log viewer |
| **Phase 8** | **Extended Platform Settings & RBAC** | 📋 **PENDING** | Max listings limit, Min trust score to sell, QR expiry config, Multi-admin roles, Dark mode |

---

## ═══════════════════════════════════════════════════════
## 🟢 PHASE 1: Core User & Listing Controls
## ═══════════════════════════════════════════════════════
- **Status**: ✅ **COMPLETED & PUSHED TO GITHUB** (`Commit: 866c3bb`)
- **Primary Pages**: `admin/src/pages/Students.jsx`, `admin/src/pages/Listings.jsx`, `admin/src/pages/Dashboard.jsx`

### 1.1 Student Management (Full Authority)
- **Live Search & Multi-Filters**: Instant search by Student Name, Username (`@registration_number`), Email, or Phone. Filters for Roles (`All`, `Buyers`, `Sellers`), ID Verification (`All`, `Physical ID Verified`, `Pending`), and Status (`All`, `Active`, `Suspended/Banned`).
- **Physical ID Card Lightbox**: High-res preview of student physical ID card with click-to-zoom Lightbox, OCR extracted details, and side-by-side comparison with the live face liveness selfie (`profile_photo`).
- **One-Click Admin Actions**:
  - `Ban / Suspend Student` (Sets `is_active=False`, instantly revoking platform access).
  - `Reactivate Student` (Restores suspended account).
  - `Manual Physical ID Verification` (Toggle `is_id_verified` with auto trust score recalculation).
  - `Role Switch` (Promote `BUYER` ➔ `SELLER` or demote `SELLER` ➔ `BUYER`).
  - `Permanent Delete Account` with safety confirmation.
- **Edit Student Modal**: Form to modify Name, Email, Phone, Role, Trust Score (0-100), and Account Status.

### 1.2 Listing Management (Full Authority)
- **Header Metric Counters**: Real-time counts for Active, Pending/Reserved, Sold, and Hidden listings.
- **Search & Filter Suite**: Filter by Title, Campus Location, Seller Name, Category, Transaction Type (`SELL` vs `DONATE`), and Status.
- **Inline Status Dropdown**: Switch listing status (`ACTIVE`, `PENDING`, `SOLD`, `HIDDEN`) directly from the table row.
- **Listing View Modal**: Full image gallery, thumbnail carousel, lightbox zoom, seller contact info, and meetup preferences.
- **Edit Listing Modal**: Update Title, Price, Description, Category, Condition, Campus Location, and Status.
- **Delete Listing**: Instant deletion with confirmation dialog.

### 1.3 High-Performance Latency Optimization
- Fixed Supabase transaction pooler (port `6543`) connection hangs by tuning `conn_max_age=0 if DEBUG else 60`.
- Deferred heavy base64 ID card serialization (`.defer('id_card_image')`), reducing list payloads from tens of megabytes to fast sub-200ms JSON responses.
- ID cards are lazy-loaded on-demand only when admin clicks to inspect a student (`/api/auth/users/<id>/`).
- Added CORS preflight caching (`CORS_PREFLIGHT_MAX_AGE = 86400`) and dashboard stats 60-second caching.

---

## ═══════════════════════════════════════════════════════
## 🟢 PHASE 2: Category Management & Campus Notice Banner
## ═══════════════════════════════════════════════════════
- **Status**: ✅ **COMPLETED & PUSHED TO GITHUB** (`Commit: 24194bd`)
- **Primary Pages**: `admin/src/pages/Categories.jsx`, `admin/src/pages/Settings.jsx`, `client/src/components/AnnouncementBanner.jsx`

### 2.1 Category Management System
- **Dedicated Categories Page**: Interactive Grid & Table view of all existing listing categories with active listing counters and metric cards.
- **Create Category Modal**: Name input with real-time auto-slug generation, custom slug support, and a visual 18-icon Lucide picker with categories (Academic, Tech, Campus, Lifestyle, Entertainment, General).
- **Edit Category Modal**: Immediate updating of Category Name, Slug, and Icon with live student badge preview.
- **Delete Category with Safeguard**:
  - Automatically checks if active listings exist.
  - If listings exist, enforces selecting an alternative target category to safely migrate all listings or requires explicit confirmation for force deletion.
- **Backend Endpoints**:
  - `GET /api/marketplace/admin/categories/` (Lists categories with annotated `listings_count` and `total_listings_count`).
  - `POST /api/marketplace/admin/categories/` (Creates category and auto-purges public category cache).
  - `GET/PATCH/PUT /api/marketplace/admin/categories/<id>/` (Updates category details).
  - `DELETE /api/marketplace/admin/categories/<id>/` (Deletes category with `reassign_to` migration safeguard).

### 2.2 Global Campus Announcement & Emergency Notice Banner
- **Backend Configuration & Public API**:
  - Stored in database via `PlatformSetting` model (`announcement_enabled`, `announcement_text`, `announcement_type`, `announcement_link`, `announcement_dismissible`).
  - `GET /api/marketplace/announcement/` (Public endpoint cached for 60s, returning active announcement state).
- **Admin Settings Live Editor**:
  - Real-time interactive preview box rendered inside `Settings.jsx` showing the exact banner design before publishing.
  - 4 Preset Severity Themes: `INFO` (Blue notice), `WARNING` (Amber caution), `ALERT` (Red urgent security banner with live beacon), `PROMO` (Emerald campus fest banner).
  - Instant toggle switch to publish/unpublish.
- **Client Marketplace Integration**:
  - Sticky, glassmorphic top banner mounted inside `client/src/App.jsx`.
  - Session-based dismissal (`sessionStorage`) so dismissed notices don't annoy students across repeat page navigation.
  - Optional action link ("Learn More →") directing to campus notices or guidelines.

---

## ═══════════════════════════════════════════════════════
## 🟢 PHASE 3: Content Moderation & Reports Resolution
## ═══════════════════════════════════════════════════════
- **Status**: ✅ **COMPLETED & VERIFIED**
- **Primary Pages**: `admin/src/pages/Reports.jsx`

### 3.1 Advanced Reports Resolution Suite
- **Interactive Moderation Queue**: Real-time counters for Pending Review, Resolved Violations, Dismissed Reports, and Total Filed. Search across listings, violation reasons, sellers, and reporters.
- **Deep Inspection Modal**:
  - **Reported Item Preview**: High-res listing image, title, price, category, condition, campus location, description snippet, and current listing status.
  - **Violation Context**: Highlighted report reason, student's detailed comments, reporter username and email.
  - **Seller Profile Card**: Seller username, email, trust score badge (0-100), and account status (`Active` vs `Suspended/Banned`).
- **Action Toolbar**:
  - ⚠️ **Warn Seller**: Compose custom or standard official warning notice dispatched directly to the student's in-app notification center.
  - 👁️ **Hide Listing**: Instant takedown setting listing status to `HIDDEN` and alerting the seller.
  - 🗑️ **Delete Listing**: Permanently deletes listing from marketplace with automated seller notice.
  - 🚫 **Ban Seller Account**: 1-click account suspension (`is_active=False`) and bulk hide of all listings belonging to that seller.
  - ✕ **Dismiss Report**: Mark invalid/false reports as `DISMISSED`.
  - ✓ **Mark Resolved**: Close investigation as resolved.

### 3.2 Prohibited Keywords & Auto-Flagging Engine
- **Prohibited Words Dictionary**: Database-backed keywords in `PlatformSetting` (e.g. vape, alcohol, weapons, weed, exam paper, cheat, fake id).
- **Automated Screening on Listing Post & Edit**: Every new listing and update is screened against the blacklist. Matching listings are automatically hidden (`status='HIDDEN'`) and an auto-flagged report is filed in the moderation queue.
- **Banned Keywords Management Tab**: Interactive chip cloud, add/remove keyword form, and an interactive **Live Keyword Screening Tester** to test sample texts in real-time.
- **Backend Endpoints**:
  - `GET /api/marketplace/admin/reports/` (Enriched with listing photos, price, seller trust score, and active status).
  - `PATCH /api/marketplace/admin/reports/<id>/` (Processes `action`: `WARN_SELLER`, `HIDE_LISTING`, `DELETE_LISTING`, `BAN_SELLER`, `DISMISS`, `RESOLVE`).
  - `GET /api/marketplace/admin/banned-words/` & `POST /api/marketplace/admin/banned-words/` (Manages active keyword blacklist).

---

## ═══════════════════════════════════════════════════════
## 🟢 PHASE 4: Offers, QR Handovers & Deal Disputes
## ═══════════════════════════════════════════════════════
- **Status**: ✅ **COMPLETED & VERIFIED**
- **Primary Pages**: `admin/src/pages/Deals.jsx`

### 4.1 Global Deal & Offer Monitor
- **Centralized Campus Deals Table**: Filter by `ALL`, `ACCEPTED` (In Handover), `COMPLETED`, `CANCELLED`, `PENDING` (Negotiation), `REJECTED`. Real-time search across listing title, campus location, buyer/seller usernames, names, emails, and 6-digit OTP codes.
- **Financial & Volume Overview**: Real-time aggregate metric cards displaying Total Deals, Active Handovers, Completed Exchanges, Cancelled/Disputed Deals, and Total Verified Trade Volume (₹ GMV).
- **Deal Inspector Modal**:
  - **Listing Overview**: High-res product thumbnail, asking price vs agreed price, discount amount, condition, meetup location.
  - **Buyer & Seller Comparison Profile Cards**: Student usernames, full names, ID verification status badges, college emails, phone numbers with direct call/email triggers, and interactive Trust Score progress indicators (0-100).
  - **Buyer Negotiation Notes**: View original purchase notes and offer messages.
- **Handover QR & OTP Session Live Tracker**:
  - Displays live session status (`ACTIVE`, `USED`, `EXPIRED`, `CANCELLED`, or `NO_QR_GENERATED`).
  - High-visibility monospaced 6-digit verification PIN code with 1-click clipboard copy.
  - Expiry countdown timer, remaining seconds calculation, and one-time UUID token identifier.

### 4.2 Deal Dispute & Emergency Intervention
- **Force Cancel Stalled Deals**:
  - One-click administrative cancellation (`POST /api/marketplace/admin/deals/<id>/action/` with `FORCE_CANCEL`).
  - Automatically unlocks and restores the listing back to `ACTIVE` in the campus marketplace.
  - Voids and invalidates any active `HandoverSession` tokens.
  - Dispatches official in-app notifications with admin-provided cancellation reason to both student accounts.
- **Force Complete Transaction**:
  - Administrative override (`FORCE_COMPLETE`) for situations where physical handover took place but mobile app connectivity or camera scanning failed on campus.
  - Atomically marks the listing as `SOLD`, the offer as `COMPLETED`, and the handover session as `USED`.
  - Recalculates and awards +5 Peer Trade Trust Score points to both buyer and seller.
  - Dispatches official transaction completion and purchase receipt notifications to both parties.
- **Export Deal Records (CSV)**:
  - 1-click automated CSV exporter generating `campusxchange_deals_<date>.csv` with comprehensive columns: Deal ID, Date, Listing Title, Listing Price, Agreed Price, Status, Buyer Reg No, Buyer Name, Buyer Email, Seller Reg No, Seller Name, Seller Email, Handover Status, Handover PIN, and Meetup Location.
- **Backend Endpoints**:
  - `GET /api/marketplace/admin/deals/` (Filter by `status`, search by query).
  - `POST /api/marketplace/admin/deals/<pk>/action/` (Intervention with `FORCE_CANCEL` and `FORCE_COMPLETE`).

---

## ═══════════════════════════════════════════════════════
## 🟢 PHASE 5: Broadcast Notifications & Direct Messaging
## ═══════════════════════════════════════════════════════
- **Status**: ✅ **COMPLETED & VERIFIED**
- **Primary Admin Pages**: `admin/src/pages/Notifications.jsx`
- **Primary Client Components**: `client/src/components/UrgentNoticeModal.jsx` & `client/src/pages/Notifications.jsx`

### 5.1 Campus Broadcast Announcements
- **Campus-Wide Push**: Dispatch in-app announcements reaching all active registered students in real-time.
- **Targeted Cohorts**: Filter recipients by student role:
  - `ALL`: All registered campus students.
  - `SELLERS`: Active campus sellers.
  - `BUYERS`: Student buyers.
  - `UNVERIFIED`: Students with unverified physical ID cards (for verification drives).
- **Priority Tier System**:
  - `NORMAL`: Standard in-app notification with bell badge.
  - `HIGH`: Amber alert with high visibility in notification center.
  - `URGENT`: Critical administrative notice that triggers the **UrgentNoticeModal** popup overlay on student devices with formal acknowledgment prompt.
- **Interactive Mobile Device Live Previewer**: Real-time rendering of the student's notification card and critical modal overlay inside the admin composer.

### 5.2 Direct Student Warnings & Notices
- **Direct Student Selector**: Real-time search across student registration numbers, names, and college emails with live student profile card preview (role, trust score, ID verification status).
- **Pre-Configured Instant Templates**:
  - 🪪 *ID Card Re-upload Request*: Prompts students with blurry or expired ID card uploads to resubmit.
  - ⚠️ *Prohibited Item Warning*: Formal compliance warning detailing listing safety policy violations.
  - 🤝 *Trade Dispute Inquiry*: Urgent intervention alert regarding an unfulfilled deal or dispute.
  - ⏳ *Unresponsive Offer Reminder*: Gentle reminder urging quick response times to protect student trust scores.
- **Broadcast History & Audit Log**:
  - Searchable log tracking all past announcements: timestamp, target cohort, priority badge, subject, message snippet, recipient count, and sender admin username.

### 5.3 User (Student) Experience & Urgent Modal Suite
- **Interactive Client Notifications Page (`client/src/pages/Notifications.jsx`)**:
  - Distinctive badges and icons for `BROADCAST` (indigo megaphone) and `DIRECT_WARNING` (amber shield).
  - Urgent priority styling: pulsing red badge and high-contrast red alert border.
  - Action deep links linking students directly to relevant campus pages (`/profile`, `/my-listings`, `/guidelines`).
  - Metrics tabs: `All Alerts`, `Unread`, `Campus Broadcasts`, and `Purchase Requests`.
- **Urgent Notice Modal (`client/src/components/UrgentNoticeModal.jsx`)**:
  - Automatic check on login and live websocket/polling events for unread `priority='URGENT'` administrative alerts.
  - Full-screen high-priority alert dialog with bounce animation, critical warning shield, message body, action button, and "I Acknowledge & Understand" dismiss button.

---

## 🟢 PHASE 6: Advanced Analytics, Growth Charts & Leaderboards
## ═══════════════════════════════════════════════════════
- **Status**: ✅ **COMPLETED & VERIFIED**
- **Primary Pages**: `admin/src/pages/Analytics.jsx` & `admin/src/pages/Dashboard.jsx`
- **Backend Endpoints**: `GET /api/marketplace/admin/analytics/?timeframe={7d|30d|90d|all}`

### 6.1 Visual Interactive Charts & Turnover Trends
- **Campus Trade Velocity & Turnover Trend**: Bespoke dual-metric area and line chart rendered via zero-dependency custom SVG with cubic bezier curves, gradient fills, and interactive crosshair hover cursor with exact date/deals/turnover tooltips.
- **Category Listing Breakdown**: Interactive SVG donut chart with segment hover focus, percentage labels, and detailed legend displaying listing counts, active counts, and average prices.
- **Student Growth Curve**: Time-series tracking new student signups across selectable timeframes (`7D`, `30D`, `90D`, `All Time`).
- **Commercial Sales vs Campus Donations**: Comparative progress cards and stacked ratio bars breaking down commercial sales versus 100% free student goodwill donations.

### 6.2 Campus Activity Heatmaps & Leaderboards
- **Campus Location Hotspots**: Ranked horizontal bar visualization mapping trading density across LPU campus spots (BH-1, BH-4, BH-7, GH, Uni-Mall, Central Library, Central Plaza).
- **Category Price Benchmarks**: Valuation comparison card showing min, max, and average asking prices across categories in INR (₹).
- **Campus Sellers Hall of Fame (Top 10)**: Ranked leaderboard with podium awards for 🥇 1st Place (Gold), 🥈 2nd Place (Silver), and 🥉 3rd Place (Bronze). Displays student avatar, name, `@username`, college email, campus verified badge, trust score meter (0-100), total items listed, items sold, and completed deal counts.
- **Automated Analytics CSV Exporter**: 1-Click download generating formatted `.csv` reports with KPIs, category shares, top sellers, and location hotspots.

---

## ═══════════════════════════════════════════════════════
## 📋 PHASE 7: Platform Security, Admin Audit Logs & System Health
## ═══════════════════════════════════════════════════════
- **Status**: ⏳ **UP NEXT**
- **Target Pages**: `admin/src/pages/AuditLogs.jsx` (New Page), `admin/src/pages/SystemHealth.jsx`

### 7.1 Immutable Admin Audit Trail
- **Automated Action Logging**: Every administrative action is permanently logged:
  - Timestamp, Admin Username, IP Address.
  - Action Category (`USER_BAN`, `USER_EDIT`, `LISTING_DELETE`, `PRICE_OVERRIDE`, `CATEGORY_ADD`).
  - Target entity ID and before/after diff summary.
- **Searchable Audit Table**: Filter logs by admin, date range, or action type.

### 7.2 Security Monitoring & Error Diagnostics
- **Login Activity Monitor**: Track recent login attempts, failed OTP spams, and suspicious IP patterns.
- **API Health & Error Log Viewer**: View recent Django 500 errors, failed external services (Cloudinary / OCR), and database query latency.

---

## ═══════════════════════════════════════════════════════
## 📋 PHASE 8: Extended Platform Settings & Admin RBAC
## ═══════════════════════════════════════════════════════
- **Status**: 📋 **PENDING**
- **Target Pages**: `admin/src/pages/Settings.jsx`, `admin/src/pages/Team.jsx`

### 8.1 Marketplace Operational Constraints
- **Max Active Listings Limit**: Set maximum simultaneous listings allowed per student (prevents spamming).
- **Minimum Trust Score to Sell**: Prevent new unverified accounts with 0 trust from listing high-value items.
- **Handover Expiry Config**: Set QR validity duration (15m, 30m, 1 hour).
- **OTP Limits**: Set maximum daily OTP resend requests and lockout windows.

### 8.2 Role-Based Access Control (RBAC) & Experience
- **Admin Roles**:
  - `Super Admin`: Unrestricted system access, settings, user bans, and database exports.
  - `Moderator`: Manage listings, review flagged items, and resolve reports.
  - `ID Verifier`: Dedicated access to examine student ID cards and approve verifications.
- **UI Enhancements**:
  - Dark Mode / Light Mode theme toggle.
  - `Ctrl + K` Global Command Palette (Jump directly to any student, listing, or setting in 1 keystroke).
  - Fully mobile-responsive admin dashboard layout.

---

## 🔄 Tracking & Update Protocol
1. **Har phase shuru karne se pehle**: Us phase ka status `IN PROGRESS 🔄` mark hoga.
2. **Implementation ke dauran**: Backend endpoints, frontend components, aur unit checks document honge.
3. **Phase complete hone par**:
   - Automated tests aur builds verify honge (`check`, `build`).
   - Status `COMPLETED ✅` update hoga with commit hash.
   - Agle phase ke liye prompt / approval initiate hoga.
