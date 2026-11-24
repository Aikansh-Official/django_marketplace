# 📦 Module 03: Listing Creation & Management

This document provides the complete, production-ready specification for creating, editing, and managing marketplace listings in the **CampXChange** native Android application using **Jetpack Compose, Multi-Image Handling, Bitmap Compression, and Dagger Hilt**.

---

## 1. Flow & Permissions Pipeline

```text
Student taps [+] "Sell" CTA Button
             │
             ▼
    Is Role == "SELLER"?
    ┌────────┴────────┐
    │ YES             │ NO (BUYER)
    ▼                 ▼
Launch CreateListing  Show UpgradeToSellerBottomSheet
Screen Form           (ID Card OCR ➡️ Selfie ➡️ OTP ➡️ Upgraded!)
```

---

## 2. API Endpoints & Request/Response Contracts

### 2.1 Listing Management Service (`ListingManagementApi.kt`)

```kotlin
package com.campxchange.app.data.remote.api

import com.campxchange.app.data.remote.dto.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

interface ListingManagementApi {

    @POST("marketplace/listings/")
    suspend fun createListing(
        @Body request: CreateListingRequestDto
    ): Response<ListingDetailDto>

    @PATCH("marketplace/listings/{id}/")
    suspend fun updateListing(
        @Path("id") listingId: Int,
        @Body request: UpdateListingRequestDto
    ): Response<ListingDetailDto>

    @DELETE("marketplace/listings/{id}/")
    suspend fun deleteListing(
        @Path("id") listingId: Int
    ): Response<Unit>

    @GET("marketplace/my-listings/")
    suspend fun getMyListings(
        @Query("status") status: String? = null // "ACTIVE", "PENDING", "SOLD", "HIDDEN"
    ): Response<List<MyListingItemDto>>
}
```

### 2.2 Data Transfer Objects (`ListingDtos.kt`)

```kotlin
package com.campxchange.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class CreateListingRequestDto(
    @SerializedName("title") val title: String,
    @SerializedName("category_id") val categoryId: Int,
    @SerializedName("description") val description: String,
    @SerializedName("price") val price: Double,
    @SerializedName("transaction_type") val transactionType: String, // "SELL", "DONATE", "EXCHANGE"
    @SerializedName("is_negotiable") val isNegotiable: Boolean,
    @SerializedName("condition") val condition: String, // "NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"
    @SerializedName("location") val location: String,
    @SerializedName("contact_preference") val contactPreference: String,
    @SerializedName("contact_whatsapp") val contactWhatsapp: String?,
    @SerializedName("images") val imagesBase64: List<String>,
    @SerializedName("primary_image_index") val primaryImageIndex: Int = 0
)

data class MyListingItemDto(
    @SerializedName("id") val id: Int,
    @SerializedName("title") val title: String,
    @SerializedName("price") val price: Double,
    @SerializedName("status") val status: String, // "ACTIVE", "PENDING", "SOLD", "HIDDEN"
    @SerializedName("location") val location: String,
    @SerializedName("views_count") val viewsCount: Int,
    @SerializedName("primary_image") val primaryImageUrl: String?,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("active_offers_count") val activeOffersCount: Int
)
```

---

## 3. Client-Side Image Compression Utility (`BitmapCompressor.kt`)

To prevent mobile network timeouts and reduce server bandwidth, images are downscaled to a max dimension of 1280px and compressed to JPEG (80% quality) before converting to Base64 or MultiPart:

```kotlin
package com.campxchange.app.core.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream

object BitmapCompressor {

    suspend fun compressAndEncodeToBase64(context: Context, imageUri: Uri): String = withContext(Dispatchers.IO) {
        val inputStream = context.contentResolver.openInputStream(imageUri)
        val originalBitmap = BitmapFactory.decodeStream(inputStream)
        inputStream?.close()

        // 1. Calculate scaled dimensions (Max 1280px)
        val maxDimension = 1280
        val width = originalBitmap.width
        val height = originalBitmap.height
        val ratio = width.toFloat() / height.toFloat()

        var newWidth = width
        var newHeight = height

        if (width > maxDimension || height > maxDimension) {
            if (ratio > 1) {
                newWidth = maxDimension
                newHeight = (maxDimension / ratio).toInt()
            } else {
                newHeight = maxDimension
                newWidth = (maxDimension * ratio).toInt()
            }
        }

        val scaledBitmap = Bitmap.createScaledBitmap(originalBitmap, newWidth, newHeight, true)

        // 2. Compress to JPEG 80%
        val outputStream = ByteArrayOutputStream()
        scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
        val byteArray = outputStream.toByteArray()

        // 3. Encode to Base64 URI
        "data:image/jpeg;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP)
    }
}
```

---

## 4. UI Composable Implementations

### 4.1 Create Listing Screen (`CreateListingScreen.kt`)

