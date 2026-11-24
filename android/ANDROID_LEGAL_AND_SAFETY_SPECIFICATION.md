# ⚖️ CampXChange — Android Legal, Safety & DPDP Compliance Specification

> **Target Platform:** Android (Native Jetpack Compose)  
> **Source Pages:** `client/src/pages/Terms.jsx`, `Privacy.jsx`, `Guidelines.jsx`, `About.jsx`  
> **Backend Service:** Django REST Framework (`/api/marketplace/report/`, `/api/marketplace/listings/<id>/report/`)  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [DPDP Act (2023) Student Data Minimization Architecture](#1-dpdp-act-2023-compliance)
2. [Campus Safety Rules & Meetup Guidelines](#2-campus-safety-rules--meetup-guidelines)
3. [Prohibited Items Policy](#3-prohibited-items-policy)
4. [Trader & Listing Reporting Pipeline](#4-trader--listing-reporting-pipeline)
5. [Jetpack Compose Legal Screens & Safety Cards](#5-jetpack-compose-legal-screens)

---

## 1. DPDP Act (2023) Student Data Minimization Architecture

CampXChange strictly adheres to India's **Digital Personal Data Protection (DPDP) Act, 2023**:
- **Identity Masking:** Public profiles and listings **NEVER** expose student registration numbers, full phone numbers, or email addresses. Names are masked to initial format (e.g., *"Anshuman V."*).
- **Physical ID Card Confidentiality:** Student ID card scans and selfies are strictly encrypted at rest in MongoDB using AES-256 and stored in private Cloudinary buckets accessible **ONLY** by system administrators. Other students cannot view raw ID cards.
- **Direct Chat Isolation:** Student chats use system-generated IDs; phone numbers and emails are automatically redacted if detected in chat messages.

---

## 2. Campus Safety Rules & Meetup Guidelines

Every product detail page and chat window embeds the **LPU Student Safety Recommendations**:

1. 📍 **Public Campus Meetups Only:** Meet during daylight hours at designated campus spots:
   - Uni-Mall Food Court
   - Central Library Ground Floor
   - Hostel Turnstiles / Common Rooms (BH-1 to BH-7, GH-1 to GH-7)
2. 🔍 **Physical Inspection Before Payment:** Always test electronics, chargers, and calculators in person before releasing payment or scanning the QR code.
3. 🚫 **Zero Advance Payment Rule:** Never send UPI advances, Google Pay, or deposits before seeing the item physically. CampXChange is 100% peer-to-peer and charges **0% commission**.

---

## 3. Prohibited Items Policy

The following items are banned from CampXChange; attempting to list them results in automated trust score penalty and permanent account ban:
- ❌ Alcohol, tobacco, nicotine, vapes, or illegal substances.
- ❌ Weapons, sharp tools, or hazardous lab chemicals.
- ❌ University examination question papers, leaked answer keys, or proxy attendance devices.
- ❌ Counterfeit goods, pirated course materials, or unlicensed software.
- ❌ Stolen campus property or unauthorized hostel appliances.

---

## 4. Trader & Listing Reporting Pipeline

Students can report suspicious activity or fraudulent listings:

> **Base URL:**
> - Production: `https://cxc.anshuman892494.online/`
> - Local Emulator: `http://10.0.2.2:8000/` (or `http://127.0.0.1:8000/` via adb reverse)
>
> **Mandatory Headers (All Calls):**
> ```http
> X-App-Security-Key: campusXchange_secure_key_2026_@nshuman892494
> Authorization: Bearer <access_token>
> Content-Type: application/json
> Accept: application/json
> ```

### 4.1 Report a Listing
- **URL:** `POST /api/marketplace/listings/{id}/report/`
- **Request Body:**
```json
{
  "reason": "PROHIBITED_ITEM",
  "details": "User is attempting to sell unauthorized hostel cooking equipment."
}
```
*(Reasons: `SPAM`, `PROHIBITED_ITEM`, `MISLEADING_PRICE`, `INAPPROPRIATE_CONTENT`, `OTHER`)*

### 4.2 Report a Trader (Seller Profile)
- **URL:** `POST /api/marketplace/report/`
- **Request Body:**
```json
{
  "reported_user_id": 42,
  "reason": "Demanding Advance / External Payment",
  "details": "Seller asked for Rs 200 UPI advance before meeting."
}
```
- **Response `200 OK`:**
```json
{
  "message": "Report submitted successfully. Campus moderators have been notified."
}
```

---

## 5. Jetpack Compose Legal Screens & Safety Cards

```kotlin
package com.campxchange.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.campxchange.app.ui.theme.*

@Composable
fun CampusSafetyCard(modifier: Modifier = Modifier) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = InfoBg),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFBFDBFE)),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Shield,
                    contentDescription = null,
                    tint = InfoBlue,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "LPU Campus Safety Tips",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color(0xFF1E3A8A)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            val tips = listOf(
                "Meet in public campus areas (Uni-Mall, Library, BH/GH common rooms).",
                "Inspect & verify condition before scanning handover QR.",
                "Never pay advances or deposits before seeing the item."
            )

            tips.forEach { tip ->
                Row(modifier = Modifier.padding(vertical = 2.dp)) {
                    Text("• ", color = InfoBlue, fontWeight = FontWeight.Bold)
                    Text(tip, fontSize = 12.sp, color = TextSecondaryLight)
                }
            }
        }
    }
}
```
