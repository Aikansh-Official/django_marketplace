# 🖼️ CampusXChange — Android Promotional Banner Slideshow & Carousel Specification

> **Target Platform:** Android Native (API 26+ / Android 8.0 to Android 15+)  
> **Source Component:** `client/src/components/home/BannerSlideshow.jsx`  
> **Backend Model & API:** Django REST Framework `Banner` (`/api/marketplace/banners/`)  
> **Architecture:** Jetpack Compose `HorizontalPager`, Coil 3 / AsyncImage, StateFlow, Coroutines  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [Overview & Visual Architecture](#1-overview--visual-architecture)
2. [REST API Contract & Endpoints](#2-rest-api-contract--endpoints)
3. [Data Models & DTOs (Kotlin)](#3-data-models--dtos-kotlin)
4. [Interactive Behavior & Gesture Controls](#4-interactive-behavior--gesture-controls)
5. [Contrast Scrims & Typography Layout](#5-contrast-scrims--typography-layout)
6. [Deep-Link & Click Navigation Router](#6-deep-link--click-navigation-router)
7. [Complete Jetpack Compose Implementation](#7-complete-jetpack-compose-implementation)
8. [Edge Cases & Performance Optimizations](#8-edge-cases--performance-optimizations)

---

## 1. Overview & Visual Architecture

The **Promotional Banner Slideshow** is a critical hero component positioned at the very top of the CampusXChange Marketplace Home screen (directly below the Top Announcement Bar and Search Bar). It is configured dynamically from the Django Admin / Web Admin dashboard to feature campus events, seasonal clearance sales, safety guidelines, and spotlighted categories.

```
┌────────────────────────────────────────────────────────────────────────┐
│  [FEATURED]                                                            │
│  Sem-End Campus Clearance Sale! 🔥                                     │
│  Get textbooks, lab aprons & electronics up to 70% off.                │
│                                                                        │
│  [ Explore Deals → ]                                       ( • ━ • • ) │
└────────────────────────────────────────────────────────────────────────┘
  ▲ Coil Image Layer + Dark Multi-Layer Gradient Overlays + Action Router
```

### Visual Specifications:
- **Aspect Ratio:** Fixed height `180.dp` on standard phones, up to `220.dp` on large devices / tablets (responsive ratio ~`2.2:1` to `16:9`).
- **Corner Radius:** `20.dp` with `clipToBounds = true`.
- **Card Margin:** `horizontal = 16.dp`, `top = 8.dp`, `bottom = 8.dp`.
- **Elevation / Shadow:** 4dp soft ambient shadow (`Color.Black.copy(alpha = 0.12f)`).
- **Background Fallback:** Dark Slate (`0xFF0F172A`) during loading or image errors.

---

## 2. REST API Contract & Endpoints

### 2.1 Public Banner Endpoint

| Property | Value |
|:---|:---|
| **Method / URL** | `GET /api/marketplace/banners/` |
| **Authentication** | Public (Anonymous allowed) |
| **Required Header** | `X-App-Security-Key: campusXchange_secure_key_2026_@nshuman892494` |
| **Sorting** | Ordered by `display_order` ASC, then `created_at` DESC |
| **Filter** | Only returns items where `is_active == true` |

### 2.2 Response Payload Example (JSON)
```json
[
  {
    "id": 1,
    "title": "Mega Semester Book Exchange 📚",
    "subtitle": "Exchange or buy 2nd-hand engineering & management textbooks directly from seniors.",
    "badge_text": "FEATURED",
    "image_url": "https://res.cloudinary.com/campusxchange/image/upload/v1710000000/banners/books_promo.jpg",
    "link_url": "/marketplace?category=books",
    "button_text": "Explore Books",
    "is_active": true,
    "display_order": 0,
    "created_at": "2026-03-10T14:20:00Z",
    "updated_at": "2026-03-15T09:12:00Z"
  },
  {
    "id": 2,
    "title": "Safe In-Person QR Handovers 🛡️",
    "subtitle": "Always verify items and scan QR code inside campus daylight zones.",
    "badge_text": "SAFETY TIP",
    "image_url": "https://res.cloudinary.com/campusxchange/image/upload/v1710000000/banners/safety_handover.jpg",
    "link_url": "/safety-guidelines",
    "button_text": "Read Guidelines",
    "is_active": true,
    "display_order": 1,
    "created_at": "2026-03-12T11:00:00Z",
    "updated_at": "2026-03-12T11:00:00Z"
  },
  {
    "id": 3,
    "title": "Official Student Community WhatsApp",
    "subtitle": "Join 5,000+ peers for instant trade alerts and campus updates.",
    "badge_text": "COMMUNITY",
    "image_url": "https://res.cloudinary.com/campusxchange/image/upload/v1710000000/banners/community_join.jpg",
    "link_url": "https://chat.whatsapp.com/campusxchange_community",
    "button_text": "Join Group",
    "is_active": true,
    "display_order": 2,
    "created_at": "2026-03-14T08:30:00Z",
    "updated_at": "2026-03-14T08:30:00Z"
  }
]
```

---

## 3. Data Models & DTOs (Kotlin)

```kotlin
package com.campusxchange.data.model

import com.google.gson.annotations.SerializedName

data class BannerDto(
    @SerializedName("id") val id: Int,
    @SerializedName("title") val title: String,
    @SerializedName("subtitle") val subtitle: String? = "",
    @SerializedName("badge_text") val badgeText: String? = "Featured",
    @SerializedName("image_url") val imageUrl: String,
    @SerializedName("link_url") val linkUrl: String? = "",
    @SerializedName("button_text") val buttonText: String? = "Explore Now",
    @SerializedName("is_active") val isActive: Boolean = true,
    @SerializedName("display_order") val displayOrder: Int = 0,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("updated_at") val updatedAt: String? = null
)
```

---

## 4. Interactive Behavior & Gesture Controls

| State / Trigger | Android Behavior | Implementation Detail |
|:---|:---|:---|
| **Auto-Play Engine** | Slides every 5,000 ms automatically | `LaunchedEffect` with `while(isActive)` & `delay(5000)` |
| **Touch Interaction** | User dragging / touch immediately pauses timer | `pagerState.isScrollInProgress` pauses timer |
| **Single Slide** | When `banners.size == 1`, auto-play and dots are disabled | Guard condition: `if (banners.size > 1)` |
| **Empty State** | If API returns `[]`, carousel height collapses to `0.dp` | Returns `Spacer(Modifier.height(0.dp))` (no blank gaps) |
| **Tap Action** | Triggers deep-link router | `Modifier.clickable { onBannerClick(banner) }` |

---

## 5. Contrast Scrims & Typography Layout

Banner images can be bright, white, or colorful. To guarantee WCAG AAA text legibility, the Android UI applies a **multi-layered gradient scrim** directly over the image:

1. **Vertical Bottom-Up Scrim:**
   - Colors: `[Color.Transparent, Color.Black.copy(alpha = 0.45f), Color.Black.copy(alpha = 0.90f)]`
   - Stops: `[0.0f, 0.40f, 1.0f]`
2. **Horizontal Leading-To-Trailing Scrim:**
   - Colors: `[Color.Black.copy(alpha = 0.80f), Color.Black.copy(alpha = 0.35f), Color.Transparent]`
   - Stops: `[0.0f, 0.55f, 1.0f]`

### Content Hierarchy:
1. **Badge Chip (Top-Left / Above Title):**
   - Background: `Color(0xFFF97316)` (Brand Orange) or frosted glass `Color.White.copy(alpha = 0.20f)`.
   - Text: Uppercase, 10.sp, ExtraBold (`FontWeight.W900`), letter spacing `1.sp`.
2. **Headline Title:**
   - Style: 20.sp to 22.sp, ExtraBold (`FontWeight.W800`), White, Max 2 lines with `TextOverflow.Ellipsis`.
   - Shadow: `Shadow(color = Color.Black.copy(alpha = 0.6f), blurRadius = 4f)`.
3. **Supporting Subtitle:**
   - Style: 13.sp, Medium (`FontWeight.W500`), `Color(0xFFE2E8F0)` (Slate 200), Max 2 lines.
4. **CTA Action Button:**
   - Background: `Color.White` with text `Color(0xFF0F172A)` (Dark Slate) for maximum punch.
   - Icon: `Icons.Default.ArrowForward` for internal links, or `Icons.Default.OpenInNew` for external HTTP links.

---

## 6. Deep-Link & Click Navigation Router

When a banner is tapped, `link_url` is evaluated by the central navigation handler:

```kotlin
fun handleBannerClick(context: Context, navController: NavController, linkUrl: String?) {
    if (linkUrl.isNullOrBlank()) return
    val trimmed = linkUrl.trim()

    when {
        // 1. External Web URL (e.g., WhatsApp group, university notice, external form)
        trimmed.startsWith("http://", ignoreCase = true) || trimmed.startsWith("https://", ignoreCase = true) -> {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(trimmed)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            try {
                context.startActivity(intent)
            } catch (e: Exception) {
                // Fallback to Chrome Custom Tabs or log error
            }
        }

        // 2. Specific Listing Deep-Link (/listings/42 or /listings/65f...)
        trimmed.startsWith("/listings/") -> {
            val listingId = trimmed.removePrefix("/listings/").trim()
            navController.navigate("product_detail/$listingId")
        }

        // 3. Category Filter Deep-Link (/marketplace?category=books)
        trimmed.contains("category=") -> {
            val categoryQuery = trimmed.substringAfter("category=").substringBefore("&")
            navController.navigate("marketplace_feed?category=$categoryQuery")
        }

        // 4. In-App Static Routes
        trimmed.startsWith("/safety") -> navController.navigate("safety_guidelines")
        trimmed.startsWith("/upgrade-seller") -> navController.navigate("upgrade_seller")
        trimmed.startsWith("/profile") -> navController.navigate("profile")
        trimmed.startsWith("/marketplace") -> navController.navigate("marketplace_feed")

        // 5. General Fallback
        else -> {
            // Attempt NavController navigation by route name
            try {
                navController.navigate(trimmed.removePrefix("/"))
            } catch (e: Exception) {
                // Ignore unrecognized route
            }
        }
    }
}
```

---

## 7. Complete Jetpack Compose Implementation

### 7.1 ViewModel Layer
```kotlin
package com.campusxchange.ui.banner

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.campusxchange.data.model.BannerDto
import com.campusxchange.data.network.MarketplaceApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface BannerUiState {
    object Loading : BannerUiState
    data class Success(val banners: List<BannerDto>) : BannerUiState
    object Empty : BannerUiState
    data class Error(val message: String) : BannerUiState
}

@HiltViewModel
class BannerViewModel @Inject constructor(
    private val apiService: MarketplaceApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow<BannerUiState>(BannerUiState.Loading)
    val uiState: StateFlow<BannerUiState> = _uiState.asStateFlow()

    init {
        loadBanners()
    }

    fun loadBanners() {
        viewModelScope.launch {
            try {
                val response = apiService.getActiveBanners()
                if (response.isSuccessful) {
                    val list = response.body().orEmpty()
                    if (list.isEmpty()) {
                        _uiState.value = BannerUiState.Empty
                    } else {
                        _uiState.value = BannerUiState.Success(list)
                    }
                } else {
                    _uiState.value = BannerUiState.Error("HTTP ${response.code()}")
                }
            } catch (e: Exception) {
                _uiState.value = BannerUiState.Error(e.localizedMessage ?: "Network Error")
            }
        }
    }
}
```

### 7.2 Banner Slideshow Composable
```kotlin
package com.campusxchange.ui.banner

import android.content.Context
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.collectIsDraggedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.campusxchange.data.model.BannerDto
import kotlinx.coroutines.delay

@Composable
fun BannerSlideshow(
    uiState: BannerUiState,
    navController: NavController,
    modifier: Modifier = Modifier
) {
    when (uiState) {
        is BannerUiState.Success -> {
            BannerCarouselContent(
                banners = uiState.banners,
                navController = navController,
                modifier = modifier
            )
        }
        is BannerUiState.Loading -> {
            BannerShimmerPlaceholder(modifier = modifier)
        }
        is BannerUiState.Empty, is BannerUiState.Error -> {
            // Collapse completely without gap
            Spacer(modifier = Modifier.height(0.dp))
        }
    }
}

@Composable
fun BannerCarouselContent(
    banners: List<BannerDto>,
    navController: NavController,
    modifier: Modifier = Modifier
) {
    if (banners.isEmpty()) return

    val context = LocalContext.current
    val totalPages = banners.size
    val pagerState = rememberPagerState(pageCount = { totalPages })
    val isDragged by pagerState.interactionSource.collectIsDraggedAsState()

    // 5-Second Auto-Scroll Timer (Paused during user touch drag)
    if (totalPages > 1) {
        LaunchedEffect(isDragged, totalPages) {
            while (!isDragged) {
                delay(5000L)
                val nextPage = (pagerState.currentPage + 1) % totalPages
                pagerState.animateScrollToPage(
                    page = nextPage,
                    animationSpec = tween(durationMillis = 650)
                )
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .height(185.dp)
            .clip(RoundedCornerShape(20.dp))
            .shadow(6.dp, RoundedCornerShape(20.dp))
            .background(Color(0xFF0F172A))
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize()
        ) { pageIndex ->
            val banner = banners[pageIndex]
            BannerSlideItem(
                banner = banner,
                onClick = { handleBannerClick(context, navController, banner.linkUrl) }
            )
        }

        // Indicators (Shown only when multiple banners exist)
        if (totalPages > 1) {
            Row(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 16.dp, bottom = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(totalPages) { index ->
                    val isSelected = pagerState.currentPage == index
                    val dotWidth by animateDpAsState(
                        targetValue = if (isSelected) 22.dp else 6.dp,
                        animationSpec = tween(300),
                        label = "dot_width"
                    )
                    val dotColor by animateColorAsState(
                        targetValue = if (isSelected) Color(0xFFF97316) else Color.White.copy(alpha = 0.45f),
                        animationSpec = tween(300),
                        label = "dot_color"
                    )

                    Box(
                        modifier = Modifier
                            .height(6.dp)
                            .width(dotWidth)
                            .clip(CircleShape)
                            .background(dotColor)
                    )
                }
            }
        }
    }
}

@Composable
fun BannerSlideItem(
    banner: BannerDto,
    onClick: () -> Unit
) {
    val context = LocalContext.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .clickable(onClick = onClick)
    ) {
        // 1. Background Image with Coil
        AsyncImage(
            model = ImageRequest.Builder(context)
                .data(banner.imageUrl)
                .crossfade(350)
                .build(),
            contentDescription = banner.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )

        // 2. Dual Contrast Scrim Overlays
        // Vertical Scrim (Bottom to Top)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color.Black.copy(alpha = 0.45f),
                            Color.Black.copy(alpha = 0.90f)
                        ),
                        startY = 0f,
                        endY = Float.POSITIVE_INFINITY
                    )
                )
        )

        // Horizontal Scrim (Left to Right)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.75f),
                            Color.Black.copy(alpha = 0.30f),
                            Color.Transparent
                        )
                    )
                )
        )

        // 3. Overlaid Information Content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.Bottom
        ) {
            // Badge Chip (if present)
            if (!banner.badgeText.isNullOrBlank()) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFF97316),
                    modifier = Modifier.padding(bottom = 6.dp)
                ) {
                    Text(
                        text = banner.badgeText.uppercase(),
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.8.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }

            // Title Headline
            Text(
                text = banner.title,
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                style = LocalTextStyle.current.copy(
                    shadow = Shadow(
                        color = Color.Black.copy(alpha = 0.7f),
                        offset = Offset(1f, 2f),
                        blurRadius = 4f
                    )
                )
            )

            // Subtitle Description
            if (!banner.subtitle.isNullOrBlank()) {
                Text(
                    text = banner.subtitle,
                    color = Color(0xFFE2E8F0),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp),
                    style = LocalTextStyle.current.copy(
                        shadow = Shadow(
                            color = Color.Black.copy(alpha = 0.6f),
                            offset = Offset(1f, 1f),
                            blurRadius = 3f
                        )
                    )
                )
            }

            // CTA Action Button
            val isExternal = banner.linkUrl?.startsWith("http", ignoreCase = true) == true
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Color.White,
                modifier = Modifier
                    .padding(top = 8.dp)
                    .clickable(onClick = onClick)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = banner.buttonText?.ifBlank { "Explore Now" } ?: "Explore Now",
                        color = Color(0xFF0F172A),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Icon(
                        imageVector = if (isExternal) Icons.Default.OpenInNew else Icons.Default.ArrowForward,
                        contentDescription = null,
                        tint = Color(0xFF0F172A),
                        modifier = Modifier.size(13.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun BannerShimmerPlaceholder(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .height(185.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(Color(0xFF1E293B))
    )
}
```

---

## 8. Edge Cases & Performance Optimizations

1. **Bitmap Memory Optimization:** Coil's disk and memory cache automatically ensures images are downsampled to target dimensions rather than keeping raw megabyte photos in memory.
2. **Network Resilience:** If the device is offline or the endpoint fails, the `BannerUiState.Error` state cleanly sets the banner space to `0.dp`, ensuring user browsing is never obstructed by an ugly blank error box.
3. **Admin Dynamic Updates:** Whenever an administrator creates, reorders, or activates a banner via the web dashboard, the Android app receives the new ordering automatically on the next pull-to-refresh or app launch.
4. **Security Header Enforcement:** The request must include `X-App-Security-Key: campusXchange_secure_key_2026_@nshuman892494` through the central `OkHttpClient` Authenticator Interceptor.
