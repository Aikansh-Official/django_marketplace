# 📱 CampusXChange — Android Session Management, Login & Registration Master Specification

> **Module Identifier:** Module 03 (Unified Master Auth & Session Specification)  
> **Target Platform:** Android Native (API Level 26+ / Android 8.0 to Android 15+)  
> **Tech Stack:** Kotlin 2.x, Jetpack Compose, Material 3, Clean Architecture + MVVM, Hilt, Coroutines StateFlow, Retrofit 2, OkHttp 4, Jetpack DataStore (Security AES-256), AndroidX Biometric, Google ML Kit (OCR), CameraX  
> **Backend Integration:** Django REST Framework + SimpleJWT (`https://cxc.anshuman892494.online/api/auth/`)  
> **Session Model:** Dual-Device Session Isolation (1 Android Session @ 90 Days + 1 Web Session @ 30 Days)  
> **Primary Brand Palette:** Vibrant Campus Orange (`#FB5607` / `#F97316`), Slate Dark (`#0F172A`), Frosted Glassmorphism (`0xF2FFFFFF`)  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [System Architecture & Session Lifecycle Overview](#1-system-architecture--session-lifecycle-overview)
2. [Dual-Device Session Isolation & Security Standard](#2-dual-device-session-isolation--security-standard)
   - 2.1 The `android_session_id` Architecture
   - 2.2 Cross-Device Session Termination Detection
   - 2.3 90-Day Refresh Token Lifecycle & OkHttp Authenticator
   - 2.4 Thread-Safe Concurrent Request Queueing
3. [Login Engine Architecture (`LoginScreen.kt`)](#3-login-engine-architecture)
   - 3.1 Dual-Identifier Authentication (Reg No / Email + Password)
   - 3.2 Hardware-Backed Biometric Authentication (Fingerprint & Face Unlock)
   - 3.3 Remember Me & Automatic Re-authentication
   - 3.4 Rate Limiting & Brute-Force Safeguards
4. [Dual-Path Registration & Verification Engine (`RegisterFlowScreen.kt`)](#4-dual-path-registration--verification-engine)
   - 4.1 Buyer Onboarding (Fast 3-Step Flow)
   - 4.2 Verified Seller Onboarding (High-Trust 5-Step Flow)
   - 4.3 Real-Time Pre-Flight Validation Engine
   - 4.4 On-Device Google ML Kit Student ID OCR
   - 4.5 CameraX Live Selfie Liveness Detection
   - 4.6 6-Digit Email OTP Engine with Resend Throttling
5. [Token Storage & Cryptographic Security (`SessionManager.kt`)](#5-token-storage--cryptographic-security)
6. [Complete Production Kotlin Code Blueprint](#6-complete-production-kotlin-code-blueprint)
   - 6.1 DTOs & Retrofit Auth Service (`AuthApiService.kt`)
   - 6.2 Token Interceptor & Authenticator (`AuthInterceptor.kt` & `TokenAuthenticator.kt`)
   - 6.3 Hardware Keystore Session Manager (`SessionManager.kt`)
   - 6.4 Biometric Prompt Handler (`BiometricPromptManager.kt`)
   - 6.5 Login ViewModel (`LoginViewModel.kt`)
   - 6.6 Register ViewModel (`RegisterViewModel.kt`)
   - 6.7 Compose Login Screen (`LoginScreen.kt`)
   - 6.8 Compose Registration Multi-Step Stepper (`RegisterFlowScreen.kt`)
   - 6.9 Session Terminated Alert Modal (`SessionTerminatedDialog.kt`)
7. [Complete REST API Contract & Security Headers](#7-complete-rest-api-contract--security-headers)
8. [Edge Cases, Error Recovery & Verification Matrix](#8-edge-cases-error-recovery--verification-matrix)

---

## 1. System Architecture & Session Lifecycle Overview

CampusXChange Android implements an enterprise-grade authentication and session governance framework. Unlike standard consumer apps that permit uncoordinated logins, CampusXChange enforces **Dual-Device Session Isolation** to protect student identities, campus transactions, and peer-to-peer escrow handovers.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       JETPACK COMPOSE UI LAYER                              │
│       LoginScreen • RegisterFlowScreen • SessionTerminatedModal             │
└──────────────────────────────────────▲──────────────────────────────────────┘
                                       │ StateFlow<LoginUiState / RegisterUiState>
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            VIEWMODEL LAYER (HILT)                           │
│        LoginViewModel • RegisterViewModel • SessionViewModel                │
└──────────────────────────────────────▲──────────────────────────────────────┘
                                       │ Coroutines / Result<T>
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                        AUTHENTICATION REPOSITORY                            │
│           Login • Register • OTP Verify • ID OCR • Biometrics                │
└──────────────┬───────────────────────────────────────┬──────────────────────┘
               ▼                                       ▼
 ┌───────────────────────────┐           ┌───────────────────────────┐
 │   SECURITY ENCRYPTED      │           │     OKHTTP 4 PIPELINE     │
 │       DATASTORE           │           │  X-App-Security-Key Shield│
 │   Tokens • Session UUID   │           │  X-Client-Type: android   │
 │   User Role • Trust Score │           │  Token Refresh Authenticator│
 └───────────────────────────┘           └─────────────┬─────────────┘
                                                       ▼
                                         ┌───────────────────────────┐
                                         │    DJANGO REST BACKEND    │
                                         │  /api/auth/login/         │
                                         │  /api/auth/token/refresh/ │
                                         │  /api/auth/status/        │
                                         └───────────────────────────┘
```

---

## 2. Dual-Device Session Isolation & Security Standard

### 2.1 The `android_session_id` Architecture

CampusXChange permits **exactly one active Android device session (90 days)** and **one active Web browser session (30 days)** per student account.

1. **Session UUID Issuance:**
   When a student logs in or registers via Android, the backend (`CustomTokenObtainPairView` in `server/users/views.py`) generates a cryptographically random UUID (`new_session_id = uuid.uuid4().hex`).
2. **JWT Claim Embedding:**
   This UUID is embedded directly inside both the `access` and `refresh` token payloads:
   ```json
   {
     "token_type": "refresh",
     "exp": 1774180800,
     "jti": "8f8b89c30c1248...",
     "user_id": "67a9b1c0e3f8...",
     "session_id": "9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a",
     "client_type": "android"
   }
   ```
3. **Database Pinning:**
   The backend saves this session identifier to the user's database record:
   - `user.android_session_id = new_session_id`
   - `user.android_session_device = "Google Pixel 8 (Android 14)"`
   - `user.android_session_created_at = timezone.now()`

---

### 2.2 Cross-Device Session Termination Detection

If a student signs into their account on a **second Android device (Device B)**:
1. Device B is issued a new `android_session_id`. The user record in MongoDB is updated.
2. When **Device A** makes its next API call or attempts to refresh its access token, the backend inspects the token claims:
   ```python
   if client_type == 'android':
       if not user.android_session_id or user.android_session_id != token_session_id:
           return Response({
               'error': 'Session terminated: Your account was logged in on another Android device or logged out.',
               'session_invalidated': True,
               'client_type': 'android'
           }, status=status.HTTP_401_UNAUTHORIZED)
   ```
3. **Android Client Reaction:**
   - The OkHttp `TokenAuthenticator` catches `session_invalidated: true`.
   - It intercepts the 401 response and dispatches a global event (`SessionTerminationEvent`).
   - The app purges cached tokens from Encrypted DataStore.
   - It pops all screens and presents the non-dismissible `SessionTerminatedDialog` with the message:  
     *"Your account was logged in on another Android device. Please log in again to continue."*

---

### 2.3 90-Day Refresh Token Lifecycle & OkHttp Authenticator

- **Access Token:** Short-lived (15 minutes). Sent in every request header as `Authorization: Bearer <access_token>`.
- **Refresh Token:** Long-lived (90 days for Android). Kept strictly in Encrypted DataStore.
- **Silent Refresh:** When an access token expires (HTTP 401), the OkHttp `Authenticator` automatically executes `POST /api/auth/token/refresh/` synchronously on the background worker thread, updates the DataStore with the new access token, and retries the failed original request with zero user disruption.

---

### 2.4 Thread-Safe Concurrent Request Queueing

When multiple network calls fire simultaneously (e.g. Marketplace feed + Notifications polling + Unread chat count), and the access token has expired:
- Without mutex locking, all 3 requests would attempt to refresh the token simultaneously, causing race conditions or SimpleJWT token reuse errors.
- The Android OkHttp `TokenAuthenticator` uses a **Kotlin `Mutex`** to guarantee that only the first request performs the token refresh. Subsequent requests suspend and await the fresh access token before retrying.

```
Request 1 (Feed) ─────── 401 ──► [ Acquire Mutex ] ──► POST /token/refresh/ ──► 200 OK ──► Retry Request 1
Request 2 (Chats) ────── 401 ──► [ Wait on Mutex ] ─────────────────────────────────────► Retry with New Token
Request 3 (Alerts) ───── 401 ──► [ Wait on Mutex ] ─────────────────────────────────────► Retry with New Token
```

---

## 3. Login Engine Architecture (`LoginScreen.kt`)

### 3.1 Dual-Identifier Authentication
Students can log in using either their **Campus Registration Number** (e.g. `12201948`) or their **Email Address** (`student@lpu.in`).
- Input field dynamically detects format:
  - If input contains `@`, it is validated as an email address.
  - If purely alphanumeric/numeric, it is treated as a registration number / username.
- Inputs are normalized (trimmed and lowercase for emails) before dispatch.

### 3.2 Hardware-Backed Biometric Authentication
- Implemented via `androidx.biometric.BiometricPrompt`.
- Available on devices supporting Class 3 (Strong) Biometrics (Fingerprint / 3D Face Unlock).
- **Mechanism:**
  - Upon first successful password login, student can toggle *"Enable Fingerprint / Face Unlock"*.
  - A secret encryption key is generated in the hardware **Android Keystore** (`MasterKeys.AES256_GCM_SPEC`).
  - When biometric auth succeeds, the saved refresh token is decrypted and used to silently obtain a valid access token.

### 3.3 Rate Limiting & Brute-Force Safeguards
- Backend enforces `ScopedRateThrottle` with scope `'login'` (maximum 5 attempts per minute).
- HTTP 429 Too Many Requests triggers a countdown timer in Compose (`"Too many attempts. Please wait 45s"`).
- Password visibility toggle with haptic feedback.

---

## 4. Dual-Path Registration & Verification Engine (`RegisterFlowScreen.kt`)

Students choose their onboarding track based on their initial intent:

```
                            ROLE SELECTION
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
            [ BUYER PATH ]               [ SELLER PATH ]
        (Fast 3-Step Onboarding)     (Verified 5-Step Onboarding)
        1. Student Details           1. Student Details
        2. Email OTP Verification    2. Student ID Card (ML Kit OCR)
        3. Password & Terms          3. CameraX Live Selfie Liveness
                                     4. Email OTP Verification
                                     5. Password & Trust Setup
```

### 4.1 Buyer Onboarding (3-Step Flow)
1. **Step 1: Student Details:** Registration Number, Full Name, Phone Number, University Email, and Hostel/Block location.
2. **Step 2: OTP Verification:** 6-digit OTP sent to university email. 60-second countdown resend timer.
3. **Step 3: Security & Agreements:** Password creation (min 8 chars, 1 uppercase, 1 digit, 1 symbol) + Campus safety and DPDP Act compliance checkboxes.

---

### 4.2 Verified Seller Onboarding (5-Step Flow)
Includes all Buyer steps plus mandatory student identity verification to eliminate campus scams:
1. **Step 1: Student Details:** Same as buyer.
2. **Step 2: Student ID Card Verification (On-Device ML Kit OCR):**
   - Student scans the physical university ID card using camera.
   - Google ML Kit extracts text locally in under 400ms without sending raw photos to third parties.
   - Extracts and verifies: Registration Number and Student Name match Step 1.
3. **Step 3: Live Selfie Liveness Check (CameraX):**
   - Front camera selfie with face detector.
   - Checks lighting, face tilt, and liveness to prevent photo-of-photo spoofing.
4. **Step 4: Email OTP Verification:** OTP with `purpose: "registration"`.
5. **Step 5: Password & Storefront Creation:** Initial seller trust score seeded at **100% Verified**.

---

### 4.3 Real-Time Pre-Flight Validation Engine

To prevent students from filling out multi-step forms only to fail at the last step, inputs are validated on-the-fly with a **400ms debounce**:
- `GET /api/auth/check-username/?username={val}`
- `GET /api/auth/check-phone/?phone={val}`
- `GET /api/auth/check-email/?email={val}`
- `POST /api/auth/check-availability/` (Batch checks all 3 before moving to Step 2).

---

## 5. Token Storage & Cryptographic Security (`SessionManager.kt`)

CampusXChange uses **AndroidX EncryptedSharedPreferences** backed by the **Android Keystore System**:
- Master key generated with `KeyGenParameterSpec` (`PURPOSE_ENCRYPT | PURPOSE_DECRYPT`, `BLOCK_MODE_GCM`, `ENCRYPTION_PADDING_NONE`).
- Tokens stored on disk are encrypted using **AES-256 GCM**.
- Keys are hardware-isolated (TEE or StrongBox Keymaster) and cannot be extracted even on rooted devices.

```kotlin
// Master Key Alias in Android Keystore
private const val MASTER_KEY_ALIAS = "_cxc_keystore_master_key_"
private const val SECURE_PREFS_NAME = "cxc_secure_session_store"
```

---

## 6. Complete Production Kotlin Code Blueprint

### 6.1 DTOs & Retrofit Auth Service (`AuthApiService.kt`)

```kotlin
package com.campusxchange.app.data.remote

import com.campusxchange.app.data.remote.dto.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

interface AuthApiService {

    @POST("api/auth/login/")
    suspend fun login(
        @Body request: LoginRequestDto
    ): Response<LoginResponseDto>

    @POST("api/auth/token/refresh/")
    suspend fun refreshToken(
        @Body request: RefreshTokenRequestDto
    ): Response<RefreshTokenResponseDto>

    @POST("api/auth/logout/")
    suspend fun logout(
        @Body request: LogoutRequestDto
    ): Response<GenericMessageDto>

    @GET("api/auth/status/")
    suspend fun getAuthStatus(): Response<AuthStatusResponseDto>

    @POST("api/auth/send-otp/")
    suspend fun sendOtp(
        @Body request: SendOtpRequestDto
    ): Response<GenericMessageDto>

    @POST("api/auth/verify-otp/")
    suspend fun verifyOtp(
        @Body request: VerifyOtpRequestDto
    ): Response<VerifyOtpResponseDto>

    @POST("api/auth/check-availability/")
    suspend fun checkAvailability(
        @Body request: CheckAvailabilityRequestDto
    ): Response<CheckAvailabilityResponseDto>

    @Multipart
    @POST("api/auth/register/")
    suspend fun register(
        @Part("username") regNo: RequestBody,
        @Part("email") email: RequestBody,
        @Part("phone") phone: RequestBody,
        @Part("full_name") fullName: RequestBody,
        @Part("password") password: RequestBody,
        @Part("role") role: RequestBody,
        @Part("campus_location") location: RequestBody,
        @Part idCardFront: MultipartBody.Part?,
        @Part selfieImage: MultipartBody.Part?
    ): Response<RegisterResponseDto>
}
```

---

### 6.2 Token Interceptor & Authenticator (`AuthInterceptor.kt` & `TokenAuthenticator.kt`)

```kotlin
package com.campusxchange.app.data.remote

import com.campusxchange.app.data.local.SessionManager
import com.campusxchange.app.data.remote.dto.RefreshTokenRequestDto
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.*
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton

/**
 * Attaches Mandatory CampusXChange Security Headers to every outgoing request.
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val sessionManager: SessionManager
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val builder = original.newBuilder()

        // 1. Mandatory Platform & Security Shield Headers
        builder.header("X-App-Security-Key", NetworkConstants.DATA_SECURITY_KEY)
        builder.header("X-Client-Type", "android") // Crucial for dual-device session isolation

        // 2. Attach Bearer Access Token if present
        val token = runBlocking { sessionManager.getAccessToken() }
        if (!token.isNullOrBlank() && !original.headers.names().contains("Authorization")) {
            builder.header("Authorization", "Bearer $token")
        }

        return chain.proceed(builder.build())
    }
}

/**
 * Handles HTTP 401 Unauthorized by executing silent token refresh with Mutex locking
 * and detects cross-device session invalidations.
 */
@Singleton
class TokenAuthenticator @Inject constructor(
    private val sessionManager: SessionManager,
    private val authApiProvider: Provider<AuthApiService>
) : Authenticator {

    private val refreshMutex = Mutex()

    override fun authenticate(route: Route?, response: Response): Request? {
        // Prevent infinite loops if refresh endpoint itself failed with 401
        if (response.request.url.encodedPath.contains("/auth/token/refresh/")) {
            return null
        }

        return runBlocking {
            refreshMutex.withLock {
                val currentAccessToken = sessionManager.getAccessToken()
                val requestToken = response.request.header("Authorization")?.removePrefix("Bearer ")

                // If token was already refreshed by another concurrent thread, retry immediately
                if (currentAccessToken != null && currentAccessToken != requestToken) {
                    return@withLock response.request.newBuilder()
                        .header("Authorization", "Bearer $currentAccessToken")
                        .build()
                }

                val refreshToken = sessionManager.getRefreshToken() ?: run {
                    sessionManager.clearSession()
                    return@withLock null
                }

                try {
                    val authApi = authApiProvider.get()
                    val refreshResponse = authApi.refreshToken(RefreshTokenRequestDto(refresh = refreshToken))

                    if (refreshResponse.isSuccessful && refreshResponse.body() != null) {
                        val newAccess = refreshResponse.body()!!.access
                        sessionManager.saveAccessToken(newAccess)
                        refreshResponse.body()!!.refresh?.let { newRefresh ->
                            sessionManager.saveRefreshToken(newRefresh)
                        }

                        // Retry original request with fresh access token
                        return@withLock response.request.newBuilder()
                            .header("Authorization", "Bearer $newAccess")
                            .build()
                    } else {
                        // Check if session was terminated on another Android device
                        val errorBody = refreshResponse.errorBody()?.string()
                        val isSessionInvalidated = try {
                            JSONObject(errorBody ?: "").optBoolean("session_invalidated", false)
                        } catch (e: Exception) {
                            false
                        }

                        sessionManager.clearSession()

                        if (isSessionInvalidated) {
                            sessionManager.broadcastSessionTerminated(
                                message = "Your account was logged in on another Android device or logged out."
                            )
                        } else {
                            sessionManager.broadcastAuthExpired()
                        }
                        return@withLock null
                    }
                } catch (e: Exception) {
                    sessionManager.clearSession()
                    return@withLock null
                }
            }
        }
    }
}
```

---

### 6.3 Hardware Keystore Session Manager (`SessionManager.kt`)

```kotlin
package com.campusxchange.app.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "cxc_secure_session_store",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    private val _sessionEvents = MutableSharedFlow<SessionEvent>(extraBufferCapacity = 1)
    val sessionEvents: SharedFlow<SessionEvent> = _sessionEvents.asSharedFlow()

    fun saveTokens(accessToken: String, refreshToken: String, sessionId: String) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .putString(KEY_SESSION_ID, sessionId)
            .apply()
    }

    fun saveAccessToken(accessToken: String) {
        prefs.edit().putString(KEY_ACCESS_TOKEN, accessToken).apply()
    }

    fun saveRefreshToken(refreshToken: String) {
        prefs.edit().putString(KEY_REFRESH_TOKEN, refreshToken).apply()
    }

    fun getAccessToken(): String? = prefs.getString(KEY_ACCESS_TOKEN, null)
    fun getRefreshToken(): String? = prefs.getString(KEY_REFRESH_TOKEN, null)
    fun getSessionId(): String? = prefs.getString(KEY_SESSION_ID, null)

    fun clearSession() {
        prefs.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .remove(KEY_SESSION_ID)
            .apply()
    }

    suspend fun broadcastSessionTerminated(message: String) {
        _sessionEvents.emit(SessionEvent.SessionTerminated(message))
    }

    suspend fun broadcastAuthExpired() {
        _sessionEvents.emit(SessionEvent.AuthExpired)
    }

    companion object {
        private const val KEY_ACCESS_TOKEN = "jwt_access_token"
        private const val KEY_REFRESH_TOKEN = "jwt_refresh_token"
        private const val KEY_SESSION_ID = "android_session_id"
    }
}

sealed class SessionEvent {
    data class SessionTerminated(val message: String) : SessionEvent()
    object AuthExpired : SessionEvent()
}
```

---

### 6.4 Biometric Prompt Handler (`BiometricPromptManager.kt`)

```kotlin
package com.campusxchange.app.ui.auth.biometrics

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.receiveAsFlow

class BiometricPromptManager(private val activity: FragmentActivity) {

    private val resultChannel = Channel<BiometricResult>()
    val promptResults = resultChannel.receiveAsFlow()

    fun showBiometricPrompt(
        title: String = "CampusXChange Quick Login",
        subtitle: String = "Verify your fingerprint or face to sign in"
    ) {
        val manager = BiometricManager.from(activity)
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG

        if (manager.canAuthenticate(authenticators) != BiometricManager.BIOMETRIC_SUCCESS) {
            resultChannel.trySend(BiometricResult.FeatureUnavailable)
            return
        }

        val executor = ContextCompat.getMainExecutor(activity)
        val prompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    resultChannel.trySend(BiometricResult.AuthenticationSuccess)
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    resultChannel.trySend(BiometricResult.AuthenticationError(errString.toString()))
                }

                override fun onAuthenticationFailed() {
                    resultChannel.trySend(BiometricResult.AuthenticationFailed)
                }
            }
        )

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setNegativeButtonText("Use Password")
            .setAllowedAuthenticators(authenticators)
            .build()

        prompt.authenticate(promptInfo)
    }

    sealed class BiometricResult {
        object HardwareUnavailable : BiometricResult()
        object FeatureUnavailable : BiometricResult()
        object AuthenticationSuccess : BiometricResult()
        object AuthenticationFailed : BiometricResult()
        data class AuthenticationError(val error: String) : BiometricResult()
    }
}
```

---

### 6.5 Compose Login Screen (`LoginScreen.kt`)

```kotlin
package com.campusxchange.app.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.campusxchange.app.ui.theme.*

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit,
    onForgotPasswordClick: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var passwordVisible by remember { mutableStateOf(false) }

    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) onLoginSuccess()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(CanvasBackground)
            .padding(horizontal = 24.dp),
        contentAlignment = Alignment.Center
    ) {
        // Floating Glassmorphic Login Card
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .shadow(elevation = 16.dp, shape = RoundedCornerShape(24.dp), ambientColor = Color.Black.copy(alpha = 0.08f)),
            shape = RoundedCornerShape(24.dp),
            color = SurfaceLight
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Brand Logo Header
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(BrandLight),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "Security",
                        tint = BrandPrimary,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Welcome Back",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    color = TextPrimary
                )
                Text(
                    text = "Log in with Registration Number or Email",
                    fontSize = 12.sp,
                    color = TextSecondary
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Error Banner
                uiState.errorMessage?.let { error ->
                    Text(
                        text = error,
                        color = ErrorRed,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(ErrorBg, RoundedCornerShape(8.dp))
                            .padding(10.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                }

                // Identifier Input
                OutlinedTextField(
                    value = uiState.identifier,
                    onValueChange = { viewModel.updateIdentifier(it) },
                    label = { Text("Registration No. / Email") },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = BrandPrimary) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Password Input
                OutlinedTextField(
                    value = uiState.password,
                    onValueChange = { viewModel.updatePassword(it) },
                    label = { Text("Password") },
                    leadingIcon = { Icon(Icons.Default.Key, contentDescription = null, tint = BrandPrimary) },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                contentDescription = "Toggle password visibility"
                            )
                        }
                    },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = uiState.rememberMe,
                            onCheckedChange = { viewModel.toggleRememberMe(it) },
                            colors = CheckboxDefaults.colors(checkedColor = BrandPrimary)
                        )
                        Text(text = "Remember me", fontSize = 12.sp, color = TextSecondary)
                    }

                    Text(
                        text = "Forgot password?",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = BrandPrimary,
                        modifier = Modifier.clickable(onClick = onForgotPasswordClick)
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Primary Login Button
                Button(
                    onClick = { viewModel.submitLogin() },
                    enabled = !uiState.isLoading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary)
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                    } else {
                        Text(text = "Log In", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Biometric Quick Login Button
                if (uiState.isBiometricAvailable) {
                    OutlinedButton(
                        onClick = { viewModel.triggerBiometricLogin() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        border = ButtonDefaults.outlinedButtonBorder.copy(
                            brush = androidx.compose.ui.graphics.SolidColor(BrandBorder)
                        )
                    ) {
                        Icon(imageVector = Icons.Default.Fingerprint, contentDescription = null, tint = BrandPrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = "Quick Biometric Login", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Navigate to Register
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "New to CampusXChange? ", fontSize = 12.sp, color = TextSecondary)
                    Text(
                        text = "Create Account",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = BrandPrimary,
                        modifier = Modifier.clickable(onClick = onNavigateToRegister)
                    )
                }
            }
        }
    }
}
```

---

### 6.6 Session Terminated Alert Modal (`SessionTerminatedDialog.kt`)

```kotlin
package com.campusxchange.app.ui.components.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.campusxchange.app.ui.theme.*

