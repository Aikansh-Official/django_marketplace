# 🏛️ Module 00: Android Architecture, Tooling & Base Infrastructure

This document establishes the architectural foundation, dependency management, network stack, design system tokens, local storage, and navigation framework for the **CampusXChange** native Android application.

---

## 1. Package Structure (Clean Architecture + MVVM)

The project adheres to Google's recommended Clean Architecture pattern with distinct layers:

```text
com.campusxchange.app/
├── core/
│   ├── common/
│   │   ├── Constants.kt
│   │   ├── NetworkResult.kt
│   │   ├── Extensions.kt
│   │   └── Resource.kt
│   ├── designsystem/
│   │   ├── Color.kt
│   │   ├── Type.kt
│   │   ├── Shape.kt
│   │   ├── Theme.kt
│   │   └── components/
│   │       ├── CXCButton.kt
│   │       ├── CXCTextField.kt
│   │       ├── CXCCard.kt
│   │       ├── CXCBadge.kt
│   │       └── UniversalLoader.kt
│   ├── network/
│   │   ├── AuthInterceptor.kt
│   │   ├── TokenAuthenticator.kt
│   │   └── ApiEndpoints.kt
│   └── storage/
│       ├── TokenManager.kt
│       └── PreferencesKeys.kt
├── data/
│   ├── local/
│   │   ├── AppDatabase.kt
│   │   ├── dao/
│   │   │   ├── ListingDao.kt
│   │   │   ├── WishlistDao.kt
│   │   │   └── ChatDao.kt
│   │   └── entity/
│   ├── remote/
│   │   ├── api/
│   │   │   ├── AuthApiService.kt
│   │   │   ├── MarketplaceApiService.kt
│   │   │   └── ChatApiService.kt
│   │   └── dto/
│   └── repository/
│       ├── AuthRepositoryImpl.kt
│       ├── MarketplaceRepositoryImpl.kt
│       └── ChatRepositoryImpl.kt
├── domain/
│   ├── model/
│   │   ├── User.kt
│   │   ├── Listing.kt
│   │   ├── Offer.kt
│   │   └── ChatMessage.kt
│   └── repository/
│       ├── AuthRepository.kt
│       ├── MarketplaceRepository.kt
│       └── ChatRepository.kt
├── presentation/
│   ├── auth/
│   ├── home/
│   ├── listing/
│   ├── productdetail/
│   ├── handover/
│   ├── profile/
│   ├── chat/
│   └── notifications/
├── di/
│   ├── NetworkModule.kt
│   ├── DatabaseModule.kt
│   └── RepositoryModule.kt
├── MainActivity.kt
└── CampusXChangeApp.kt
```

---

## 2. Dependency Management (`gradle/libs.versions.toml`)

```toml
[versions]
agp = "8.6.0"
kotlin = "2.0.20"
coreKtx = "1.13.1"
lifecycleRuntimeKtx = "2.8.5"
activityCompose = "1.9.2"
composeBom = "2024.09.00"
navigationCompose = "2.8.0"
hilt = "2.52"
hiltNavigationCompose = "1.2.0"
retrofit = "2.11.0"
okhttp = "4.12.0"
room = "2.6.1"
datastore = "1.1.1"
coil = "2.7.0"
camerax = "1.3.4"
mlkitText = "16.0.1"
mlkitBarcode = "17.3.0"
firebaseBom = "33.3.0"
coroutine = "1.8.1"
zxing = "3.5.3"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-lifecycle-viewmodel-compose = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version.ref = "lifecycleRuntimeKtx" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }

# Compose BOM & UI
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-compose-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-compose-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-compose-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
androidx-compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-compose-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-compose-material-icons-extended = { group = "androidx.compose.material", name = "material-icons-extended" }
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigationCompose" }

# Dependency Injection (Hilt)
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
androidx-hilt-navigation-compose = { group = "androidx.hilt", name = "hilt-navigation-compose", version.ref = "hiltNavigationCompose" }

# Networking (Retrofit & OkHttp)
retrofit = { group = "com.squareup.retrofit2", name = "retrofit", version.ref = "retrofit" }
retrofit-converter-gson = { group = "com.squareup.retrofit2", name = "converter-gson", version.ref = "retrofit" }
okhttp = { group = "com.squareup.okhttp3", name = "okhttp", version.ref = "okhttp" }
okhttp-logging = { group = "com.squareup.okhttp3", name = "logging-interceptor", version.ref = "okhttp" }

# Local Storage
androidx-datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }
androidx-room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
androidx-room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }
androidx-room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }

# Image Loading
coil-compose = { group = "io.coil-kt", name = "coil-compose", version.ref = "coil" }

# CameraX & ML Kit
androidx-camera-core = { group = "androidx.camera", name = "camera-core", version.ref = "camerax" }
androidx-camera-camera2 = { group = "androidx.camera", name = "camera-camera2", version.ref = "camerax" }
androidx-camera-lifecycle = { group = "androidx.camera", name = "camera-lifecycle", version.ref = "camerax" }
androidx-camera-view = { group = "androidx.camera", name = "camera-view", version.ref = "camerax" }
google-mlkit-text-recognition = { group = "com.google.android.gms", name = "play-services-mlkit-text-recognition", version.ref = "mlkitText" }
google-mlkit-barcode-scanning = { group = "com.google.android.gms", name = "play-services-mlkit-barcode-scanning", version.ref = "mlkitBarcode" }
zxing-core = { group = "com.google.zxing", name = "core", version.ref = "zxing" }

# Firebase BOM
firebase-bom = { group = "com.google.firebase", name = "firebase-bom", version.ref = "firebaseBom" }
firebase-messaging = { group = "com.google.firebase", name = "firebase-messaging" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
hilt-android = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
ksp = { id = "com.google.devtools.ksp", version = "2.0.20-1.0.25" }
google-services = { id = "com.google.gms.google-services", version = "4.4.2" }
```

