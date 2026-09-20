# 🤝 CampusXChange — Android Price Negotiation & Counter-Offer Engine Specification

> **Target Platform:** Android (Native Jetpack Compose)  
> **Source Component:** `client/src/pages/ProductDetail.jsx` & `client_features_list.md` Section 9.3  
> **Backend Service:** Django REST Framework (`/api/marketplace/offers/`)  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [Negotiation Architecture & State Machine](#1-negotiation-architecture--state-machine)
2. [REST API Contract & Endpoints](#2-rest-api-contract--endpoints)
3. [Seller Counter-Offer Response Flow](#3-seller-counter-offer-response-flow)
4. [Buyer Decision Cycle & Automatic Deal Lock](#4-buyer-decision-cycle--automatic-deal-lock)
5. [Jetpack Compose UI Components (`CounterOfferDialog.kt`)](#5-jetpack-compose-ui-components)

---

## 1. Negotiation Architecture & State Machine

CampusXChange enables students to haggle and agree on fair prices directly inside the app before meeting on campus:

```
[Buyer Places Offer: ₹400] ──(Listing Price ₹500)──> Offer Status: PENDING
                                                           │
                                   ┌───────────────────────┴───────────────────────┐
                                   ▼                                               ▼
                         Seller Accepts (₹400)                          Seller Counters (₹450)
                                   │                                               │
                         Listing -> PENDING (Reserved)                   Status -> COUNTERED
                                   │                                               │
                         Generate QR Handover                                      ▼
                                                                           Buyer Decision:
                                                                  ┌────────────────┴────────────────┐
                                                                  ▼                                 ▼
                                                        Accepts ₹450                      Declines
                                                                  │                                 │
                                                        Listing -> PENDING (Reserved)     Status -> REJECTED
                                                        Price locks at ₹450
```

---

## 2. REST API Contract & Endpoints

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

### 2.1 Buyer Places Custom Price Offer
- **URL:** `POST /api/marketplace/listings/{id}/offer/`
- **Request Body:**
```json
{
  "offer_amount": 400.00,
  "message": "Hey! Can I pick it up today for Rs 400 at BH-4?"
}
```
- **Response `201 Created`:**
```json
{
  "id": 88,
  "listing": 101,
  "offer_amount": "400.00",
  "status": "PENDING",
  "message": "Hey! Can I pick it up today for Rs 400 at BH-4?",
  "created_at": "2026-09-06T14:30:00Z"
}
```

---

## 3. Seller Counter-Offer Response Flow

The seller can Accept, Reject, or Propose a **Counter-Offer**:

- **URL:** `POST /api/marketplace/offers/{id}/respond/`
- **Request Body (Counter Option):**
```json
{
  "action": "COUNTER",
  "counter_amount": 450.00,
  "counter_note": "I can do Rs 450 minimum because it includes the brand new battery."
}
```
- **Response `200 OK`:**
```json
{
  "id": 88,
  "status": "COUNTERED",
  "offer_amount": "400.00",
  "counter_amount": "450.00",
  "counter_note": "I can do Rs 450 minimum because it includes the brand new battery."
}
```

---

## 4. Buyer Decision Cycle & Automatic Deal Lock

When a seller counters, the buyer receives an in-app notification (`OFFER_COUNTERED`) and can Accept or Decline:

- **URL:** `POST /api/marketplace/offers/{id}/counter-respond/`
- **Request Body (Accept):**
```json
{
  "action": "ACCEPT"
}
```
- **Request Body (Decline):**
```json
{
  "action": "REJECT"
}
```

### Automatic Lock Mechanism on Accept:
1. `offer.offer_amount` is updated to the `counter_amount` (₹450).
2. `offer.status` transitions to `ACCEPTED`.
3. `listing.status` transitions to `PENDING` (Reserved for this buyer).
4. All other competing pending offers for this listing are automatically rejected.
5. In-app notification dispatched to the seller to generate the Handover QR code.

---

## 5. Jetpack Compose UI Components (`CounterOfferDialog.kt`)

```kotlin
package com.campusxchange.app.ui.offers

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.campusxchange.app.ui.theme.*

@Composable
fun CounterOfferBanner(
    counterAmount: Double,
    counterNote: String?,
    onAcceptCounter: () -> Unit,
    onDeclineCounter: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = BrandLight),
        border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder),
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "⚡ Seller Counter-Offer: ₹${counterAmount.toInt()}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Black,
                color = BrandHover
            )
            if (!counterNote.isNullOrBlank()) {
                Text(
                    text = "\"$counterNote\"",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondaryLight,
                    modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = onAcceptCounter,
                    colors = ButtonDefaults.buttonColors(containerColor = SuccessGreen),
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(ButtonCornerRadius)
                ) {
                    Text("Accept (₹${counterAmount.toInt()})", fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = onDeclineCounter,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = ErrorRed),
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(ButtonCornerRadius)
                ) {
                    Text("Decline", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
```
