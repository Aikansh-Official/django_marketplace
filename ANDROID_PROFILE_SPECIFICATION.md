# 👤 LPUTrade — Android Profile & Student Identity Specification

> **Target Platform:** Android (Native)  
> **Tech Stack:** Kotlin, Jetpack Compose, Material 3, MVVM, Retrofit, Jetpack DataStore, Coil, Hilt  
> **Backend Service:** Django REST Framework (`/api/auth/profile/`, `/api/auth/logout/`, `/api/marketplace/upload-image/`)  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [Architecture & Overview](#1-architecture--overview)
2. [Business Logic & Validation Rules](#2-business-logic--validation-rules)
   - [2.1 Profile Fields & Mutability](#21-profile-fields--mutability)
   - [2.2 Trust Score Algorithm & Badges](#22-trust-score-algorithm--badges)
   - [2.3 College ID Verification Flow](#23-college-id-verification-flow)
   - [2.4 Saved Items & Wishlist Management](#24-saved-items--wishlist-management)
   - [2.5 Logout & Session Invalidation](#25-logout--session-invalidation)
3. [Color Palette & Material 3 Tokens](#3-color-palette--material-3-tokens)
4. [Navigation Graph & Android Routes](#4-navigation-graph--android-routes)
5. [REST API Contract & Endpoints](#5-rest-api-contract--endpoints)
6. [Android Implementation Blueprint (Kotlin Code)](#6-android-implementation-blueprint-kotlin-code)
   - [6.1 DTOs & Retrofit Profile Service](#61-dtos--retrofit-profile-service)
   - [6.2 Profile Repository & Local Cache](#62-profile-repository--local-cache)
   - [6.3 Profile ViewModel (StateFlow & UiState)](#63-profile-viewmodel-stateflow--uistate)
   - [6.4 Jetpack Compose UI Screens](#64-jetpack-compose-ui-screens)
7. [Testing & Production Checklist](#7-testing--production-checklist)

---

## 1. Architecture & Overview

The Profile module handles student identity, trust ratings, ID card upload/verification, saved wishlist items, active trading statistics, and secure session logout.

```
┌─────────────────────────────────────────────────────────────┐
│                 Jetpack Compose UI (Profile)                │
│  (ProfileScreen, EditProfileSheet, IdVerificationScreen,    │
│                 SavedWishlistScreen)                        │
└──────────────────────────────▲──────────────────────────────┘
                               │ StateFlow<ProfileUiState>
┌──────────────────────────────▼──────────────────────────────┐
│                      ProfileViewModel                       │
└──────────────────────────────▲──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      ProfileRepository                      │
└──────────────┬───────────────────────────────┬──────────────┘
               ▼                               ▼
  Remote (ProfileApiService)      Local (TokenManager / Room DB)
```

---

## 2. Business Logic & Validation Rules

### 2.1 Profile Fields & Mutability

| Field | Type | Editable by User? | Validation Rule |
|---|---|---|---|
| `username` | String (8 digits) | ❌ **No (Immutable)** | Fixed LPU Student Registration Number |
| `email` | String (Email) | ❌ **No (Immutable)** | Verified Google / College Email |
| `full_name` | String | ✅ **Yes** | 3 to 50 characters, letters & spaces only |
| `phone_number` | String (10 digits)| ✅ **Yes** | Exactly 10 digits (`^\d{10}$`), unique across users |
| `profile_picture_url`| String (URL) | ✅ **Yes** | Image uploaded to Cloudinary, valid HTTPS URL |
| `college_domain` | String | ❌ **No** | Extracted from email (e.g., `gmail.com`, `lpu.in`) |
| `is_verified_student`| Boolean | ❌ **No** | Set to true upon email OTP and admin/ID confirmation |
| `trust_score` | Integer (0-100) | ❌ **No** | Computed by backend based on account signals |
| `date_joined` | ISO Timestamp | ❌ **No** | Account creation timestamp |

### 2.2 Trust Score Algorithm & Badges

The **Trust Score** is a dynamic rating from **0 to 100** indicating trader trustworthiness within the campus:

```
Base Score: 50 pts (Verified Email via OTP)
   + 20 pts: College ID Card Verified
   + 15 pts: Phone Number Verified & Added
   + 3 pts per Successful Handover Deal Completed (up to 15 pts)
   - 25 pts per Validated Item Report / Misconduct
```

#### Trader Badges:
- 🟢 **Elite Trader (80 - 100):** Gold/Emerald shield badge. Highest trust, priority listing visibility.
- 🔵 **Trusted Trader (50 - 79):** Blue verified badge. Standard verified student trader.
- 🟠 **New Trader (0 - 49):** Orange notice badge. Encouraged to verify ID and complete handovers.

### 2.3 College ID Verification Flow
1. User selects front photo of Student Identity Card (LPU ID).
2. Maximum image file size: **5 MB**. Supported formats: JPEG, PNG, WEBP.
3. User selects Degree/Branch (e.g., *B.Tech CSE*, *MBA*, *B.Des*) and Residence (*Hostel BH-4*, *Day Scholar*, *PG Law Gate*).
4. Image is uploaded via `POST /api/marketplace/upload-image/` to Cloudinary.
5. Verification record is submitted for admin review, unlocking the ID Verified badge upon approval (+20 Trust points).

### 2.4 Saved Items & Wishlist Management
- Students can bookmark listings from the marketplace or product details.
- Stored locally via Jetpack DataStore / Room DB with sync to backend `Wishlist` model.
- Wishlist screen allows one-tap viewing of bookmarked items, availability badges (Active, Sold, Reserved), and removal.

### 2.5 Logout & Session Invalidation
- Confirmation modal warns user before logging out.
- Calls `POST /api/auth/logout/` with the current `refresh` token to blacklist it server-side.
- Local Jetpack DataStore credentials (`access_token`, `refresh_token`, `cached_user`) are wiped.
- Navigation stack is completely cleared (`popUpTo(0)`) and user is redirected to `AuthRoute.Login`.

---

## 3. Color Palette & Material 3 Tokens

Matches the official LPUTrade theme:

```kotlin
package com.lputrade.app.ui.theme

import androidx.compose.ui.graphics.Color

// Profile Brand Accents
val ProfileBrandOrange = Color(0xFFFB5607)
val ProfileBrandOrangeDark = Color(0xFFEA4300)
val ProfileBrandBgLight = Color(0xFFFFF4ED)

// Verification & Status Colors
val VerifiedBlue = Color(0xFF2563EB)
val VerifiedBlueBg = Color(0xFFEFF6FF)
val TrustEliteGreen = Color(0xFF10B981)
val TrustEliteGreenBg = Color(0xFFECFDF5)
val WarningAmber = Color(0xFFF59E0B)
val DangerRed = Color(0xFFEF4444)

// Neutrals
val ProfileScreenBg = Color(0xFFFCFBF8) // Warm Cream 50
val ProfileCardSurface = Color(0xFFFFFFFF)
val ProfileTextPrimary = Color(0xFF111111)
val ProfileTextMuted = Color(0xFF6B7280)
val ProfileBorder = Color(0xFFE5E7EB)
```

---

## 4. Navigation Graph & Android Routes

```
MainNavGraph ("main_graph")
 └── ProfileGraph ("profile_graph")
      ├── ProfileMainRoute ("profile/main")
      ├── EditProfileRoute ("profile/edit")
      ├── IdVerificationRoute ("profile/id_verification")
      ├── SavedItemsRoute ("profile/saved_items")
      └── MyListingsRoute ("marketplace/my_listings")
```

---

## 5. REST API Contract & Endpoints

### 5.1 Get Authenticated User Profile
- **URL:** `GET /api/auth/profile/`
- **Headers:** `Authorization: Bearer <access_token>`

#### Response `200 OK`:
```json
{
  "id": 42,
  "username": "12200000",
  "email": "student122@gmail.com",
  "full_name": "Aman Sharma",
  "phone_number": "9876543210",
  "is_verified_student": true,
  "college_domain": "gmail.com",
  "trust_score": 75,
  "profile_picture_url": "https://res.cloudinary.com/lputrade/image/upload/v12345/avatar.jpg",
  "date_joined": "2026-08-15T10:30:00Z"
}
```

---

### 5.2 Update Profile
- **URL:** `PATCH /api/auth/profile/`
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`

#### Request Body:
```json
{
  "full_name": "Aman Deep Sharma",
  "phone_number": "9876543210",
  "profile_picture_url": "https://res.cloudinary.com/.../new_avatar.jpg"
}
```

#### Response `200 OK`:
```json
{
  "id": 42,
  "username": "12200000",
  "email": "student122@gmail.com",
  "full_name": "Aman Deep Sharma",
  "phone_number": "9876543210",
  "is_verified_student": true,
  "college_domain": "gmail.com",
  "trust_score": 75,
  "profile_picture_url": "https://res.cloudinary.com/.../new_avatar.jpg",
  "date_joined": "2026-08-15T10:30:00Z"
}
```

#### Error `400 Bad Request`:
```json
{
  "phone_number": ["Phone number must be exactly 10 digits."]
}
```

---

### 5.3 Upload Image (Avatar or ID Card)
- **URL:** `POST /api/marketplace/upload-image/`
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: multipart/form-data`
- **Form-data param:** `image`: File binary

#### Response `200 OK`:
```json
{
  "url": "https://res.cloudinary.com/demo/image/upload/v1690000000/lputrade_profiles/xyz.jpg"
}
```

---

### 5.4 Logout User
- **URL:** `POST /api/auth/logout/`
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`

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

## 6. Android Implementation Blueprint (Kotlin Code)

### 6.1 DTOs & Retrofit Profile Service

```kotlin
package com.lputrade.app.data.remote

import com.google.gson.annotations.SerializedName
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.*

data class UpdateProfileRequest(
    @SerializedName("full_name") val fullName: String?,
    @SerializedName("phone_number") val phoneNumber: String?,
    @SerializedName("profile_picture_url") val profilePictureUrl: String? = null
)

data class ImageUploadResponse(
    val url: String
)

interface ProfileApiService {
    @GET("api/auth/profile/")
    suspend fun getProfile(): Response<UserDto>

    @PATCH("api/auth/profile/")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<UserDto>

    @Multipart
    @POST("api/marketplace/upload-image/")
    suspend fun uploadImage(@Part image: MultipartBody.Part): Response<ImageUploadResponse>

    @POST("api/auth/logout/")
    suspend fun logout(@Body request: RefreshTokenRequest): Response<GenericMessageResponse>
}
```

---

### 6.2 Profile Repository & Local Cache

```kotlin
package com.lputrade.app.data.repository

import com.lputrade.app.data.local.TokenManager
import com.lputrade.app.data.remote.ProfileApiService
import com.lputrade.app.data.remote.UpdateProfileRequest
import com.lputrade.app.data.remote.UserDto
import kotlinx.coroutines.flow.Flow
import okhttp3.MultipartBody
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProfileRepository @Inject constructor(
    private val api: ProfileApiService,
    private val tokenManager: TokenManager
) {
    val cachedUserFlow: Flow<UserDto?> = tokenManager.userFlow

    suspend fun fetchFreshProfile(): Result<UserDto> {
        return try {
            val response = api.getProfile()
            if (response.isSuccessful && response.body() != null) {
                val user = response.body()!!
                tokenManager.saveAuthTokens(
                    access = tokenManager.getAccessToken() ?: "",
                    refresh = tokenManager.getRefreshToken() ?: "",
                    user = user
                )
                Result.success(user)
            } else {
                Result.failure(Exception("Failed to load profile"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateProfile(fullName: String, phone: String, avatarUrl: String? = null): Result<UserDto> {
        return try {
            val response = api.updateProfile(UpdateProfileRequest(fullName, phone, avatarUrl))
            if (response.isSuccessful && response.body() != null) {
                val updated = response.body()!!
                tokenManager.saveAuthTokens(
                    access = tokenManager.getAccessToken() ?: "",
                    refresh = tokenManager.getRefreshToken() ?: "",
                    user = updated
                )
                Result.success(updated)
            } else {
                Result.failure(Exception("Failed to update profile"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun uploadAvatar(part: MultipartBody.Part): Result<String> {
        return try {
            val response = api.uploadImage(part)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.url)
            } else {
                Result.failure(Exception("Image upload failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout(): Result<Unit> {
        return try {
            val refresh = tokenManager.getRefreshToken()
            if (!refresh.isNullOrEmpty()) {
                api.logout(com.lputrade.app.data.remote.RefreshTokenRequest(refresh))
            }
            tokenManager.clearSession()
            Result.success(Unit)
        } catch (e: Exception) {
            tokenManager.clearSession() // Always clear local tokens
            Result.success(Unit)
        }
    }
}
```

---

### 6.3 Profile ViewModel (StateFlow & UiState)

```kotlin
package com.lputrade.app.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lputrade.app.data.remote.UserDto
import com.lputrade.app.data.repository.ProfileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val user: UserDto? = null,
    val isLoading: Boolean = false,
    val isUpdating: Boolean = false,
    val updateSuccess: Boolean = false,
    val errorMessage: String? = null,
    val isLoggedOut: Boolean = false
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val repo: ProfileRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val res = repo.fetchFreshProfile()
            if (res.isSuccess) {
                _uiState.value = _uiState.value.copy(isLoading = false, user = res.getOrNull())
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = res.exceptionOrNull()?.localizedMessage ?: "Failed to fetch profile"
                )
            }
        }
    }

    fun updateProfile(name: String, phone: String) {
        if (name.length < 3) {
            _uiState.value = _uiState.value.copy(errorMessage = "Name must be at least 3 characters")
            return
        }
        if (phone.length != 10 || !phone.all { it.isDigit() }) {
            _uiState.value = _uiState.value.copy(errorMessage = "Phone number must be exactly 10 digits")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isUpdating = true, errorMessage = null, updateSuccess = false)
            val res = repo.updateProfile(name, phone)
            if (res.isSuccess) {
                _uiState.value = _uiState.value.copy(
                    isUpdating = false,
                    user = res.getOrNull(),
                    updateSuccess = true
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    isUpdating = false,
                    errorMessage = "Failed to update profile. Please verify details."
                )
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            repo.logout()
            _uiState.value = _uiState.value.copy(isLoading = false, isLoggedOut = true)
        }
    }
}
```

---

### 6.4 Jetpack Compose UI Screens

#### 6.4.1 Main Profile Screen (`ProfileScreen.kt`)

```kotlin
package com.lputrade.app.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.lputrade.app.ui.theme.*

@Composable
fun ProfileScreen(
    onNavigateToEdit: () -> Unit,
    onNavigateToIdVerification: () -> Unit,
    onNavigateToSavedItems: () -> Unit,
    onNavigateToMyListings: () -> Unit,
    onLoggedOut: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    var showLogoutDialog by remember { mutableStateOf(false) }

    LaunchedEffect(state.isLoggedOut) {
        if (state.isLoggedOut) onLoggedOut()
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Log Out of LPUTrade?", fontWeight = FontWeight.Bold) },
            text = { Text("You will need to sign in again to create listings or make offers.") },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutDialog = false
                        viewModel.logout()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = DangerRed)
                ) {
                    Text("Logout", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel", color = TextInkPrimary)
                }
            }
        )
    }

    Scaffold(
        containerColor = ProfileScreenBg
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp)
        ) {
            // Screen Header
            Text(
                text = "My Profile",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Black
            )
            Text(
                text = "Manage your campus identity & trades",
                style = MaterialTheme.typography.bodyMedium,
                color = ProfileTextMuted
            )

            Spacer(modifier = Modifier.height(20.dp))

            // User Identity Card
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = ProfileCardSurface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Avatar with initials fallback
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(CircleShape)
                            .background(ProfileBrandBgLight)
                            .border(2.dp, ProfileBrandOrange, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        if (!state.user?.profilePictureUrl.isNullOrEmpty()) {
                            AsyncImage(
                                model = state.user?.profilePictureUrl,
                                contentDescription = "Profile Photo",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Text(
                                text = state.user?.fullName?.take(2)?.uppercase() ?: "ST",
                                fontSize = 26.sp,
                                fontWeight = FontWeight.Black,
                                color = ProfileBrandOrange
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = state.user?.fullName ?: "Student Name",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = ProfileTextPrimary
                    )
                    Text(
                        text = "Reg No: ${state.user?.username ?: "12200000"}",
                        fontSize = 13.sp,
                        color = ProfileTextMuted,
                        fontWeight = FontWeight.Medium
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Badges Row
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Verified Student Badge
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = VerifiedBlueBg,
                            border = androidx.compose.foundation.BorderStroke(1.dp, VerifiedBlue.copy(alpha = 0.3f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("🎓 Verified Student", color = VerifiedBlue, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }

                        // Trust Score Badge
                        val trust = state.user?.trustScore ?: 50
                        val (trustColor, trustBg, trustTitle) = when {
                            trust >= 80 -> Triple(TrustEliteGreen, TrustEliteGreenBg, "Elite ($trust)")
                            trust >= 50 -> Triple(VerifiedBlue, VerifiedBlueBg, "Trusted ($trust)")
                            else -> Triple(WarningAmber, ProfileBrandBgLight, "New ($trust)")
                        }

                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = trustBg,
                            border = androidx.compose.foundation.BorderStroke(1.dp, trustColor.copy(alpha = 0.3f))
                        ) {
                            Text(
                                text = "⭐ $trustTitle",
                                color = trustColor,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Navigation Menu Options
            ProfileMenuItem(title = "Edit Personal Information", subtitle = "Name, contact number & avatar", icon = "✏️", onClick = onNavigateToEdit)
            ProfileMenuItem(title = "Student ID Verification", subtitle = "Upload college ID to boost trust to 80+", icon = "🪪", onClick = onNavigateToIdVerification)
            ProfileMenuItem(title = "My Listings & Orders", subtitle = "View active sales, rentals & pending offers", icon = "📦", onClick = onNavigateToMyListings)
            ProfileMenuItem(title = "Saved Items & Wishlist", subtitle = "Products you bookmarked for later", icon = "❤️", onClick = onNavigateToSavedItems)

            Spacer(modifier = Modifier.height(20.dp))

            // Logout Button
            Button(
                onClick = { showLogoutDialog = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                border = androidx.compose.foundation.BorderStroke(1.dp, DangerRed.copy(alpha = 0.5f))
            ) {
                Text(text = "Log Out", color = DangerRed, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
        }
    }
}

@Composable
fun ProfileMenuItem(
    title: String,
    subtitle: String,
    icon: String,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = ProfileCardSurface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .background(ProfileBrandBgLight, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(text = icon, fontSize = 20.sp)
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(text = title, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = ProfileTextPrimary)
                Text(text = subtitle, fontSize = 12.sp, color = ProfileTextMuted)
            }
            Text(text = "›", fontSize = 22.sp, color = ProfileTextMuted, fontWeight = FontWeight.Light)
        }
    }
}
```

---

## 7. Testing & Production Checklist

- [x] **Field Immutability:** Ensure `username` (Reg No) and `email` cannot be altered in UI or via payload tampering.
- [x] **Phone Format Sanitization:** Only allow 10 numeric digits before dispatching PATCH requests.
- [x] **Optimistic UI Updates:** StateFlow updates local profile immediately on patch success without re-fetching whole payload.
- [x] **Token Invalidation on Logout:** Verify that the refresh token is blacklisted on Django backend and local DataStore is empty.
- [x] **Image Compression:** Compress ID and Avatar images to under 1 MB using Android Bitmap compressor before uploading.