@Composable
fun SessionTerminatedDialog(
    message: String,
    onConfirmLoginAgain: () -> Unit
) {
    Dialog(
        onDismissRequest = { /* Non-dismissible: Must re-authenticate */ },
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)
    ) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = SurfaceLight,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .clip(CircleShape)
                        .background(ErrorBg),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Session Alert",
                        tint = ErrorRed,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Session Terminated",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    color = TextPrimary
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = message,
                    fontSize = 13.sp,
                    color = TextSecondary,
                    textAlign = TextAlign.Center,
                    lineHeight = 18.sp
                )

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = onConfirmLoginAgain,
                    colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                ) {
                    Text(
                        text = "Log In Again",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }
}
```

---

## 7. Complete REST API Contract & Security Headers

### Mandatory Headers (Every Outgoing Request)
```http
X-App-Security-Key: campusXchange_secure_key_2026_@nshuman892494
X-Client-Type: android
Authorization: Bearer <access_token>
```

### 7.1 Login (`POST /api/auth/login/`)
**Request:**
```json
{
  "username": "12201948",
  "password": "StudentPassword@2026"
}
```
**Response (200 OK):**
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "client_type": "android",
  "session_id": "8f8b89c30c1248a3b5c7...",
  "expires_in_days": 90,
  "user": {
    "id": "67a9b1c0e3f8a...",
    "username": "12201948",
    "email": "anshuman@lpu.in",
    "full_name": "Anshuman",
    "role": "SELLER",
    "is_id_verified": true,
    "trust_score": 4.9,
    "campus_location": "BH-4, Boys Hostel 4"
  }
}
```

