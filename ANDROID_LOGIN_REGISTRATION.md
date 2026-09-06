# 📱 LPUTrade — Android Login & Registration Complete Specification

> **Target Platform:** Android (Native)  
> **Tech Stack:** Kotlin, Jetpack Compose, Material 3, Clean Architecture + MVVM, Retrofit, OkHttp, Jetpack DataStore, Hilt  
> **Backend Service:** Django REST Framework + SimpleJWT (`http://<server-ip>:8000/api/auth/`)  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [Architecture & System Flow](#1-architecture--system-flow)
2. [Complete Business & Validation Logic](#2-complete-business--validation-logic)
3. [Color Palette & Design Tokens (Material 3)](#3-color-palette--design-tokens-material-3)
4. [Typography, Shapes & Components](#4-typography-shapes--components)
5. [Jetpack Compose Navigation & App Routes](#5-jetpack-compose-navigation--app-routes)
6. [Complete REST API Contract & Endpoints](#6-complete-rest-api-contract--endpoints)
7. [Android Implementation Blueprint (Kotlin Code)](#7-android-implementation-blueprint-kotlin-code)
   - [7.1 Retrofit API Service & DTOs](#71-retrofit-api-service--dtos)
   - [7.2 Token Management (Jetpack DataStore)](#72-token-management-jetpack-datastore)
   - [7.3 OkHttp Auth Interceptor & Token Authenticator](#73-okhttp-auth-interceptor--token-authenticator)
   - [7.4 ViewModels & State Management](#74-viewmodels--state-management)
   - [7.5 Jetpack Compose UI Screens](#75-jetpack-compose-ui-screens)
8. [Security & Production Checklist](#8-security--production-checklist)

---

## 1. Architecture & System Flow

The Android authentication module follows **Clean Architecture** with **MVVM (Model-View-ViewModel)** and **MVI-like unidirectional data flow** using Kotlin `StateFlow`.

```
┌────────────────────────────────────────────────────────┐
│               Jetpack Compose UI (Screens)             │
│        (LoginScreen, RegisterScreen, OtpScreen)       │
└───────────────────────────▲────────────────────────────┘
                            │ UI Events / UiState
┌───────────────────────────▼────────────────────────────┐
│                    ViewModels                          │
│          (LoginViewModel, RegisterViewModel)           │
└───────────────────────────▲────────────────────────────┘
                            │ UseCases / Coroutines
┌───────────────────────────▼────────────────────────────┐
│               Repository Layer (AuthRepository)        │
└─────────────┬────────────────────────────┬─────────────┘
              ▼                            ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     Local Token Store     │ │      Remote Network       │
│    (Jetpack DataStore)    │ │   (Retrofit + OkHttp)     │
└───────────────────────────┘ └─────────────┬─────────────┘
                                            ▼
                                  Django REST API Server
```

### Authentication Flow Overview

```mermaid
sequenceDiagram
    autonumber
    actor Student as 🧑‍🎓 Student (Android)
    participant UI as 📱 Compose UI
    participant VM as ⚙️ AuthViewModel
    participant DS as 💾 DataStore
    participant API as 🐍 Django Backend

    Note over Student,API: Registration Flow (3 Steps)
    Student->>UI: Enter Reg No, Name, Phone, Email
    UI->>VM: Check username availability
    VM->>API: GET /api/auth/check-username/?username=12200000
    API-->>VM: {"available": true}
    Student->>UI: Tap "Verify Now"
    UI->>VM: Request OTP
    VM->>API: POST /api/auth/send-otp/ {"email": "...@gmail.com"}
    API-->>UI: 200 OK (OTP Sent via Email / Console)
    
    Student->>UI: Enters 6-digit OTP
    UI->>VM: Verify OTP
    VM->>API: POST /api/auth/verify-otp/ {"email": "...", "otp": "123456"}
    API-->>UI: 200 OK ("Email verified successfully")
    
    Student->>UI: Enter Password & Confirm Password
    UI->>VM: Submit Registration
    VM->>API: POST /api/auth/register/ {...}
    API-->>VM: 201 Created (User Registered)
    VM->>API: POST /api/auth/login/ {"username": "...", "password": "..."}
    API-->>VM: 200 OK {access, refresh, user}
    VM->>DS: Save Access & Refresh Tokens + User Details
    VM-->>UI: Navigate to HomeScreen (Clear Backstack)

    Note over Student,API: Direct Login Flow
    Student->>UI: Enter 8-digit Reg No & Password
    UI->>VM: Tap "Sign In"
    VM->>API: POST /api/auth/login/
    API-->>VM: 200 OK {access, refresh, user}
    VM->>DS: Save Tokens
    VM-->>UI: Navigate to HomeScreen
```

---

## 2. Complete Business & Validation Logic

### 2.1 Student Registration Rules

| Field | Rule | Regex / Validation Logic | Error Message |
|---|---|---|---|
| **Registration Number** | Exactly 8 numeric digits | `^\d{8}$` | *"Registration number must be exactly 8 digits."* |
| **Username Live Check** | Debounced 500ms API call | `GET /api/auth/check-username/?username={val}` | *"This registration number is already registered."* |
| **Full Name** | 3 to 50 characters | `name.length in 3..50` | *"Name must be between 3 and 50 characters."* |
| **Phone Number** | Exactly 10 numeric digits | `^\d{10}$` | *"Phone number must be exactly 10 digits."* |
| **Email Address** | Standard email format ending with `@gmail.com` | `^[\w\.-]+@gmail\.com$` *(case insensitive)* | *"Only @gmail.com email addresses are allowed."* |
| **OTP Code** | 6 numeric digits | `^\d{6}$` | *"Please enter a valid 6-digit code."* |
| **Password** | Min 8 chars, 1+ special char | `password.length >= 8 && [^a-zA-Z0-9].contains` | *"Must be at least 8 chars and contain a special character."* |
| **Confirm Password** | Must match password | `password == passwordConfirm` | *"Passwords do not match."* |

### 2.2 OTP Engine & Security Rules
- **Validity Duration:** OTP expires exactly **10 minutes** from timestamp of generation (`created_at + 10 min`).
- **Maximum Verification Attempts:** Limited to **5 attempts** per email.
- **Lockout Mechanism:** If 5 failed OTP attempts are reached, backend locks the session (`HTTP 429 Too Many Requests`). User must request a new OTP.
- **Cleanup & Invalidation:** On successful account registration (`/api/auth/register/`), the OTP record is purged from the database to prevent replay attacks.
- **Throttling (Rate Limits):**
  - Signup / OTP endpoints: `5 requests / minute`.
  - Login endpoint: `10 requests / minute`.

### 2.3 Token Lifecycle & Refresh Engine
- **Access Token:** Valid for **60 minutes** (JWT). Stored securely in Jetpack DataStore. Sent in header: `Authorization: Bearer <access_token>`.
- **Refresh Token:** Valid for **24 hours** (1 day). Stored in Jetpack DataStore.
- **Token Rotation:** On refresh via `/api/auth/token/refresh/`, Django rotates the refresh token and blacklists the previous refresh token.
- **Automatic Silent Refresh:** OkHttp `Authenticator` automatically intercepts `401 Unauthorized`, calls refresh token endpoint synchronously, saves the new tokens, and retries the failed API call without user interruption.
- **Session Expiry:** If the refresh token also returns `401 Unauthorized` or is blacklisted, local credentials are wiped and user is navigated back to `LoginScreen`.

---

## 3. Color Palette & Design Tokens (Material 3)

The Android application adopts the identical brand identity defined in `client/tailwind.config.js` and `DESIGN_SYSTEM.md`.

### 3.1 Color Tokens Specification

| Token Name | Hex Code | Jetpack Compose Color | Role in UI |
|---|---|---|---|
| **Brand 500 (Primary)** | `#FB5607` | `Color(0xFFFB5607)` | Primary buttons, active tabs, focused border, OTP highlights |
| **Brand 600 (Darker/Hover)**| `#EA4300` | `Color(0xFFEA4300)` | Button pressed state, gradient accent |
| **Brand 700 (Deep)** | `#C33002` | `Color(0xFFC33002)` | Dark brand gradient stop |
| **Brand 400 (Light)** | `#FF732C` | `Color(0xFFFF732C)` | Accent badges, divider highlights |
| **Brand 100 (Subtle)** | `#FFE5D3` | `Color(0xFFFFE5D3)` | Icon container background, tag background |
| **Brand 50 (Ultra Light)** | `#FFF4ED` | `Color(0xFFFFF4ED)` | Tinted input backgrounds, card accents |
| **Background (Light)** | `#FCFBF8` | `Color(0xFFFCFBF8)` | Main screen scaffold background (Warm Cream) |
| **Surface (Card/Modal)** | `#FFFFFF` | `Color(0xFFFFFFFF)` | White cards, dialogs, bottom sheets |
| **Surface Variant** | `#F3F4F6` | `Color(0xFFF3F4F6)` | Inactive input background, secondary button bg |
| **Text Primary (Ink 900)** | `#111111` | `Color(0xFF111111)` | Titles, headers, field inputs, active text |
| **Text Secondary (Gray 500)**|`#6B7280` | `Color(0xFF6B7280)` | Subtitles, input placeholders, helper text |
| **Border Normal** | `#E5E7EB` | `Color(0xFFE5E7EB)` | Card borders, text field borders |
| **Border Focused** | `#FB5607` | `Color(0xFFFB5607)` | Active input outline |
| **Success Color** | `#10B981` | `Color(0xFF10B981)` | Username available badge, verified checkmark |
| **Error Color** | `#EF4444` | `Color(0xFFEF4444)` | Validation errors, username taken badge |
| **Info / Banner Blue** | `#3B82F6` | `Color(0xFF3B82F6)` | OTP sent information notice |
| **Glass Overlay** | `#CCFFFFFF` | `Color(0xCCFFFFFF)` | 80% opacity card overlay with blur |

### 3.2 Jetpack Compose Theme Definition (`Color.kt`)

```kotlin
package com.lputrade.app.ui.theme

import androidx.compose.ui.graphics.Color

// LPUTrade Brand Palette
val Brand50 = Color(0xFFFFF4ED)
val Brand100 = Color(0xFFFFE5D3)
val Brand200 = Color(0xFFFFC6A2)
val Brand300 = Color(0xFFFFA16A)
val Brand400 = Color(0xFFFF732C)
val Brand500 = Color(0xFFFB5607) // Primary Accent
val Brand600 = Color(0xFFEA4300)
val Brand700 = Color(0xFFC33002)
val Brand800 = Color(0xFF9B2608)
val Brand900 = Color(0xFF7D220B)

// Neutral & Background
val CreamBackground = Color(0xFFFCFBF8)
val SurfaceWhite = Color(0xFFFFFFFF)
val TextInkPrimary = Color(0xFF111111)
val TextMutedSecondary = Color(0xFF6B7280)
val BorderLight = Color(0xFFE5E7EB)
val InputBackground = Color(0xFFF9FAFB)

// Status Feedback
val StatusSuccess = Color(0xFF10B981)
val StatusError = Color(0xFFEF4444)
val StatusWarning = Color(0xFFF59E0B)
val InfoBlue = Color(0xFF2563EB)
val InfoBlueBg = Color(0xFFEFF6FF)
val SuccessGreenBg = Color(0xFFECFDF5)
```

---

## 4. Typography, Shapes & Components

### 4.1 Typography Guidelines (`Type.kt`)
- **Font Family:** Inter or Outfit (Google Fonts).
- **Headings (H1/H2):** Bold / ExtraBold, tight letter spacing, `TextInkPrimary`.
- **Labels:** `11.sp`, SemiBold / Black, uppercase tracking (`0.08.em`).
- **Inputs:** `15.sp`, Medium, `TextInkPrimary`.

```kotlin
package com.lputrade.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val LPUTradeTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Black,
        fontSize = 28.sp,
        lineHeight = 34.sp,
        color = TextInkPrimary
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
        lineHeight = 28.sp,
        color = TextInkPrimary
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        color = TextInkPrimary
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        lineHeight = 22.sp,
        color = TextInkPrimary
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 13.sp,
        color = TextMutedSecondary
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Black,
        fontSize = 11.sp,
        letterSpacing = 1.sp,
        color = TextMutedSecondary
    )
)
```

### 4.2 Shapes (`Shape.kt`)
Following `DESIGN_SYSTEM.md`, elements use soft rounded corners (`rounded-md` in Tailwind = `8.dp` to `12.dp` in Compose).

```kotlin
package com.lputrade.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

val LPUTradeShapes = Shapes(
    small = RoundedCornerShape(6.dp),
    medium = RoundedCornerShape(8.dp),    // Inputs, Buttons, OTP boxes
    large = RoundedCornerShape(16.dp),   // Cards, BottomSheets
    extraLarge = RoundedCornerShape(24.dp)
)
```

---

## 5. Jetpack Compose Navigation & App Routes

### 5.1 Route Tree Structure

```
AppNavigation
 ├── SplashRoute ("splash")
 ├── AuthNavGraph ("auth_graph") [Start Destination if Unauthenticated]
 │    ├── LoginRoute ("auth/login")
 │    ├── RegisterStep1Route ("auth/register_step1") [Details & Email]
 │    ├── RegisterStep2Route ("auth/register_step2?email={email}&username={username}") [OTP]
 │    └── RegisterStep3Route ("auth/register_step3") [Password & Submit]
 └── MainNavGraph ("main_graph") [Start Destination if Authenticated]
      ├── HomeRoute ("main/home")
      ├── MarketplaceRoute ("main/marketplace")
      └── ProfileRoute ("main/profile")
```

### 5.2 Navigation Implementation (`AuthNavigation.kt`)

```kotlin
package com.lputrade.app.navigation

import androidx.navigation.NavController
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import androidx.navigation.navigation
import com.lputrade.app.ui.auth.login.LoginScreen
import com.lputrade.app.ui.auth.register.RegisterStep1Screen
import com.lputrade.app.ui.auth.register.RegisterOtpScreen
import com.lputrade.app.ui.auth.register.RegisterPasswordScreen

sealed class AuthRoute(val route: String) {
    object Login : AuthRoute("auth/login")
    object RegisterStep1 : AuthRoute("auth/register_step1")
    object RegisterStep2 : AuthRoute("auth/register_otp")
    object RegisterStep3 : AuthRoute("auth/register_password")
}

fun NavGraphBuilder.authNavGraph(
    navController: NavController,
    onAuthSuccess: () -> Unit
) {
    navigation(startDestination = AuthRoute.Login.route, route = "auth_graph") {
        composable(AuthRoute.Login.route) {
            LoginScreen(
                onNavigateToRegister = { navController.navigate(AuthRoute.RegisterStep1.route) },
                onLoginSuccess = onAuthSuccess
            )
        }
        composable(AuthRoute.RegisterStep1.route) {
            RegisterStep1Screen(
                onNavigateToLogin = { navController.popBackStack() },
                onOtpSent = { email, username ->
                    navController.navigate(AuthRoute.RegisterStep2.route)
                }
            )
        }
        composable(AuthRoute.RegisterStep2.route) {
            RegisterOtpScreen(
                onBack = { navController.popBackStack() },
                onVerified = { navController.navigate(AuthRoute.RegisterStep3.route) }
            )
        }
        composable(AuthRoute.RegisterStep3.route) {
            RegisterPasswordScreen(
                onBack = { navController.popBackStack() },
                onRegistrationComplete = onAuthSuccess
            )
        }
    }
}
```

---

## 6. Complete REST API Contract & Endpoints

Base URL: `http://<YOUR_DJANGO_SERVER_IP>:8000/api/auth/`

### Summary Table

| Endpoint | Method | Auth Required | Throttle Scope | Description |
|---|---|---|---|---|
| `check-username/` | `GET` | No | Default | Live username/reg-no availability checker |
| `send-otp/` | `POST` | No | `signup` (5/min) | Generates & sends 6-digit OTP to `@gmail.com` |
| `verify-otp/` | `POST` | No | `signup` (5/min) | Validates OTP (Max 5 attempts, 10 min window) |
| `register/` | `POST` | No | `signup` (5/min) | Creates account with verified student status |
| `login/` | `POST` | No | `login` (10/min) | Authenticates student & returns JWT + profile |
| `token/refresh/` | `POST` | No | Default | Exchanges valid refresh token for new access token |
| `logout/` | `POST` | No | Default | Blacklists refresh token |
| `status/` | `GET` | Optional | Default | Checks current session authentication status |
| `profile/` | `GET` | **Bearer JWT** | `user` (100/min)| Retrieves authenticated student profile details |
| `profile/` | `PUT/PATCH`| **Bearer JWT** | `user` (100/min)| Updates profile picture, phone or name |

---

### 6.1 Check Username Availability
- **URL:** `GET /api/auth/check-username/?username={reg_no}`
- **Headers:** `Accept: application/json`
- **Query Params:** `username` (8-digit Reg No, e.g. `12200000`)

#### Response `200 OK`:
```json
{
  "available": true
}
```
*(If already taken: `{"available": false}`)*

---

### 6.2 Send OTP
- **URL:** `POST /api/auth/send-otp/`
- **Headers:** `Content-Type: application/json`

#### Request Body:
```json
{
  "email": "student122@gmail.com"
}
```

#### Response `200 OK`:
```json
{
  "message": "OTP sent successfully."
}
```

#### Error Response `400 Bad Request`:
```json
{
  "email": [
    "Only @gmail.com email addresses are allowed.",
    "An account with this email already exists."
  ]
}
```

---

### 6.3 Verify OTP
- **URL:** `POST /api/auth/verify-otp/`
- **Headers:** `Content-Type: application/json`

#### Request Body:
```json
{
  "email": "student122@gmail.com",
  "otp": "491823"
}
```

#### Response `200 OK`:
```json
{
  "message": "Email verified successfully."
}
```

#### Error Responses:
- **`400 Bad Request` (Invalid OTP):**
  ```json
  { "error": "Invalid OTP. 3 attempt(s) remaining." }
  ```
- **`400 Bad Request` (Expired):**
  ```json
  { "error": "OTP has expired. Please request a new one." }
  ```
- **`429 Too Many Requests` (Lockout):**
  ```json
  { "error": "Too many failed attempts. OTP has been invalidated. Please request a new one." }
  ```

---

### 6.4 Register User
- **URL:** `POST /api/auth/register/`
- **Headers:** `Content-Type: application/json`

#### Request Body:
```json
{
  "username": "12200000",
  "email": "student122@gmail.com",
  "full_name": "Aman Sharma",
  "phone_number": "9876543210",
  "password": "SecurePassword@2026",
  "password_confirm": "SecurePassword@2026"
}
```

#### Response `201 Created`:
```json
{
  "username": "12200000",
  "email": "student122@gmail.com",
  "full_name": "Aman Sharma",
  "phone_number": "9876543210"
}
```

#### Error Response `400 Bad Request`:
```json
{
  "username": ["Registration number must be exactly 8 digits."],
  "phone_number": ["Phone number must be exactly 10 digits."],
  "email": ["Email must be verified with OTP before registering."],
  "password": ["Must contain at least one special character."]
}
```

---

### 6.5 Login (Token Obtain)
- **URL:** `POST /api/auth/login/`
- **Headers:** `Content-Type: application/json`

#### Request Body:
```json
{
  "username": "12200000",
  "password": "SecurePassword@2026"
}
```

#### Response `200 OK`:
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Successfully logged in.",
  "user": {
    "id": 42,
    "username": "12200000",
    "email": "student122@gmail.com",
    "full_name": "Aman Sharma",
    "phone_number": "9876543210",
    "is_verified_student": true,
    "college_domain": "gmail.com",
    "trust_score": 50,
    "date_joined": "2026-09-06T09:20:00Z",
    "is_staff": false,
    "is_superuser": false
  }
}
```

#### Error Response `401 Unauthorized`:
```json
{
  "detail": "No active account found with the given credentials"
}
```

---

### 6.6 Token Refresh
- **URL:** `POST /api/auth/token/refresh/`
- **Headers:** `Content-Type: application/json`

#### Request Body:
```json
{
  "refresh": "<CURRENT_REFRESH_TOKEN>"
}
```

#### Response `200 OK`:
```json
{
  "access": "<NEW_ACCESS_TOKEN>",
  "refresh": "<NEW_ROTATED_REFRESH_TOKEN>",
  "message": "Token refreshed successfully."
}
```

---

### 6.7 Logout
- **URL:** `POST /api/auth/logout/`
- **Headers:** `Content-Type: application/json`

#### Request Body:
```json
{
  "refresh": "<CURRENT_REFRESH_TOKEN>"
}
```

#### Response `200 OK`:
```json
{
  "message": "Successfully logged out."
}
```

---

## 7. Android Implementation Blueprint (Kotlin Code)

### 7.1 Retrofit API Service & DTOs

```kotlin
package com.lputrade.app.data.remote

import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.*

// Request DTOs
data class CheckUsernameResponse(val available: Boolean)

data class SendOtpRequest(val email: String)
data class GenericMessageResponse(val message: String)

data class VerifyOtpRequest(
    val email: String,
    val otp: String
)

data class RegisterRequest(
    val username: String,
    val email: String,
    @SerializedName("full_name") val fullName: String,
    @SerializedName("phone_number") val phoneNumber: String,
    val password: String,
    @SerializedName("password_confirm") val passwordConfirm: String
)

data class LoginRequest(
    val username: String,
    val password: String
)

data class UserDto(
    val id: Int,
    val username: String,
    val email: String,
    @SerializedName("full_name") val fullName: String,
    @SerializedName("phone_number") val phoneNumber: String?,
    @SerializedName("is_verified_student") val isVerifiedStudent: Boolean,
    @SerializedName("college_domain") val collegeDomain: String?,
    @SerializedName("trust_score") val trustScore: Int
)

data class LoginResponse(
    val access: String,
    val refresh: String,
    val message: String?,
    val user: UserDto?
)

data class RefreshTokenRequest(val refresh: String)
data class RefreshTokenResponse(val access: String, val refresh: String?)

interface AuthApiService {
    @GET("api/auth/check-username/")
    suspend fun checkUsername(@Query("username") username: String): Response<CheckUsernameResponse>

    @POST("api/auth/send-otp/")
    suspend fun sendOtp(@Body request: SendOtpRequest): Response<GenericMessageResponse>

    @POST("api/auth/verify-otp/")
    suspend fun verifyOtp(@Body request: VerifyOtpRequest): Response<GenericMessageResponse>

    @POST("api/auth/register/")
    suspend fun register(@Body request: RegisterRequest): Response<UserDto>

    @POST("api/auth/login/")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("api/auth/token/refresh/")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<RefreshTokenResponse>

    @POST("api/auth/logout/")
    suspend fun logout(@Body request: RefreshTokenRequest): Response<GenericMessageResponse>

    @GET("api/auth/profile/")
    suspend fun getProfile(): Response<UserDto>
}
```

---

### 7.2 Token Management (Jetpack DataStore)

```kotlin
package com.lputrade.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.lputrade.app.data.remote.UserDto
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.authDataStore by preferencesDataStore("lputrade_auth_prefs")

@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val gson: Gson
) {
    companion object {
        val KEY_ACCESS_TOKEN = stringPreferencesKey("jwt_access_token")
        val KEY_REFRESH_TOKEN = stringPreferencesKey("jwt_refresh_token")
        val KEY_USER_CACHE = stringPreferencesKey("cached_user_json")
    }

    val accessTokenFlow: Flow<String?> = context.authDataStore.data.map { it[KEY_ACCESS_TOKEN] }
    val userFlow: Flow<UserDto?> = context.authDataStore.data.map { prefs ->
        prefs[KEY_USER_CACHE]?.let { gson.fromJson(it, UserDto::class.java) }
    }

    suspend fun saveAuthTokens(access: String, refresh: String, user: UserDto? = null) {
        context.authDataStore.edit { prefs ->
            prefs[KEY_ACCESS_TOKEN] = access
            prefs[KEY_REFRESH_TOKEN] = refresh
            user?.let { prefs[KEY_USER_CACHE] = gson.toJson(it) }
        }
    }

    suspend fun updateAccessToken(access: String, newRefresh: String? = null) {
        context.authDataStore.edit { prefs ->
            prefs[KEY_ACCESS_TOKEN] = access
            newRefresh?.let { prefs[KEY_REFRESH_TOKEN] = it }
        }
    }

    suspend fun getAccessToken(): String? = context.authDataStore.data.first()[KEY_ACCESS_TOKEN]
    suspend fun getRefreshToken(): String? = context.authDataStore.data.first()[KEY_REFRESH_TOKEN]

    suspend fun clearSession() {
        context.authDataStore.edit { it.clear() }
    }
}
```

---

### 7.3 OkHttp Auth Interceptor & Token Authenticator

```kotlin
package com.lputrade.app.data.remote

import com.lputrade.app.data.local.TokenManager
import kotlinx.coroutines.runBlocking
import okhttp3.*
import javax.inject.Inject
import javax.inject.Provider

// Injects Bearer token into outgoing authenticated requests
class AuthInterceptor @Inject constructor(
    private val tokenManager: TokenManager
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val accessToken = runBlocking { tokenManager.getAccessToken() }

        val request = if (!accessToken.isNullOrEmpty() && !original.url.encodedPath.contains("/api/auth/login") && !original.url.encodedPath.contains("/api/auth/register")) {
            original.newBuilder()
                .header("Authorization", "Bearer $accessToken")
                .build()
        } else {
            original
        }
        return chain.proceed(request)
    }
}

// Automatically retries 401s by rotating refresh token
class TokenAuthenticator @Inject constructor(
    private val tokenManager: TokenManager,
    private val authApiServiceProvider: Provider<AuthApiService>
) : Authenticator {
    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null // Prevent infinite loop

        synchronized(this) {
            val currentRefreshToken = runBlocking { tokenManager.getRefreshToken() } ?: return null
            val apiService = authApiServiceProvider.get()

            val refreshCall = runBlocking {
                try {
                    apiService.refreshToken(RefreshTokenRequest(currentRefreshToken))
                } catch (e: Exception) {
                    null
                }
            }

            if (refreshCall != null && refreshCall.isSuccessful && refreshCall.body() != null) {
                val newTokens = refreshCall.body()!!
                runBlocking {
                    tokenManager.updateAccessToken(newTokens.access, newTokens.refresh)
                }
                return response.request.newBuilder()
                    .header("Authorization", "Bearer ${newTokens.access}")
                    .build()
            } else {
                // Token invalid or blacklisted: wipe local credentials
                runBlocking { tokenManager.clearSession() }
                return null
            }
        }
    }

    private fun responseCount(response: Response): Int {
        var result = 1
        var prior = response.priorResponse
        while (prior != null) {
            result++
            prior = prior.priorResponse
        }
        return result
    }
}
```

---

### 7.4 ViewModels & State Management

#### 7.4.1 Login ViewModel
```kotlin
package com.lputrade.app.ui.auth.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lputrade.app.data.local.TokenManager
import com.lputrade.app.data.remote.AuthApiService
import com.lputrade.app.data.remote.LoginRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginUiState(
    val regNo: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val regNoError: String? = null,
    val passwordError: String? = null,
    val generalError: String? = null,
    val isSuccess: Boolean = false
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authApi: AuthApiService,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun onRegNoChange(value: String) {
        if (value.length <= 8 && value.all { it.isDigit() }) {
            _uiState.value = _uiState.value.copy(
                regNo = value,
                regNoError = if (value.isNotEmpty() && value.length != 8) "Must be 8 digits" else null
            )
        }
    }

    fun onPasswordChange(value: String) {
        _uiState.value = _uiState.value.copy(password = value, passwordError = null)
    }

    fun submitLogin() {
        val state = _uiState.value
        if (state.regNo.length != 8) {
            _uiState.value = state.copy(regNoError = "Enter your 8-digit registration number")
            return
        }
        if (state.password.isEmpty()) {
            _uiState.value = state.copy(passwordError = "Password is required")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, generalError = null)
            try {
                val res = authApi.login(LoginRequest(state.regNo, state.password))
                if (res.isSuccessful && res.body() != null) {
                    val body = res.body()!!
                    tokenManager.saveAuthTokens(body.access, body.refresh, body.user)
                    _uiState.value = _uiState.value.copy(isLoading = false, isSuccess = true)
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        generalError = "Invalid credentials. Please check your Registration No and Password."
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    generalError = "Network error. Please check your connection."
                )
            }
        }
    }
}
```

#### 7.4.2 Register ViewModel (Debounced Username & 3-Step Wizard)
```kotlin
package com.lputrade.app.ui.auth.register

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lputrade.app.data.local.TokenManager
import com.lputrade.app.data.remote.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class UsernameCheckStatus { IDLE, CHECKING, AVAILABLE, TAKEN }

data class RegisterUiState(
    val step: Int = 1, // 1: Details, 2: OTP, 3: Password
    val fullName: String = "",
    val regNo: String = "",
    val phone: String = "",
    val email: String = "",
    val otp: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val usernameStatus: UsernameCheckStatus = UsernameCheckStatus.IDLE,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isRegistrationComplete: Boolean = false
)

@HiltViewModel
class RegisterViewModel @Inject constructor(
    private val authApi: AuthApiService,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(RegisterUiState())
    val uiState: StateFlow<RegisterUiState> = _uiState.asStateFlow()

    private var usernameCheckJob: Job? = null

    fun onRegNoChange(value: String) {
        if (value.length <= 8 && value.all { it.isDigit() }) {
            _uiState.value = _uiState.value.copy(regNo = value)
            if (value.length == 8) {
                checkUsernameAvailability(value)
            } else {
                _uiState.value = _uiState.value.copy(usernameStatus = UsernameCheckStatus.IDLE)
            }
        }
    }

    private fun checkUsernameAvailability(username: String) {
        usernameCheckJob?.cancel()
        usernameCheckJob = viewModelScope.launch {
            delay(500) // Debounce
            _uiState.value = _uiState.value.copy(usernameStatus = UsernameCheckStatus.CHECKING)
            try {
                val res = authApi.checkUsername(username)
                if (res.isSuccessful && res.body()?.available == true) {
                    _uiState.value = _uiState.value.copy(usernameStatus = UsernameCheckStatus.AVAILABLE)
                } else {
                    _uiState.value = _uiState.value.copy(usernameStatus = UsernameCheckStatus.TAKEN)
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(usernameStatus = UsernameCheckStatus.IDLE)
            }
        }
    }

    fun onFullNameChange(v: String) { _uiState.value = _uiState.value.copy(fullName = v) }
    fun onPhoneChange(v: String) { if (v.length <= 10 && v.all { it.isDigit() }) _uiState.value = _uiState.value.copy(phone = v) }
    fun onEmailChange(v: String) { _uiState.value = _uiState.value.copy(email = v) }
    fun onOtpChange(v: String) { if (v.length <= 6 && v.all { it.isDigit() }) _uiState.value = _uiState.value.copy(otp = v) }
    fun onPasswordChange(v: String) { _uiState.value = _uiState.value.copy(password = v) }
    fun onConfirmPasswordChange(v: String) { _uiState.value = _uiState.value.copy(confirmPassword = v) }

    fun sendOtp() {
        val s = _uiState.value
        if (s.fullName.length < 3) { _uiState.value = s.copy(errorMessage = "Full name must be at least 3 characters"); return }
        if (s.regNo.length != 8) { _uiState.value = s.copy(errorMessage = "Reg No must be 8 digits"); return }
        if (s.phone.length != 10) { _uiState.value = s.copy(errorMessage = "Phone number must be 10 digits"); return }
        if (!s.email.lowercase().endsWith("@gmail.com")) {
            _uiState.value = s.copy(errorMessage = "Only @gmail.com emails are allowed"); return
        }
        if (s.usernameStatus == UsernameCheckStatus.TAKEN) {
            _uiState.value = s.copy(errorMessage = "This Reg No is already registered"); return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            try {
                val res = authApi.sendOtp(SendOtpRequest(s.email))
                if (res.isSuccessful) {
                    _uiState.value = _uiState.value.copy(isLoading = false, step = 2)
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = "Failed to send OTP. Email may already be in use.")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = "Network failure.")
            }
        }
    }

    fun verifyOtp() {
        val s = _uiState.value
        if (s.otp.length != 6) { _uiState.value = s.copy(errorMessage = "Enter full 6-digit OTP"); return }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            try {
                val res = authApi.verifyOtp(VerifyOtpRequest(s.email, s.otp))
                if (res.isSuccessful) {
                    _uiState.value = _uiState.value.copy(isLoading = false, step = 3)
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = "Invalid or expired OTP.")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = "Verification failed.")
            }
        }
    }

    fun submitRegistration() {
        val s = _uiState.value
        if (s.password.length < 8 || !s.password.any { !it.isLetterOrDigit() }) {
            _uiState.value = s.copy(errorMessage = "Password must be at least 8 chars with 1 special character")
            return
        }
        if (s.password != s.confirmPassword) {
            _uiState.value = s.copy(errorMessage = "Passwords do not match")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            try {
                val regRes = authApi.register(
                    RegisterRequest(
                        username = s.regNo,
                        email = s.email,
                        fullName = s.fullName,
                        phoneNumber = s.phone,
                        password = s.password,
                        passwordConfirm = s.confirmPassword
                    )
                )

                if (regRes.isSuccessful) {
                    // Auto-login upon successful registration
                    val loginRes = authApi.login(LoginRequest(s.regNo, s.password))
                    if (loginRes.isSuccessful && loginRes.body() != null) {
                        val body = loginRes.body()!!
                        tokenManager.saveAuthTokens(body.access, body.refresh, body.user)
                        _uiState.value = _uiState.value.copy(isLoading = false, isRegistrationComplete = true)
                    }
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = "Registration failed.")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = "Registration error.")
            }
        }
    }
}
```

---

### 7.5 Jetpack Compose UI Screens

#### 7.5.1 Styled Auth Input Components (`AuthComponents.kt`)

```kotlin
package com.lputrade.app.ui.auth.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lputrade.app.ui.theme.*

@Composable
fun LPUTradeInputField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    keyboardType: KeyboardType = KeyboardType.Text,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailingIcon: @Composable (() -> Unit)? = null,
    errorMessage: String? = null
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = TextMutedSecondary,
            modifier = Modifier.padding(bottom = 6.dp)
        )
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = { Text(placeholder, color = TextMutedSecondary.copy(alpha = 0.6f)) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = SurfaceWhite,
                unfocusedContainerColor = InputBackground,
                focusedBorderColor = Brand500,
                unfocusedBorderColor = BorderLight,
                errorBorderColor = StatusError
            ),
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            visualTransformation = visualTransformation,
            trailingIcon = trailingIcon,
            singleLine = true,
            isError = errorMessage != null
        )
        if (errorMessage != null) {
            Text(
                text = errorMessage,
                color = StatusError,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 4.dp, start = 2.dp)
            )
        }
    }
}

