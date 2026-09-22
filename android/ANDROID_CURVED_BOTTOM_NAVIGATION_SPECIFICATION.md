# 📱 CampusXChange — Android Curved Cradle Navigation, Top Bar & Role Dashboards Specification

> **Module Identifier:** Module 16  
> **Target Platform:** Android Native (API Level 26+ / Android 8.0 to Android 15+)  
> **Tech Stack:** Kotlin 2.x, Jetpack Compose, Material 3, Hilt, Coroutines StateFlow, Room DB, Retrofit 2  
> **Backend Integration:** Django REST Framework (`/api/auth/status/`, `/api/marketplace/`, `/api/chat/`)  
> **Design Parity:** 100% Alignment with CampusXChange Web Client (`Navbar.jsx`, `Home.jsx`, `ThemeBackground.jsx`)  
> **Primary Brand Palette:** Vibrant Campus Orange (`#FB5607` / `#F97316`), Frosted Glassmorphism (`0xF2FFFFFF` + `blur(16dp)`), Plus Jakarta Sans Typography  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [Executive Summary & Visual Anatomy](#1-executive-summary--visual-anatomy)
2. [Cradle Notch Mathematical Geometry (`CradleNotchShape.kt`)](#2-cradle-notch-mathematical-geometry)
3. [Global Dynamic App Session Engine (`AppSessionViewModel.kt`)](#3-global-dynamic-app-session-engine)
4. [Adaptive Campus Top Bar Architecture (`CampusDynamicTopBar.kt`)](#4-adaptive-campus-top-bar-architecture)
   - 4.1 Buyer Top Bar (Geolocation, Live Autocomplete Search, Role Toggle)
   - 4.2 Seller Top Bar (Store Reputation, Status Pill, Buyer Feed Switch)
5. [Curved Cradle Bottom Navigation Bar (`CurvedCradleBottomBar.kt`)](#5-curved-cradle-bottom-navigation-bar)
   - 5.1 Context-Aware Hero Action (Default WTB vs. Handover Alert)
   - 5.2 Animated Orange Dot Indicator (`•`)
   - 5.3 Buyer vs. Seller Navigation Matrix
6. [Role-Specific Dynamic Dashboards](#6-role-specific-dynamic-dashboards)
   - 6.1 Buyer Dashboard (`BuyerDashboardScreen.kt`)
   - 6.2 Seller Dashboard (`SellerDashboardScreen.kt`)
7. [Master Navigation Scaffold Integration (`CampusMasterScaffold.kt`)](#7-master-navigation-scaffold-integration)
8. [Complete REST API Contract](#8-complete-rest-api-contract)
9. [Verification & QA Testing Matrix](#9-verification--qa-testing-matrix)

---

## 1. Executive Summary & Visual Anatomy

The CampusXChange Android navigation framework provides an immersive, tactile experience designed specifically for university campus commerce. It combines:
1. **Floating Pill Dock:** A detached frosted glassmorphic navigation bar with `32.dp` rounded corners.
2. **Concave Cradle Cutout:** An organic scoop carved into the top-center of the bar using smooth Cubic Bezier curves.
3. **Elevated Hero Action Button (FAB):** A solid **Vibrant Campus Orange** (`#FB5607`) circular button half-docked in the cradle scoop.
4. **Active State Orange Dot (`•`):** A subtle animated dot indicating the current destination or nestled right below the cradle when the center action is triggered.
5. **Dynamic Role Parity:** Real-time state toggling between **Buyer Mode** (browsing, wishlist, peer chat, and context-aware deal verification) and **Seller Hub** (revenue metrics, active listings, incoming offer bargaining, and QR generation).

```
                  ┌──────────────┐
                  │ ⚡ Hero FAB  │  (Elevated #FB5607 Circular Button + White Icon)
         ╭────────┴──────────────┴────────╮
 ╭───────╯  \   Concave Cradle Cutout   / ╰───────╮
 │  [ ▤ ]       [ 🛒 ]          [ 💬 ]     [ 👤 ] │  (Floating Frosted White Glass Pill)
 │               • (Orange Dot)                   │  (#FB5607 Animated Indicator Dot)
 ╰────────────────────────────────────────────────╯
```

---

## 2. Cradle Notch Mathematical Geometry (`CradleNotchShape.kt`)

To prevent jagged edges, clipping artifacts, or abrupt angles, the cradle notch uses **Cubic Bezier curves** (`cubicTo`) that guarantee tangent continuity ($C^1$ smoothness) across density scales.

```
       CradleLeft
           P1        Control1    Control2     P2
            *---------\                     /---------*
                       \                   /
                        \     Trough      /
                         *---------------*
                            CradleCenter
```

### 2.1 Complete `CradleNotchShape.kt` Implementation

```kotlin
package com.campusxchange.app.ui.components.navigation

import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp

/**
 * Creates the organic concave cradle notch shape with continuous Bezier curvature
 * matching the CampusXChange floating dock design.
 *
 * @param cradleRadius Radius of the central cutout for the FAB
 * @param cradleDepth Depth of the concave scoop into the navigation bar
 * @param cornerRadius Outer pill corner radius (32.dp)
 * @param smoothCornerRadius Curvature lead-in and lead-out smoothing
 */
class CradleNotchShape(
    private val cradleRadius: Dp = 38.dp,
    private val cradleDepth: Dp = 26.dp,
    private val cornerRadius: Dp = 32.dp,
    private val smoothCornerRadius: Dp = 12.dp
) : Shape {
    override fun createOutline(
        size: Size,
        layoutDirection: LayoutDirection,
        density: Density
    ): Outline {
        val radiusPx = with(density) { cradleRadius.toPx() }
        val depthPx = with(density) { cradleDepth.toPx() }
        val cornerPx = with(density) { cornerRadius.toPx() }
        val smoothPx = with(density) { smoothCornerRadius.toPx() }

        val path = Path().apply {
            val centerX = size.width / 2f

            // 1. Start from top-left after corner radius
            moveTo(0f, cornerPx)
            // Top-left outer rounded corner
            cubicTo(0f, cornerPx * 0.45f, cornerPx * 0.45f, 0f, cornerPx, 0f)

            // 2. Flat line toward center cradle notch
            val cradleLeft = centerX - radiusPx - smoothPx
            lineTo(cradleLeft, 0f)

            // 3. Smooth concave cradle scoop (Cubic Bezier)
            // Left lead-in curve into scoop
            cubicTo(
                x1 = cradleLeft + smoothPx * 0.5f, y1 = 0f,
                x2 = centerX - radiusPx, y2 = depthPx * 0.25f,
                x3 = centerX - radiusPx + (smoothPx * 0.2f), y3 = depthPx * 0.85f
            )
            // Bottom trough curvature
            cubicTo(
                x1 = centerX - (radiusPx * 0.45f), y1 = depthPx,
                x2 = centerX + (radiusPx * 0.45f), y2 = depthPx,
                x3 = centerX + radiusPx - (smoothPx * 0.2f), y3 = depthPx * 0.85f
            )
            // Right lead-out curve out of scoop
            val cradleRight = centerX + radiusPx + smoothPx
            cubicTo(
                x1 = centerX + radiusPx, y1 = depthPx * 0.25f,
                x2 = cradleRight - smoothPx * 0.5f, y2 = 0f,
                x3 = cradleRight, y3 = 0f
            )

            // 4. Flat line to top-right outer corner
            lineTo(size.width - cornerPx, 0f)
            cubicTo(
                size.width - cornerPx * 0.45f, 0f,
                size.width, cornerPx * 0.45f,
                size.width, cornerPx
            )

            // 5. Right side vertical line & bottom-right corner
            lineTo(size.width, size.height - cornerPx)
            cubicTo(
                size.width, size.height - cornerPx * 0.45f,
                size.width - cornerPx * 0.45f, size.height,
                size.width - cornerPx, size.height
            )

            // 6. Bottom edge & bottom-left corner
            lineTo(cornerPx, size.height)
            cubicTo(
                cornerPx * 0.45f, size.height,
                0f, size.height - cornerPx * 0.45f,
                0f, size.height - cornerPx
            )

            close()
        }
        return Outline.Generic(path)
    }
}
```

---

## 3. Global Dynamic App Session Engine (`AppSessionViewModel.kt`)

Mirroring `client/src/App.jsx` and `client/src/components/Navbar.jsx`, the Android app maintains a single reactive source of truth for student identity, role switching, unread message badges, and active handover alerts.

### 3.1 Data Contracts & State Models

```kotlin
package com.campusxchange.app.ui.navigation.state

import androidx.compose.ui.graphics.vector.ImageVector

enum class UserRole { BUYER, SELLER }

data class StudentUser(
    val id: String,
    val username: String,
    val email: String,
    val fullName: String,
    val profilePhotoUrl: String?,
    val role: String,               // "BUYER", "SELLER", "ADMIN"
    val isIdVerified: Boolean,       // Verified via Campus Student ID OCR
    val isStaff: Boolean,
    val trustScore: Float,          // e.g. 4.9f
    val campusLocation: String       // e.g. "BH-4, Boys Hostel 4"
) {
    val isEligibleSeller: Boolean
        get() = role == "SELLER" || isIdVerified || isStaff
}

data class ActiveMeetupTrade(
    val dealId: String,
    val listingId: String,
    val listingTitle: String,
    val peerName: String,
    val agreedPrice: Double,
    val meetupLocation: String,     // e.g. "Block 34 Canteen"
    val scheduledTime: String,
    val status: String,             // "ACCEPTED", "PENDING_HANDOVER", "COMPLETED"
    val isBuyer: Boolean
)

data class AppSessionUiState(
    val isAuthenticated: Boolean = false,
    val currentUser: StudentUser? = null,
    val activeRole: UserRole = UserRole.BUYER,
    val unreadNotificationsCount: Int = 0,
    val unreadChatCount: Int = 0,
    val savedWishlistCount: Int = 0,
    val activeMeetupTrade: ActiveMeetupTrade? = null,
    val selectedCampusBlock: String = "LPU Campus (All Blocks)"
)
```

### 3.2 `AppSessionViewModel.kt` Implementation

```kotlin
package com.campusxchange.app.ui.navigation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.campusxchange.app.data.repository.SessionRepository
import com.campusxchange.app.ui.navigation.state.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AppSessionViewModel @Inject constructor(
    private val sessionRepository: SessionRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AppSessionUiState())
    val uiState: StateFlow<AppSessionUiState> = _uiState.asStateFlow()

    init {
        syncUserSession()
        startPeriodicUnreadPolling()
        observeActiveMeetups()
    }

    private fun syncUserSession() {
        viewModelScope.launch {
            sessionRepository.getUserStatus().collect { user ->
                _uiState.update { current ->
                    current.copy(
                        isAuthenticated = user != null,
                        currentUser = user,
                        activeRole = if (user?.role == "SELLER") UserRole.SELLER else current.activeRole
                    )
                }
            }
        }
    }

    private fun startPeriodicUnreadPolling() {
        viewModelScope.launch {
            // Polls notifications every 20s and chats every 10s (matching web client)
            sessionRepository.pollUnreadCounts().collect { (notifications, chats) ->
                _uiState.update {
                    it.copy(
                        unreadNotificationsCount = notifications,
                        unreadChatCount = chats
                    )
                }
            }
        }
    }

    private fun observeActiveMeetups() {
        viewModelScope.launch {
            sessionRepository.getActiveMeetupTrade().collect { trade ->
                _uiState.update { it.copy(activeMeetupTrade = trade) }
            }
        }
    }

    fun toggleRole(requestedRole: UserRole, onRequireSellerUpgrade: () -> Unit) {
        val user = _uiState.value.currentUser
        if (requestedRole == UserRole.SELLER && user?.isEligibleSeller != true) {
            // Trigger 5-step seller onboarding / ID card verification flow
            onRequireSellerUpgrade()
            return
        }
        _uiState.update { it.copy(activeRole = requestedRole) }
    }

    fun updateCampusBlock(blockName: String) {
        _uiState.update { it.copy(selectedCampusBlock = blockName) }
    }
}
```

---

## 4. Adaptive Campus Top Bar Architecture (`CampusDynamicTopBar.kt`)

The Top Bar dynamically reconfigures its UI based on whether the student is currently browsing as a **Buyer** or managing their inventory as a **Seller**.

### 4.1 Buyer Top Bar (`BuyerTopAppBar.kt`)

```kotlin
package com.campusxchange.app.ui.components.topbar

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.campusxchange.app.ui.navigation.state.AppSessionUiState
import com.campusxchange.app.ui.navigation.state.UserRole
import com.campusxchange.app.ui.theme.*

@Composable
fun BuyerTopAppBar(
    sessionState: AppSessionUiState,
    onRoleToggle: (UserRole) -> Unit,
    onSearchClick: () -> Unit,
    onNotificationsClick: () -> Unit,
    onLocationClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding(),
        color = SurfaceGlassLight,
        tonalElevation = 1.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // 1. Campus Geolocation Block Selector Chip
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(BrandLight)
                    .border(1.dp, BrandBorder.copy(alpha = 0.6f), RoundedCornerShape(20.dp))
                    .clickable(onClick = onLocationClick)
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = "Campus Location",
                    tint = BrandPrimary,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = sessionState.selectedCampusBlock.take(14),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = BrandPrimary
                )
                Icon(
                    imageVector = Icons.Default.ArrowDropDown,
                    contentDescription = "Select Block",
                    tint = BrandPrimary,
                    modifier = Modifier.size(16.dp)
                )
            }

            // 2. Compact Search Bar Trigger
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 10.dp)
                    .height(38.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(SurfaceVariantLight)
                    .border(1.dp, BorderSubtle, RoundedCornerShape(20.dp))
                    .clickable(onClick = onSearchClick)
                    .padding(horizontal = 12.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search",
                    tint = TextMuted,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Search cycles, books...",
                    fontSize = 12.sp,
                    color = TextMuted,
                    maxLines = 1
                )
            }

            // 3. Switch to Seller Pill & Notification Bell
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Switch to Seller Mode Pill
                OutlinedButton(
                    onClick = { onRoleToggle(UserRole.SELLER) },
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                    shape = RoundedCornerShape(20.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = androidx.compose.ui.graphics.SolidColor(BrandPrimary)
                    ),
                    modifier = Modifier.height(32.dp)
                ) {
                    Text(
                        text = "Sell ⇄",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = BrandPrimary
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Notification Bell with Unread Badge
                BadgedBox(
                    badge = {
                        if (sessionState.unreadNotificationsCount > 0) {
                            Badge(
                                containerColor = BrandPrimary,
                                contentColor = Color.White
                            ) {
                                Text(
                                    text = if (sessionState.unreadNotificationsCount > 9) "9+"
                                    else sessionState.unreadNotificationsCount.toString()
                                )
                            }
                        }
                    },
                    modifier = Modifier.clickable(onClick = onNotificationsClick)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Notifications,
                        contentDescription = "Notifications",
                        tint = TextSecondary,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        }
    }
}
```

### 4.2 Seller Top Bar (`SellerTopAppBar.kt`)

```kotlin
@Composable
fun SellerTopAppBar(
    sessionState: AppSessionUiState,
    onRoleToggle: (UserRole) -> Unit,
    onNotificationsClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding(),
        color = SurfaceGlassLight,
        tonalElevation = 1.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // 1. Seller Shop Avatar + Verified Badge
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(34.dp)
                        .clip(CircleShape)
                        .background(BrandPrimary),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = sessionState.currentUser?.fullName?.take(1) ?: "S",
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = sessionState.currentUser?.fullName ?: "Seller Store",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Verified Student",
                            tint = SuccessGreen,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                    Text(
                        text = "🟢 Live • 15m avg reply",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        color = TextSecondary
                    )
                }
            }

            // 2. Switch back to Buyer Feed & Offers Alert
            Row(verticalAlignment = Alignment.CenterVertically) {
                Button(
                    onClick = { onRoleToggle(UserRole.BUYER) },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandLight),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier.height(32.dp)
                ) {
                    Text(
                        text = "Buyer Feed ➔",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = BrandPrimary
                    )
                }

                Spacer(modifier = Modifier.width(10.dp))

                BadgedBox(
                    badge = {
                        if (sessionState.unreadNotificationsCount > 0) {
                            Badge(containerColor = BrandPrimary, contentColor = Color.White) {
                                Text(sessionState.unreadNotificationsCount.toString())
                            }
                        }
                    },
                    modifier = Modifier.clickable(onClick = onNotificationsClick)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Notifications,
                        contentDescription = "Alerts",
                        tint = TextSecondary,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        }
    }
}
```

---

## 5. Curved Cradle Bottom Navigation Bar (`CurvedCradleBottomBar.kt`)

### 5.1 Context-Aware Hero Action Model

To solve the constraint that **Scan QR must not be displayed permanently for Buyers**:
- **Default State (95% browsing):** Shows **"+ Request Item (Want to Buy)"** (`Icons.Default.AddComment`).
- **Contextual Trigger:** When `activeMeetupTrade?.status == "PENDING_HANDOVER"`, it morphs into **"Verify Handover (Scan QR / Enter PIN)"** with a pulsating orange beacon ring (`#FB5607`).
- **Seller State:** Core call-to-action is **"+ List Item / Sell Now"** (`Icons.Default.Add`).

```kotlin
sealed class DynamicHeroAction(
    val title: String,
    val icon: ImageVector,
    val badgeCount: Int = 0,
    val isPulsingAlert: Boolean = false,
    val actionRoute: String
) {
    object BuyerPostRequest : DynamicHeroAction(
        title = "Post Request",
        icon = Icons.Default.AddComment,
        actionRoute = "post_buy_request"
    )

    data class BuyerVerifyHandover(val dealId: String) : DynamicHeroAction(
        title = "Verify Handover",
        icon = Icons.Default.QrCodeScanner,
        badgeCount = 1,
        isPulsingAlert = true,
        actionRoute = "handover_verify/$dealId"
    )

    object SellerCreateListing : DynamicHeroAction(
        title = "Sell Item",
        icon = Icons.Default.Add,
        actionRoute = "create_listing"
    )
}
```

### 5.2 Destination Navigation Items & Models

```kotlin
data class NavigationTabItem(
    val route: String,
    val label: String,
    val unselectedIcon: ImageVector,
    val selectedIcon: ImageVector
)

fun getBuyerLeftTabs() = listOf(
    NavigationTabItem("marketplace_feed", "Explore", Icons.Outlined.GridView, Icons.Filled.GridView),
    NavigationTabItem("wishlist", "Saved", Icons.Outlined.BookmarkBorder, Icons.Filled.Bookmark)
)

fun getBuyerRightTabs() = listOf(
    NavigationTabItem("chat_list", "Chats", Icons.Outlined.ChatBubbleOutline, Icons.Filled.ChatBubble),
    NavigationTabItem("buyer_profile", "Profile", Icons.Outlined.Person, Icons.Filled.Person)
)

fun getSellerLeftTabs() = listOf(
    NavigationTabItem("seller_dashboard", "Hub", Icons.Outlined.Insights, Icons.Filled.Insights),
    NavigationTabItem("my_listings", "Listings", Icons.Outlined.Inventory2, Icons.Filled.Inventory2)
)

fun getSellerRightTabs() = listOf(
    NavigationTabItem("seller_offers", "Offers", Icons.Outlined.Handshake, Icons.Filled.Handshake),
    NavigationTabItem("seller_profile", "Store", Icons.Outlined.VerifiedUser, Icons.Filled.VerifiedUser)
)
```

### 5.3 Complete `CurvedCradleBottomBar.kt` Implementation

```kotlin
package com.campusxchange.app.ui.components.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import com.campusxchange.app.ui.navigation.state.UserRole
import com.campusxchange.app.ui.theme.*

@Composable
fun CurvedCradleBottomBar(
    currentRole: UserRole,
    currentRoute: String,
    heroAction: DynamicHeroAction,
    unreadChatCount: Int,
    pendingOfferCount: Int,
    onTabSelected: (String) -> Unit,
    onHeroActionClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val haptic = LocalHapticFeedback.current
    val leftTabs = remember(currentRole) {
        if (currentRole == UserRole.BUYER) getBuyerLeftTabs() else getSellerLeftTabs()
    }
    val rightTabs = remember(currentRole) {
        if (currentRole == UserRole.BUYER) getBuyerRightTabs() else getSellerRightTabs()
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        contentAlignment = Alignment.BottomCenter
    ) {
        // Floating Pill Container with Concave Scoop
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(68.dp)
                .shadow(
                    elevation = 12.dp,
                    shape = CradleNotchShape(),
                    ambientColor = Color.Black.copy(alpha = 0.08f),
                    spotColor = BrandPrimary.copy(alpha = 0.14f)
                ),
            shape = CradleNotchShape(),
            color = SurfaceGlassLight,
            tonalElevation = 2.dp
        ) {
            Row(
                modifier = Modifier.fillMaxSize(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left 2 Navigation Destination Tabs
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    leftTabs.forEach { tab ->
                        CradleNavItem(
                            item = tab,
                            isSelected = currentRoute == tab.route,
                            badgeCount = 0,
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                onTabSelected(tab.route)
                            }
                        )
                    }
                }

                // Center Spacer matching the Concave Cradle Scoop
                Spacer(modifier = Modifier.width(72.dp))

                // Right 2 Navigation Destination Tabs
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    rightTabs.forEachIndexed { index, tab ->
                        val badge = if (index == 0) {
                            if (currentRole == UserRole.BUYER) unreadChatCount else pendingOfferCount
                        } else 0

                        CradleNavItem(
                            item = tab,
                            isSelected = currentRoute == tab.route,
                            badgeCount = badge,
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                onTabSelected(tab.route)
                            }
                        )
                    }
                }
            }
        }

        // Docked Circular Hero Action FAB (Brand Primary Orange #FB5607)
        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .offset(y = (-18).dp)
        ) {
            FloatingActionButton(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onHeroActionClick()
                },
                modifier = Modifier
                    .size(58.dp)
                    .shadow(
                        elevation = 8.dp,
                        shape = CircleShape,
                        spotColor = BrandPrimary.copy(alpha = 0.45f)
                    ),
                shape = CircleShape,
                containerColor = BrandPrimary, // Official Campus Orange #FB5607
                contentColor = Color.White
            ) {
                Icon(
                    imageVector = heroAction.icon,
                    contentDescription = heroAction.title,
                    modifier = Modifier.size(28.dp)
                )
            }
        }
    }
}

@Composable
fun CradleNavItem(
    item: NavigationTabItem,
    isSelected: Boolean,
    badgeCount: Int = 0,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            )
            .padding(vertical = 6.dp)
    ) {
        BadgedBox(
            badge = {
                if (badgeCount > 0) {
                    Badge(
                        containerColor = BrandPrimary,
                        contentColor = Color.White
                    ) {
                        Text(text = if (badgeCount > 99) "99+" else badgeCount.toString())
                    }
                }
            }
        ) {
            Icon(
                imageVector = if (isSelected) item.selectedIcon else item.unselectedIcon,
                contentDescription = item.label,
                tint = if (isSelected) BrandPrimary else TextMuted,
                modifier = Modifier.size(24.dp)
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        // CampusXChange Active Orange Dot Indicator (Matching Design Mockup)
        AnimatedVisibility(
            visible = isSelected,
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            Box(
                modifier = Modifier
                    .size(5.dp)
                    .background(color = BrandPrimary, shape = CircleShape)
            )
        }
        if (!isSelected) {
            Spacer(modifier = Modifier.height(5.dp)) // Preserve vertical balance
        }
    }
}
```

---

## 6. Role-Specific Dynamic Dashboards

### 6.1 Buyer Dashboard Layout (`BuyerDashboardScreen.kt`)
Driven by `MarketplaceViewModel` (mirroring `client/src/pages/Home.jsx`):

```kotlin
@Composable
fun BuyerDashboardScreen(
    navController: NavController,
    viewModel: MarketplaceViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = 8.dp, bottom = 90.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        // 1. Campus Urgent Broadcast Announcement (Full Width)
        item(span = { GridItemSpan(2) }) {
            uiState.announcement?.let { notice ->
                CampusAnnouncementCard(
                    title = notice.title,
                    message = notice.message,
                    theme = notice.theme
                )
            }
        }

        // 2. Dynamic Active Meetup Handover Alert (Full Width)
        item(span = { GridItemSpan(2) }) {
            uiState.activeMeetup?.let { meetup ->
                ActiveMeetupCard(
                    peerName = meetup.peerName,
                    itemTitle = meetup.listingTitle,
                    location = meetup.meetupLocation,
                    time = meetup.scheduledTime,
                    onVerifyClick = { navController.navigate("handover_verify/${meetup.dealId}") }
                )
            }
        }

        // 3. Dynamic Category Quick Chips (Horizontal Scroll Row)
        item(span = { GridItemSpan(2) }) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(horizontal = 4.dp)
            ) {
                items(uiState.categories) { category ->
                    CategoryFilterChip(
                        category = category,
                        isSelected = uiState.selectedCategory == category.slug,
                        onClick = { viewModel.selectCategory(category.slug) }
                    )
                }
            }
        }

        // 4. Hero Banner Slideshow (Auto-scroll 5s)
        item(span = { GridItemSpan(2) }) {
            HeroBannerCarousel(banners = uiState.banners)
        }

        // 5. 2-Column Product Cards
        items(uiState.listings, key = { it.id }) { listing ->
            ProductGridCard(
                listing = listing,
                isSaved = uiState.savedItemIds.contains(listing.id),
                onToggleWishlist = { viewModel.toggleWishlist(listing.id) },
                onClick = { navController.navigate("listing_detail/${listing.id}") }
            )
        }
    }
}
```

### 6.2 Seller Dashboard Layout (`SellerDashboardScreen.kt`)
Driven by `SellerDashboardViewModel`:

```kotlin
@Composable
fun SellerDashboardScreen(
    navController: NavController,
    viewModel: SellerDashboardViewModel = hiltViewModel()
) {
    val stats by viewModel.sellerStats.collectAsState()
    val pendingOffers by viewModel.pendingOffers.collectAsState()

    LazyColumn(
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 90.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        // 1. 4-Tile KPI Summary Grid
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                KpiMetricCard(
                    title = "Total Sold",
                    value = "₹${stats.totalEarnings}",
                    subtitle = "+₹2,400 this week",
                    modifier = Modifier.weight(1f)
                )
                KpiMetricCard(
                    title = "Active Items",
                    value = "${stats.activeCount} Items",
                    subtitle = "Live on campus",
                    modifier = Modifier.weight(1f)
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                KpiMetricCard(
                    title = "Total Views",
                    value = "${stats.totalViews}",
                    subtitle = "Across all listings",
                    modifier = Modifier.weight(1f)
                )
                KpiMetricCard(
                    title = "Trust Score",
                    value = "⭐ ${stats.trustScore}",
                    subtitle = "${stats.verifiedDeals} verified trades",
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // 2. Action Required Offers Drawer
        if (pendingOffers.isNotEmpty()) {
            item {
                Text(
                    text = "🚨 Offers Awaiting Your Decision (${pendingOffers.size})",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            }
            items(pendingOffers) { offer ->
                PendingOfferCard(
                    buyerName = offer.buyerName,
                    listingTitle = offer.listingTitle,
                    originalPrice = offer.originalPrice,
                    offeredPrice = offer.offeredPrice,
                    onAccept = { viewModel.acceptOffer(offer.id) },
                    onCounter = { counterPrice -> viewModel.sendCounterOffer(offer.id, counterPrice) },
                    onDecline = { viewModel.declineOffer(offer.id) }
                )
            }
        }

        // 3. Quick Inventory Manager
        item {
            SellerInventoryManagementSection(
                onBumpItem = { itemId -> viewModel.bumpListing(itemId) },
                onEditItem = { itemId -> navController.navigate("edit_listing/$itemId") },
                onMarkSold = { itemId -> viewModel.markAsSold(itemId) }
            )
        }
    }
}
```

---

## 7. Master Navigation Scaffold Integration (`CampusMasterScaffold.kt`)

```kotlin
package com.campusxchange.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.*
import com.campusxchange.app.ui.components.navigation.CurvedCradleBottomBar
import com.campusxchange.app.ui.components.topbar.*
import com.campusxchange.app.ui.navigation.state.*
import com.campusxchange.app.ui.navigation.viewmodel.AppSessionViewModel
import com.campusxchange.app.ui.theme.CanvasBackground

@Composable
fun CampusMasterScaffold(
    sessionViewModel: AppSessionViewModel = hiltViewModel(),
    navController: NavHostController = rememberNavController()
) {
    val sessionState by sessionViewModel.uiState.collectAsState()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: "marketplace_feed"

    val dynamicHeroAction = remember(sessionState) {
        when (sessionState.activeRole) {
            UserRole.SELLER -> DynamicHeroAction.SellerCreateListing
            UserRole.BUYER -> {
                val trade = sessionState.activeMeetupTrade
                if (trade != null && trade.status == "PENDING_HANDOVER") {
                    DynamicHeroAction.BuyerVerifyHandover(trade.dealId)
                } else {
                    DynamicHeroAction.BuyerPostRequest
                }
            }
        }
    }

    val showBars = currentRoute in listOf(
        "marketplace_feed", "wishlist", "chat_list", "buyer_profile",
        "seller_dashboard", "my_listings", "seller_offers", "seller_profile"
    )

    Scaffold(
        topBar = {
            if (showBars) {
                if (sessionState.activeRole == UserRole.BUYER) {
                    BuyerTopAppBar(
                        sessionState = sessionState,
                        onRoleToggle = { newRole ->
                            sessionViewModel.toggleRole(newRole) {
                                navController.navigate("seller_upgrade_flow")
                            }
                        },
                        onSearchClick = { navController.navigate("search_screen") },
                        onNotificationsClick = { navController.navigate("notifications") },
                        onLocationClick = { /* Open Campus Location Bottom Sheet */ }
                    )
                } else {
                    SellerTopAppBar(
                        sessionState = sessionState,
                        onRoleToggle = { newRole -> sessionViewModel.toggleRole(newRole) {} },
                        onNotificationsClick = { navController.navigate("notifications") }
                    )
                }
            }
        },
        bottomBar = {
            if (showBars) {
                CurvedCradleBottomBar(
                    currentRole = sessionState.activeRole,
                    currentRoute = currentRoute,
                    heroAction = dynamicHeroAction,
                    unreadChatCount = sessionState.unreadChatCount,
                    pendingOfferCount = 2,
                    onTabSelected = { targetRoute ->
                        navController.navigate(targetRoute) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onHeroActionClick = {
                        navController.navigate(dynamicHeroAction.actionRoute)
                    }
                )
            }
        },
        containerColor = CanvasBackground
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = if (sessionState.activeRole == UserRole.BUYER) "marketplace_feed" else "seller_dashboard",
            modifier = Modifier.padding(innerPadding)
        ) {
            // Buyer screens
            composable("marketplace_feed") { BuyerDashboardScreen(navController = navController) }
            composable("wishlist") { WishlistScreen(navController = navController) }
            composable("chat_list") { ChatListScreen(navController = navController) }
            composable("buyer_profile") { BuyerProfileScreen(navController = navController) }

            // Seller screens
            composable("seller_dashboard") { SellerDashboardScreen(navController = navController) }
            composable("my_listings") { MyListingsScreen(navController = navController) }
            composable("seller_offers") { SellerOffersScreen(navController = navController) }
            composable("seller_profile") { SellerProfileScreen(navController = navController) }

            // Hero action targets
            composable("post_buy_request") { PostBuyRequestScreen(navController = navController) }
            composable("create_listing") { CreateListingScreen(navController = navController) }
            composable("handover_verify/{dealId}") { backStack ->
                val dealId = backStack.arguments?.getString("dealId") ?: ""
                HandoverVerifyScreen(dealId = dealId, navController = navController)
            }
        }
    }
}
```

---

## 8. Complete REST API Contract

| Endpoint | HTTP | Purpose | Sync Interval / Trigger |
|:---|:---:|:---|:---|
| `/api/auth/status/` | `GET` | User profile, role, student ID verification | App startup, auth changes |
| `/api/marketplace/notifications/` | `GET` | Notification list & unread count | Polled every 20 seconds |
| `/api/marketplace/conversations/` | `GET` | Chat list & unread chat badge | Polled every 10 seconds |
| `/api/marketplace/search-suggestions/?q=` | `GET` | Autocomplete categories & items | Debounced (200ms on typing) |
| `/api/marketplace/categories/` | `GET` | Dynamic campus category pills | Cached in Room DB |
| `/api/marketplace/listings/` | `GET` | 2-column marketplace feed | Pull-to-refresh & filters |
| `/api/marketplace/seller-stats/` | `GET` | Seller revenue, active items, trust score | Loaded on Seller Hub launch |
| `/api/marketplace/offers/?status=PENDING` | `GET` | Action-required bargaining list | Real-time / 15s polling |
| `/api/marketplace/trades/active/` | `GET` | Meetup handover verification trigger | Polled when deal accepted |

---

## 9. Verification & QA Testing Matrix

| Test Case | Scenario | Expected Behavior |
|:---|:---|:---|
| **TC-NAV-01** | Student opens app in default Buyer Mode | TopBar shows Location + Search + "Sell ⇄" pill. BottomBar shows Explore, Saved, `+ Request Item`, Chats, Profile. Active orange dot (`•`) is under Explore. |
| **TC-NAV-02** | Student taps non-active tab (e.g. Saved) | Haptic click triggers. Icon tints to `#FB5607`. Active dot smoothly fades in beneath Saved icon. |
| **TC-NAV-03** | Offer is accepted by a peer (`PENDING_HANDOVER`) | Buyer Hero FAB dynamically transforms from `+ Request Item` to `Verify Handover QR` with glowing orange beacon ring. |
| **TC-NAV-04** | Student completes meetup QR scan | Trade completes. Hero FAB seamlessly reverts to `+ Request Item`. |
| **TC-NAV-05** | Unverified buyer taps "Sell ⇄" | App catches `!isEligibleSeller` and opens 5-step ML Kit ID verification modal. |
| **TC-NAV-06** | Verified seller switches to Seller Hub | TopBar changes to Store reputation and status pill. BottomBar swaps destinations to Hub, Listings, `+ List Item`, Offers, Store. |
| **TC-NAV-07** | Live search typing | Autocomplete dropdown renders matching categories and items with zero UI lag. |
| **TC-NAV-08** | Edge-to-edge system insets | Floating dock padding respects 3-button navigation and Android 15 gesture navigation bars without overlap. |
