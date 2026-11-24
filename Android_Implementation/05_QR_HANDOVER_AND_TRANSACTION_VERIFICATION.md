# 🤝 Module 05: QR Handover, Purchases Dashboard & Campus Transaction Verification (Website Parity)

This document provides the complete technical specification for the **CampXChange** peer-to-peer physical meetup verification system using **ZXing vector QR generation, CameraX with Google ML Kit Barcode Scanning, 6-digit OTP PIN fallback, the 2-step verification/confirmation workflow, and the My Purchases orders dashboard**.

---

## 1. Handover Security Architecture & Lifecycle

The campus meetup verification prevents disputes and fraud by guaranteeing both buyer and seller are physically co-located before marking an item as `SOLD`:

```text
       SELLER DEVICE                               BUYER DEVICE
 ┌───────────────────────┐                   ┌───────────────────────┐
 │ Tap "Generate QR"     │                   │ Tap "Scan QR / PIN"   │
 └───────────┬───────────┘                   └───────────┬───────────┘
             │ POST /offers/<id>/generate-qr/            │
             ▼                                           ▼
 ┌───────────────────────┐                   ┌───────────────────────┐
 │ Display Dynamic QR &  │                   │ CameraX Barcode Scan  │
 │ 6-Digit PIN (30m Exp) │                   │ (or Manual 6-Digit PIN│
 └───────────┬───────────┘                   └───────────┬───────────┘
             │                                           │
             │       Buyer Scans Seller's Screen         │
             │◄──────────────────────────────────────────┘
             │
             │ Step 1: Buyer executes POST /handover/verify/
             │ with { token: UUID } or { pin_code: "123456" }
             │
             ▼
 ┌───────────────────────────────────────────────────────────────────┐
 │                  Verified Deal Summary Preview                    │
 │ 1. Item Title & Agreed Price displayed to Buyer                   │
 │ 2. Seller Name & Meetup Spot displayed                            │
 │ 3. Mandatory Safety Checklist (Both boxes required):              │
 │    - [x] Item inspected in person & condition confirmed           │
 │    - [x] Payment made directly to seller (Cash/UPI)               │
 └─────────────────┬─────────────────────────────────────────────────┘
                   │
                   │ Step 2: Buyer executes POST /handover/confirm/
                   │ with { token: UUID }
                   ▼
 ┌───────────────────────────────────────────────────────────────────┐
 │                    Backend Atomic Transaction                     │
 │ 1. HandoverSession status: ACTIVE ➡️ USED                         │
 │ 2. Offer status: ACCEPTED ➡️ COMPLETED                            │
 │ 3. Listing status: PENDING ➡️ SOLD                                │
 │ 4. Trust Score Bonus: +5 points to both Buyer and Seller          │
 └─────────────────┬───────────────────────────────┬─────────────────┘
                   │                               │
                   ▼                               ▼
 ┌───────────────────────┐                   ┌───────────────────────┐
 │ 🎉 Confetti Screen    │                   │ 🎉 Confetti Screen    │
 │ "+5 Trust Score Added"│                   │ "+5 Trust Score Added"│
 │ Marked as SOLD        │                   │ Prompt Deal Review    │
 └───────────────────────┘                   └───────────────────────┘
```

---

## 2. API Endpoints & Request/Response Contracts

### 2.1 Handover Api Service (`HandoverApiService.kt`)

```kotlin
package com.campxchange.app.data.api

import com.campxchange.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface HandoverApiService {

    @POST("api/marketplace/offers/{id}/generate-qr/")
    suspend fun generateHandoverQR(
        @Path("id") offerId: String
    ): Response<HandoverSessionDto>

    @POST("api/marketplace/handover/verify/")
    suspend fun verifyHandover(
        @Body request: VerifyHandoverRequest
    ): Response<VerifyHandoverResponse>

    @POST("api/marketplace/handover/confirm/")
    suspend fun confirmHandover(
        @Body request: ConfirmHandoverRequest
    ): Response<ConfirmHandoverResponse>

    @GET("api/marketplace/my-offers/")
    suspend fun getMyOffers(): Response<List<OfferDto>>
}
```