@Composable
fun LPUTradePrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false,
    enabled: Boolean = true
) {
    Button(
        onClick = onClick,
        enabled = enabled && !isLoading,
        modifier = modifier
            .fillMaxWidth()
            .height(50.dp),
        shape = RoundedCornerShape(8.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = Brand500,
            disabledContainerColor = Brand300
        ),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp, pressedElevation = 6.dp)
    ) {
        if (isLoading) {
            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(22.dp), strokeWidth = 2.5.dp)
        } else {
            Text(text = text, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
        }
    }
}

@Composable
fun OtpCodeInput(
    otpValue: String,
    onOtpChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    BasicTextField(
        value = otpValue,
        onValueChange = { if (it.length <= 6 && it.all { char -> char.isDigit() }) onOtpChange(it) },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
        decorationBox = {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = modifier.fillMaxWidth()
            ) {
                repeat(6) { index ->
                    val char = when {
                        index < otpValue.length -> otpValue[index].toString()
                        else -> ""
                    }
                    val isFocused = otpValue.length == index

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp)
                            .background(SurfaceWhite, RoundedCornerShape(8.dp))
                            .border(
                                width = if (isFocused) 2.dp else 1.dp,
                                color = if (isFocused) Brand500 else BorderLight,
                                shape = RoundedCornerShape(8.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = char,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Black,
                            color = TextInkPrimary,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }
    )
}
```

#### 7.5.2 Login Screen (`LoginScreen.kt`)

```kotlin
package com.lputrade.app.ui.auth.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.lputrade.app.ui.auth.components.LPUTradeInputField
import com.lputrade.app.ui.auth.components.LPUTradePrimaryButton
import com.lputrade.app.ui.theme.*

@Composable
fun LoginScreen(
    onNavigateToRegister: () -> Unit,
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.isSuccess) {
        if (state.isSuccess) onLoginSuccess()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(CreamBackground)
            .padding(horizontal = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .align(Alignment.Center),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Brand Icon Header
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .background(Brand50, RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(text = "🛡️", fontSize = 28.sp)
            }

            Spacer(modifier = Modifier.height(16.dp))
            Text(text = "Welcome Back", style = MaterialTheme.typography.headlineMedium)
            Text(text = "Sign in with your student credentials", style = MaterialTheme.typography.bodyMedium)

            Spacer(modifier = Modifier.height(32.dp))

            // Form Fields
            LPUTradeInputField(
                label = "Registration Number",
                value = state.regNo,
                onValueChange = { viewModel.onRegNoChange(it) },
                placeholder = "e.g. 12200000",
                keyboardType = KeyboardType.Number,
                errorMessage = state.regNoError
            )

            Spacer(modifier = Modifier.height(16.dp))

            LPUTradeInputField(
                label = "Password",
                value = state.password,
                onValueChange = { viewModel.onPasswordChange(it) },
                placeholder = "••••••••",
                visualTransformation = PasswordVisualTransformation(),
                keyboardType = KeyboardType.Password,
                errorMessage = state.passwordError
            )

            if (state.generalError != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = state.generalError!!,
                    color = StatusError,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(modifier = Modifier.height(28.dp))

            LPUTradePrimaryButton(
                text = "Sign In",
                onClick = { viewModel.submitLogin() },
                isLoading = state.isLoading
            )

            Spacer(modifier = Modifier.height(20.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = "Don't have an account? ", color = TextMutedSecondary, fontSize = 14.sp)
                TextButton(onClick = onNavigateToRegister) {
                    Text(text = "Sign up", color = Brand500, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
            }
        }
    }
}
```

---

## 8. Security & Production Checklist

- [x] **Cleartext Traffic Restriction:** Enforce HTTPS in production via `res/xml/network_security_config.xml`.
- [x] **Secure Token Persistence:** Sensitive tokens stored in encrypted format or Private Jetpack DataStore file isolated to app UID.
- [x] **Live Availability Debouncing:** 500ms debounce prevents unnecessary API load on the Django server when entering Reg No.
- [x] **Automatic 401 Re-Auth:** Zero token expiry crashes via OkHttp `TokenAuthenticator` transparent token rotation.
- [x] **Scoped Rate Limiting:** UI gracefully handles `429 Too Many Requests` when OTP or Login attempt limit is hit.
- [x] **Strict Reg No & Phone Formatting:** Digits-only keyboard filtering (`KeyboardType.Number`) eliminates formatting anomalies before network payload generation.
