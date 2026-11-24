# 🔔 Module 08: Notifications, System Alerts & Platform Infrastructure (Website Parity)

This document details the complete native Android specification for **CampXChange** push notifications via **Firebase Cloud Messaging (FCM)**, the in-app notification feed (with 100% website-parity filtering, search, and badges), urgent safety modals, and deep-link routing.

---

## 1. Notification Architecture & Channel Matrix

```text
        FCM CLOUD PUSH                      IN-APP NOTIFICATION FEED (WEBSITE PARITY)
  ┌───────────────────────┐                 ┌────────────────────────────────────────────────────────┐
  │ Push Message Payload  │                 │ GET /api/marketplace/notifications/?tab=...&search=... │
  └───────────┬───────────┘                 └───────────────────────────┬────────────────────────────┘
              │                                                         │
              ▼                                                         ▼
  ┌───────────────────────┐                 ┌────────────────────────────────────────────────────────┐
  │ CXCFirebaseService    │                 │ 5 Web-Parity Filter Tabs:                              │
  │ - Route to Channel    │                 │ [All] [Unread] [Trade Alerts] [Messages] [Announcements│
  │ - Build PendingIntent │                 │ Search Bar: In-memory & query text matching            │
  └───────────┬───────────┘                 └────────────────────────────────────────────────────────┘
              │
  ┌───────────┴──────────────────────────────────────────────────────────────────────────────┐
  │ Android Notification Channels (API 26+ / Android 8.0+):                                  │
  │ 1. cxc_urgent_channel   (High Importance, Heads-up popup for Safety & Handover QR)       │
  │ 2. cxc_trade_channel    (High Importance, Deals, Offers, Buy Requests)                   │
  │ 3. cxc_messages_channel (High Importance, Student direct chats with avatars)             │
  │ 4. cxc_broadcast_channel(Default Importance, Campus announcements)                       │
  └──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. API Endpoints & Request/Response Contracts

### 2.1 Notifications Api Service (`NotificationApiService.kt`)

```kotlin
package com.campxchange.app.data.remote.api

