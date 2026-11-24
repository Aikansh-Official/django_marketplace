# ⭐ Module 09: Verified Ratings & Peer Reviews Engine

This document provides the complete native Android specification for the **CampXChange** deal-gated peer review system, interactive 1-5 star selector, preset feedback chips, trust score recalculation impact, and public seller review feed.

---

## 1. Trust Architecture & Anti-Spam Gate

```text
┌────────────────────────────────────────────────────────┐
│               Completed Handover Session               │
│               (Status: COMPLETED / SOLD)               │
└──────────────────────────┬─────────────────────────────┘
                           │ Launches
                           ▼
┌────────────────────────────────────────────────────────┐
│            SubmitReviewBottomSheet Composable          │
├────────────────────────────────────────────────────────┤
│ 1. Star Rating (1 to 5 Stars with Touch Animation):    │
│    ★ ★ ★ ★ ★  ("Excellent")                            │
├────────────────────────────────────────────────────────┤
│ 2. Preset Quick-Tag Chips:                             │
│    [✓ Punctual] [✓ Item as Described] [✓ Polite]       │
│    [Quick Response] [Fair Pricing] [Smooth Handover]   │
├────────────────────────────────────────────────────────┤
│ 3. Comment Note (Optional):                            │
│    "Great seller, gave original bill and box too!"     │
├────────────────────────────────────────────────────────┤
│ 4. Trust Score Impact Indicator:                       │
│    "Your review will boost this student's Trust Score" │
└──────────────────────────┬─────────────────────────────┘
                           │ POST /marketplace/reviews/
                           ▼
┌────────────────────────────────────────────────────────┐
│                Atomic Database Update                  │
│ 1. Save Review with unique (deal_id, reviewer_id)      │
│ 2. Recalculate Seller's Trust Score                    │
│ 3. Award +2 Reviewer Participation Points              │
└────────────────────────────────────────────────────────┘
```

---

## 2. API Endpoints & Request/Response Contracts

### 2.1 Reviews Api Service (`ReviewsApiService.kt`)

```kotlin
package com.campxchange.app.data.remote.api

import com.campxchange.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface ReviewsApiService {

    @POST("marketplace/reviews/")
    suspend fun submitReview(
        @Body request: SubmitReviewRequestDto
    ): Response<ReviewDto>

    @GET("marketplace/seller/{id}/reviews/")
    suspend fun getSellerReviews(
        @Path("id") sellerId: Int
    ): Response<List<ReviewDto>>
}
```

### 2.2 Data Transfer Objects (`ReviewDtos.kt`)

```kotlin
package com.campxchange.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class SubmitReviewRequestDto(
    @SerializedName("deal_id") val dealId: Int,
    @SerializedName("listing_id") val listingId: Int,
    @SerializedName("rating") val rating: Int, // 1 to 5
    @SerializedName("comment") val comment: String?,
    @SerializedName("quick_tags") val quickTags: List<String>
)

data class ReviewDto(
    @SerializedName("id") val id: Int,
    @SerializedName("reviewer_name") val reviewerName: String, // Masked DPDP name e.g. "Aman K."
    @SerializedName("rating") val rating: Int,
    @SerializedName("comment") val comment: String?,
    @SerializedName("quick_tags") val quickTags: List<String>,
    @SerializedName("created_at") val createdAt: String
)
```

---

## 3. UI Composable Implementations

### 3.1 Interactive 1-5 Star Selector & Review Sheet (`SubmitReviewBottomSheet.kt`)

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubmitReviewBottomSheet(
    dealId: Int,
    listingId: Int,
    sellerName: String,
    viewModel: ReviewViewModel,
    onSubmitted: () -> Unit,
    onDismiss: () -> Unit
) {
    var rating by remember { mutableIntStateOf(5) }
    var commentText by remember { mutableStateOf("") }
    val selectedTags = remember { mutableStateListOf<String>() }

    val presetTags = listOf(
        "Punctual",
        "Item as Described",
        "Polite & Friendly",
        "Quick Response",
        "Fair Pricing",
        "Smooth Handover"
    )

    val ratingLabels = mapOf(
        1 to "Poor",
        2 to "Fair",
        3 to "Good",
        4 to "Very Good",
        5 to "Excellent"
    )

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Rate Your Experience", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("How was your campus deal with $sellerName?", color = TextSecondary, style = MaterialTheme.typography.bodyMedium)

            Spacer(modifier = Modifier.height(20.dp))

            // 1. Interactive 1-5 Star Picker
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                for (i in 1..5) {
                    IconButton(
                        onClick = { rating = i },
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(
                            imageVector = if (i <= rating) Icons.Default.Star else Icons.Default.StarBorder,
                            contentDescription = "$i Stars",
                            tint = if (i <= rating) Color(0xFFFBBF24) else TextMuted,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }
            }

            Text(
                text = ratingLabels[rating] ?: "",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Brand500,
                modifier = Modifier.padding(top = 6.dp)
            )

            Spacer(modifier = Modifier.height(20.dp))

            // 2. Preset Quick-Tag Chips
            Text("QUICK FEEDBACK TAGS", style = MaterialTheme.typography.labelSmall, color = TextMuted)
            Spacer(modifier = Modifier.height(8.dp))

            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                presetTags.forEach { tag ->
                    val isSelected = selectedTags.contains(tag)
                    FilterChip(
                        selected = isSelected,
                        onClick = {
                            if (isSelected) selectedTags.remove(tag) else selectedTags.add(tag)
                        },
                        label = { Text(tag, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Brand50,
                            selectedLabelColor = Brand500
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 3. Optional Comment Text Area
            OutlinedTextField(
                value = commentText,
                onValueChange = { if (it.length <= 500) commentText = it },
                label = { Text("Write a note for fellow students (Optional)") },
                minLines = 3,
                maxLines = 5,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(24.dp))

            // 4. Submit Button
            Button(
                onClick = {
                    viewModel.submitDealReview(
                        dealId = dealId,
                        listingId = listingId,
                        rating = rating,
                        comment = commentText.trim().ifEmpty { null },
                        tags = selectedTags.toList(),
                        onSuccess = {
                            onSubmitted()
                            onDismiss()
                        }
                    )
                },
                colors = ButtonDefaults.buttonColors(containerColor = Brand500),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth().height(50.dp)
            ) {
                Text("Submit Review & Award Trust Points", fontWeight = FontWeight.Bold)
            }
        }
    }
}
```

---

### 3.2 Review Feed Card (`ReviewFeedCard.kt`)

```kotlin
@Composable
fun ReviewFeedCard(
    review: ReviewDto,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(review.reviewerName, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                // Stars Row
                Row {
                    for (i in 1..5) {
                        Icon(
                            imageVector = if (i <= review.rating) Icons.Default.Star else Icons.Default.StarBorder,
                            contentDescription = null,
                            tint = if (i <= review.rating) Color(0xFFFBBF24) else TextMuted,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            // Quick Tags Chips
            if (review.quickTags.isNotEmpty()) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    review.quickTags.take(3).forEach { tag ->
                        Surface(
                            color = Color(0xFFF1F5F9),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(tag, fontSize = 10.sp, color = TextSecondary, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                }
            }

            // Optional Comment Body
            review.comment?.let { comment ->
                Spacer(modifier = Modifier.height(8.dp))
                Text(comment, style = MaterialTheme.typography.bodySmall, color = TextPrimary)
            }

            Spacer(modifier = Modifier.height(6.dp))
            Text(review.createdAt.substring(0, 10), fontSize = 10.sp, color = TextMuted)
        }
    }
}
```
