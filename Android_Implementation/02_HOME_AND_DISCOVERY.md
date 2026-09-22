# 🛍️ Module 02: Homepage, Search & Marketplace Discovery

This document details the complete native Android specification for the **CampusXChange** home discovery feed, dynamic categories, live search with autocomplete suggestions, filter/sort bottom sheet, 2-column listing card grid, animated background, and urgent announcements.

---

## 1. Homepage Architecture & Visual Hierarchy

```text
┌────────────────────────────────────────────────────────┐
│ TopAppBar: [Logo]      [Search Bar]      [🤍 2] [🔔 3] │
├────────────────────────────────────────────────────────┤
│ [Sticky Announcement Banner: "Mid-Term Book Fair..."]  │
├────────────────────────────────────────────────────────┤
│ Categories: [🏷️ All] [📚 Books] [💻 Tech] [🚲 Cycles]  │
├────────────────────────────────────────────────────────┤
│ Filters & Sort: [🔘 Buy/Donate] [⚙️ Filter] [⇅ Sort]   │
├────────────────────────────────────────────────────────┤
│ 2-Column Responsive LazyVerticalGrid:                  │
│ ┌──────────────────────────┐┌──────────────────────────┐│
│ │ [Item Image]             ││ [Item Image]             ││
│ │ ₹450   [Negotiable] [🤍] ││ FREE     [Donation]  [🤍] ││
│ │ Engineering Maths Vol 1  ││ Hero Sprint 21T Cycle    ││
│ │ 📍 BH-4 • Good           ││ 📍 Uni-Mall • Like New   ││
│ │ 🛡️ Verified Student      ││ 🛡️ Verified Student      ││
│ └──────────────────────────┘└──────────────────────────┘│
└────────────────────────────────────────────────────────┘
```

---

## 2. API Endpoints & Request/Response Contracts

### 2.1 Marketplace Discovery Service (`MarketplaceDiscoveryApi.kt`)

```kotlin
package com.campusxchange.app.data.remote.api

import com.campusxchange.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface MarketplaceDiscoveryApi {

    @GET("marketplace/categories/")
    suspend fun getCategories(): Response<List<CategoryDto>>

    @GET("marketplace/listings/")
    suspend fun getListings(
        @Query("category") categorySlug: String? = null,
        @Query("search") searchQuery: String? = null,
        @Query("transaction_type") transactionType: String? = null, // "SELL", "DONATE"
        @Query("condition") condition: String? = null,
        @Query("ordering") ordering: String? = "-created_at", // "-created_at", "price", "-price", "-views_count"
        @Query("page") page: Int = 1
    ): Response<PaginatedListingsDto>

    @GET("marketplace/search-suggestions/")
    suspend fun getSearchSuggestions(
        @Query("q") query: String
    ): Response<SearchSuggestionsDto>

    @GET("marketplace/announcement/")
    suspend fun getActiveAnnouncement(): Response<AnnouncementDto>
}
```

### 2.2 Data Transfer Objects (`DiscoveryDtos.kt`)

```kotlin
package com.campusxchange.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class CategoryDto(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String,
    @SerializedName("slug") val slug: String,
    @SerializedName("icon") val iconName: String
)

data class ListingSummaryDto(
    @SerializedName("id") val id: Int,
    @SerializedName("title") val title: String,
    @SerializedName("price") val price: Double,
    @SerializedName("original_price") val originalPrice: Double?,
    @SerializedName("is_negotiable") val isNegotiable: Boolean,
    @SerializedName("transaction_type") val transactionType: String,
    @SerializedName("condition") val condition: String,
    @SerializedName("location") val location: String,
    @SerializedName("views_count") val viewsCount: Int,
    @SerializedName("primary_image") val primaryImageUrl: String?,
    @SerializedName("seller_name") val sellerName: String,
    @SerializedName("seller_is_verified") val sellerIsVerified: Boolean,
    @SerializedName("created_at") val createdAt: String
)

data class PaginatedListingsDto(
    @SerializedName("count") val count: Int,
    @SerializedName("next") val next: String?,
    @SerializedName("previous") val previous: String?,
    @SerializedName("results") val results: List<ListingSummaryDto>
)

data class SearchSuggestionsDto(
    @SerializedName("listings") val listings: List<SearchListingItemDto>,
    @SerializedName("categories") val categories: List<CategoryDto>
)

data class SearchListingItemDto(
    @SerializedName("id") val id: Int,
    @SerializedName("title") val title: String,
    @SerializedName("price") val price: Double,
    @SerializedName("category_name") val categoryName: String
)

data class AnnouncementDto(
    @SerializedName("id") val id: Int,
    @SerializedName("title") val title: String,
    @SerializedName("message") val message: String,
    @SerializedName("severity") val severity: String, // "INFO", "WARNING", "ALERT", "PROMO"
    @SerializedName("link_url") val linkUrl: String?,
    @SerializedName("is_active") val isActive: Boolean
)
```