import com.campxchange.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface NotificationApiService {

    @GET("marketplace/notifications/")
    suspend fun getNotifications(
        @Query("tab") tab: String? = null,      // "ALL", "UNREAD", "TRADE", "MESSAGES", "BROADCAST"
        @Query("search") search: String? = null // Search term matching title or message
    ): Response<List<NotificationDto>>

    @PATCH("marketplace/notifications/{id}/read/")
    suspend fun markAsRead(
        @Path("id") notificationId: String
    ): Response<GenericMessageResponse>

    @POST("marketplace/notifications/read-all/")
    suspend fun markAllAsRead(): Response<GenericMessageResponse>

    @DELETE("marketplace/notifications/{id}/delete/")
    suspend fun deleteNotification(
        @Path("id") notificationId: String
    ): Response<GenericMessageResponse>

    @DELETE("marketplace/notifications/clear-all/")
    suspend fun clearAllNotifications(): Response<GenericMessageResponse>

    @POST("marketplace/fcm-token/")
    suspend fun registerFcmToken(
        @Body request: FcmTokenRegistrationDto
    ): Response<GenericMessageResponse>
}
```

### 2.2 Data Transfer Objects (`NotificationDtos.kt`)

```kotlin
package com.campxchange.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class NotificationDto(
    @SerializedName("id") val rawId: Any?,
    @SerializedName("notification_type") val type: String = "GENERAL",
    @SerializedName("priority") val priority: String = "NORMAL", // "LOW", "NORMAL", "HIGH", "URGENT"
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

data class FcmTokenRegistrationDto(
    @SerializedName("fcm_token") val fcmToken: String,
    @SerializedName("device_model") val deviceModel: String
)

data class GenericMessageResponse(
    val success: Boolean? = true,
    val message: String? = null
)
```

---

## 3. Web Parity Feature Matrix

### 3.1 The 5 Category Tabs

Matching `client/src/pages/Notifications.jsx`:
1. **All (`ALL`):** Displays all notifications received by the student.
2. **Unread (`UNREAD`):** Filter for unread items (`is_read == false`) with active unread counter badge.
3. **Trade Alerts (`TRADE`):** Filter for transactions:
   - `BUY_REQUEST` (Purchase Request)
   - `OFFER_RECEIVED` (Offer Received)
   - `OFFER_ACCEPTED` (Offer Accepted)
   - `OFFER_DECLINED` (Offer Declined)
   - `COUNTER_OFFER` (Counter Offer)
   - `HANDOVER_READY` (Handover QR Ready)
   - `ITEM_SOLD` (Item Sold)
   - `DEAL_CANCELLED` (Deal Cancelled)
4. **Messages (`MESSAGES`):** Filter for communications:
   - `CHAT_MESSAGE` (Direct chat message)
   - `PRODUCT_INQUIRY` (Listing inquiry)
   - `OFFER_MESSAGE` (Negotiation note)
5. **Announcements (`BROADCAST`):** System broadcasts & security warnings:
   - `CAMPUS_BROADCAST` (Official Campus Announcement)
   - `SYSTEM_ALERT` (System Alert)
   - `DIRECT_WARNING` (Account Notice / Safety Alert)
   - `SECURITY_ALERT` (Security Interceptor)
   - `GENERAL` (Platform updates)

### 3.2 Visual Palette & Badge Styling

| Type | Badge Background | Badge Text | Symbol/Icon |
|---|---|---|---|
| **Purchase Request / Offer** | `#FEF3C7` (Amber 100) | `#92400E` (Amber 800) | 💰 Tag / Cart |
| **Offer Accepted / Item Sold**| `#D1FAE5` (Emerald 100) | `#065F46` (Emerald 800) | 🤝 Checkmark / Deal |
| **Handover Ready** | `#DBEAFE` (Blue 100) | `#1E40AF` (Blue 800) | 📦 QR Code |
| **Offer Declined / Cancelled**| `#FEE2E2` (Red 100) | `#991B1B` (Red 800) | ✕ Cross |
| **Messages / Inquiry** | `#E0E7FF` (Indigo 100) | `#3730A3` (Indigo 800) | 💬 Chat Bubble |
| **Broadcast / Alerts** | `#FEF3C7` / `#FEE2E2` | Amber / Red | 📢 Megaphone |

---

## 4. UI Composable Implementations

### 4.1 In-App Notifications Screen (`NotificationsScreen.kt`)
The Jetpack Compose screen implements:
1. **TopBar Action Center:**
   - Back navigation.
   - Title with unread count pill badge.
   - "Mark all read" button.
   - "Clear all" button (opens confirmation alert dialog).
2. **Search Header:**
   - `OutlinedTextField` with leading search icon and trailing clear button.
3. **Tab Row:**
   - 5 selectable chips showing name + count badge: `All (12)`, `Unread (3)`, `Trade (4)`, `Messages (2)`, `Announcements (3)`.
4. **Notification Cards:**
   - Rounded border (Orange border if unread, light gray if read).
   - Category badge pill with dynamic colors.
   - Relative timestamp formatted via `DateUtils.getRelativeTimeSpanString`.
   - Title & detailed message.
   - Coil `AsyncImage` product thumbnail when `listing_image` exists.
   - Quick delete icon button.
5. **Empty State:**
   - Beautiful illustration and empty state message when no notifications match selected filter or search query.

---

## 5. System Interceptor Screens & Dialogs

### 5.1 Urgent Notice Non-Dismissible Modal (`UrgentNoticeModal.kt`)
Pops up when student opens app if there is an unread alert with `priority="URGENT"`:
- High contrast red header with pulsing shield icon.
- Non-cancelable: Backdrop click and back button are disabled.
- Dismissible **only** when user taps "I Acknowledge & Understand" (which marks it as read via API).

### 5.2 HTTP 503 Maintenance Screen (`MaintenanceScreen.kt`)
Triggered automatically by an OkHttp response interceptor when the server returns `503 Service Unavailable` with `maintenance_mode: true`. Displays an animated maintenance illustration, message, and a "Retry Connection" button.

### 5.3 HTTP 403 Account Suspension Screen (`SuspendedAccountScreen.kt`)
Intercepts `403 Forbidden` with `account_suspended: true`:
- Displays suspension notice, exact violation reason, and a button to contact Campus Safety.
- Disables access to marketplace features.

### 5.4 Dual-Device Session Isolation Alert (`DualDeviceSessionDialog.kt`)
Notifies the student if their Android session was invalidated because they logged in on a second Android device (enforcing the platform's 1 Web + 1 Android device limit).
