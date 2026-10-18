# 🔔 CampXChange — Android Notifications & FCM Push Alerts Specification (Website Parity)

> **Target Platform:** Android (Native Jetpack Compose)  
> **Web Source of Truth:** `client/src/pages/Notifications.jsx` & `server/marketplace/views.py` (`NotificationListView`)  
> **Backend Service:** Django REST Framework (`/api/marketplace/notifications/`)  
> **MongoDB & DRF Parity:** Full support for MongoDB ObjectIds, `listing_title`, `listing_image`, and 5 Web Tabs.  
> **Last Updated:** October 2026

---

## 📑 Table of Contents
1. [Architecture & Web Parity Overview](#1-architecture--web-parity-overview)
2. [Notification Categories & 5-Tab Filter System](#2-notification-categories--5-tab-filter-system)
   - [2.1 The 5 Web Parity Tabs](#21-the-5-web-parity-tabs)
   - [2.2 Complete Notification Type Registry & Badges](#22-complete-notification-type-registry--badges)
3. [REST API Contract & Query Parameters](#3-rest-api-contract--query-parameters)
   - [3.1 Fetch Notifications with Tabs & Search](#31-fetch-notifications-with-tabs--search)
   - [3.2 Mark Single Read / Mark All Read](#32-mark-single-read--mark-all-read)
   - [3.3 Single Delete / Clear All](#33-single-delete--clear-all)
4. [DTOs & Backend Data Model Alignment](#4-dtos--backend-data-model-alignment)
5. [Kotlin Architecture & Production Code](#5-kotlin-architecture--production-code)
   - [5.1 NotificationApiService.kt](#51-notificationapiservicekt)
   - [5.2 NotificationsViewModel.kt (Tab Counts & Local Search)](#52-notificationsviewmodelkt-tab-counts--local-search)
   - [5.3 NotificationsScreen.kt (Compose UI with Coil Thumbnails)](#53-notificationsscreenkt-compose-ui-with-coil-thumbnails)
   - [5.4 CampXChangeMessagingService.kt (FCM Push Handler)](#54-campxchangemessagingservicekt-fcm-push-handler)
6. [Deep Linking & Route Navigation Engine](#6-deep-linking--route-navigation-engine)

---

## 1. Architecture & Web Parity Overview

To achieve 100% parity with the web client (`client/src/pages/Notifications.jsx`), the Android application mirrors:
1. **5-Tab Filter Row:** `All`, `Unread`, `Trade Alerts`, `Messages`, and `Announcements`.
2. **Category Unread Badges:** Tab indicators showing exact item counts matching user activity.
3. **Real-time Search Filter:** Instant in-memory and query-based filtering across notification titles and message bodies.
4. **Rich Card Layout:** Listing thumbnail preview image (via Coil), color-coded category badges, relative time stamps (`Just now`, `5m ago`, `2h ago`), unread accent pill indicator, and quick delete icon.
5. **Clear All Confirmation Dialog:** Safety modal to prevent accidental wipeout of notification history.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                   Django DRF + MongoDB Backend Engine                    │
│      GET /api/marketplace/notifications/?tab={TAB}&search={QUERY}       │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                Android NotificationApiService & Repository               │
│          Handles MongoDB 24-char hex strings & DRF Serializers           │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         NotificationsViewModel                           │
│  - 5 Web-Parity Filter Tabs (ALL, UNREAD, TRADE, MESSAGES, BROADCAST)    │
│  - Real-time search query state & dynamic tab counts                     │
│  - Optimistic UI updates for Mark Read / Delete / Clear All              │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    NotificationsScreen (Jetpack Compose)                 │
│  - Search OutlinedTextField with Clear button                            │
│  - Scrollable TabRow with colored badges                                 │
│  - Coil AsyncImage for listing product thumbnails                        │
│  - Smart Deep Link Navigation (Product Detail, Chat, Handover QR)        │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Notification Categories & 5-Tab Filter System

### 2.1 The 5 Web Parity Tabs

Matching `client/src/pages/Notifications.jsx`:

| Tab Enum | Label | Matching Types | Description |
|---|---|---|---|
| `ALL` | **All** | All notification types | Complete user notifications stream |
| `UNREAD` | **Unread** | Any type where `is_read == false` | Quick access to pending items |
| `TRADE` | **Trade Alerts** | `BUY_REQUEST`, `OFFER_RECEIVED`, `OFFER_ACCEPTED`, `OFFER_DECLINED`, `COUNTER_OFFER`, `HANDOVER_READY`, `ITEM_SOLD`, `DEAL_CANCELLED` | Marketplace orders, offers, QR exchanges |
| `MESSAGES` | **Messages** | `CHAT_MESSAGE`, `PRODUCT_INQUIRY`, `OFFER_MESSAGE` | Direct buyer-seller communications |
| `BROADCAST` | **Announcements** | `CAMPUS_BROADCAST`, `SYSTEM_ALERT`, `DIRECT_WARNING`, `SECURITY_ALERT`, `GENERAL` | Admin warnings, campus updates, system news |

### 2.2 Complete Notification Type Registry & Badges

| Notification Type | Display Badge Label | Badge Background | Badge Text Color | Destination Screen |
|---|---|---|---|---|
| `BUY_REQUEST` | Purchase Request | `#FEF3C7` (Amber 100) | `#92400E` (Amber 800) | Product Detail -> Buyer Offers |
| `OFFER_RECEIVED` | Offer Received | `#FEF3C7` (Amber 100) | `#92400E` (Amber 800) | Product Detail -> Offers Modal |
| `OFFER_ACCEPTED` | Offer Accepted | `#D1FAE5` (Emerald 100) | `#065F46` (Emerald 800) | Product Detail / Campus Meetup |
| `OFFER_DECLINED` | Offer Declined | `#FEE2E2` (Red 100) | `#991B1B` (Red 800) | Marketplace Browse |
| `COUNTER_OFFER` | Counter Offer | `#EDE9FE` (Purple 100) | `#5B21B6` (Purple 800) | Product Detail -> Offer Details |
| `HANDOVER_READY` | Handover Ready | `#DBEAFE` (Blue 100) | `#1E40AF` (Blue 800) | Handover QR & PIN Screen |
| `ITEM_SOLD` | Item Sold | `#D1FAE5` (Emerald 100) | `#065F46` (Emerald 800) | Listing Manager / Order Receipt |
| `PRODUCT_INQUIRY` | Product Inquiry | `#E0E7FF` (Indigo 100) | `#3730A3` (Indigo 800) | Student Chat Thread |
| `CHAT_MESSAGE` | Message | `#E0E7FF` (Indigo 100) | `#3730A3` (Indigo 800) | Student Chat Thread |
| `CAMPUS_BROADCAST`| Campus Broadcast | `#FEF3C7` (Amber 100) | `#92400E` (Amber 800) | Announcement Dialog |
| `SYSTEM_ALERT` | System Alert | `#FEE2E2` (Red 100) | `#991B1B` (Red 800) | Safety & Policy Center |
| `DIRECT_WARNING` | Security Alert | `#FEE2E2` (Red 100) | `#991B1B` (Red 800) | Security Interceptor Modal |

---

## 3. REST API Contract & Query Parameters

### 3.1 Fetch Notifications with Tabs & Search
- **Endpoint:** `GET /api/marketplace/notifications/`
- **Query Parameters:**
  - `tab`: `ALL` | `UNREAD` | `TRADE` | `MESSAGES` | `BROADCAST` (Optional)
  - `search`: String (Optional, e.g. `?search=calculator`)
- **Headers:**
  ```http
  Authorization: Bearer <jwt_access_token>
  X-App-Security-Key: campusXchange_secure_key_2026_@nshuman892494
  Content-Type: application/json
  Accept: application/json
  ```

#### Response `200 OK`:
```json
[
  {
    "id": 42,
    "notification_type": "OFFER_RECEIVED",
    "priority": "HIGH",
    "title": "New ₹1,200 Offer for 'Calculus Early Transcendentals'",
    "message": "Rahul Verma made a counter offer for your engineering textbook.",
    "link": "/listings/66fd3b8a1c9e84b2a3f4e123",
    "listing": "66fd3b8a1c9e84b2a3f4e123",
    "listing_title": "Calculus Early Transcendentals - 8th Edition",
    "listing_image": "https://cxc.anshuman892494.online/media/listings/calculus.jpg",
    "sender": 108,
    "sender_name": "Rahul Verma",
    "sender_username": "rahul_v",
    "is_read": false,
    "created_at": "2026-10-18T12:30:00Z"
  }
]
```

### 3.2 Mark Single Read / Mark All Read
- **Mark Single Read:** `PATCH /api/marketplace/notifications/{id}/read/`
- **Mark All Read:** `POST /api/marketplace/notifications/read-all/`
- **Response `200 OK`:**
  ```json
  { "success": true, "message": "Marked as read." }
  ```

### 3.3 Single Delete / Clear All
- **Single Delete:** `DELETE /api/marketplace/notifications/{id}/delete/`
- **Clear All:** `DELETE /api/marketplace/notifications/clear-all/`
- **Response `200 OK`:**
  ```json
  { "success": true, "message": "Notification deleted." }
  ```

---

## 4. DTOs & Backend Data Model Alignment

In Django's `NotificationSerializer`, `listing` is returned as a `PrimaryKeyRelatedField` (MongoDB hex ID string `66fd...`), alongside extra fields `listing_title` and `listing_image`.

```kotlin
data class NotificationDto(
    @SerializedName("id") val rawId: Any?,
    @SerializedName("notification_type") val type: String = "GENERAL",
    @SerializedName("priority") val priority: String = "NORMAL",
    @SerializedName("title") val title: String = "",
    @SerializedName("message") val message: String = "",
    @SerializedName("link") val link: String? = null,
    @SerializedName("listing") val rawListing: Any? = null,
    @SerializedName("listing_title") val listingTitle: String? = null,
    @SerializedName("listing_image") val listingImage: String? = null,
    @SerializedName("sender") val rawSender: Any? = null,
    @SerializedName("sender_name") val senderName: String? = null,
    @SerializedName("sender_username") val senderUsername: String? = null,
    @SerializedName("is_read") val isRead: Boolean = false,
    @SerializedName("created_at") val createdAt: String = ""
) {
    val idString: String
        get() = when (rawId) {
            is Number -> rawId.toLong().toString()
            is String -> rawId
            else -> rawId?.toString() ?: ""
        }

    val resolvedListingIdString: String?
        get() = when (rawListing) {
            is Number -> rawListing.toLong().toString()
            is String -> rawListing.ifEmpty { null }
            is Map<*, *> -> rawListing["id"]?.toString()
            else -> null
        }
}
```

---

## 5. Kotlin Architecture & Production Code

### 5.1 NotificationApiService.kt
```kotlin
package com.campxchange.app.data.remote.api

import com.campxchange.app.data.remote.dto.GenericMessageResponse
import com.campxchange.app.data.remote.dto.NotificationDto
import retrofit2.Response
import retrofit2.http.*

interface NotificationApiService {

    @GET("marketplace/notifications/")
    suspend fun getNotifications(
        @Query("tab") tab: String? = null,
        @Query("search") search: String? = null
    ): Response<List<NotificationDto>>

    @PATCH("marketplace/notifications/{id}/read/")
    suspend fun markAsRead(
        @Path("id") id: String
    ): Response<GenericMessageResponse>

    @POST("marketplace/notifications/read-all/")
    suspend fun markAllAsRead(): Response<GenericMessageResponse>

    @DELETE("marketplace/notifications/{id}/delete/")
    suspend fun deleteNotification(
        @Path("id") id: String
    ): Response<GenericMessageResponse>

    @DELETE("marketplace/notifications/clear-all/")
    suspend fun clearAllNotifications(): Response<GenericMessageResponse>
}
```

### 5.2 NotificationsViewModel.kt (Tab Counts & Local Search)
```kotlin
package com.campxchange.app.ui.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.campxchange.app.data.remote.api.NotificationApiService
import com.campxchange.app.data.remote.dto.NotificationDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class NotificationTab(val label: String, val queryKey: String) {
    ALL("All", "ALL"),
    UNREAD("Unread", "UNREAD"),
    TRADE("Trade Alerts", "TRADE"),
    MESSAGES("Messages", "MESSAGES"),
    BROADCAST("Announcements", "BROADCAST")
}

data class NotificationsUiState(
    val notifications: List<NotificationDto> = emptyList(),
    val selectedTab: NotificationTab = NotificationTab.ALL,
    val searchQuery: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val totalCount: Int = 0,
    val unreadCount: Int = 0,
    val tradeCount: Int = 0,
    val messagesCount: Int = 0,
    val broadcastCount: Int = 0
)

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val api: NotificationApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(NotificationsUiState())
    val uiState: StateFlow<NotificationsUiState> = _uiState.asStateFlow()

    private var allNotificationsCache: List<NotificationDto> = emptyList()

    init {
        loadNotifications()
    }

    fun setTab(tab: NotificationTab) {
        _uiState.value = _uiState.value.copy(selectedTab = tab)
        applyFilters()
    }

    fun onSearchQueryChanged(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        applyFilters()
    }

    fun loadNotifications() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            try {
                val res = api.getNotifications()
                if (res.isSuccessful && res.body() != null) {
                    allNotificationsCache = res.body()!!
                    recalculateCounts()
                    applyFilters()
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = "Failed to load notifications.")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = e.localizedMessage ?: "Network error.")
            }
        }
    }

    private fun recalculateCounts() {
        val all = allNotificationsCache
        val unread = all.count { !it.isRead }
        val trade = all.count { isTradeType(it.type) }
        val messages = all.count { isMessageType(it.type) }
        val broadcast = all.count { isBroadcastType(it.type) }

        _uiState.value = _uiState.value.copy(
            totalCount = all.size,
            unreadCount = unread,
            tradeCount = trade,
            messagesCount = messages,
            broadcastCount = broadcast
        )
    }

    private fun applyFilters() {
        val tab = _uiState.value.selectedTab
        val query = _uiState.value.searchQuery.trim().lowercase()

        var filtered = when (tab) {
            NotificationTab.ALL -> allNotificationsCache
            NotificationTab.UNREAD -> allNotificationsCache.filter { !it.isRead }
            NotificationTab.TRADE -> allNotificationsCache.filter { isTradeType(it.type) }
            NotificationTab.MESSAGES -> allNotificationsCache.filter { isMessageType(it.type) }
            NotificationTab.BROADCAST -> allNotificationsCache.filter { isBroadcastType(it.type) }
        }

        if (query.isNotEmpty()) {
            filtered = filtered.filter {
                it.title.lowercase().contains(query) ||
                it.message.lowercase().contains(query) ||
                (it.listingTitle?.lowercase()?.contains(query) == true)
            }
        }

        _uiState.value = _uiState.value.copy(
            notifications = filtered,
            isLoading = false
        )
    }

    private fun isTradeType(type: String): Boolean = type in listOf(
        "BUY_REQUEST", "OFFER_RECEIVED", "OFFER_ACCEPTED", "OFFER_DECLINED",
        "COUNTER_OFFER", "HANDOVER_READY", "ITEM_SOLD", "DEAL_CANCELLED"
    )

    private fun isMessageType(type: String): Boolean = type in listOf(
        "CHAT_MESSAGE", "PRODUCT_INQUIRY", "OFFER_MESSAGE"
    )

    private fun isBroadcastType(type: String): Boolean = type in listOf(
        "CAMPUS_BROADCAST", "SYSTEM_ALERT", "DIRECT_WARNING", "SECURITY_ALERT", "GENERAL"
    )

    fun markAsRead(id: String) {
        viewModelScope.launch {
            try {
                api.markAsRead(id)
            } catch (_: Exception) {}
            allNotificationsCache = allNotificationsCache.map {
                if (it.idString == id) it.copy(isRead = true) else it
            }
            recalculateCounts()
            applyFilters()
        }
    }

    fun markAllAsRead() {
        viewModelScope.launch {
            try {
                api.markAllAsRead()
            } catch (_: Exception) {}
            allNotificationsCache = allNotificationsCache.map { it.copy(isRead = true) }
            recalculateCounts()
            applyFilters()
        }
    }

    fun deleteNotification(id: String) {
        viewModelScope.launch {
            try {
                api.deleteNotification(id)
            } catch (_: Exception) {}
            allNotificationsCache = allNotificationsCache.filter { it.idString != id }
            recalculateCounts()
            applyFilters()
        }
    }

    fun clearAllNotifications() {
        viewModelScope.launch {
            try {
                api.clearAllNotifications()
            } catch (_: Exception) {}
            allNotificationsCache = emptyList()
            recalculateCounts()
            applyFilters()
        }
    }
}
```

### 5.3 NotificationsScreen.kt (Compose UI with Coil Thumbnails)
```kotlin
// Displays:
// 1. TopAppBar with Back button, "Notifications", unread summary, Mark All Read, and Clear All buttons.
// 2. Search OutlinedTextField.
// 3. Scrollable TabRow (All, Unread, Trade Alerts, Messages, Announcements).
// 4. LazyColumn of NotificationCard items.
// 5. NotificationCard with:
//    - Left circular category icon or type symbol.
//    - Category badge (colored background + colored text).
//    - Relative timestamp ("Just now", "5m ago", "Yesterday").
//    - Notification title & message body.
//    - Right listing thumbnail (Coil AsyncImage with rounded corners) if listingImage != null.
//    - Trash icon button for single delete.
// 6. Clear All Confirmation Alert Dialog.
```

### 5.4 CampXChangeMessagingService.kt (FCM Push Handler)
```kotlin
package com.campxchange.app.core.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.campxchange.app.MainActivity
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class CampXChangeMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val title = remoteMessage.data["title"] ?: remoteMessage.notification?.title ?: "CampXChange"
        val message = remoteMessage.data["message"] ?: remoteMessage.notification?.body ?: ""
        val type = remoteMessage.data["type"] ?: "GENERAL"
        val listingId = remoteMessage.data["listing_id"]

        showHeadsUpNotification(title, message, type, listingId)
    }

    private fun showHeadsUpNotification(title: String, message: String, type: String, listingId: String?) {
        val channelId = when (type) {
            "HANDOVER_READY", "BUY_REQUEST", "OFFER_RECEIVED", "OFFER_ACCEPTED" -> "cxc_trade_channel"
            "CHAT_MESSAGE", "PRODUCT_INQUIRY" -> "cxc_messages_channel"
            else -> "cxc_broadcast_channel"
        }

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "CampXChange Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Campus alerts, trade notifications, and chat messages."
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("deep_link_type", type)
            putExtra("listing_id", listingId)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
```

---

## 6. Deep Linking & Route Navigation Engine

When a notification card is tapped, the app automatically executes:
1. `viewModel.markAsRead(item.idString)` (instantly clears unread status).
2. Navigation dispatcher:
   ```kotlin
   when {
       notif.type == "HANDOVER_READY" -> {
           navController.navigate(Screen.HandoverSellerQR.createRoute(18))
       }
       notif.type in listOf("BUY_REQUEST", "OFFER_RECEIVED", "OFFER_ACCEPTED") -> {
           val id = notif.resolvedListingIdString ?: "101"
           navController.navigate(Screen.ProductDetail.createRoute(id))
       }
       notif.type in listOf("CHAT_MESSAGE", "PRODUCT_INQUIRY") -> {
           navController.navigate("chat_inbox")
       }
       notif.resolvedListingIdString != null -> {
           navController.navigate(Screen.ProductDetail.createRoute(notif.resolvedListingIdString!!))
       }
   }
   ```
This provides students with a seamless, frictionless path directly to the relevant action, perfectly identical to clicking notifications on the web platform.