### 7.2 Refresh Token with Dual-Device Check (`POST /api/auth/token/refresh/`)
**Request:**
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
**Response (401 Unauthorized - Session Replaced on Device B):**
```json
{
  "error": "Session terminated: Your account was logged in on another Android device or logged out.",
  "session_invalidated": true,
  "client_type": "android"
}
```

---

## 8. Edge Cases, Error Recovery & Verification Matrix

| Test ID | Scenario | Expected Behavior |
|:---|:---|:---|
| **TC-SESS-01** | Student logs into Device A, then signs into Device B | Device B receives new session UUID. On Device A's next API or refresh call, backend returns 401 `session_invalidated: true`. Device A purges tokens and shows non-dismissible `SessionTerminatedDialog`. |
| **TC-SESS-02** | Student is active on 1 Web browser and 1 Android phone simultaneously | Both sessions remain fully active without conflicts because `X-Client-Type: android` and `X-Client-Type: web` isolate session slots independently. |
| **TC-SESS-03** | Access token expires after 15 minutes during feed scrolling | OkHttp `TokenAuthenticator` intercepts 401, acquires Mutex, executes `POST /token/refresh/`, stores new access token, and retries request seamlessly. Zero disruption to student. |
| **TC-SESS-04** | 5 concurrent requests fire when access token has expired | Mutex lock guarantees exactly one refresh call executes. Other 4 requests suspend and retry with the single refreshed token. |
| **TC-SESS-05** | Student attempts 6 invalid passwords in 60 seconds | Backend throttles with HTTP 429 (`login` scope). Android UI displays locked countdown timer. |
| **TC-SESS-06** | Student ID card OCR does not match registration number entered | ML Kit on-device validation fails immediately with clear error: *"Scanned ID (12204912) does not match entered Reg No (12201948)"*. Prevents fake account creation. |
| **TC-SESS-07** | Device reboot with "Remember Me" enabled | Encrypted DataStore persists 90-day refresh token. App launches directly to Dashboard via silent refresh. |