---

## 3. UI Composable Implementations

### 3.1 Listing Card (`ListingCard.kt`)

Designed for high density, visual clarity, and responsiveness inside a 2-column grid:

```kotlin
package com.campusxchange.app.presentation.home.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.outlined.FavoriteBorder
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
import coil.compose.SubcomposeAsyncImage
import com.campusxchange.app.core.designsystem.*
import com.campusxchange.app.data.remote.dto.ListingSummaryDto

@Composable
fun ListingCard(
    listing: ListingSummaryDto,
    isSaved: Boolean,
    onSaveToggle: () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Column {
            // 1. Image Thumbnail with Floating Badges
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .background(Color(0xFFF1F5F9))
            ) {
                SubcomposeAsyncImage(
                    model = listing.primaryImageUrl,
                    contentDescription = listing.title,
                    contentScale = ContentScale.Crop,
                    loading = {
                        Box(Modifier.fillMaxSize().background(Color(0xFFE2E8F0))) // Shimmer placeholder
                    },
                    modifier = Modifier.fillMaxSize()
                )

                // Transaction / Price Badge (Top-Left)
                Surface(
                    color = if (listing.transactionType == "DONATE") SuccessGreen else Brand500,
                    shape = RoundedCornerShape(bottomEnd = 8.dp),
                    modifier = Modifier.align(Alignment.TopStart)
                ) {
                    Text(
                        text = if (listing.transactionType == "DONATE") "FREE" else "₹${listing.price.toInt()}",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }

                // Heart Save Button (Top-Right)
                IconButton(
                    onClick = onSaveToggle,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(4.dp)
                        .size(32.dp)
                        .background(Color(0x80FFFFFF), CircleShape)
                ) {
                    Icon(
                        imageVector = if (isSaved) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder,
                        contentDescription = "Save",
                        tint = if (isSaved) ErrorRed else TextSecondary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            // 2. Listing Details Body
            Column(modifier = Modifier.padding(10.dp)) {
                // Title
                Text(
                    text = listing.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 18.sp
                )

                Spacer(modifier = Modifier.height(6.dp))

                // Location Pin & Campus Spot
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = TextMuted, modifier = Modifier.size(13.dp))
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(
                        text = listing.location,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Badges Row (Condition + Seller Trust)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Condition Badge
                    Surface(
                        color = Color(0xFFF1F5F9),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = listing.condition.replace("_", " "),
                            fontSize = 10.sp,
                            color = TextSecondary,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    // Seller Verification Tag
                    if (listing.sellerIsVerified) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Verified, contentDescription = "Verified", tint = InfoBlue, modifier = Modifier.size(13.dp))
                            Spacer(modifier = Modifier.width(2.dp))
                            Text("Verified", fontSize = 10.sp, color = InfoBlue, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }
}
```

---

### 3.2 Real-Time Search & Autocomplete Suggestions (`SearchAutocompleteOverlay.kt`)

Handles 200ms debounced queries against `/api/marketplace/search-suggestions/`:

```kotlin
@Composable
fun SearchAutocompleteDropdown(
    suggestions: SearchSuggestionsDto,
    onListingSelected: (Int) -> Unit,
    onCategorySelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(vertical = 8.dp)) {
            // Category Suggestions
            if (suggestions.categories.isNotEmpty()) {
                Text(
                    "CATEGORIES",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextMuted,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )
                suggestions.categories.forEach { cat ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onCategorySelected(cat.slug) }
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Category, contentDescription = null, tint = Brand500, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(cat.name, style = MaterialTheme.typography.bodyMedium, color = TextPrimary)
                    }
                }
                HorizontalDivider(color = BorderLight, modifier = Modifier.padding(vertical = 6.dp))
            }

            // Matching Items
            if (suggestions.listings.isNotEmpty()) {
                Text(
                    "MATCHING ITEMS",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextMuted,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )
                suggestions.listings.forEach { item ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onListingSelected(item.id) }
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            item.title,
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            "₹${item.price.toInt()}",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = Brand500
                        )
                    }
                }
            }
        }
    }
}
```

---

### 3.3 Dynamic Category Chips Row (`CategoryRow.kt`)

