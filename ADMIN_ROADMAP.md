# 🛡️ CampusXChange Admin Panel — Master Implementation Roadmap

> **Master Execution Plan**: Har phase ko number wise divide kiya gaya hai. Jaise-jaise ek-ek phase complete hota jayega, is file mein uska status, endpoints, aur controls update hote rahenge.

---

## 📌 Roadmap Progress Overview

| Phase # | Phase Name | Status | Key Deliverables |
|:-------:|:-----------|:------:|:-----------------|
| **Phase 1** | **Core User & Listing Controls** | ✅ **COMPLETED** | Ban/Unban, ID Card Inspection Lightbox, Role Switch, Listing Editor, Latency Optimization |
| **Phase 2** | **Category Management & Campus Notice Banner** | ⏳ **UP NEXT** | Add/Edit/Delete Categories, Icon picker, Global Emergency/Notice Banner at Marketplace top |
| **Phase 3** | **Content Moderation & Reports Resolution** | 📋 **PENDING** | Banned Words auto-flag, Flagged Queue, Warn/Ban user from report, Dismiss/Action modal |
| **Phase 4** | **Offers, QR Handovers & Deal Disputes** | 📋 **PENDING** | View all live offers, Handover QR session monitor, Force cancel/complete deals |
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
## ⏳ PHASE 2: Category Management & Campus Notice Banner
## ═══════════════════════════════════════════════════════
- **Status**: ⏳ **UP NEXT (READY TO IMPLEMENT)**
- **Target Pages**: `admin/src/pages/Categories.jsx`, `admin/src/pages/Settings.jsx`, `client/src/components/AnnouncementBanner.jsx`

### 2.1 Category Management System
- **Dedicated Categories Page**: Table and grid view of all existing listing categories (Books, Electronics, Cycles, Uniforms, Room Essentials, etc.).
- **Create New Category**:
  - Name, URL Slug (auto-generated), Icon (Lucide icon identifier / emoji / image URL), Description.
  - Active toggle (enable/disable without deleting).
- **Edit Category**: Update name, slug, icon, and display order.
- **Delete Category with Safeguard**: Check if category contains active listings. If yes, warn admin and allow bulk reassigning listings to an alternative category before deletion.
- **Category Analytics**: Show total listings and active listings count per category.

### 2.2 Global Campus Announcement & Emergency Notice Banner
- **Backend Model / Settings**:
  - `announcement_enabled` (Boolean)
  - `announcement_text` (String - formatted text or headline)
  - `announcement_type` (`INFO` [blue], `WARNING` [amber], `ALERT` [red], `PROMO` [emerald])
  - `announcement_link` (Optional URL or internal route)
  - `announcement_dismissible` (Boolean - can students close it for the session)
- **Admin Control UI (inside Settings or dedicated tab)**:
  - Live preview of the banner as admin types.
  - Publish / Unpublish instant toggle.
  - Color theme and icon selector.
- **Client Marketplace Integration**:
  - Sticky, beautiful top banner rendered across the student marketplace with smooth entry animations and dismiss behavior.

---

## ═══════════════════════════════════════════════════════
## 📋 PHASE 3: Content Moderation & Reports Resolution
## ═══════════════════════════════════════════════════════
- **Status**: 📋 **PENDING**
- **Target Pages**: `admin/src/pages/Reports.jsx`, `admin/src/pages/Moderation.jsx`

