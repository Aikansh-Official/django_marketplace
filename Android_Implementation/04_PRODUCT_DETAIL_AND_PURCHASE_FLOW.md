# 🔍 Module 04: Product Detail, Image Lightbox & Offer Engine

This document specifies the native Android implementation for the **CampusXChange** product detail page, high-resolution pinch-to-zoom image lightbox, DPDP-compliant seller preview card, dynamic bargaining/offer negotiation engine, seller offer management, and report listing system.

---

## 1. Interaction & State Machine Architecture

```text
┌────────────────────────────────────────────────────────┐
│               Product Detail Screen View               │
├────────────────────────────────────────────────────────┤
│ [Gallery: HorizontalPager] ➡️ Click to Zoom Lightbox    │
│ [Title, Price Badge, Condition, Location Pin, Views]   │
│ [DPDP Seller Card: Masked Name, Trust Score, Chat CTA] │
├────────────────────────────────────────────────────────┤
│ Offer Negotiation State Machine:                       │
│                                                        │
│ [Make Offer / Buy CTA] ➡️ POST /listings/<id>/offer/   │
│        │                                               │
│        ▼                                               │
│ [Status: PENDING] ──(Seller Counters)──► [COUNTERED]   │
│        │                                      │        │
│        │ (Seller Accepts)             (Buyer Accepts)  │
│        ▼                                      ▼        │
│ ┌────────────────────────────────────────────────────┐ │
│ │   [Status: ACCEPTED / DEAL LOCKED]                 │ │
│ │   Seller: "Generate Handover QR" Button            │ │
│ │   Buyer:  "Scan Handover QR" Button                │ │
│ └───────────────────────┬────────────────────────────┘ │
│                         │                              │
│                         ▼ (QR Verified)                │
│             [Status: COMPLETED]                        │
│             🎉 Confetti + Prompt Review                │
└────────────────────────────────────────────────────────┘
```

---

## 2. API Endpoints & Request/Response Contracts

### 2.1 Product & Offer Service (`ProductDetailApi.kt`)

```kotlin
package com.campusxchange.app.data.remote.api

import com.campusxchange.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface ProductDetailApi {

    @GET("marketplace/listings/{id}/")
    suspend fun getListingDetail(
        @Path("id") listingId: Int
    ): Response<ListingDetailDto>

    @POST("marketplace/listings/{id}/offer/")
    suspend fun submitOffer(
        @Path("id") listingId: Int,
        @Body request: SubmitOfferRequestDto
    ): Response<OfferDto>

    @GET("marketplace/listings/{id}/offers/")
    suspend fun getOffersForListing(
        @Path("id") listingId: Int
    ): Response<List<OfferDto>>

    @PATCH("marketplace/offers/{id}/respond/")
    suspend fun respondToOffer(
        @Path("id") offerId: Int,
        @Body request: RespondOfferRequestDto // "ACCEPT", "REJECT", "COUNTER"
    ): Response<OfferDto>

    @POST("marketplace/offers/{id}/counter-respond/")
    suspend fun respondToCounterOffer(
        @Path("id") offerId: Int,
        @Body request: CounterDecisionDto // "ACCEPT", "DECLINE"
    ): Response<OfferDto>

    @POST("marketplace/listings/{id}/report/")
    suspend fun reportListing(
        @Path("id") listingId: Int,
        @Body request: ReportListingRequestDto
    ): Response<GenericMessageDto>
}
```

### 2.2 Data Transfer Objects (`ProductDetailDtos.kt`)

```kotlin
package com.campusxchange.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ListingDetailDto(
    @SerializedName("id") val id: Int,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String,
    @SerializedName("price") val price: Double,
    @SerializedName("original_price") val originalPrice: Double?,
    @SerializedName("is_negotiable") val isNegotiable: Boolean,
    @SerializedName("transaction_type") val transactionType: String,
    @SerializedName("condition") val condition: String,
    @SerializedName("location") val location: String,
    @SerializedName("views_count") val viewsCount: Int,
    @SerializedName("status") val status: String,
    @SerializedName("images") val images: List<ListingImageDto>,
    @SerializedName("seller") val seller: SellerPreviewDto,
    @SerializedName("user_offer") val userOffer: OfferDto?,
    @SerializedName("related_listings") val relatedListings: List<ListingSummaryDto>,
    @SerializedName("is_owner") val isOwner: Boolean
)

data class ListingImageDto(
    @SerializedName("id") val id: Int,
    @SerializedName("image_url") val imageUrl: String,
    @SerializedName("is_primary") val isPrimary: Boolean
)

data class SellerPreviewDto(
    @SerializedName("id") val id: Int,
    @SerializedName("display_name") val displayName: String, // DPDP masked e.g. "Rohan S."
    @SerializedName("trust_score") val trustScore: Int,
    @SerializedName("is_verified_student") val isVerifiedStudent: Boolean,
    @SerializedName("completed_deals_count") val completedDealsCount: Int,
    @SerializedName("profile_photo") val profilePhotoUrl: String?,
    @SerializedName("member_since") val memberSince: String
)

data class OfferDto(
    @SerializedName("id") val id: Int,
    @SerializedName("listing_id") val listingId: Int,
    @SerializedName("buyer_id") val buyerId: Int,
    @SerializedName("buyer_name") val buyerName: String,
    @SerializedName("offer_amount") val offerAmount: Double,
    @SerializedName("counter_amount") val counterAmount: Double?,
    @SerializedName("buyer_message") val buyerMessage: String?,
    @SerializedName("seller_note") val sellerNote: String?,
    @SerializedName("status") val status: String, // "PENDING", "ACCEPTED", "REJECTED", "COUNTERED", "COMPLETED", "CANCELLED"
    @SerializedName("created_at") val createdAt: String
)

data class SubmitOfferRequestDto(
    @SerializedName("offer_amount") val offerAmount: Double,
    @SerializedName("buyer_message") val buyerMessage: String?
)

data class RespondOfferRequestDto(
    @SerializedName("action") val action: String, // "ACCEPT", "REJECT", "COUNTER"
    @SerializedName("counter_amount") val counterAmount: Double? = null,
    @SerializedName("seller_note") val sellerNote: String? = null
)

data class CounterDecisionDto(
    @SerializedName("decision") val decision: String // "ACCEPT", "DECLINE"
)
```

