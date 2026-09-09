# 📦 CampusXChange — Android Listing Management & Selling Specification

> **Target Platform:** Android (Native)  
> **Tech Stack:** Kotlin, Jetpack Compose, Material 3, MVVM, Retrofit, CameraX / PhotoPicker, Coil, Hilt  
> **Backend Service:** Django REST Framework (`/api/marketplace/listings/`, `/api/marketplace/my-listings/`, `/api/marketplace/upload-image/`)  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [Architecture & Workflow](#1-architecture--workflow)
2. [Complete Business & Validation Rules](#2-complete-business--validation-rules)
3. [Color Palette & Material 3 Tokens](#3-color-palette--material-3-tokens)
4. [Navigation & Compose Routes](#4-navigation--compose-routes)
5. [Complete REST API Contract](#5-complete-rest-api-contract)
6. [Android Implementation Blueprint (Kotlin Code)](#6-android-implementation-blueprint-kotlin-code)
   - [6.1 DTOs & Retrofit Listing Service](#61-dtos--retrofit-listing-service)
   - [6.2 Image Compression & Multi-Photo Picker](#62-image-compression--multi-photo-picker)
   - [6.3 Create/Edit Listing ViewModel](#63-createedit-listing-viewmodel)
   - [6.4 My Listings Screen (Tabs: Active, Sold, Hidden)](#64-my-listings-screen-tabs-active-sold-hidden)
   - [6.5 CreateListingScreen Composable](#65-createlistingscreen-composable)
7. [Offline Drafts & Error Recovery](#7-offline-drafts--error-recovery)

---

## 1. Architecture & Workflow

The Listing Management module enables students to list campus items in under 60 seconds with on-device image compression and Cloudinary synchronization.

```
┌─────────────────────────────────────────────────────────────┐
│                 Create / Edit Listing Screen                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Photo Picker (Android 13+ PhotoPicker / Camera)       │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ Mode Switch: SELL / RENT / DONATE                     │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ Details: Title, Category, Price, Condition, Location  │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ Contact Preference: Chat, WhatsApp, Call, Meetup      │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────▲──────────────────────────────┘
                               │ StateFlow<CreateListingUiState>
┌──────────────────────────────▼──────────────────────────────┐
│                  CreateListingViewModel                     │
└──────────────────────────────▲──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    ListingRepository                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Business & Validation Rules

### 2.1 Form Field Validations

| Field | Rule | Validation Logic | UI Feedback |
|---|---|---|---|
| **Title** | 5 to 100 characters | `title.trim().length in 5..100` | *"Title must be between 5 and 100 characters."* |
| **Category** | Mandatory selection | `categoryId > 0` | *"Please select a category."* |
| **Transaction Type** | `SELL`, `RENT`, `DONATE`| Radio / Segmented control | If DONATE, price locked to `0.00` |
| **Price** | > 0 for SELL/RENT | `if (type != DONATE) price > 0` | *"Please enter a valid price in ₹."* |
| **Rent Period** | Mandatory for RENT | `day`, `week`, `month`, `semester`| Displayed as suffix: `₹150 / month` |
| **Condition** | Mandatory | `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`, `POOR` | Visual badge selector |
| **Location** | Min 3 chars | `location.trim().length >= 3` | Chip quick-picker for campus spots |
| **Images** | 1 to 5 photos | `images.isNotEmpty() && size <= 5`| *"Upload at least 1 clear photo."* |

### 2.2 Campus Location Quick-Chips
Students can type custom spots or tap quick-fill chips:
- 🏢 `BH-4 Hostel`
- 🏢 `BH-1 Hostel`
- 🏢 `GH Girls Hostel`
- 📚 `Block 34 (Engineering)`
- 🛍️ `Uni-Mall Food Court`
- 🚪 `Law Gate Main Entrance`
- 📖 `Central Library`

### 2.3 Status Lifecycle
```
[ACTIVE] ──(Buyer makes accepted offer)──> [PENDING] ──(QR Scanned)──> [SOLD]
   │
   └──(Seller toggles visibility)────────> [HIDDEN]
```

---

## 3. Color Palette & Material 3 Tokens

```kotlin
package com.CampusXChange.app.ui.theme

import androidx.compose.ui.graphics.Color

val ListingPrimaryOrange = Color(0xFFFB5607)
val ImageUploadBorder = Color(0xFFD1D5DB)
val PrimaryBadgeBg = Color(0xFFFFF4ED)
val PrimaryBadgeText = Color(0xFFFB5607)
val ActiveGreen = Color(0xFF10B981)
val SoldGray = Color(0xFF6B7280)
val HiddenAmber = Color(0xFFF59E0B)
```

---

## 4. Navigation & Compose Routes

```kotlin
sealed class ListingRoute(val route: String) {
    object Create : ListingRoute("listing/create")
    object MyListings : ListingRoute("listing/my_listings")
    fun edit(listingId: Int): String = "listing/edit/$listingId"
}
```

---

## 5. Complete REST API Contract

### 5.1 Create Listing
- **URL:** `POST /api/marketplace/listings/`
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`

#### Request Body:
```json
{
  "title": "Scientific Calculator Casio fx-991EX ClassWiz",
  "category_id": 4,
  "description": "Used during 1st year exams, all functions and solar panel working perfectly.",
  "price": "750.00",
  "is_negotiable": true,
  "transaction_type": "SELL",
  "rent_period": null,
  "condition": "GOOD",
  "location": "BH-4, Room 410",
  "contact_preference": "ALL",
  "contact_phone": "9876543210",
  "contact_whatsapp": "9876543210",
  "images": [
    {
      "image_url": "https://res.cloudinary.com/CampusXChange/image/upload/v1234/casio1.jpg",
      "is_primary": true
    },
    {
      "image_url": "https://res.cloudinary.com/CampusXChange/image/upload/v1234/casio2.jpg",
      "is_primary": false
    }
  ]
}
```

#### Response `201 Created`:
```json
{
  "id": 105,
  "title": "Scientific Calculator Casio fx-991EX ClassWiz",
  "status": "ACTIVE",
  "created_at": "2026-09-06T10:00:00Z"
}
```

---

### 5.2 Fetch My Listings
- **URL:** `GET /api/marketplace/my-listings/`
- **Headers:** `Authorization: Bearer <access_token>`

#### Response `200 OK`:
```json
[
  {
    "id": 105,
    "title": "Scientific Calculator Casio fx-991EX ClassWiz",
    "price": "750.00",
    "status": "ACTIVE",
    "views_count": 18,
    "offers_count": 2,
    "images": [
      {
        "id": 401,
        "image_url": "https://res.cloudinary.com/.../casio1.jpg",
        "is_primary": true
      }
    ]
  }
]
```

---

### 5.3 Toggle Listing Status
- **URL:** `POST /api/marketplace/listings/{id}/status/`
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`

#### Request Body:
```json
{
  "status": "SOLD"
}
```
*(Options: `ACTIVE`, `PENDING`, `SOLD`, `HIDDEN`)*

#### Response `200 OK`:
```json
{
  "id": 105,
  "status": "SOLD",
  "message": "Listing status updated to SOLD."
}
```

---

## 6. Android Implementation Blueprint (Kotlin Code)

### 6.1 DTOs & Retrofit Listing Service

```kotlin
package com.CampusXChange.app.data.remote

import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.*

data class ListingImagePayload(
    @SerializedName("image_url") val imageUrl: String,
    @SerializedName("is_primary") val isPrimary: Boolean
)

data class CreateListingRequest(
    val title: String,
    @SerializedName("category_id") val categoryId: Int,
    val description: String,
    val price: Double,
    @SerializedName("is_negotiable") val isNegotiable: Boolean,
    @SerializedName("transaction_type") val transactionType: String,
    @SerializedName("rent_period") val rentPeriod: String?,
    val condition: String,
    val location: String,
    @SerializedName("contact_preference") val contactPreference: String,
    @SerializedName("contact_phone") val contactPhone: String?,
    @SerializedName("contact_whatsapp") val contactWhatsapp: String?,
    val images: List<ListingImagePayload>
)

data class StatusUpdateRequest(val status: String)

interface ListingManagementApiService {
    @POST("api/marketplace/listings/")
    suspend fun createListing(@Body request: CreateListingRequest): Response<ListingDto>

    @PUT("api/marketplace/listings/{id}/")
    suspend fun updateListing(
        @Path("id") id: Int,
        @Body request: CreateListingRequest
    ): Response<ListingDto>

    @GET("api/marketplace/my-listings/")
    suspend fun getMyListings(): Response<List<ListingDto>>

    @POST("api/marketplace/listings/{id}/status/")
    suspend fun updateListingStatus(
        @Path("id") id: Int,
        @Body request: StatusUpdateRequest
    ): Response<GenericMessageResponse>

    @DELETE("api/marketplace/listings/{id}/")
    suspend fun deleteListing(@Path("id") id: Int): Response<Unit>
}
```

---

### 6.2 Image Compression & Multi-Photo Picker

```kotlin
package com.CampusXChange.app.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream

object ImageUtils {
    fun compressImageUri(context: Context, imageUri: Uri, quality: Int = 75): File {
        val inputStream = context.contentResolver.openInputStream(imageUri)
        val originalBitmap = BitmapFactory.decodeStream(inputStream)
        
        // Scale down if dimensions exceed 1600px
        val maxDimension = 1600
        val scale = Math.min(
            maxDimension.toFloat() / originalBitmap.width,
            maxDimension.toFloat() / originalBitmap.height
        )
        
        val scaledBitmap = if (scale < 1.0f) {
            Bitmap.createScaledBitmap(
                originalBitmap,
                (originalBitmap.width * scale).toInt(),
                (originalBitmap.height * scale).toInt(),
                true
            )
        } else {
            originalBitmap
        }

        val tempFile = File(context.cacheDir, "upload_${System.currentTimeMillis()}.jpg")
        val outputStream = FileOutputStream(tempFile)
        scaledBitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
        outputStream.flush()
        outputStream.close()
        return tempFile
    }
}
```

---

### 6.3 Create/Edit Listing ViewModel

```kotlin
package com.CampusXChange.app.ui.listing

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.CampusXChange.app.data.remote.*
import com.CampusXChange.app.utils.ImageUtils
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import javax.inject.Inject

data class CreateListingUiState(
    val title: String = "",
    val categoryId: Int = 0,
    val description: String = "",
    val price: String = "",
    val isNegotiable: Boolean = true,
    val transactionType: String = "SELL", // SELL, RENT, DONATE
    val rentPeriod: String = "month",
    val condition: String = "GOOD",
    val location: String = "",
    val contactPreference: String = "ALL",
    val contactPhone: String = "",
    val contactWhatsapp: String = "",
    val uploadedImages: List<String> = emptyList(), // Cloudinary URLs
    val primaryImageIndex: Int = 0,
    val isUploadingImage: Boolean = false,
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null,
    val isSuccess: Boolean = false
)

@HiltViewModel
class CreateListingViewModel @Inject constructor(
    private val api: ListingManagementApiService,
    private val profileApi: ProfileApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(CreateListingUiState())
    val uiState: StateFlow<CreateListingUiState> = _uiState.asStateFlow()

    fun onTitleChange(v: String) { _uiState.value = _uiState.value.copy(title = v) }
    fun onPriceChange(v: String) { if (v.all { it.isDigit() || it == '.' }) _uiState.value = _uiState.value.copy(price = v) }
    fun onCategoryChange(id: Int) { _uiState.value = _uiState.value.copy(categoryId = id) }
    fun onTransactionTypeChange(type: String) { _uiState.value = _uiState.value.copy(transactionType = type) }
    fun onConditionChange(c: String) { _uiState.value = _uiState.value.copy(condition = c) }
    fun onLocationChange(loc: String) { _uiState.value = _uiState.value.copy(location = loc) }
    fun onDescriptionChange(d: String) { _uiState.value = _uiState.value.copy(description = d) }

    fun uploadPickedImage(context: Context, uri: Uri) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isUploadingImage = true, errorMessage = null)
            try {
                val compressedFile = ImageUtils.compressImageUri(context, uri)
                val reqBody = compressedFile.asRequestBody("image/jpeg".toMediaTypeOrNull())
                val part = MultipartBody.Part.createFormData("image", compressedFile.name, reqBody)

                val uploadRes = profileApi.uploadImage(part)
                if (uploadRes.isSuccessful && uploadRes.body() != null) {
                    val newUrl = uploadRes.body()!!.url
                    val currentList = _uiState.value.uploadedImages.toMutableList().apply { add(newUrl) }
                    _uiState.value = _uiState.value.copy(
                        uploadedImages = currentList,
                        isUploadingImage = false
                    )
                } else {
                    _uiState.value = _uiState.value.copy(isUploadingImage = false, errorMessage = "Failed to upload photo.")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isUploadingImage = false, errorMessage = "Image upload failed.")
            }
        }
    }

    fun submitListing() {
        val s = _uiState.value
        if (s.title.length < 5) { _uiState.value = s.copy(errorMessage = "Title must be at least 5 characters"); return }
        if (s.categoryId == 0) { _uiState.value = s.copy(errorMessage = "Please select a category"); return }
        val priceVal = s.price.toDoubleOrNull() ?: 0.0
        if (s.transactionType != "DONATE" && priceVal <= 0.0) {
            _uiState.value = s.copy(errorMessage = "Please enter a valid price"); return
        }
        if (s.location.isBlank()) { _uiState.value = s.copy(errorMessage = "Please provide campus meetup spot"); return }
        if (s.uploadedImages.isEmpty()) { _uiState.value = s.copy(errorMessage = "Upload at least 1 image"); return }

        val imagePayloads = s.uploadedImages.mapIndexed { idx, url ->
            ListingImagePayload(imageUrl = url, isPrimary = (idx == s.primaryImageIndex))
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, errorMessage = null)
            try {
                val res = api.createListing(
                    CreateListingRequest(
                        title = s.title,
                        categoryId = s.categoryId,
                        description = s.description,
                        price = if (s.transactionType == "DONATE") 0.0 else priceVal,
                        isNegotiable = s.isNegotiable,
                        transactionType = s.transactionType,
                        rentPeriod = if (s.transactionType == "RENT") s.rentPeriod else null,
                        condition = s.condition,
                        location = s.location,
                        contactPreference = s.contactPreference,
                        contactPhone = s.contactPhone.ifEmpty { null },
                        contactWhatsapp = s.contactWhatsapp.ifEmpty { null },
                        images = imagePayloads
                    )
                )

                if (res.isSuccessful) {
                    _uiState.value = _uiState.value.copy(isSubmitting = false, isSuccess = true)
                } else {
                    _uiState.value = _uiState.value.copy(isSubmitting = false, errorMessage = "Failed to create listing.")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isSubmitting = false, errorMessage = "Network error.")
            }
        }
    }
}
```

---

### 6.4 My Listings Screen (Tabs: Active, Sold, Hidden)

```kotlin
package com.CampusXChange.app.ui.listing

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.CampusXChange.app.data.remote.ListingDto
import com.CampusXChange.app.ui.theme.*

@Composable
fun MyListingsScreen(
    onListingClick: (Int) -> Unit,
    onEditClick: (Int) -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) }
    val tabTitles = listOf("Active", "Pending", "Sold", "Hidden")

    Scaffold(
        topBar = {
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.White,
                contentColor = ListingPrimaryOrange
            ) {
                tabTitles.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp) }
                    )
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Renders filtered cards
        }
    }
}
```

---

## 7. Offline Drafts & Error Recovery

- **DataStore Form Draft Auto-Save:** In-progress listing titles, description, and chosen category are auto-saved locally so students don't lose typed text if they switch apps to take photos.
- **Immediate Draft Purge:** On `201 Created` response, the local draft is automatically purged.