### 3.1 Advanced Reports Resolution Suite
- **Complete Report Context**: View report reason, reporter student details, reported item/user, timestamps, and attached evidence.
- **One-Click Action Toolbar**:
  - `Dismiss Report` (Mark as invalid / no violation).
  - `Issue Warning to Seller` (Sends formal admin warning to the seller's account).
  - `Take Down Listing` (Sets status to `HIDDEN` or deletes listing).
  - `Ban Reported User` (One-click instant suspension from the report modal).
- **Resolution Notes**: Admin can record internal resolution notes for audit tracking.

### 3.2 Banned Words & Auto-Flagging Engine
- **Prohibited Keywords Dictionary**: Admin can configure restricted words (e.g. alcohol, vape, weapons, assignment fraud, abusive terms).
- **Auto-Flagging on Listing Creation**: If a listing title or description matches restricted keywords, status is set to `FLAGGED_REVIEW` instead of public `ACTIVE`.
- **Flagged Queue Page**: Dedicated view for moderators to inspect flagged listings, approve them to public, or reject and penalize the seller.

---

## ═══════════════════════════════════════════════════════
## 📋 PHASE 4: Offers, QR Handovers & Deal Disputes
## ═══════════════════════════════════════════════════════
- **Status**: 📋 **PENDING**
- **Target Pages**: `admin/src/pages/Deals.jsx` (New Page)

### 4.1 Global Deal & Offer Monitor
- **Centralized Table of All Deals**: Filter by `PENDING`, `ACCEPTED`, `HANDOVER_PENDING`, `COMPLETED`, `CANCELLED`.
- **Deal Inspector**: See buyer, seller, agreed price, original price, listing details, and message timeline.
- **Handover QR Session Live Tracker**:
  - Inspect active QR codes generated for physical handovers.
  - Expiry countdown timer, verification OTP display, and meetup location status.

### 4.2 Deal Dispute & Emergency Intervention
- **Force Cancel Stalled Deals**: If a buyer or seller ghosts after agreement, admin can cancel the deal and automatically restore the listing to `ACTIVE`.
- **Force Complete Transaction**: In cases where students completed the physical exchange but connectivity failed during QR scan, admin can manually verify and mark transaction `COMPLETED`.
- **Export Deal Records**: Download transaction logs (CSV/Excel) for university reporting.

---

## ═══════════════════════════════════════════════════════
## 📋 PHASE 5: Broadcast Notifications & Direct Messaging
## ═══════════════════════════════════════════════════════
- **Status**: 📋 **PENDING**
- **Target Pages**: `admin/src/pages/Notifications.jsx` (New Page)

### 5.1 Campus Broadcast Announcements
- **Campus-Wide Push**: Send in-app notifications to all registered students (e.g., "End-of-Semester Hostel Clearance Sale is live!").
- **Targeted Broadcasts**: Filter recipients by Role (`All Sellers`, `All Buyers`, `Unverified Students`).
- **Priority Levels**: `Normal`, `High`, `Urgent` (triggers prominent popup on next student login).

### 5.2 Direct Student Warnings & Notices
- **Direct Notice from Admin**: Send individual official alerts (e.g., "Please re-upload your student ID card due to blurry image").
- **Pre-Configured Notification Templates**: One-click quick messaging templates for common scenarios.
- **Notification History Log**: Admin view of all broadcast and direct messages ever dispatched.

---

## ═══════════════════════════════════════════════════════
## 📋 PHASE 6: Advanced Analytics, Growth Charts & Leaderboards
## ═══════════════════════════════════════════════════════
- **Status**: 📋 **PENDING**
- **Target Pages**: `admin/src/pages/Analytics.jsx` & `admin/src/pages/Dashboard.jsx`

### 6.1 Visual Interactive Charts
- **Transaction Volume Over Time**: Dynamic line chart showing daily, weekly, and monthly completed deals and transaction turnover.
- **Category Listing Breakdown**: Interactive donut chart displaying listing counts and popularity per category.
- **Student Growth Curve**: Graph tracking new daily and weekly student signups.
- **Sell vs Donation Ratio**: Visual breakdown of commercial vs free student donations.

### 6.2 Campus Activity Heatmaps & Leaderboards
- **Top Sellers Leaderboard**: Ranked table of top campus sellers based on trust score, completed handovers, and positive reviews.
- **Campus Location Hotspots**: Bar chart comparing trading activity across campus spots (BH-1, BH-4, GH, Uni-Mall, Central Library, Central Plaza).
- **Price Trend Insights**: Average selling prices across categories over time.

---

## ═══════════════════════════════════════════════════════
## 📋 PHASE 7: Platform Security, Admin Audit Logs & System Health
## ═══════════════════════════════════════════════════════
- **Status**: 📋 **PENDING**
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