---

## 3. AndroidManifest.xml Configuration

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <!-- Hardware Feature Requirements -->
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <application
        android:name=".CampusXChangeApp"
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="CampusXChange"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.CampusXChange"
        android:usesCleartextTraffic="true"> <!-- Allowed for local dev emulator 10.0.2.2 -->

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Firebase Cloud Messaging Receiver -->
        <service
            android:name=".core.notification.CXCFirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
    </application>

</manifest>
```

---

## 4. Compose Design System & Theme Tokens

### 4.1 Color Tokens (`Color.kt`)

```kotlin
package com.campusxchange.app.core.designsystem

import androidx.compose.ui.graphics.Color

// Brand Colors (Vibrant Orange Palette)
val Brand500 = Color(0xFFF97316) // Primary Action Color
val Brand600 = Color(0xFFEA580C) // Pressed/Hover Emphasized
val Brand400 = Color(0xFFFB923C) // Light Accent
val Brand50 = Color(0xFFFFF7ED)  // Subtle tint

// Neutral / Background Colors
val BackgroundLight = Color(0xFFF8FAFC) // App Screen Background
val SurfaceWhite = Color(0xFFFFFFFF)    // Card & Modal Surface
val SurfaceElevated = Color(0xCCFFFFFF) // 80% White for Glassmorphism
val BorderLight = Color(0xFFE2E8F0)     // Divider & Input Stroke

// Typography Grays
val TextPrimary = Color(0xFF0F172A)     // Headings & High Contrast Text
val TextSecondary = Color(0xFF64748B)   // Subtitles & Placeholders
val TextMuted = Color(0xFF94A3B8)       // Timestamps & Inactive states

// Status & Alert Colors
val SuccessGreen = Color(0xFF10B981)
val WarningAmber = Color(0xFFF59E0B)
val ErrorRed = Color(0xFFEF4444)
val InfoBlue = Color(0xFF3B82F6)
```

### 4.2 Shapes & Glassmorphic Elevation (`Shape.kt` & Modifiers)

```kotlin
package com.campusxchange.app.core.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

val CXCShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(24.dp)
)

// Glassmorphic Card Surface Modifier
fun Modifier.cxcGlassmorphicCard(): Modifier = this
    .shadow(elevation = 6.dp, shape = RoundedCornerShape(12.dp), ambientColor = Color(0x0F000000))
    .clip(RoundedCornerShape(12.dp))
    .background(
        Brush.verticalGradient(
            colors = listOf(
                Color(0xF5FFFFFF),
                Color(0xEBFFFFFF)
            )
        )
    )
    .border(width = 1.dp, color = Color(0x40FFFFFF), shape = RoundedCornerShape(12.dp))
```

---

## 5. Network Infrastructure (Retrofit + OkHttp Interceptors)

### 5.1 Auth Interceptor (`AuthInterceptor.kt`)
Injects the JWT token, platform identifier `X-Client-Type: android`, and optional `X-App-Security-Key`:

```kotlin
package com.campusxchange.app.core.network

import com.campusxchange.app.core.storage.TokenManager
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class AuthInterceptor @Inject constructor(
    private val tokenManager: TokenManager
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val builder = originalRequest.newBuilder()

        // 1. Mandatory Platform Headers
        builder.header("X-Client-Type", "android")
        builder.header("Content-Type", "application/json")
        builder.header("Accept", "application/json")

        // 2. Attach JWT Access Token if available
        val token = runBlocking { tokenManager.getAccessToken() }
        if (!token.isNullOrEmpty() && !originalRequest.headers.names().contains("Authorization")) {
            builder.header("Authorization", "Bearer $token")
        }

        return chain.proceed(builder.build())
    }
}
```

### 5.2 Token Authenticator (`TokenAuthenticator.kt`)
Handles automatic silent refresh upon `401 Unauthorized` without interrupting user experience:

```kotlin
package com.campusxchange.app.core.network

import com.campusxchange.app.core.storage.TokenManager
import com.google.gson.JsonObject
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import javax.inject.Inject