```kotlin
package com.campxchange.app.presentation.listing

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.campxchange.app.core.designsystem.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateListingScreen(
    viewModel: ListingManagementViewModel,
    onListingCreated: (Int) -> Unit,
    onNavigateBack: () -> Unit
) {
    val state by viewModel.createState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // Android 13+ Photo Picker (Up to 5 images)
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(maxItems = 5)
    ) { uris ->
        viewModel.onImagesSelected(context, uris)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create New Listing", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SurfaceWhite)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // 1. Multi-Image Upload Strip (Up to 5 images)
            Text("ITEM PHOTOS (${state.images.size}/5)", style = MaterialTheme.typography.labelMedium, color = TextMuted)
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Add Image Picker Box
                if (state.images.size < 5) {
                    Box(
                        modifier = Modifier
                            .size(90.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .border(1.5.dp, Brand500, RoundedCornerShape(8.dp))
                            .clickable {
                                photoPickerLauncher.launch(
                                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                )
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.AddPhotoAlternate, contentDescription = null, tint = Brand500)
                            Text("Add", fontSize = 11.sp, color = Brand500, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }

                // Uploaded Images Previews with Star & Delete
                state.images.forEachIndexed { index, imgUri ->
                    Box(modifier = Modifier.size(90.dp)) {
                        AsyncImage(
                            model = imgUri,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(8.dp))
                        )

                        // Star / Thumbnail Selector (Top-Left)
                        IconButton(
                            onClick = { viewModel.setPrimaryImageIndex(index) },
                            modifier = Modifier
                                .align(Alignment.TopStart)
                                .size(24.dp)
                                .background(Color(0x99000000), CircleShape)
                        ) {
                            Icon(
                                Icons.Default.Star,
                                contentDescription = "Primary",
                                tint = if (state.primaryImageIndex == index) Color(0xFFFBBF24) else Color.White,
                                modifier = Modifier.size(14.dp)
                            )
                        }

                        // Remove Image Button (Top-Right)
                        IconButton(
                            onClick = { viewModel.removeImage(index) },
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .size(24.dp)
                                .background(Color(0x99000000), CircleShape)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Remove", tint = Color.White, modifier = Modifier.size(14.dp))
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // 2. Transaction Type Toggle (Sell vs Donate)
            Row(modifier = Modifier.fillMaxWidth()) {
                FilterChip(
                    selected = state.transactionType == "SELL",
                    onClick = { viewModel.setTransactionType("SELL") },
                    label = { Text("Commercial Sale (₹)") },
                    modifier = Modifier.weight(1f).padding(end = 4.dp),
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Brand500, selectedLabelColor = Color.White)
                )
                FilterChip(
                    selected = state.transactionType == "DONATE",
                    onClick = { viewModel.setTransactionType("DONATE") },
                    label = { Text("Free Student Donation") },
                    modifier = Modifier.weight(1f).padding(start = 4.dp),
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = SuccessGreen, selectedLabelColor = Color.White)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 3. Title Field
            OutlinedTextField(
                value = state.title,
                onValueChange = { viewModel.onTitleChanged(it) },
                label = { Text("Item Title (e.g. Engineering Graphics Kit)") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 4. Price & Negotiable Switch (Only if SELL)
            if (state.transactionType == "SELL") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = state.priceText,
                        onValueChange = { viewModel.onPriceChanged(it) },
                        label = { Text("Price (₹)") },
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Negotiable", style = MaterialTheme.typography.bodyMedium)
                        Switch(
                            checked = state.isNegotiable,
                            onCheckedChange = { viewModel.setNegotiable(it) },
                            colors = SwitchDefaults.colors(checkedThumbColor = Brand500)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // 5. Condition Selector
            Text("ITEM CONDITION", style = MaterialTheme.typography.labelMedium, color = TextMuted)
            val conditions = listOf("NEW" to "Brand New", "LIKE_NEW" to "Like New", "GOOD" to "Good", "FAIR" to "Fair", "POOR" to "For Parts")
            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                conditions.forEach { (key, label) ->
                    FilterChip(
                        selected = state.condition == key,
                        onClick = { viewModel.setCondition(key) },
                        label = { Text(label, fontSize = 11.sp) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 6. Campus Meetup Location
            OutlinedTextField(
                value = state.location,
                onValueChange = { viewModel.onLocationChanged(it) },
                label = { Text("Campus Meetup Spot (e.g. BH-4, Uni-Mall, Library)") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 7. Description
            OutlinedTextField(
                value = state.description,
                onValueChange = { viewModel.onDescriptionChanged(it) },
                label = { Text("Detailed Description (Condition notes, reason for selling)") },
                minLines = 3,
                maxLines = 6,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(28.dp))

            // 8. Publish Button
            Button(
                onClick = { viewModel.publishListing(onSuccess = onListingCreated) },
                enabled = state.isValid && !state.isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = Brand500),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth().height(52.dp)
            ) {
                if (state.isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    Text("Publish to Campus Marketplace", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
```

---

### 4.2 My Listings Management Screen (`MyListingsScreen.kt`)

Includes status tabs (`All`, `Active`, `Reserved/Pending`, `Sold`, `Hidden`), quick view metrics, and action bottom sheets (Edit, Delete, Mark as Sold).
