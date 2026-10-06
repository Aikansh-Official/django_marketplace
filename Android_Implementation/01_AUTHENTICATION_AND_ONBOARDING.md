# 🔐 Module 01: Authentication, Student Onboarding & ID Verification

This document provides the complete, production-ready specification for implementing authentication and onboarding in the **CampXChange** native Android application using **Kotlin, Jetpack Compose, Google ML Kit Text Recognition, CameraX, and Dagger Hilt**.

---

## 1. Onboarding Architectural Overview

The application features a **Role-Aware Dual-Path Registration Pipeline**:

```text
┌────────────────────────────────────────────────────────┐
│               Registration Initializer                 │
│         Role Choice: [ Buyer ] or [ Seller ]           │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
  ┌──────────────────────┐    ┌──────────────────────┐
  │   BUYER FLOW         │    │   SELLER FLOW        │
  │   (3 Fast Steps)     │    │   (5 Verified Steps) │
  ├──────────────────────┤    ├──────────────────────┤
  │ 1. Student Details   │    │ 1. Student Details   │
  │ 2. Email 6-Digit OTP │    │ 2. ML Kit ID Card OCR│
  │ 3. Set Password &    │    │ 3. CameraX Selfie    │
  │    Auto-Login        │    │ 4. Email 6-Digit OTP │
  └──────────────────────┘    │ 5. Set Password &    │
                              │    Auto-Login (+3 TS)│
                              └──────────────────────┘
```

---

## 2. API Endpoints & Request/Response DTOs

### 2.1 Retrofit Service (`AuthApiService.kt`)

```kotlin
package com.campxchange.app.data.remote.api

import com.campxchange.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface AuthApiService {

    @POST("auth/login/")
    suspend fun login(
        @Body request: LoginRequestDto
    ): Response<AuthResponseDto>

    @POST("auth/register/")
    suspend fun register(
        @Body request: RegisterRequestDto
    ): Response<AuthResponseDto>

    @POST("auth/send-otp/")
    suspend fun sendOtp(
        @Body request: SendOtpRequestDto
    ): Response<GenericMessageDto>

    @POST("auth/verify-otp/")
    suspend fun verifyOtp(
        @Body request: VerifyOtpRequestDto
    ): Response<OtpVerificationResultDto>

    @GET("auth/check-username/")
    suspend fun checkUsername(
        @Query("username") username: String
    ): Response<AvailabilityCheckDto>

    @GET("auth/check-phone/")
    suspend fun checkPhone(
        @Query("phone") phone: String
    ): Response<AvailabilityCheckDto>

    @GET("auth/check-email/")
    suspend fun checkEmail(
        @Query("email") email: String
    ): Response<AvailabilityCheckDto>

    @POST("auth/check-availability/")
    suspend fun checkPreFlightAvailability(
        @Body request: PreFlightAvailabilityDto
    ): Response<PreFlightResultDto>

    @POST("auth/upgrade-to-seller/")
    suspend fun upgradeToSeller(
        @Body request: UpgradeSellerRequestDto
    ): Response<AuthResponseDto>

    @GET("auth/status/")
    suspend fun checkAuthStatus(): Response<UserStatusDto>
}
```

### 2.2 Data Transfer Objects (`AuthDtos.kt`)