class TokenAuthenticator @Inject constructor(
    private val tokenManager: TokenManager
) : Authenticator {
    private val refreshMutex = Mutex()

    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 3) return null // Prevent infinite loop

        return runBlocking {
            refreshMutex.withLock {
                val currentToken = tokenManager.getAccessToken()
                val requestToken = response.request.header("Authorization")?.replace("Bearer ", "")

                // If token was already refreshed by a concurrent coroutine
                if (currentToken != null && currentToken != requestToken) {
                    return@runBlocking response.request.newBuilder()
                        .header("Authorization", "Bearer $currentToken")
                        .build()
                }

                val refreshToken = tokenManager.getRefreshToken() ?: return@runBlocking null

                // Synchronous HTTP call to refresh token
                val client = OkHttpClient()
                val jsonPayload = JSONObject().apply { put("refresh", refreshToken) }.toString()
                val body = jsonPayload.toRequestBody("application/json".toMediaType())

                val refreshRequest = Request.Builder()
                    .url("${tokenManager.getBaseUrl()}/auth/token/refresh/")
                    .post(body)
                    .header("X-Client-Type", "android")
                    .build()

                val refreshResponse = client.newCall(refreshRequest).execute()
                if (refreshResponse.isSuccessful) {
                    val resString = refreshResponse.body?.string() ?: ""
                    val jsonObject = JSONObject(resString)
                    val newAccess = jsonObject.getString("access")
                    val newRefresh = jsonObject.optString("refresh", refreshToken)

                    tokenManager.saveTokens(newAccess, newRefresh)

                    return@runBlocking response.request.newBuilder()
                        .header("Authorization", "Bearer $newAccess")
                        .build()
                } else {
                    // Refresh token expired or invalidated by dual-device login
                    tokenManager.clearSession()
                    return@runBlocking null
                }
            }
        }
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
```

---

## 6. Local Token Storage (`TokenManager.kt` with DataStore)

```kotlin
package com.campusxchange.app.core.storage

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "cxc_secure_prefs")

@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        val ACCESS_TOKEN = stringPreferencesKey("access_token")
        val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        val USER_ROLE = stringPreferencesKey("user_role")
        val USERNAME = stringPreferencesKey("username")
        val FULL_NAME = stringPreferencesKey("full_name")
        val TRUST_SCORE = intPreferencesKey("trust_score")
        val IS_ID_VERIFIED = booleanPreferencesKey("is_id_verified")
    }

    suspend fun saveTokens(access: String, refresh: String) {
        context.dataStore.edit {
            it[ACCESS_TOKEN] = access
            it[REFRESH_TOKEN] = refresh
        }
    }

    suspend fun getAccessToken(): String? = context.dataStore.data.first()[ACCESS_TOKEN]
    suspend fun getRefreshToken(): String? = context.dataStore.data.first()[REFRESH_TOKEN]

    val isAuthenticatedFlow: Flow<Boolean> = context.dataStore.data.map {
        !it[ACCESS_TOKEN].isNullOrEmpty()
    }

    suspend fun clearSession() {
        context.dataStore.edit { it.clear() }
    }

    fun getBaseUrl(): String = "http://10.0.2.2:8000/api" // Emulator default
}
```

---

## 7. Navigation Architecture (Navigation Compose)

### 7.1 Screen Route Catalog (`Screen.kt`)

```kotlin
package com.campusxchange.app.core.navigation

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Login : Screen("login")
    object RegisterSteps : Screen("register_steps")
    object Home : Screen("home")
    object MyListings : Screen("my_listings")
    object CreateListing : Screen("create_listing")
    object EditListing : Screen("edit_listing/{listingId}") {
        fun createRoute(listingId: Int) = "edit_listing/$listingId"
    }
    object ProductDetail : Screen("product_detail/{listingId}") {
        fun createRoute(listingId: Int) = "product_detail/$listingId"
    }
    object HandoverQR : Screen("handover_qr/{offerId}") {
        fun createRoute(offerId: Int) = "handover_qr/$offerId"
    }
    object HandoverScanner : Screen("handover_scanner/{offerId}") {
        fun createRoute(offerId: Int) = "handover_scanner/$offerId"
    }
    object Profile : Screen("profile")
    object SellerProfile : Screen("seller_profile/{userId}") {
        fun createRoute(userId: Int) = "seller_profile/$userId"
    }
    object Conversations : Screen("conversations")
    object ChatThread : Screen("chat/{listingId}/{peerId}") {
        fun createRoute(listingId: Int, peerId: Int) = "chat/$listingId/$peerId"
    }
    object Notifications : Screen("notifications")
}
```

### 7.2 Main Scaffold with Bottom Navigation (`MainScaffold.kt`)

Bottom Navigation Bar items are:
1. 🏠 **Home** (`home`)
2. 📋 **My Items** (`my_listings`) — *Seller only / redirects to Orders for Buyer*
3. ➕ **Sell** (`create_listing`) — *Elevated Center Action Button*
4. 💬 **Chats** (`conversations`)
5. 👤 **Profile** (`profile`)