---

## 3. Fullscreen Pinch-to-Zoom Lightbox (`ProductImageLightbox.kt`)

Implements smooth multi-touch gestures for image inspection:

```kotlin
@Composable
fun FullscreenPinchZoomLightbox(
    imageUrls: List<String>,
    initialPage: Int,
    onDismiss: () -> Unit
) {
    val pagerState = rememberPagerState(initialPage = initialPage, pageCount = { imageUrls.size })
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
        ) {
            // Close Action
            IconButton(
                onClick = onDismiss,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(16.dp)
                    .size(40.dp)
                    .background(Color(0x66000000), CircleShape)
            ) {
                Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
            }

            // Image Pager with Pinch to Zoom
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize()
            ) { page ->
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .pointerInput(Unit) {
                            detectTransformGestures { _, pan, zoom, _ ->
                                scale = (scale * zoom).coerceIn(1f, 4f)
                                offset = if (scale > 1f) offset + pan else Offset.Zero
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    AsyncImage(
                        model = imageUrls[page],
                        contentDescription = null,
                        contentScale = ContentScale.Fit,
                        modifier = Modifier
                            .fillMaxSize()
                            .graphicsLayer(
                                scaleX = scale,
                                scaleY = scale,
                                translationX = offset.x,
                                translationY = offset.y
                            )
                    )
                }
            }

            // Bottom Indicator
            Text(
                text = "${pagerState.currentPage + 1} / ${imageUrls.size}",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 24.dp)
            )
        }
    }
}
```

---

## 4. DPDP-Compliant Seller Card (`SellerProfileCard.kt`)

Adheres strictly to the Digital Personal Data Protection (DPDP) Act: displays masked names (`Rohan S.`), Trust Score radial indicator, and verified student credentials without exposing phone numbers or raw email addresses.

```kotlin
@Composable
fun SellerReputationCard(
    seller: SellerPreviewDto,
    onViewProfile: (Int) -> Unit,
    onInitiateChat: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar with Trust Score Ring
            Box(contentAlignment = Alignment.Center) {
                CircularProgressIndicator(
                    progress = { seller.trustScore / 100f },
                    modifier = Modifier.size(54.dp),
                    color = Brand500,
                    trackColor = Color(0xFFE2E8F0),
                    strokeWidth = 3.dp
                )
                AsyncImage(
                    model = seller.profilePhotoUrl,
                    contentDescription = null,
                    modifier = Modifier.size(44.dp).clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
            }

            Spacer(modifier = Modifier.width(14.dp))

            // Details
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = seller.displayName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    if (seller.isVerifiedStudent) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(Icons.Default.Verified, contentDescription = "Verified", tint = InfoBlue, modifier = Modifier.size(16.dp))
                    }
                }
                Text(
                    text = "Trust Score: ${seller.trustScore}/100 • ${seller.completedDealsCount} Deals",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }

            // Direct In-App Chat Action
            IconButton(
                onClick = { onInitiateChat(seller.id) },
                modifier = Modifier.background(Brand50, CircleShape)
            ) {
                Icon(Icons.Default.Chat, contentDescription = "Chat", tint = Brand500)
            }
        }
    }
}
```

---

## 5. Dynamic Bargaining & Offer Negotiation BottomSheet

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BuyOfferBottomSheet(
    listing: ListingDetailDto,
    onOfferSubmitted: (Double, String) -> Unit,
    onDismiss: () -> Unit
) {
    var offerAmountText by remember { mutableStateOf(listing.price.toInt().toString()) }
    var buyerNote by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
        ) {
            Text("Make an Offer to Seller", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(
                "Listed Price: ₹${listing.price.toInt()} ${if (listing.isNegotiable) "(Open to Bargaining)" else "(Firm Price)"}",
                color = TextSecondary,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(vertical = 8.dp)
            )

            // Price Proposal Input
            OutlinedTextField(
                value = offerAmountText,
                onValueChange = { offerAmountText = it },
                label = { Text("Your Proposed Offer (₹)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Optional Note
            OutlinedTextField(
                value = buyerNote,
                onValueChange = { buyerNote = it },
                label = { Text("Message to Seller (e.g. Can meet at BH-4 today at 5pm)") },
                minLines = 2,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    val amount = offerAmountText.toDoubleOrNull() ?: listing.price
                    onOfferSubmitted(amount, buyerNote)
                },
                colors = ButtonDefaults.buttonColors(containerColor = Brand500),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth().height(50.dp)
            ) {
                Text("Send Purchase Offer", fontWeight = FontWeight.Bold)
            }
        }
    }
}
```

---

## 6. Real-Time Deal Status Banner & QR Handover Triggers

When an offer transitions to `ACCEPTED`:
- **For Seller**: "Deal Accepted! Generate Handover QR" launches `HandoverQRScreen`.
- **For Buyer**: "Deal Accepted! Meet at Campus Spot & Scan QR" launches `HandoverScannerScreen`.