```kotlin
package com.campxchange.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class LoginRequestDto(
    @SerializedName("username") val username: String, // 8-digit Reg Number
    @SerializedName("password") val password: String
)

data class RegisterRequestDto(
    @SerializedName("username") val username: String,
    @SerializedName("full_name") val fullName: String,
    @SerializedName("email") val email: String,
    @SerializedName("phone_number") val phoneNumber: String,
    @SerializedName("password") val password: String,
    @SerializedName("role") val role: String, // "BUYER" or "SELLER"
    @SerializedName("id_card_image") val idCardImageBase64: String? = null,
    @SerializedName("profile_photo") val profilePhotoBase64: String? = null,
    @SerializedName("id_card_data") val idCardData: Map<String, String>? = null
)

data class AuthResponseDto(
    @SerializedName("access") val accessToken: String,
    @SerializedName("refresh") val refreshToken: String,
    @SerializedName("user") val user: UserDto,
    @SerializedName("message") val message: String?
)

data class UserDto(
    @SerializedName("id") val id: Int,
    @SerializedName("username") val username: String,
    @SerializedName("full_name") val fullName: String,
    @SerializedName("email") val email: String,
    @SerializedName("role") val role: String,
    @SerializedName("trust_score") val trustScore: Int,
    @SerializedName("is_id_verified") val isIdVerified: Boolean,
    @SerializedName("profile_photo") val profilePhoto: String?
)

data class SendOtpRequestDto(
    @SerializedName("email") val email: String
)

data class VerifyOtpRequestDto(
    @SerializedName("email") val email: String,
    @SerializedName("otp") val otp: String
)

data class AvailabilityCheckDto(
    @SerializedName("available") val available: Boolean,
    @SerializedName("message") val message: String?
)
```

---

## 3. UI Screens & Step Implementations

### 3.1 Step 1: Student Personal Details (`RegisterStepDetailsScreen.kt`)
Enforces strict campus validation:
- **Registration Number**: Exactly 8 numeric digits (`12012345`).
- **Full Name**: Minimum 3 alphabetic characters.
- **Phone Number**: Exactly 10 Indian digits (`9876543210`).
- **Email**: Valid email address (`@gmail.com` or `@lpu.in`).
- **Live Debounced Checking**: Queries `/api/auth/check-*` after 350ms user inactivity.

```kotlin
@Composable
fun RegisterStepDetailsScreen(
    viewModel: RegisterViewModel,
    onNext: () -> Unit
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState())
    ) {
        Text(
            text = "Step 1 of ${if (state.role == "SELLER") "5" else "3"}",
            style = MaterialTheme.typography.labelMedium,
            color = Brand500,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Personal Information",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = TextPrimary
        )
        Text(
            text = "Enter your official student credentials to verify campus identity.",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary,
            modifier = Modifier.padding(bottom = 20.dp)
        )

        // Registration Number Field with real-time green/red indicator
        OutlinedTextField(
            value = state.username,
            onValueChange = { if (it.length <= 8) viewModel.onUsernameChanged(it) },
            label = { Text("Registration Number (8 Digits)") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            trailingIcon = {
                if (state.isCheckingUsername) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                } else if (state.isUsernameAvailable == true) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = SuccessGreen)
                } else if (state.isUsernameAvailable == false) {
                    Icon(Icons.Default.Error, contentDescription = null, tint = ErrorRed)
                }
            },
            isError = state.isUsernameAvailable == false,
            modifier = Modifier.fillMaxWidth()
        )
        if (state.isUsernameAvailable == false) {
            Text("Registration number is already registered.", color = ErrorRed, style = MaterialTheme.typography.bodySmall)
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Full Name
        OutlinedTextField(
            value = state.fullName,
            onValueChange = { viewModel.onFullNameChanged(it) },
            label = { Text("Full Name (as per Student ID)") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Phone Number
        OutlinedTextField(
            value = state.phoneNumber,
            onValueChange = { if (it.length <= 10) viewModel.onPhoneChanged(it) },
            label = { Text("10-Digit Mobile Number") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Email
        OutlinedTextField(
            value = state.email,
            onValueChange = { viewModel.onEmailChanged(it) },
            label = { Text("College Email (@lpu.in / Gmail)") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(28.dp))

        Button(
            onClick = onNext,
            enabled = state.isStep1Valid,
            colors = ButtonDefaults.buttonColors(containerColor = Brand500),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            Text("Continue", fontWeight = FontWeight.Bold)
        }
    }
}
```

---

### 3.2 Step 2 (Seller): On-Device ML Kit ID Card OCR Scanner (`RegisterStepIdCardScreen.kt`)

