# 🎓 CampusXChange (LPU Campus Peer-to-Peer Marketplace)

> **CampusXChange** is a campus-exclusive, verified peer-to-peer trading and exchange ecosystem engineered for university students. It enables safe, transparent, and frictionless transactions for academic textbooks, electronics, lab equipment, cycles, hostel essentials, and free goodwill donations right inside the university campus.

[![Django](https://img.shields.io/badge/Backend-Django%20REST%20Framework-092E20?style=for-the-badge&logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20SQLite-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)

---

## 🏛️ System Architecture

CampusXChange is organized as a decoupled, multi-app monorepo:

```
LPUTrade/
├── server/             # Django REST Framework Backend API & Database
│   ├── marketplace/    # Core Listings, Offers, QR Handovers, Notifications, Analytics
│   ├── users/          # Student Authentication, OCR ID Verification, Trust Scoring
│   └── cxc_backend/    # Platform Settings, Security Middleware & Routing
├── client/             # Student Web Portal (Vite + React 19 + Tailwind CSS)
│   ├── src/components/ # Product Cards, QR Handover Scanner, Urgent Alert Modals
│   └── src/pages/      # Marketplace Feed, My Listings, Profile, Notifications
├── admin/              # Administrative Operations Center (Vite + React 19 + Tailwind CSS)
│   ├── src/pages/      # Dashboard, Analytics, Students, Listings, Deals, Broadcasts
│   └── src/layouts/    # Admin Navigation, Profile Bar, Live System Clock
└── ADMIN_ROADMAP.md    # 8-Phase Architectural Master Roadmap & Implementation Log
```

---

## ✨ Key Features & Capabilities

### 👨‍🎓 1. Student Portal (`client/`)
- **Campus Email Authentication**: Restricted exclusively to verified college domains (e.g., `@lpu.in`).
- **Physical ID Card Verification (OCR)**: Students upload their university ID card for automatic credential and student ID extraction with selfie liveness checks.
- **Dynamic Trust Score (0–100)**: Peer rating engine calculated from email verification, approved student ID cards, and verified trade completions.
- **Dual-Mode Listings**:
  - 🏷️ **Commercial Sale**: Direct student-to-student sale with in-app price negotiation.
  - 🎁 **Free Goodwill Donation**: Senior-to-junior giveaways for lab coats, drafters, and semester notes.
- **Time-Bound QR & 6-Digit PIN Handover**: Physical exchange verification requiring the seller to scan buyer's QR or enter a 6-digit OTP code to complete the deal.
- **Urgent Campus Alerts**: Full-screen modal takeover for high-priority campus announcements (curfew changes, weather warnings, verification drives).

### 🛡️ 2. Admin Operations Console (`admin/`)
- **Command Center Dashboard**: Live metrics on active inventory, pending ID reviews, and campus trade velocity.
- **Student Profile Supervision**: Inspect physical ID cards side-by-side with OCR data and live selfie photos; 1-click ban/unban or ID verification override.
- **Catalog & Inventory Moderation**: Full authority to edit, hide, or permanently delete flagged listings.
- **Automated Content Protection**: Real-time keyword filter blocking inappropriate items, exam leaks, and contraband upon submission.
- **Handover & Deal Disputes**: Live tracking of all campus deals; administrative **Force Complete** (auto-awards trust score) or **Force Cancel** (unlocks listing) for disputed handovers.
- **Campus Broadcast Studio**: Real-time announcement studio with cohort targeting (`ALL`, `SELLERS`, `BUYERS`, `UNVERIFIED`) and an interactive **Live Mobile Preview Screen**.
- **Business Intelligence & Analytics**:
  - Dual-metric turnover (₹ GMV) and completed deals time-series graphs with custom SVG rendering.
  - Category share donut visualization and price benchmarking.
  - Campus location hotspots ranking top trade meetup points (BH-1, BH-4, Uni-Mall, Central Library).
  - **Campus Sellers Hall of Fame**: Top 10 student traders leaderboard with 🥇 Gold, 🥈 Silver, and 🥉 Bronze podium awards.
  - 1-Click CSV Report Exporter.
- **Platform Security & Audit Logs**:
  - Immutable administrative audit trail (`AdminAuditLog`) recording all student bans, ID verifications, listing edits, deal interventions, and configuration updates with IP/User-Agent tracking.
  - Searchable audit console with multi-filtering, severity badges, JSON payload inspector, and CSV exporter.
  - Live system diagnostics: real-time database ping latency meter (ms), cache read/write benchmark, security posture checklist, and threat telemetry.

---

## 🗺️ Master Roadmap & Phase Status

| Phase | Module | Status | Highlights |
|---|---|---|---|
| **Phase 1** | **Core User & Listing Controls** | ✅ `COMPLETED` | OCR verification inspection, student ban/unban, listing management |
| **Phase 2** | **Categories & Announcements** | ✅ `COMPLETED` | Dynamic category manager with SVG icons, public announcement banner |
| **Phase 3** | **Content Moderation & Blacklist** | ✅ `COMPLETED` | Student report queue, compliance actions, automated keyword blacklist |
| **Phase 4** | **Deals, QR Handovers & Disputes**| ✅ `COMPLETED` | OTP/PIN session monitor, deal dispute force-cancel & force-complete |
| **Phase 5** | **Broadcasts & Direct Messaging** | ✅ `COMPLETED` | Targeted student notices, urgent popup overlay, mobile live preview |
| **Phase 6** | **Analytics, Growth & Leaderboard**| ✅ `COMPLETED` | GMV charts, category breakdown, campus hotspots, top sellers leaderboard |
| **Phase 7** | **Platform Security & Audit Logs**| ✅ `COMPLETED` | Immutable administrative audit trail, live DB/cache latency meter, security checklist |
| **Phase 8** | **Operational Rules & Admin RBAC** | ⏳ `UP NEXT` | Active listing caps, minimum trust score to sell, role-based admin tiers |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18.0 or higher
- **Package Managers**: `pip` and `npm`

---

### 2. Backend Setup (`server/`)

```bash
cd server

# Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Run database tests (14/14 passing)
python manage.py test marketplace.tests

# Start development server (Port 8000)
python manage.py runserver
```

---

### 3. Student Web App (`client/`)

```bash
cd client

# Install packages
npm install

# Start Vite development server (Port 5173)
npm run dev

# Build production bundle
npm run build
```

---

### 4. Admin Operations Console (`admin/`)

```bash
cd admin

# Install packages
npm install

# Start Vite development server (Port 5174)
npm run dev

# Build production bundle
npm run build
```

---

## 🔒 Security & Data Integrity

- **Middleware Security Key**: All external and internal API requests validate through Django's `DataSecurityMiddleware` against `DATA_SECURITY_KEY`.
- **JWT & HttpOnly Sessions**: Cookie-based authentication preventing XSS token harvesting.
- **Rate Throttling**: DRF scoped rate limiters protect OTP generation, listing creation, and authentication endpoints from abuse.
- **Physical Handover Cryptography**: Each handover session generates a high-entropy UUID token paired with a salted 6-digit PIN code that auto-expires after the meetup window.

---

## 📄 License & Attribution

Developed for **Lovely Professional University (LPU)** Campus Community. All rights reserved.