### 2.2 Data Transfer Objects (`HandoverDtos.kt`)

```kotlin
package com.campxchange.app.data.api

import com.google.gson.annotations.SerializedName

data class HandoverSessionDto(
    @SerializedName("id") val rawId: Any? = null,
    val token: String = "",
    @SerializedName("pin_code") val pinCode: String = "",
    @SerializedName("expires_at") val expiresAt: String? = null,
    @SerializedName("remaining_seconds") val remainingSeconds: Int? = null,
    val status: String = "ACTIVE"
) {
    val idString: String get() = rawId?.toString() ?: ""
}

data class VerifyHandoverRequest(
    val token: String? = null,
    @SerializedName("pin_code") val pinCode: String? = null
)

data class VerifyHandoverResponse(
    @SerializedName("session_id") val rawSessionId: Any? = null,
    val token: String = "",
    @SerializedName("listing_id") val rawListingId: Any? = null,
    @SerializedName(value = "listing_title", alternate = ["listingTitle"]) val listingTitle: String = "",
    @SerializedName(value = "listing_price", alternate = ["listingPrice"]) val listingPrice: String = "",
    @SerializedName(value = "listing_image", alternate = ["listingImage"]) val listingImage: String? = null,
    @SerializedName(value = "seller_id", alternate = ["sellerId"]) val rawSellerId: Any? = null,
    @SerializedName(value = "seller_name", alternate = ["sellerName"]) val sellerName: String = "",
    @SerializedName(value = "seller_reg", alternate = ["sellerReg"]) val sellerReg: String? = null,
    @SerializedName(value = "meetup_location", alternate = ["meetupLocation"]) val meetupLocation: String = "",
    val verified: Boolean = false
) {
    val sessionIdString: String get() = rawSessionId?.toString() ?: ""
    val listingIdString: String get() = rawListingId?.toString() ?: ""
}

data class ConfirmHandoverRequest(val token: String)

data class ConfirmHandoverResponse(
    val success: Boolean = true,
    val message: String = "",
    @SerializedName("trust_score_awarded") val trustScoreAwarded: Int = 5
)
```

---

## 3. UI Screen Architecture (Website Parity)

### 3.1 "My Purchases & Active Orders" Screen (`MyOrdersScreen.kt`)
- Route: `Screen.MyOrders` (`"profile/my_orders"`)
- Accessible directly from Profile (for both Buyers and Sellers).
- Shows tabs: `All`, `Handover Ready (Accepted)`, `Pending`, `Completed`.
- Any accepted offer features a **"Scan QR / Handover"** button opening `BuyerHandoverScreen`.

### 3.2 Product Detail Screen Banner (`ProductDetailScreen.kt`)
- If the current student's offer is accepted by the seller:
  - Displays a green banner at top:
    *"Your Purchase Request Was Accepted! Meet the seller on campus to inspect the item, make payment (Cash/UPI), and scan their Handover QR code or enter their 6-digit PIN."*
  - Bottom CTA button updates to: **"Deal Reserved / Handover QR"** and navigates directly to `BuyerHandoverScreen`.

### 3.3 Seller QR Screen (`SellerQRDisplayScreen.kt`)
- Route: `Screen.HandoverSellerQR` (`"handover_seller_qr/{offerId}"`)
- Calls `POST /api/marketplace/offers/{id}/generate-qr/`.
- Renders sharp vector QR code and large 6-digit fallback PIN.

### 3.4 Buyer Handover Screen (`BuyerHandoverScreen.kt`)
- Route: `Screen.HandoverBuyer` (`"handover_buyer"`)
- Supports:
  1. **Camera QR Scan:** Integrated CameraX preview scanning seller's phone screen.
  2. **6-Digit PIN Entry:** Numeric input box.
- After code verification:
  - Displays verified item title, price, seller name, and meetup location.
  - Requires 2 confirmation checkboxes:
    - `[ ] I have inspected the item in person and confirmed its condition.`
    - `[ ] I have completed payment (Cash / UPI) to the seller.`
  - Unlocks "Confirm Final Handover & Deal" button.
  - On confirm, navigates to `Screen.DealComplete` celebrating with Confetti!