Uses **Google ML Kit Text Recognition** completely on-device without cloud API dependencies:

```kotlin
package com.campxchange.app.presentation.auth.ocr

import android.content.Context
import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

class IdCardOcrParser(private val context: Context) {
    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    suspend fun extractIdDetails(bitmap: Bitmap): OcrResult = suspendCancellableCoroutine { continuation ->
        val image = InputImage.fromBitmap(bitmap, 0)
        recognizer.process(image)
            .addOnSuccessListener { visionText ->
                val fullText = visionText.text
                val extractedRegNo = extractRegistrationNumber(fullText)
                val isAuthentic = fullText.contains("Lovely Professional University", ignoreCase = true) ||
                                  fullText.contains("Student ID", ignoreCase = true) ||
                                  fullText.contains("Identity Card", ignoreCase = true)

                continuation.resume(
                    OcrResult(
                        rawText = fullText,
                        detectedRegNo = extractedRegNo,
                        isLpuCard = isAuthentic,
                        confidenceScore = if (isAuthentic && extractedRegNo != null) 95 else 40
                    )
                )
            }
            .addOnFailureListener { e ->
                continuation.resume(OcrResult(error = e.localizedMessage))
            }
    }

    private fun extractRegistrationNumber(text: String): String? {
        // Match 8-digit numeric registration numbers
        val regex = Regex("""\b\d{8}\b""")
        return regex.find(text)?.value
    }
}

data class OcrResult(
    val rawText: String = "",
    val detectedRegNo: String? = null,
    val isLpuCard: Boolean = false,
    val confidenceScore: Int = 0,
    val error: String? = null
)
```

**ID Card Screen Features**:
- **Capture or Pick**: Button to snap photo with camera or choose from gallery.
- **Auto-Cross Check**: Compares detected registration number with Step 1's username. If mismatched, warns the student.
- **Skip Option**: "Skip for now — Continue as Buyer" switches user role to `BUYER` and routes directly to Step 4 (OTP).

---

### 3.3 Step 3 (Seller): Live Face Selfie with CameraX (`RegisterStepSelfieScreen.kt`)

Implements CameraX front-camera preview with an **Oval Cutout Guide Canvas**, screen glow flash, and haptic feedback:

```kotlin
@Composable
fun CameraXSelfieCapture(
    onPhotoCaptured: (Bitmap) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val haptics = LocalHapticFeedback.current

    var imageCapture: ImageCapture? by remember { mutableStateOf(null) }
    val previewView = remember { PreviewView(context) }

    LaunchedEffect(Unit) {
        val cameraProvider = ProcessCameraProvider.getInstance(context).get()
        val preview = Preview.Builder().build().also {
            it.setSurfaceProvider(previewView.surfaceProvider)
        }
        imageCapture = ImageCapture.Builder()
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
            .build()

        val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

        try {
            cameraProvider.unbindAll()
            cameraProvider.bindToLifecycle(
                lifecycleOwner,
                cameraSelector,
                preview,
                imageCapture
            )
        } catch (exc: Exception) {
            exc.printStackTrace()
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        // 1. Camera Preview
        AndroidView(factory = { previewView }, modifier = Modifier.fillMaxSize())

        // 2. Oval Cutout Mask Overlay
        Canvas(modifier = Modifier.fillMaxSize()) {
            val ovalWidth = size.width * 0.75f
            val ovalHeight = ovalWidth * 1.35f
            val left = (size.width - ovalWidth) / 2
            val top = (size.height - ovalHeight) / 2 - 40.dp.toPx()

            // Dark semi-transparent scrim
            drawRect(color = Color(0x99000000))

            // Transparent oval cutout
            drawOval(
                color = Color.Transparent,
                topLeft = Offset(left, top),
                size = Size(ovalWidth, ovalHeight),
                blendMode = BlendMode.Clear
            )

            // Highlighting border
            drawOval(
                color = Brand500,
                topLeft = Offset(left, top),
                size = Size(ovalWidth, ovalHeight),
                style = Stroke(width = 3.dp.toPx())
            )
        }

        // 3. Instruction Header
        Text(
            text = "Align your face inside the oval",
            color = Color.White,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 48.dp)
        )

        // 4. Capture Shutter Button
        IconButton(
            onClick = {
                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                val executor = ContextCompat.getMainExecutor(context)
                imageCapture?.takePicture(
                    executor,
                    object : ImageCapture.OnImageCapturedCallback() {
                        override fun onCaptureSuccess(imageProxy: ImageProxy) {
                            val bitmap = imageProxy.toBitmap()
                            imageProxy.close()
                            onPhotoCaptured(bitmap)
                        }
                    }
                )
            },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 36.dp)
                .size(72.dp)
                .background(Brand500, CircleShape)
        ) {
            Icon(Icons.Default.CameraAlt, contentDescription = "Capture", tint = Color.White, modifier = Modifier.size(36.dp))
        }
    }
}
```

