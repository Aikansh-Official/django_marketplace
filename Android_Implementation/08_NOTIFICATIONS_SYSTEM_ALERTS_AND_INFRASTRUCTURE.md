# 🔔 Module 08: Notifications, System Alerts & Platform Infrastructure

This document details the complete native Android specification for **CampXChange** push notifications via **Firebase Cloud Messaging (FCM)**, the in-app notification feed, urgent non-dismissible safety modals, maintenance/suspension interceptors, and dual-device session isolation.

---

## 1. Notification Architecture & Channel Matrix

```text
       FCM CLOUD PUSH                      IN-APP NOTIFICATION FEED
 ┌───────────────────────┐                 ┌───────────────────────┐
 │ Push Message Payload  │                 │ GET /notifications/   │
 └───────────┬───────────┘                 └───────────┬───────────┘
             │                                         │
             ▼                                         ▼
 ┌───────────────────────┐                 ┌───────────────────────┐
 │ CXCFirebaseService    │                 │ Filter Tabs:          │
 │ - Route to Channel    │                 │ [All] [Unread]        │
 │ - Build PendingIntent │                 │ [Broadcasts] [Offers] │
 └───────────┬───────────┘                 └───────────────────────┘
             │
 ┌───────────┴───────────────────────────────────────────────────────┐
 │ Android Notification Channels (API 26+ / Android 8.0+):           │
 │ 1. URGENT_CHANNEL  (High Importance, Vibration, Heads-up popup)   │
 │ 2. OFFERS_CHANNEL  (High Importance, Transaction alerts)          │
 │ 3. CHAT_CHANNEL    (High Importance, Peer messages with avatar)   │
 │ 4. BROADCASTS_CHAN (Default Importance, Campus announcements)     │
 └───────────────────────────────────────────────────────────────────┘
```

---

## 2. API Endpoints & Request/Response Contracts

### 2.1 Notifications Api Service (`NotificationsApiService.kt`)

```kotlin
package com.campxchange.app.data.remote.api

import com.campxchange.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface NotificationsApiService {

    @GET("marketplace/notifications/")
    suspend fun getNotifications(
        @Query("tab") tab: String? = null // "UNREAD", "BROADCAST", "OFFERS"
    ): Response<List<NotificationDto>>

    @PATCH("marketplace/notifications/{id}/read/")
    suspend fun markAsRead(
        @Path("id") notificationId: Int
    ): Response<Unit>

    @DELETE("marketplace/notifications/{id}/")
    suspend fun deleteNotification(
        @Path("id") notificationId: Int
    ): Response<Unit>

    @DELETE("marketplace/notifications/clear-all/")
    suspend fun clearAllNotifications(): Response<Unit>

    @POST("marketplace/fcm-token/")
    suspend fun registerFcmToken(
        @Body request: FcmTokenRegistrationDto
    ): Response<Unit>
}
```

### 2.2 Data Transfer Objects (`NotificationDtos.kt`)

```kotlin
package com.campxchange.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class NotificationDto(
    @SerializedName("id") val id: Int,
    @SerializedName("notification_type") val type: String, // "BUY_REQUEST", "BROADCAST", "DIRECT_WARNING", "HANDOVER_READY", etc.
    @SerializedName("priority") val priority: String, // "NORMAL", "HIGH", "URGENT"
    @SerializedName("title") val title: String,
    @SerializedName("message") val message: String,
    @SerializedName("link") val link: String?,
    @SerializedName("is_read") val isRead: Boolean,
    @SerializedName("created_at") val createdAt: String
)

data class FcmTokenRegistrationDto(
    @SerializedName("fcm_token") val fcmToken: String,
    @SerializedName("device_model") val deviceModel: String
)
```

---

## 3. Firebase Cloud Messaging Service (`CXCFirebaseMessagingService.kt`)

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
import com.campxchange.app.R
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class CXCFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Dispatches new FCM token to Django backend via Repository
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val title = remoteMessage.data["title"] ?: remoteMessage.notification?.title ?: "CampXChange"
        val body = remoteMessage.data["body"] ?: remoteMessage.notification?.body ?: ""
        val priority = remoteMessage.data["priority"] ?: "NORMAL"
        val deepLinkRoute = remoteMessage.data["route"]

        showNotification(title, body, priority, deepLinkRoute)
    }

    private fun showNotification(title: String, body: String, priority: String, route: String?) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createChannels(notificationManager)

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            route?.let { putExtra("DESTINATION_ROUTE", it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val channelId = when (priority) {
            "URGENT" -> "cxc_urgent_channel"
            "HIGH" -> "cxc_offers_channel"
            else -> "cxc_general_channel"
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_cxc_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(if (priority == "URGENT") NotificationCompat.PRIORITY_MAX else NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun createChannels(manager: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val urgentChannel = NotificationChannel(
                "cxc_urgent_channel",
                "Urgent Safety Notices",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Critical campus compliance and urgent safety alerts"
                enableVibration(true)
            }

            val offersChannel = NotificationChannel(
                "cxc_offers_channel",
                "Offers & Deals",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Updates on your purchase requests and handover QR"
            }

            val generalChannel = NotificationChannel(
                "cxc_general_channel",
                "Campus Announcements",
                NotificationManager.IMPORTANCE_DEFAULT
            )

            manager.createNotificationChannels(listOf(urgentChannel, offersChannel, generalChannel))
        }
    }
}
```

---

## 4. UI Composable Implementations

### 4.1 In-App Notifications Screen (`NotificationsScreen.kt`)

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    viewModel: NotificationsViewModel,
    onNavigateRoute: (String) -> Unit,
    onNavigateBack: () -> Unit
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notifications & Alerts", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    TextButton(onClick = { viewModel.clearAll() }) {
                        Text("Clear All", color = Brand500, fontWeight = FontWeight.SemiBold)
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Filter Tabs
            TabRow(selectedTabIndex = state.selectedTab) {
                Tab(selected = state.selectedTab == 0, onClick = { viewModel.setTab(0) }, text = { Text("All") })
                Tab(selected = state.selectedTab == 1, onClick = { viewModel.setTab(1) }, text = { Text("Unread (${state.unreadCount})") })
                Tab(selected = state.selectedTab == 2, onClick = { viewModel.setTab(2) }, text = { Text("Broadcasts") })
                Tab(selected = state.selectedTab == 3, onClick = { viewModel.setTab(3) }, text = { Text("Requests") })
            }

            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(state.notifications) { item ->
                    NotificationCard(
                        notification = item,
                        onClick = {
                            viewModel.markRead(item.id)
                            item.link?.let { onNavigateRoute(it) }
                        },
                        onDelete = { viewModel.deleteNotification(item.id) }
                    )
                }
            }
        }
    }
}
```

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
