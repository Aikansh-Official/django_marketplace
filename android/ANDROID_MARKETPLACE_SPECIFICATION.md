# 🛒 CampXChange — Android Marketplace & Browsing Specification

> **Target Platform:** Android (Native)  
> **Tech Stack:** Kotlin, Jetpack Compose, Material 3, MVVM, Retrofit, Coil, StateFlow, Hilt  
> **Backend Service:** Django REST Framework (`/api/marketplace/categories/`, `/api/marketplace/listings/`)  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [Architecture & System Flow](#1-architecture--system-flow)
2. [Complete Business & Filtering Logic](#2-complete-business--filtering-logic)
3. [Color Palette & Material 3 Styling](#3-color-palette--material-3-styling)
4. [Navigation & Compose Routes](#4-navigation--compose-routes)
5. [Complete REST API Contract](#5-complete-rest-api-contract)
6. [Android Implementation Blueprint (Kotlin Code)](#6-android-implementation-blueprint-kotlin-code)
   - [6.1 DTOs & Retrofit Service](#61-dtos--retrofit-service)
   - [6.2 Marketplace Repository](#62-marketplace-repository)
   - [6.3 Marketplace ViewModel (Debounce Search & Filters)](#63-marketplace-viewmodel-debounce-search--filters)
   - [6.4 Jetpack Compose Components (ProductCard & Filters)](#64-jetpack-compose-components-productcard--filters)
   - [6.5 HomeScreen Composable](#65-homescreen-composable)
7. [Performance & Offline Strategy](#7-performance--offline-strategy)

---

## 1. Architecture & System Flow

The Marketplace browsing engine utilizes a **two-column adaptive grid** with pull-to-refresh, debounced search, active filter chips, and instant wishlist toggling.

```
┌─────────────────────────────────────────────────────────────┐
│                 HomeScreen / MarketplaceScreen              │
│       ┌──────────────────────────────────────────────┐      │
│       │ Top Announcement Bar (Passive Alert / Notice)│      │
│       ├──────────────────────────────────────────────┤      │
│       │ Search Bar + Category Horizontal Row Chips   │      │
│       ├──────────────────────────────────────────────┤      │
│       │ BannerSlideshow Hero Carousel (Auto-scroll)  │      │
│       │ → Detailed in ANDROID_BANNER_CAROUSEL_SPEC.md│      │
│       ├──────────────────────────────────────────────┤      │
│       │ Transaction (Sell/Rent/Donate) & Sort Filter │      │
│       ├──────────────────────────────────────────────┤      │
│       │ LazyVerticalGrid (2 Columns) of ProductCards │      │
│       └──────────────────────────────────────────────┘      │
└──────────────────────────────▲──────────────────────────────┘
                               │ StateFlow<MarketplaceUiState>
┌──────────────────────────────▼──────────────────────────────┐
│                    MarketplaceViewModel                     │
│  (StateFlow, Search Query Debouncing, Filter Combiner)       │
└──────────────────────────────▲──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    MarketplaceRepository                    │
└──────────────┬───────────────────────────────┬──────────────┘
               ▼                               ▼
    Remote: Retrofit MarketplaceApi        Local Cache: Room
```

---

## 2. Complete Business & Filtering Logic

### 2.1 Category Filtering
- Categories are fetched dynamically from `/api/marketplace/categories/`.
- Pre-seeded campus categories:
  - 📚 **Textbooks & Notes** (`books-notes`)
  - 🚲 **Cycles & Mobility** (`cycles`)
  - 💻 **Electronics & Laptops** (`electronics`)
  - 🧮 **Calculators & Stationary** (`stationery`)
  - 🪑 **Hostel Furniture & Mattresses** (`furniture`)
  - 🔬 **Lab Equipment & Coats** (`lab-equipment`)
- Selecting "All" clears the category filter and displays campus-wide items.

### 2.2 Search with 400ms Debounce
- Search bar queries across: **Listing Title**, **Description**, and **Campus Location** (e.g. *"BH-4"*, *"Block 34"*, *"Casio"*).
- Keystrokes are throttled using Kotlin Coroutines `delay(400)` before firing the network request.
- Minimum search characters: 2. Empty search resets to general feed.

### 2.3 Transaction Modes & Condition Filters

| Filter Type | Values | Behavior in UI |
|---|---|---|
| **Transaction** | `ALL` | Shows everything |
| | `SELL` | Direct buy and sell items with currency price |
| | `RENT` | Displays rent period badge (e.g. `₹150 / month`) |
| | `DONATE` | Displays vibrant green **FREE / DONATION** tag |
| **Condition** | `NEW` | Brand New with packaging |
| | `LIKE_NEW` | Pristine condition / barely used |
| | `GOOD` | Standard usable condition |
| | `FAIR` | Minor cosmetic wear |
| | `POOR` | For parts or heavily used |

### 2.4 Sorting Criteria
- **Newest First:** `ordering=-created_at` (Default)
- **Price: Low to High:** `ordering=price`
- **Price: High to Low:** `ordering=-price`
- **Most Popular:** `ordering=-views_count`

---

## 3. Color Palette & Material 3 Styling

Matches the CampXChange Brand Guidelines:

```kotlin
package com.CampXChange.app.ui.theme

import androidx.compose.ui.graphics.Color

val MarketplacePrimaryOrange = Color(0xFFFB5607)
val MarketplaceCardBackground = Color(0xFFFFFFFF)
val MarketplaceScaffoldBg = Color(0xFFFCFBF8) // Warm Cream 50
val ChipSelectedBg = Color(0xFFFB5607)
val ChipUnselectedBg = Color(0xFFF3F4F6)
val ChipUnselectedText = Color(0xFF4B5563)
val DonateGreen = Color(0xFF10B981)
val DonateGreenBg = Color(0xFFECFDF5)
val RentPurple = Color(0xFF8B5CF6)
val RentPurpleBg = Color(0xFFF5F3FF)
```

---

## 4. Navigation & Compose Routes

```kotlin
sealed class MarketplaceRoute(val route: String) {
    object Home : MarketplaceRoute("marketplace/home")
    object Search : MarketplaceRoute("marketplace/search")
    fun detail(listingId: Int): String = "marketplace/detail/$listingId"
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

### 5.1 Fetch All Categories
- **URL:** `GET /api/marketplace/categories/`
- **Auth:** Not required (Guest accessible)

#### Response `200 OK`:
```json
[
  {
    "id": 1,
    "name": "Textbooks & Notes",
    "slug": "books-notes",
    "icon": "BookOpen"
  },
  {
    "id": 2,
    "name": "Cycles & Mobility",
    "slug": "cycles",
    "icon": "Bike"
  }
]
```

---

### 5.2 Fetch Listings (Filtered & Sorted)
- **URL:** `GET /api/marketplace/listings/`
- **Auth:** Optional
- **Query Parameters:**
  - `search` (Optional, string)
  - `category` (Optional, category slug or id)
  - `transaction_type` (Optional: `SELL`, `RENT`, `DONATE`)
  - `condition` (Optional: `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`, `POOR`)
  - `ordering` (Optional: `-created_at`, `price`, `-price`, `-views_count`)

#### Response `200 OK`:
```json
[
  {
    "id": 101,
    "title": "Engineering Mechanics Textbook (B.Tech 1st Year)",
    "description": "Standard book in clean condition, no missing pages.",
    "price": "350.00",
    "is_negotiable": true,
    "transaction_type": "SELL",
    "rent_period": null,
    "condition": "GOOD",
    "location": "BH-4 Hostel, Room 312",
    "status": "ACTIVE",
    "views_count": 84,
    "created_at": "2026-09-05T14:20:00Z",
    "seller": {
      "id": 42,
      "username": "12200000",
      "full_name": "Aman Sharma",
      "trust_score": 85,
      "is_verified_student": true
    },
    "category": {
      "id": 1,
      "name": "Textbooks & Notes",
      "slug": "books-notes"
    },
    "images": [
      {
        "id": 201,
        "image_url": "https://res.cloudinary.com/CampXChange/image/upload/v1234/book1.jpg",
        "is_primary": true
      }
    ]
  }
]
```

---

## 6. Android Implementation Blueprint (Kotlin Code)

### 6.1 DTOs & Retrofit Service

```kotlin
package com.CampXChange.app.data.remote

import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

data class CategoryDto(
    val id: String,
    val name: String,
    val slug: String,
    val icon: String?
)

data class ListingImageDto(
    val id: String,
    @SerializedName("image_url") val imageUrl: String,
    @SerializedName("is_primary") val isPrimary: Boolean
)

data class SellerSummaryDto(
    val id: String,
    val username: String,
    @SerializedName("full_name") val fullName: String,
    @SerializedName("trust_score") val trustScore: Int,
    @SerializedName("is_verified_student") val isVerifiedStudent: Boolean
)

data class ListingDto(
    val id: String,
    val title: String,
    val description: String,
    val price: Double,
    @SerializedName("is_negotiable") val isNegotiable: Boolean,
    @SerializedName("transaction_type") val transactionType: String, // SELL, RENT, DONATE
    @SerializedName("rent_period") val rentPeriod: String?,
    val condition: String,
    val location: String,
    val status: String,
    @SerializedName("views_count") val viewsCount: Int,
    @SerializedName("created_at") val createdAt: String,
    val seller: SellerSummaryDto,
    val category: CategoryDto?,
    val images: List<ListingImageDto>
)

interface MarketplaceApiService {
    @GET("api/marketplace/categories/")
    suspend fun getCategories(): Response<List<CategoryDto>>

    @GET("api/marketplace/listings/")
    suspend fun getListings(
        @Query("search") search: String? = null,
        @Query("category") category: String? = null,
        @Query("transaction_type") transactionType: String? = null,
        @Query("condition") condition: String? = null,
        @Query("ordering") ordering: String? = null
    ): Response<List<ListingDto>>
}
```

---

### 6.2 Marketplace Repository

```kotlin
package com.CampXChange.app.data.repository

import com.CampXChange.app.data.remote.CategoryDto
import com.CampXChange.app.data.remote.ListingDto
import com.CampXChange.app.data.remote.MarketplaceApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MarketplaceRepository @Inject constructor(
    private val api: MarketplaceApiService
) {
    suspend fun fetchCategories(): Result<List<CategoryDto>> {
        return try {
            val res = api.getCategories()
            if (res.isSuccessful && res.body() != null) {
                Result.success(res.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch categories"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun fetchListings(
        query: String?,
        categorySlug: String?,
        transType: String?,
        condition: String?,
        sort: String?
    ): Result<List<ListingDto>> {
        return try {
            val res = api.getListings(
                search = if (query.isNullOrBlank()) null else query,
                category = if (categorySlug == "ALL" || categorySlug.isNullOrBlank()) null else categorySlug,
                transactionType = if (transType == "ALL" || transType.isNullOrBlank()) null else transType,
                condition = if (condition == "ALL" || condition.isNullOrBlank()) null else condition,
                ordering = sort
            )
            if (res.isSuccessful && res.body() != null) {
                Result.success(res.body()!!)
            } else {
                Result.failure(Exception("Failed to load listings"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

---

### 6.3 Marketplace ViewModel (Debounce Search & Filters)

```kotlin
package com.CampXChange.app.ui.marketplace

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.CampXChange.app.data.remote.CategoryDto
import com.CampXChange.app.data.remote.ListingDto
import com.CampXChange.app.data.repository.MarketplaceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MarketplaceUiState(
    val categories: List<CategoryDto> = emptyList(),
    val listings: List<ListingDto> = emptyList(),
    val selectedCategorySlug: String = "ALL",
    val searchQuery: String = "",
    val selectedTransactionType: String = "ALL",
    val selectedSort: String = "-created_at",
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class MarketplaceViewModel @Inject constructor(
    private val repository: MarketplaceRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MarketplaceUiState())
    val uiState: StateFlow<MarketplaceUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        loadInitialData()
    }

    private fun loadInitialData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val catResult = repository.fetchCategories()
            if (catResult.isSuccess) {
                _uiState.value = _uiState.value.copy(categories = catResult.getOrNull().orEmpty())
            }
            refreshListings()
        }
    }

    fun onSearchChange(newQuery: String) {
        _uiState.value = _uiState.value.copy(searchQuery = newQuery)
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(400) // 400ms Debounce
            refreshListings()
        }
    }

    fun onCategorySelect(slug: String) {
        _uiState.value = _uiState.value.copy(selectedCategorySlug = slug)
        refreshListings()
    }

    fun onTransactionTypeSelect(type: String) {
        _uiState.value = _uiState.value.copy(selectedTransactionType = type)
        refreshListings()
    }

    fun onSortSelect(sort: String) {
        _uiState.value = _uiState.value.copy(selectedSort = sort)
        refreshListings()
    }

    fun refreshListings() {
        val s = _uiState.value
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRefreshing = true, errorMessage = null)
            val res = repository.fetchListings(
                query = s.searchQuery,
                categorySlug = s.selectedCategorySlug,
                transType = s.selectedTransactionType,
                condition = null,
                sort = s.selectedSort
            )
            if (res.isSuccess) {
                _uiState.value = _uiState.value.copy(
                    listings = res.getOrNull().orEmpty(),
                    isLoading = false,
                    isRefreshing = false
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isRefreshing = false,
                    errorMessage = "Failed to load marketplace items"
                )
            }
        }
    }
}
```

---

### 6.4 Jetpack Compose Components (ProductCard & Filters)

```kotlin
package com.CampXChange.app.ui.marketplace.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.CampXChange.app.data.remote.ListingDto
import com.CampXChange.app.ui.theme.*

@Composable
fun ProductCard(
    listing: ListingDto,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = MarketplaceCardBackground),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            // Product Image with Transaction Tag Overlay
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .background(Color(0xFFF3F4F6))
            ) {
                val primaryImg = listing.images.firstOrNull { it.isPrimary }?.imageUrl
                    ?: listing.images.firstOrNull()?.imageUrl

                if (!primaryImg.isNullOrEmpty()) {
                    AsyncImage(
                        model = primaryImg,
                        contentDescription = listing.title,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                }

                // Transaction Mode Tag (Top Left)
                Box(
                    modifier = Modifier
                        .padding(8.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(
                            when (listing.transactionType) {
                                "DONATE" -> DonateGreen
                                "RENT" -> RentPurple
                                else -> MarketplacePrimaryOrange
                            }
                        )
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = when (listing.transactionType) {
                            "DONATE" -> "FREE"
                            "RENT" -> "RENT"
                            else -> "BUY"
                        },
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                }
            }

            // Details Container
            Column(modifier = Modifier.padding(10.dp)) {
                // Price & Negotiable Badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = if (listing.transactionType == "DONATE") "₹0 (Free)" else "₹${listing.price.toInt()}",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black,
                        color = TextInkPrimary
                    )
                    if (listing.isNegotiable && listing.transactionType != "DONATE") {
                        Text(
                            text = "Negotiable",
                            fontSize = 10.sp,
                            color = ProfileTextMuted,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Title
                Text(
                    text = listing.title,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextInkPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(6.dp))

                // Campus Location Tag
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "📍 ", fontSize = 11.sp)
                    Text(
                        text = listing.location,
                        fontSize = 11.sp,
                        color = ProfileTextMuted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}
```

---

### 6.5 HomeScreen Composable

```kotlin
package com.CampXChange.app.ui.marketplace

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.CampXChange.app.ui.marketplace.components.ProductCard
import com.CampXChange.app.ui.theme.*

@Composable
fun HomeScreen(
    onProductClick: (Int) -> Unit,
    viewModel: MarketplaceViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        containerColor = MarketplaceScaffoldBg
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Search Input Bar
            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = { viewModel.onSearchChange(it) },
                placeholder = { Text("Search books, cycles, laptops, hostel...") },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                shape = RoundedCornerShape(10.dp),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White,
                    focusedBorderColor = MarketplacePrimaryOrange,
                    unfocusedBorderColor = BorderLight
                )
            )

            // Horizontal Category Chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // "All" chip
                FilterChip(
                    selected = state.selectedCategorySlug == "ALL",
                    onClick = { viewModel.onCategorySelect("ALL") },
                    label = { Text("All Campus") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MarketplacePrimaryOrange,
                        selectedLabelColor = Color.White
                    )
                )

                // Category chips
                state.categories.forEach { cat ->
                    FilterChip(
                        selected = state.selectedCategorySlug == cat.slug,
                        onClick = { viewModel.onCategorySelect(cat.slug) },
                        label = { Text(cat.name) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MarketplacePrimaryOrange,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 2-Column Product Grid
            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                    CircularProgressIndicator(color = MarketplacePrimaryOrange)
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(state.listings, key = { it.id }) { listing ->
                        ProductCard(
                            listing = listing,
                            onClick = { onProductClick(listing.id) }
                        )
                    }
                }
            }
        }
    }
}
```

---

## 7. Performance & Offline Strategy

- **Image Caching via Coil:** Disk and memory cache configured with Crossfade animation to prevent jitter when scrolling product feed.
- **Search Cancellation:** Previous Retrofit network calls are cancelled when a student types a new character in the search box.
- **Swipe-to-Refresh:** Pull-to-refresh triggers `viewModel.refreshListings()` updating latest stock and sold items.