```kotlin
@Composable
fun CategoryChipsRow(
    categories: List<CategoryDto>,
    selectedSlug: String?,
    onSelectCategory: (String?) -> Unit
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
    ) {
        // "All" Default Chip
        item {
            FilterChip(
                selected = selectedSlug == null,
                onClick = { onSelectCategory(null) },
                label = { Text("All Items") },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Brand500,
                    selectedLabelColor = Color.White
                )
            )
        }

        // Dynamic Server Categories
        items(categories) { category ->
            FilterChip(
                selected = selectedSlug == category.slug,
                onClick = { onSelectCategory(category.slug) },
                label = { Text(category.name) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Brand500,
                    selectedLabelColor = Color.White
                )
            )
        }
    }
}
```

---

### 3.4 Filter & Sort BottomSheet (`FilterSortBottomSheet.kt`)

Offers instant toggling for:
- **Transaction Type**: `All Modes`, `Sell (Commercial)`, `Free Donations`.
- **Condition**: `New`, `Like New`, `Good`, `Fair`, `Poor`.
- **Ordering**: `Newest First` (`-created_at`), `Price: Low to High` (`price`), `Price: High to Low` (`-price`), `Most Popular` (`-views_count`).

---

### 3.5 Animated Compose Canvas Background (`ThemeCanvasBackground.kt`)

Emulates `ThemeBackground.jsx` with hardware-accelerated Compose Canvas rendering without battery drain:

```kotlin
@Composable
fun ThemeCanvasBackground(modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "bg_anim")
    val offsetY by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 60f,
        animationSpec = infiniteRepeatable(
            animation = tween( durationMillis = 6000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "particle_drift"
    )

    Canvas(modifier = modifier.fillMaxSize()) {
        // Soft gradient base
        drawRect(color = BackgroundLight)

        // Floating ambient translucent shapes
        drawCircle(
            color = Color(0x08F97316),
            radius = 180.dp.toPx(),
            center = Offset(size.width * 0.85f, size.height * 0.15f + offsetY)
        )
        drawCircle(
            color = Color(0x063B82F6),
            radius = 220.dp.toPx(),
            center = Offset(size.width * 0.1f, size.height * 0.65f - offsetY)
        )
    }
}
```

---

## 4. ViewModel State Management (`HomeViewModel.kt`)

```kotlin
package com.campusxchange.app.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.campusxchange.app.data.remote.api.MarketplaceDiscoveryApi
import com.campusxchange.app.data.remote.dto.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = false,
    val categories: List<CategoryDto> = emptyList(),
    val listings: List<ListingSummaryDto> = emptyList(),
    val announcement: AnnouncementDto? = null,
    val selectedCategorySlug: String? = null,
    val searchQuery: String = "",
    val searchSuggestions: SearchSuggestionsDto? = null,
    val transactionTypeFilter: String? = null,
    val conditionFilter: String? = null,
    val sortOrdering: String = "-created_at",
    val error: String? = null
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val api: MarketplaceDiscoveryApi
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val searchQueryFlow = MutableStateFlow("")

    init {
        loadInitialFeed()
        observeSearchSuggestions()
    }

    fun loadInitialFeed() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val catRes = api.getCategories()
                val listRes = api.getListings(
                    categorySlug = _uiState.value.selectedCategorySlug,
                    transactionType = _uiState.value.transactionTypeFilter,
                    ordering = _uiState.value.sortOrdering
                )
                val announceRes = api.getActiveAnnouncement()

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        categories = catRes.body() ?: emptyList(),
                        listings = listRes.body()?.results ?: emptyList(),
                        announcement = if (announceRes.isSuccessful && announceRes.body()?.isActive == true) announceRes.body() else null
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.localizedMessage) }
            }
        }
    }

    @OptIn(FlowPreview::class)
    private fun observeSearchSuggestions() {
        viewModelScope.launch {
            searchQueryFlow
                .debounce(250L)
                .filter { it.length >= 2 }
                .distinctUntilChanged()
                .collectLatest { query ->
                    val res = api.getSearchSuggestions(query)
                    if (res.isSuccessful) {
                        _uiState.update { it.copy(searchSuggestions = res.body()) }
                    }
                }
        }
    }

    fun onSearchQueryChanged(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        searchQueryFlow.value = query
    }

    fun onCategorySelected(slug: String?) {
        _uiState.update { it.copy(selectedCategorySlug = slug, searchSuggestions = null) }
        loadInitialFeed()
    }

    fun applyFilters(transactionType: String?, condition: String?, ordering: String) {
        _uiState.update {
            it.copy(
                transactionTypeFilter = transactionType,
                conditionFilter = condition,
                sortOrdering = ordering
            )
        }
        loadInitialFeed()
    }
}
```
