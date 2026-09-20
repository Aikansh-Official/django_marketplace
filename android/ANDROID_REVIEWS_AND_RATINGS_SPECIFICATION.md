# ⭐ CampusXChange — Android Verified Peer Reviews & Ratings Specification

> **Target Platform:** Android (Native Jetpack Compose)  
> **Source Component:** `client/src/components/reviews/ReviewModal.jsx` & `client_features_list.md` Section 9.1  
> **Backend Service:** Django REST Framework (`/api/marketplace/reviews/`, `/api/marketplace/seller/<id>/reviews/`)  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [Overview & Trust Architecture](#1-overview--trust-architecture)
2. [Business Rules & Eligibility Gates](#2-business-rules--eligibility-gates)
3. [REST API Contract & DTOs](#3-rest-api-contract--dtos)
4. [Jetpack Compose UI Screen (`ReviewModalSheet.kt`)](#4-jetpack-compose-ui-screen)
5. [Trust Score Recalculation Formula](#5-trust-score-recalculation-formula)

---

## 1. Overview & Trust Architecture

CampusXChange prevents fake and bot-manipulated reviews by enforcing **strict deal-gated peer ratings**:
- **Verified Deals Only:** A student can **only** submit a review after a transaction is successfully completed via QR code or OTP PIN handover (`deal.status == 'COMPLETED'`).
- **Mutual Reviewing:** Both the Buyer and Seller can review each other once per deal.
- **Dynamic Trust Score Recalculation:** High ratings boost the student's campus trust score; poor ratings trigger automated trust penalties.
- **DPDP Act (2023) Compliance:** Reviewer identities are anonymized (e.g., *"Aman S."*) in public feeds to prevent retaliation.

---

## 2. Business Rules & Eligibility Gates

1. **Gate 1 — Status Check:** `deal.status` must equal `COMPLETED`. Pending or cancelled deals cannot be reviewed.
2. **Gate 2 — Participant Validation:** `request.user` must be either the `buyer` or `seller` of the deal.
3. **Gate 3 — Single Review Constraint:** Unique composite key `('deal', 'reviewer')`. Duplicate submissions return `400 Bad Request`.
4. **Rating Bounds:** Must be an integer between 1 and 5.
5. **Quick Tags Support:** Optional preset tags:
   - `Punctual`
   - `Item as Described`
   - `Polite`
   - `Quick Response`
   - `Fair Pricing`

---

## 3. REST API Contract & DTOs

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

### 3.1 Submit Peer Review
- **URL:** `POST /api/marketplace/reviews/`
- **Request Body:**
```json
{
  "deal_id": 55,
  "rating": 5,
  "comment": "Super smooth transaction! Book was in pristine condition, met right on time near BH-4.",
  "quick_tags": ["Punctual", "Item as Described", "Polite"]
}
```
- **Response `201 Created`:**
```json
{
  "id": 12,
  "deal": 55,
  "listing_title": "Engineering Mechanics Textbook",
  "rating": 5,
  "comment": "Super smooth transaction! Book was in pristine condition, met right on time near BH-4.",
  "quick_tags": ["Punctual", "Item as Described", "Polite"],
  "reviewer_display_name": "Aryan S.",
  "created_at": "2026-09-06T12:00:00Z"
}
```

### 3.2 Fetch Seller Reviews
- **URL:** `GET /api/marketplace/seller/{seller_id}/reviews/`
- **Response `200 OK`:**
```json
[
  {
    "id": 12,
    "rating": 5,
    "comment": "Super smooth transaction! Met right on time.",
    "quick_tags": ["Punctual", "Polite"],
    "reviewer_display_name": "Aryan S.",
    "created_at": "2026-09-06T12:00:00Z"
  }
]
```

---

## 4. Jetpack Compose UI Screen (`ReviewModalSheet.kt`)

```kotlin
package com.campusxchange.app.ui.reviews

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.campusxchange.app.ui.theme.*

val PRESET_QUICK_TAGS = listOf(
    "Punctual",
    "Item as Described",
    "Polite",
    "Quick Response",
    "Fair Pricing"
)

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun ReviewModalSheet(
    dealId: Long,
    itemTitle: String,
    traderName: String,
    onDismiss: () -> Unit,
    onSubmitReview: (rating: Int, comment: String, tags: List<String>) -> Unit
) {
    var rating by remember { mutableStateOf(5) }
    var comment by remember { mutableStateOf("") }
    val selectedTags = remember { mutableStateListOf<String>() }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SurfaceLight,
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Rate Your Campus Trade",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black
            )
            Text(
                text = "How was your experience trading with $traderName for \"$itemTitle\"?",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondaryLight,
                modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
            )

            // Star Rating Selector
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 16.dp)
            ) {
                for (star in 1..5) {
                    IconButton(onClick = { rating = star }) {
                        Icon(
                            imageVector = if (star <= rating) Icons.Filled.Star else Icons.Outlined.Star,
                            contentDescription = "Star $star",
                            tint = if (star <= rating) Color(0xFFF59E0B) else Color(0xFFCBD5E1),
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }
            }

            // Quick Feedback Chips
            Text(
                text = "Quick Highlights (Tap to select)",
                style = MaterialTheme.typography.labelSmall,
                color = TextMutedLight,
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
            )

            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
            ) {
                PRESET_QUICK_TAGS.forEach { tag ->
                    val isSelected = selectedTags.contains(tag)
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = if (isSelected) BrandLight else SurfaceVariantLight,
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isSelected) BrandPrimary else Color.Transparent
                        ),
                        modifier = Modifier.clickable {
                            if (isSelected) selectedTags.remove(tag) else selectedTags.add(tag)
                        }
                    ) {
                        Text(
                            text = tag,
                            color = if (isSelected) BrandHover else TextSecondaryLight,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }
            }

            // Comment Box
            OutlinedTextField(
                value = comment,
                onValueChange = { comment = it },
                label = { Text("Write a brief comment (optional)") },
                modifier = Modifier.fillMaxWidth().padding(bottom = 20.dp),
                minLines = 3,
                maxLines = 5,
                shape = RoundedCornerShape(8.dp)
            )

            // Submit Button
            Button(
                onClick = { onSubmitReview(rating, comment.trim(), selectedTags.toList()) },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                shape = RoundedCornerShape(ButtonCornerRadius)
            ) {
                Text("Submit Verified Review", fontWeight = FontWeight.Bold)
            }
        }
    }
}
```

---

## 5. Trust Score Recalculation Formula

When a review is submitted:
```python
# Django Backend: CustomUser.calculate_trust_score()
avg_rating = reviews.aggregate(Avg('rating'))['rating__avg'] or 0.0

if avg_rating >= 4.5:
    trust_bonus = +15
elif avg_rating >= 3.5:
    trust_bonus = +8
elif avg_rating < 2.5 and reviews.count() >= 2:
    trust_penalty = -15
```
Instant trust rating update is reflected across Android Profile & Seller cards immediately.
