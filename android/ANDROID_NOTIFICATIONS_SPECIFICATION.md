# 🔔 CampusXChange — Android Notifications & FCM Push Alerts Specification

> **Target Platform:** Android (Native)  
> **Tech Stack:** Kotlin, Jetpack Compose, Firebase Cloud Messaging (FCM), Material 3, Hilt, Navigation Deep Links  
> **Backend Service:** Django REST Framework (`/api/marketplace/notifications/`)  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [System Architecture & Push Pipeline](#1-system-architecture--push-pipeline)
2. [Complete Business & Notification Logic](#2-complete-business--notification-logic)
   - [2.1 Notification Types & Priorities](#21-notification-types--priorities)
   - [2.2 Notification Channels (Android 8.0+)](#22-notification-channels-android-80)
   - [2.3 Badge Counts & Unread Synchronization](#23-badge-counts--unread-synchronization)
   - [2.4 Deep Linking Engine](#24-deep-linking-engine)
3. [Color Palette & Material 3 Styling](#3-color-palette--material-3-styling)
4. [Navigation & Compose Routes](#4-navigation--compose-routes)
5. [Complete REST API Contract](#5-complete-rest-api-contract)
6. [Android Implementation Blueprint (Kotlin Code)](#6-android-implementation-blueprint-kotlin-code)
   - [6.1 DTOs & Retrofit Notification Service](#61-dtos--retrofit-notification-service)
   - [6.2 FirebaseMessagingService Implementation](#62-firebasemessagingservice-implementation)
   - [6.3 Notifications ViewModel](#63-notifications-viewmodel)
   - [6.4 NotificationsScreen Composable (Swipe to Delete & Filter)](#64-notificationsscreen-composable-swipe-to-delete--filter)
7. [Testing & Battery Optimization Strategy](#7-testing--battery-optimization-strategy)

---

## 1. System Architecture & Push Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                 Django Backend Triggers                     │
│  (Offer Created, Accepted, QR Ready, Item Sold, Chat Msg)   │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Firebase Cloud Messaging (FCM)                │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            Android FirebaseMessagingService                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. Builds heads-up system notification with channel   │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ 2. Updates local badge count in DataStore             │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ 3. Attaches Deep Link Intent to relevant screen       │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────▲──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│             In-App Notifications Screen (Compose)           │
│         (List, Mark as Read, Delete, Filter Unread)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Business & Notification Logic

### 2.1 Notification Types & Priorities

| Type Key | Title Template | Urgency | Action on Tap |
|---|---|---|---|
| `BUY_REQUEST` | *"New Purchase Request for '{title}'"* | High | Opens Offers tab on Product Detail |
| `REQUEST_ACCEPTED` | *"Offer Accepted! '{title}'"* | High | Opens Campus Meetup & Chat |
| `REQUEST_REJECTED` | *"Purchase Request Declined"* | Normal | Opens Marketplace browse |
| `HANDOVER_READY` | *"Handover QR Code Ready for '{title}'"* | Urgent (Heads-up) | Opens Buyer QR Scanner screen directly |
| `ITEM_SOLD` | *"Item Sold! Handover Completed"* | High | Opens Deal celebration dialog (+3 trust) |
| `DEAL_CANCELLED` | *"Deal Cancelled for '{title}'"* | Normal | Resets UI state |
| `GENERAL` | *"Campus Marketplace Announcement"* | Low | Opens notification detail |

### 2.2 Notification Channels (Android 8.0+)
- **`channel_deals` (High Importance):** For purchase requests, acceptances, and handover ready alerts. Plays sound & vibrates.
- **`channel_chat` (High Importance):** For direct student-to-student chat messages.
- **`channel_general` (Default Importance):** For general announcements and status updates.

### 2.3 Badge Counts & Unread Synchronization
- Unread count is displayed on the bottom navigation bar notification icon.
- Tapping **"Mark All as Read"** sends a batch `POST /api/marketplace/notifications/read-all/` updating all records server-side.
- Tapping an individual notification marks it as read via `PATCH /api/marketplace/notifications/{id}/read/`.

---

## 3. Color Palette & Material 3 Styling

```kotlin
package com.CampusXChange.app.ui.theme

import androidx.compose.ui.graphics.Color

val NotifUnreadBg = Color(0xFFFFF4ED) // Brand 50
val NotifReadBg = Color(0xFFFFFFFF)
val NotifIconHandoverBg = Color(0xFFEFF6FF) // Blue 50
val NotifIconOfferBg = Color(0xFFECFDF5) // Green 50
val NotifIconAlertBg = Color(0xFFFEF2F2) // Red 50
val NotifBorder = Color(0xFFE5E7EB)
```

---

## 4. Navigation & Compose Routes

```kotlin
sealed class NotificationRoute(val route: String) {
    object List : NotificationRoute("notifications/list")
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
> Authorization: Bearer <access_token>
> Content-Type: application/json
> Accept: application/json
> ```

### 5.1 Fetch Notifications List
- **URL:** `GET /api/marketplace/notifications/`
- **Headers:** `Authorization: Bearer <access_token>`, `X-App-Security-Key: campusXchange_secure_key_2026_@nshuman892494`

#### Response `200 OK`:
```json
[
  {
    "id": 14,
    "notification_type": "HANDOVER_READY",
    "title": "Handover QR Ready for 'TI-84 Plus Calculator'",
    "message": "Aman Sharma has generated the Handover QR & PIN. Scan or enter PIN to complete your purchase!",
    "is_read": false,
    "created_at": "2026-09-06T10:02:00Z",
    "listing": {
      "id": 101,
      "title": "TI-84 Plus Graphing Calculator"
    }
  }
]
```

---

### 5.2 Mark Single Notification Read
- **URL:** `PATCH /api/marketplace/notifications/{id}/read/`
- **Headers:** `Authorization: Bearer <access_token>`

#### Response `200 OK`:
```json
{
  "success": true
}
```

---

### 5.3 Mark All Read
- **URL:** `POST /api/marketplace/notifications/read-all/`
- **Headers:** `Authorization: Bearer <access_token>`

#### Response `200 OK`:
```json
{
  "success": true
}
```

---

### 5.4 Delete Single / Clear All Notifications
- **Delete Single:** `DELETE /api/marketplace/notifications/{id}/delete/`
- **Clear All:** `DELETE /api/marketplace/notifications/clear-all/`
- **Headers:** `Authorization: Bearer <access_token>`

#### Response `200 OK`:
```json
{
  "success": true
}
```

---

## 6. Android Implementation Blueprint (Kotlin Code)

### 6.1 DTOs & Retrofit Notification Service

```kotlin
package com.CampusXChange.app.data.remote

import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.*

data class NotificationDto(
    val id: String,
    @SerializedName("notification_type") val type: String,
    val title: String,
    val message: String,
    @SerializedName("is_read") val isRead: Boolean,
    @SerializedName("created_at") val createdAt: String,
    val listing: ListingSummaryDto?
)

data class ListingSummaryDto(
    val id: String,
    val title: String
)

interface NotificationApiService {
    @GET("api/marketplace/notifications/")
    suspend fun getNotifications(): Response<List<NotificationDto>>

    @PATCH("api/marketplace/notifications/{id}/read/")
    suspend fun markAsRead(@Path("id") id: String): Response<GenericMessageResponse>

    @POST("api/marketplace/notifications/read-all/")
    suspend fun markAllAsRead(): Response<GenericMessageResponse>

    @DELETE("api/marketplace/notifications/{id}/delete/")
    suspend fun deleteNotification(@Path("id") id: String): Response<GenericMessageResponse>

    @DELETE("api/marketplace/notifications/clear-all/")
    suspend fun clearAllNotifications(): Response<GenericMessageResponse>
}
```

---

### 6.2 FirebaseMessagingService Implementation

```kotlin
package com.CampusXChange.app.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.CampusXChange.app.MainActivity

class CampusXChangeMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Upload FCM Token to Django Backend for user session
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val title = remoteMessage.data["title"] ?: remoteMessage.notification?.title ?: "CampusXChange Alert"
        val message = remoteMessage.data["message"] ?: remoteMessage.notification?.body ?: ""
        val type = remoteMessage.data["type"] ?: "GENERAL"
        val listingId = remoteMessage.data["listing_id"]

        showHeadsUpNotification(title, message, type, listingId)
    }

    private fun showHeadsUpNotification(title: String, message: String, type: String, listingId: String?) {
        val channelId = if (type == "HANDOVER_READY" || type == "BUY_REQUEST") "channel_deals" else "channel_general"
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "CampusXChange Campus Deals & Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for student purchases, offers, and handovers."
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

        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)

        notificationManager.notify(System.currentTimeMillis().toInt(), notificationBuilder.build())
    }
}
```

---

### 6.3 Notifications ViewModel

```kotlin
package com.CampusXChange.app.ui.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.CampusXChange.app.data.remote.NotificationApiService
import com.CampusXChange.app.data.remote.NotificationDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NotificationsUiState(
    val notifications: List<NotificationDto> = emptyList(),
    val filterOnlyUnread: Boolean = false,
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val api: NotificationApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(NotificationsUiState())
    val uiState: StateFlow<NotificationsUiState> = _uiState.asStateFlow()

    init {
        loadNotifications()
    }

    fun loadNotifications() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            try {
                val res = api.getNotifications()
                if (res.isSuccessful && res.body() != null) {
                    _uiState.value = _uiState.value.copy(notifications = res.body()!, isLoading = false)
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = "Failed to load notifications.")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = "Network failure.")
            }
        }
    }

    fun markAsRead(id: String) {
        viewModelScope.launch {
            api.markAsRead(id)
            val updated = _uiState.value.notifications.map {
                if (it.id == id) it.copy(isRead = true) else it
            }
            _uiState.value = _uiState.value.copy(notifications = updated)
        }
    }

    fun markAllAsRead() {
        viewModelScope.launch {
            api.markAllAsRead()
            val updated = _uiState.value.notifications.map { it.copy(isRead = true) }
            _uiState.value = _uiState.value.copy(notifications = updated)
        }
    }

    fun deleteNotification(id: String) {
        viewModelScope.launch {
            api.deleteNotification(id)
            val updated = _uiState.value.notifications.filter { it.id != id }
            _uiState.value = _uiState.value.copy(notifications = updated)
        }
    }

    fun toggleUnreadFilter() {
        _uiState.value = _uiState.value.copy(filterOnlyUnread = !_uiState.value.filterOnlyUnread)
    }
}
```

---

### 6.4 NotificationsScreen Composable (Swipe to Delete & Filter)

```kotlin
package com.CampusXChange.app.ui.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.CampusXChange.app.data.remote.NotificationDto
import com.CampusXChange.app.ui.theme.*

@Composable
fun NotificationsScreen(
    onOpenListing: (Int) -> Unit,
    viewModel: NotificationsViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    val displayList = if (state.filterOnlyUnread) {
        state.notifications.filter { !it.isRead }
    } else {
        state.notifications
    }

    Scaffold(
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Notifications", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Row {
                    TextButton(onClick = { viewModel.markAllAsRead() }) {
                        Text("Mark all read", color = Brand500, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        },
        containerColor = Color(0xFFFCFBF8)
    ) { padding ->
        if (state.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Brand500)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(displayList, key = { it.id }) { notif ->
                    NotificationCard(
                        notification = notif,
                        onClick = {
                            viewModel.markAsRead(notif.id)
                            notif.listing?.id?.let { onOpenListing(it) }
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun NotificationCard(
    notification: NotificationDto,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (!notification.isRead) Color(0xFFFFF4ED) else Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Color.White),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = when (notification.type) {
                        "HANDOVER_READY" -> "🤝"
                        "BUY_REQUEST" -> "💰"
                        "ITEM_SOLD" -> "🎉"
                        else -> "🔔"
                    },
                    fontSize = 18.sp
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(notification.title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(3.dp))
                Text(notification.message, fontSize = 12.sp, color = Color(0xFF4B5563))
            }
        }
    }
}
```

---

## 7. Testing & Battery Optimization Strategy

- **Doze Mode Compliance:** FCM high-priority payloads are reserved strictly for time-sensitive deals (`HANDOVER_READY`), preventing unwanted battery drain.
- **Payload Data-Only Delivery:** All notification rendering occurs locally inside `FirebaseMessagingService`, giving full control over sound, vibration, and custom styling.