---

### 3.4 Step 4: 6-Digit Email OTP Verification (`RegisterStepOtpScreen.kt`)

```kotlin
@Composable
fun RegisterStepOtpScreen(
    email: String,
    onOtpVerified: () -> Unit,
    viewModel: RegisterViewModel
) {
    var otpValue by remember { mutableStateOf("") }
    var timerSeconds by remember { mutableIntStateOf(60) }

    LaunchedEffect(Unit) {
        viewModel.sendEmailOtp(email)
        while (timerSeconds > 0) {
            delay(1000L)
            timerSeconds--
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Email Verification", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(
            "We have sent a 6-digit verification code to:\n$email",
            textAlign = TextAlign.Center,
            color = TextSecondary,
            modifier = Modifier.padding(vertical = 12.dp)
        )

        // 6-Digit Input Row
        OutlinedTextField(
            value = otpValue,
            onValueChange = { if (it.length <= 6 && it.all { char -> char.isDigit() }) otpValue = it },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            textStyle = TextStyle(fontSize = 28.sp, letterSpacing = 16.sp, textAlign = TextAlign.Center, fontWeight = FontWeight.Bold),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(0.8f).padding(vertical = 24.dp)
        )

        Button(
            onClick = { viewModel.verifyOtp(email, otpValue, onSuccess = onOtpVerified) },
            enabled = otpValue.length == 6,
            colors = ButtonDefaults.buttonColors(containerColor = Brand500),
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            Text("Verify OTP", fontWeight = FontWeight.Bold)
        }

        // Resend Timer
        TextButton(
            onClick = {
                timerSeconds = 60
                viewModel.sendEmailOtp(email)
            },
            enabled = timerSeconds == 0,
            modifier = Modifier.padding(top = 16.dp)
        ) {
            Text(if (timerSeconds > 0) "Resend code in ${timerSeconds}s" else "Resend Code")
        }
    }
}
```

---

### 3.5 Step 5: Password Creation & Auto-Login (`RegisterStepPasswordScreen.kt`)

- Password strength validation: Min 8 characters with at least 1 special symbol.
- On successful `201 Created`:
  1. Automatically triggers `POST /api/auth/login/` with credentials.
  2. Saves JWT access/refresh tokens in `TokenManager`.
  3. Launches celebratory confetti animation.
  4. Navigates directly to `home`.

---

## 4. Post-Registration Seller Upgrade (`UpgradeToSellerModal.kt`)

Existing `BUYER` accounts can unlock listing creation privileges by invoking `POST /api/auth/upgrade-to-seller/`:
1. Modal / BottomSheet opens with 3 sub-steps:
   - ID Card Photo Upload + OCR check.
   - Live Selfie camera capture.
   - College Email OTP.
2. Upon verification: Server upgrades student's role to `SELLER`, increments Trust Score by +10 points, and instantly updates the local `TokenManager` role cache.
