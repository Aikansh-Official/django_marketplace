# 🔍 CampusXChange — Android Product Detail & Actions Specification

> **Target Platform:** Android (Native)  
> **Tech Stack:** Kotlin, Jetpack Compose, Material 3, MVVM, Retrofit, Coil, Hilt  
> **Backend Service:** Django REST Framework (`/api/marketplace/listings/{id}/`, `/api/marketplace/reports/`)  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [Architecture & Screen Structure](#1-architecture--screen-structure)
2. [Complete Business & Interaction Logic](#2-complete-business--interaction-logic)
3. [Color Palette & Material 3 Styling](#3-color-palette--material-3-styling)
4. [Android Navigation & Deep Linking](#4-navigation--deep-linking)
5. [Complete REST API Contract](#5-complete-rest-api-contract)
6. [Android Implementation Blueprint (Kotlin Code)](#6-android-implementation-blueprint-kotlin-code)
   - [6.1 DTOs & Retrofit Product Detail Service](#61-dtos--retrofit-product-detail-service)
   - [6.2 Product Detail ViewModel](#62-product-detail-viewmodel)
   - [6.3 Image Carousel & Zoom Component](#63-image-carousel--zoom-component)
   - [6.4 Make Offer BottomSheet & Report Dialog](#64-make-offer-bottomsheet--report-dialog)
   - [6.5 ProductDetailScreen Composable](#65-productdetailscreen-composable)
7. [Android System Intents (Call, WhatsApp, Share)](#7-android-system-intents-call-whatsapp-share)

---

## 1. Architecture & Screen Structure

The Product Detail Screen displays comprehensive item information with contextual action bars:
- **For Buyers:** "Make Offer", "Chat", "Call", "WhatsApp", and "Report Listing".
- **For Sellers:** "Edit Listing", "Mark as Sold", "Manage Offers", and "Delete".

```
┌─────────────────────────────────────────────────────────────┐
│                 ProductDetailScreen                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Image Pager (HorizontalPager) + Page Indicator Dots   │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ Price, Title, Condition Tag & Campus Meetup Location  │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ Seller Card (Avatar, Verified Badge, Trust Score)     │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ Full Item Description & Specifications                │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ Bottom Fixed Action Bar: "Make Offer" / "Chat"        │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────▲──────────────────────────────┘
                               │ StateFlow<ProductDetailUiState>
┌──────────────────────────────▼──────────────────────────────┐
│                  ProductDetailViewModel                     │
└──────────────────────────────▲──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  MarketplaceRepository                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Business & Interaction Logic

### 2.1 Image Carousel & Zoom
- Supports multiple images with pinch-to-zoom using Compose `Modifier.transformable`.
- Displays index indicator (e.g. `1 / 4`) and primary thumbnail fallback.

### 2.2 Dynamic Contact Preferences
Sellers configure how students should reach them:
- **`ALL`:** Shows Call, WhatsApp, and In-App Chat buttons.
- **`WHATSAPP`:** Prioritizes WhatsApp direct messaging intent.
- **`CALL`:** Prioritizes Phone dialer intent.
- **`CHAT`:** In-app messaging only (hides seller phone number for privacy).
- **`MEETUP`:** Campus meetup only; phone hidden until an offer is accepted.

### 2.3 Make Offer / Buy Request
- Buyer enters an **Offer Amount** (defaulting to listing price) and an optional **Message** (e.g., *"Can meet at Uni-Mall tomorrow at 4 PM"*).
- Dispatches `POST /api/marketplace/listings/{id}/offer/`.
- Once submitted, state updates to "Offer Pending" with option to view or withdraw.

### 2.4 Reporting Violations
- Protects campus community against prohibited items, duplicate spam, harassment, or fake pricing.
- Submits report via `POST /api/marketplace/reports/` with selected reason and optional details.

---

## 3. Color Palette & Material 3 Styling

```kotlin
package com.CampusXChange.app.ui.theme

import androidx.compose.ui.graphics.Color

val ProductPriceText = Color(0xFF111111)
val NegotiableBadgeText = Color(0xFFFB5607)
val NegotiableBadgeBg = Color(0xFFFFF4ED)
val WhatsAppGreen = Color(0xFF25D366)
val CallBlue = Color(0xFF2563EB)
val ChatOrange = Color(0xFFFB5607)
val MeetupLocationBg = Color(0xFFF3F4F6)
```

---

## 4. Navigation & Deep Linking

```kotlin
// In NavGraph
composable(
    route = "marketplace/detail/{listingId}",
    arguments = listOf(navArgument("listingId") { type = NavType.IntType }),
    deepLinks = listOf(navDeepLink { uriPattern = "https://CampusXChange.com/product/{listingId}" })
) { backStackEntry ->
    val listingId = backStackEntry.arguments?.getInt("listingId") ?: 0
    ProductDetailScreen(
        listingId = listingId,
        onNavigateBack = { navController.popBackStack() },
        onOpenChat = { sellerId, prodId -> navController.navigate("chat/$sellerId?listingId=$prodId") }
    )
}
```

---

## 5. Complete REST API Contract

> **Base URL:**
> - Production: `https://cxc.anshuman892494.online/`
> - Local Emulator: `http://10.0.2.2:8000/` (or `http://127.0.0.1:8000/` via adb reverse)
>
> **Mandatory Headers (All Calls):**
> ```http
> X-App-Security-Key: campusXchange_secure_key_2026_@nshuman892494
> Accept: application/json
> ```

### 5.1 Fetch Product Details
- **URL:** `GET /api/marketplace/listings/{id}/`
- **Auth:** Optional (Returns authenticated user specific offer status if `Authorization: Bearer <token>` supplied)

#### Response `200 OK`:
```json
{
  "id": 101,
  "title": "TI-84 Plus Graphing Calculator",
  "description": "Mint condition, used for one semester in Engineering Calculus. Comes with USB cable.",
  "price": "1800.00",
  "is_negotiable": true,
  "transaction_type": "SELL",
  "rent_period": null,
  "condition": "LIKE_NEW",
  "location": "BH-4 Hostel, Ground Floor Common Room",
  "contact_preference": "ALL",
  "contact_phone": "9876543210",
  "contact_whatsapp": "9876543210",
  "status": "ACTIVE",
  "views_count": 142,
  "created_at": "2026-09-04T11:00:00Z",
  "seller": {
    "id": 42,
    "username": "12200000",
    "full_name": "Aman Sharma",
    "trust_score": 85,
    "is_verified_student": true,
    "profile_picture_url": "https://res.cloudinary.com/.../avatar.jpg"
  },
  "images": [
    {
      "id": 301,
      "image_url": "https://res.cloudinary.com/.../calc1.jpg",
      "is_primary": true
    },
    {
      "id": 302,
      "image_url": "https://res.cloudinary.com/.../calc2.jpg",
      "is_primary": false
    }
  ]
}
```

---

### 5.2 Submit Buy Request / Offer
- **URL:** `POST /api/marketplace/listings/{id}/offer/`
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`

#### Request Body:
```json
{
  "offer_amount": "1600.00",
  "buyer_message": "Hi Aman, can take it today at Uni-Mall for ₹1600."
}
```

#### Response `201 Created`:
```json
{
  "id": 55,
  "listing": 101,
  "offer_amount": "1600.00",
  "buyer_message": "Hi Aman, can take it today at Uni-Mall for ₹1600.",
  "status": "PENDING",
  "created_at": "2026-09-06T09:30:00Z"
}
```

---

### 5.3 Report Listing
- **URL:** `POST /api/marketplace/reports/`
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`

#### Request Body:
```json
{
  "listing_id": 101,
  "reason": "Misleading description / Prohibited item",
  "details": "Item description claims brand new, but product shown has visible damages."
}
```

#### Response `201 Created`:
```json
{
  "id": 12,
  "message": "Report submitted successfully. Our campus moderation team will review this listing."
}
```

---

## 6. Android Implementation Blueprint (Kotlin Code)

### 6.1 DTOs & Retrofit Product Detail Service

```kotlin
package com.CampusXChange.app.data.remote

import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.*

data class CreateOfferRequest(
    @SerializedName("offer_amount") val offerAmount: Double,
    @SerializedName("buyer_message") val buyerMessage: String
)

data class OfferDto(
    val id: String,
    @SerializedName("listing") val listingId: String,
    @SerializedName("offer_amount") val offerAmount: Double,
    @SerializedName("buyer_message") val buyerMessage: String,
    val status: String,
    @SerializedName("created_at") val createdAt: String
)

data class CreateReportRequest(
    @SerializedName("listing_id") val listingId: String,
    val reason: String,
    val details: String
)

interface ProductDetailApiService {
    @GET("api/marketplace/listings/{id}/")
    suspend fun getListingDetail(@Path("id") id: String): Response<ListingDto>

    @POST("api/marketplace/listings/{id}/offer/")
    suspend fun makeOffer(
        @Path("id") id: String,
        @Body request: CreateOfferRequest
    ): Response<OfferDto>

    @POST("api/marketplace/reports/")
    suspend fun reportListing(@Body request: CreateReportRequest): Response<GenericMessageResponse>
}
```

---

### 6.2 Product Detail ViewModel

```kotlin
package com.CampusXChange.app.ui.product

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.CampusXChange.app.data.local.TokenManager
import com.CampusXChange.app.data.remote.CreateOfferRequest
import com.CampusXChange.app.data.remote.CreateReportRequest
import com.CampusXChange.app.data.remote.ListingDto
import com.CampusXChange.app.data.remote.ProductDetailApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProductDetailUiState(
    val listing: ListingDto? = null,
    val isLoading: Boolean = false,
    val isOwner: Boolean = false,
    val offerSubmitting: Boolean = false,
    val offerSuccess: Boolean = false,
    val reportSubmitting: Boolean = false,
    val reportSuccess: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class ProductDetailViewModel @Inject constructor(
    private val api: ProductDetailApiService,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProductDetailUiState())
    val uiState: StateFlow<ProductDetailUiState> = _uiState.asStateFlow()

    fun loadProduct(listingId: Int) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            try {
                val res = api.getListingDetail(listingId)
                if (res.isSuccessful && res.body() != null) {
                    val listing = res.body()!!
                    val currentUser = tokenManager.getAccessToken() // Check if current user is seller
                    _uiState.value = _uiState.value.copy(
                        listing = listing,
                        isLoading = false
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = "Product not found or has been removed."
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = "Network error loading details."
                )
            }
        }
    }

    fun submitOffer(listingId: Int, amount: Double, message: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(offerSubmitting = true, errorMessage = null)
            try {
                val res = api.makeOffer(listingId, CreateOfferRequest(amount, message))
                if (res.isSuccessful) {
                    _uiState.value = _uiState.value.copy(offerSubmitting = false, offerSuccess = true)
                } else {
                    _uiState.value = _uiState.value.copy(offerSubmitting = false, errorMessage = "Failed to send offer.")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(offerSubmitting = false, errorMessage = "Network error.")
            }
        }
    }

    fun submitReport(listingId: Int, reason: String, details: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(reportSubmitting = true)
            try {
                val res = api.reportListing(CreateReportRequest(listingId, reason, details))
                if (res.isSuccessful) {
                    _uiState.value = _uiState.value.copy(reportSubmitting = false, reportSuccess = true)
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(reportSubmitting = false)
            }
        }
    }
}
```

---

### 6.3 Image Carousel & Zoom Component

```kotlin
package com.CampusXChange.app.ui.product.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.CampusXChange.app.data.remote.ListingImageDto

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ProductImageGallery(
    images: List<ListingImageDto>,
    modifier: Modifier = Modifier
) {
    val pagerState = rememberPagerState(pageCount = { images.ifEmpty { listOf(1) }.size })

    Box(modifier = modifier.fillMaxWidth().height(300.dp)) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize()
        ) { page ->
            if (images.isNotEmpty()) {
                AsyncImage(
                    model = images[page].imageUrl,
                    contentDescription = "Listing photo $page",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = Modifier.fillMaxSize().background(Color(0xFFE5E7EB)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No image available", color = Color(0xFF6B7280))
                }
            }
        }

        // Indicator Counter (e.g. 1 / 4)
        if (images.size > 1) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(12.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.Black.copy(alpha = 0.6f))
                    .padding(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Text(
                    text = "${pagerState.currentPage + 1} / ${images.size}",
                    color = Color.White,
                    fontSize = 12.sp
                )
            }
        }
    }
}
```

---

### 6.4 Make Offer BottomSheet & Report Dialog

```kotlin
package com.CampusXChange.app.ui.product.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.CampusXChange.app.ui.theme.MarketplacePrimaryOrange

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MakeOfferBottomSheet(
    currentPrice: Double,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onSubmitOffer: (amount: Double, message: String) -> Unit
) {
    var offerAmount by remember { mutableStateOf(currentPrice.toInt().toString()) }
    var message by remember { mutableStateOf("") }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
        containerColor = Color.White
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp)
        ) {
            Text("Make a Purchase Offer", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text(
                "Sellers will review your request and can accept or counter.",
                fontSize = 13.sp,
                color = Color(0xFF6B7280),
                modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
            )

            // Price Input
            OutlinedTextField(
                value = offerAmount,
                onValueChange = { if (it.all { char -> char.isDigit() }) offerAmount = it },
                label = { Text("Your Offer Amount (₹)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Message Input
            OutlinedTextField(
                value = message,
                onValueChange = { message = it },
                label = { Text("Meeting Note / Message") },
                placeholder = { Text("e.g. Can meet near BH-4 tomorrow at 4 PM") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                maxLines = 3
            )

            Spacer(modifier = Modifier.height(20.dp))

            Button(
                onClick = {
                    val amount = offerAmount.toDoubleOrNull() ?: currentPrice
                    onSubmitOffer(amount, message)
                },
                enabled = !isSubmitting && offerAmount.isNotEmpty(),
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MarketplacePrimaryOrange)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                } else {
                    Text("Send Offer", fontWeight = FontWeight.Bold)
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
```

---

## 7. Android System Intents (Call, WhatsApp, Share)

```kotlin
package com.CampusXChange.app.utils

import android.content.Context
import android.content.Intent
import android.net.Uri

object IntentUtils {
    fun dialPhoneNumber(context: Context, phoneNumber: String) {
        val intent = Intent(Intent.ACTION_DIAL).apply {
            data = Uri.parse("tel:$phoneNumber")
        }
        context.startActivity(intent)
    }

    fun openWhatsAppChat(context: Context, phoneNumber: String, productTitle: String) {
        val formattedNumber = if (!phoneNumber.startsWith("+91")) "+91$phoneNumber" else phoneNumber
        val url = "https://api.whatsapp.com/send?phone=$formattedNumber&text=Hi,%20I%20am%20interested%20in%20your%20CampusXChange%20listing:%20$productTitle"
        val intent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse(url)
        }
        context.startActivity(intent)
    }

    fun shareListing(context: Context, title: String, price: String, listingId: Int) {
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "Check out this item on CampusXChange!")
            putExtra(Intent.EXTRA_TEXT, "Hey, check out '$title' for $price on CampusXChange!\nhttps://CampusXChange.com/product/$listingId")
        }
        context.startActivity(Intent.createChooser(shareIntent, "Share Listing via"))
    }
}
```
