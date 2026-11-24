# 📢 CampXChange — Android Announcements & Urgent Alerts Specification

> **Target Platform:** Android (Native Jetpack Compose)  
> **Source Components:** `client/src/components/AnnouncementBanner.jsx` & `client/src/components/UrgentNoticeModal.jsx`  
> **Backend Service:** Django REST Framework (`/api/marketplace/announcement/`, `/api/marketplace/notifications/urgent/`)  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [Overview & Visual Hierarchy](#1-overview--visual-hierarchy)
2. [Campus Top Announcement Banner](#2-campus-top-announcement-banner)
3. [Full-Screen Urgent Notice Modal (Compliance Shield)](#3-full-screen-urgent-notice-modal)
4. [REST API Contract & Endpoints](#4-rest-api-contract--endpoints)
5. [Jetpack Compose UI Implementations](#5-jetpack-compose-ui-implementations)

---

## 1. Overview & Visual Hierarchy

CampXChange features a dual-layer alert infrastructure:
1. **Passive Ambient Banner:** Sticky top banner for campus announcements, holiday notices, and seasonal student deals.
2. **Active Full-Screen Modal (`URGENT`):** Non-dismissible overlay forced immediately upon login when an administrator issues a critical compliance or safety alert (e.g., student ID re-upload request, university moderation warning).

---

## 2. Campus Top Announcement Banner

### 4 Visual Themes & Severity Levels
- **`INFO` (Blue):** General updates, schedule changes, library meetup tips.
- **`WARNING` (Amber):** Upcoming maintenance downtime or weather advisories.
- **`ALERT` (Red):** Fraud alerts, scam warnings, security guidelines.
- **`PROMO` (Emerald):** End-of-semester mega clearance, book donation drives.

### Session-Based Dismissal
- When user taps the `X` icon, the banner is hidden for the current app session.
- Stored in a lightweight in-memory StateFlow or DataStore flag.

---

## 3. Full-Screen Urgent Notice Modal

- Triggered automatically on `MainActivity` launch / login if `GET /api/marketplace/notifications/urgent/` returns an active urgent notice.
- **Blocking UX:** User cannot dismiss by tapping outside or pressing the back button.
- **Mandatory Action:** User must tap **"I Acknowledge & Understand"** to dismiss, which calls `PATCH /api/marketplace/notifications/{id}/read/`.

---

## 4. REST API Contract & Endpoints

> **Base URL:**
> - Production: `https://cxc.anshuman892494.online/`
> - Local Emulator: `http://10.0.2.2:8000/` (or `http://127.0.0.1:8000/` via adb reverse)
>
> **Mandatory Headers (All Calls):**
> ```http
> X-App-Security-Key: campusXchange_secure_key_2026_@nshuman892494
> Authorization: Bearer <access_token>
> Accept: application/json
> ```

### 4.1 Fetch Active Announcement Banner
- **URL:** `GET /api/marketplace/announcement/`
- **Auth:** Optional
- **Response `200 OK`:**
```json
{
  "id": 3,
  "title": "Semester Exchange Fair!",
  "message": "End-of-term book exchange and hostel furniture clearance is now live at Uni-Mall.",
  "severity": "PROMO",
  "action_label": "View Items",
  "action_url": "marketplace?category=books-notes",
  "is_active": true
}
```

### 4.2 Fetch Urgent Notifications (Blocking Modal)
- **URL:** `GET /api/marketplace/notifications/urgent/`
- **Auth:** Required (`Authorization: Bearer <token>`)
- **Response `200 OK` (When Urgent Notice Exists):**
```json
{
  "has_urgent": true,
  "notification": {
    "id": 99,
    "title": "Action Required: Verify Student ID Card",
    "message": "Your uploaded ID card photo was blurry. Please re-upload a clear physical card to maintain your verified seller status.",
    "created_at": "2026-09-06T09:00:00Z"
  }
}
```

---

## 5. Jetpack Compose UI Implementations

```kotlin
package com.campxchange.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.campxchange.app.ui.theme.*

@Composable
fun AnnouncementBanner(
    title: String,
    message: String,
    severity: String, // INFO, WARNING, ALERT, PROMO
    onActionClick: () -> Unit,
    onDismiss: () -> Unit
) {
    val (bg, contentColor) = when (severity) {
        "ALERT" -> Pair(ErrorBg, ErrorRed)
        "WARNING" -> Pair(WarningBg, WarningAmber)
        "PROMO" -> Pair(SuccessBg, SuccessGreen)
        else -> Pair(InfoBg, InfoBlue)
    }

    Surface(
        color = bg,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Info,
                contentDescription = null,
                tint = contentColor,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = contentColor
                )
                Text(
                    text = message,
                    fontSize = 11.sp,
                    color = TextSecondaryLight
                )
            }
            IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
                Icon(Icons.Default.Close, contentDescription = "Dismiss", tint = TextMutedLight)
            }
        }
    }
}
```
