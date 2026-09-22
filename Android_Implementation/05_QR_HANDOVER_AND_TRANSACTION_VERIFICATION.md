# 🤝 Module 05: QR Handover & Campus Transaction Verification

This document provides the complete technical specification for the **CampusXChange** peer-to-peer physical meetup verification system using **ZXing vector QR generation, CameraX with Google ML Kit Barcode Scanning, 6-digit OTP PIN fallback, and real-time completion polling**.

---

## 1. Handover Security Architecture & Lifecycle

The campus meetup verification prevents dispute and fraud by guaranteeing both buyer and seller are physically co-located before marking an item as `SOLD`:

```text
       SELLER DEVICE                               BUYER DEVICE
 ┌───────────────────────┐                   ┌───────────────────────┐
 │ Tap "Generate QR"     │                   │ Tap "Scan QR"         │
 └───────────┬───────────┘                   └───────────┬───────────┘
             │ POST /offers/<id>/generate-qr/            │
             ▼                                           ▼
 ┌───────────────────────┐                   ┌───────────────────────┐
 │ Display Dynamic QR &  │                   │ CameraX Barcode Scan  │
 │ 6-Digit PIN (15m Exp) │                   │ (or Manual 6-Digit PIN│
 └───────────┬───────────┘                   └───────────┬───────────┘
             │                                           │
             │       Buyer Scans Seller's Screen         │
             │◄──────────────────────────────────────────┘
             │
             │ Buyer executes POST /handover/verify/
             │ with { token: UUID, pin_code: "123456" }
             │
             ▼
 ┌───────────────────────────────────────────────────────────────────┐
 │                    Backend Atomic Verification                    │
 │ 1. Session status: ACTIVE ➡️ USED                                │
 │ 2. Offer status: ACCEPTED ➡️ COMPLETED                            │
 │ 3. Listing status: PENDING ➡️ SOLD                                │
 │ 4. Trust Score Bonus: +5 points to both Buyer and Seller          │
 └─────────────────┬───────────────────────────────┬─────────────────┘
                   │                               │
       Auto-Polling│(2.5s)               Verification Result
       Detects USED│                               │
                   ▼                               ▼
 ┌───────────────────────┐                   ┌───────────────────────┐
 │ 🎉 Confetti Celebration│                   │ 🎉 Confetti Celebration│
 │ "+5 Trust Score Added"│                   │ "+5 Trust Score Added"│
 │ Redirect to Orders    │                   │ Prompt Deal Review    │
 └───────────────────────┘                   └───────────────────────┘
```

---

## 2. API Endpoints & Request/Response Contracts

### 2.1 Handover Api Service (`HandoverApiService.kt`)

```kotlin
package com.campusxchange.app.data.remote.api

import com.campusxchange.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface HandoverApiService {

    @POST("marketplace/offers/{id}/generate-qr/")
    suspend fun generateHandoverQr(
        @Path("id") offerId: Int
    ): Response<HandoverSessionDto>

    @POST("marketplace/handover/verify/")
    suspend fun verifyHandover(
        @Body request: VerifyHandoverRequestDto
    ): Response<HandoverVerificationResultDto>

    @GET("marketplace/handover/session-status/{id}/")
    suspend fun checkSessionStatus(
        @Path("id") sessionId: Int
    ): Response<HandoverSessionStatusDto>
}
```

### 2.2 Data Transfer Objects (`HandoverDtos.kt`)

```kotlin
package com.campusxchange.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class HandoverSessionDto(
    @SerializedName("session_id") val sessionId: Int,
    @SerializedName("token") val token: String, // UUID
    @SerializedName("pin_code") val pinCode: String, // 6-digit numeric string e.g. "582910"
    @SerializedName("expires_at") val expiresAt: String,
    @SerializedName("listing_title") val listingTitle: String,
    @SerializedName("agreed_price") val agreedPrice: Double,
    @SerializedName("buyer_name") val buyerName: String,
    @SerializedName("qr_payload") val qrPayload: String // Verification URL or JSON payload
)

data class VerifyHandoverRequestDto(
    @SerializedName("token") val token: String,
    @SerializedName("pin_code") val pinCode: String
)

data class HandoverVerificationResultDto(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String,
    @SerializedName("trust_score_awarded") val trustScoreAwarded: Int,
    @SerializedName("offer_id") val offerId: Int,
    @SerializedName("listing_id") val listingId: Int
)

data class HandoverSessionStatusDto(
    @SerializedName("status") val status: String // "ACTIVE", "USED", "EXPIRED", "CANCELLED"
)
```

---

## 3. Seller: QR Code & 6-Digit PIN Generation Screen (`SellerHandoverScreen.kt`)

### 3.1 Vector QR Code Generation
Uses **ZXing Core** to render an ultra-sharp vector bitmap inside Jetpack Compose:

```kotlin
package com.campusxchange.app.core.util

import android.graphics.Bitmap
import android.graphics.Color
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter

object QrCodeGenerator {
    fun generateQrBitmap(content: String, sizePx: Int = 512): Bitmap {
        val writer = QRCodeWriter()
        val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, sizePx, sizePx)
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.RGB_565)
        for (x in 0 until sizePx) {
            for (y in 0 until sizePx) {
                bitmap.setPixel(x, y, if (bitMatrix[x, y]) Color.BLACK else Color.WHITE)
            }
        }
        return bitmap
    }
}
```

### 3.2 Seller Handover Screen Composable

```kotlin
@Composable
fun SellerHandoverScreen(
    offerId: Int,
    viewModel: HandoverViewModel,
    onCompleted: () -> Unit,
    onNavigateBack: () -> Unit
) {
    val state by viewModel.sellerState.collectAsStateWithLifecycle()
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current

    LaunchedEffect(offerId) {
        viewModel.startSellerSession(offerId)
    }

    LaunchedEffect(state.isSessionCompleted) {
        if (state.isSessionCompleted) {
            onCompleted()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Campus Handover QR") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Show this QR to the Buyer", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Keep this screen open until the buyer scans the code.", color = TextSecondary, style = MaterialTheme.typography.bodyMedium)

            Spacer(modifier = Modifier.height(24.dp))

            // 1. QR Code Display
            state.qrBitmap?.let { bitmap ->
                Image(
                    bitmap = bitmap.asImageBitmap(),
                    contentDescription = "Handover QR",
                    modifier = Modifier
                        .size(240.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .border(2.dp, BorderLight, RoundedCornerShape(16.dp))
                )
            } ?: CircularProgressIndicator(modifier = Modifier.size(60.dp), color = Brand500)

            Spacer(modifier = Modifier.height(20.dp))

            // 2. 6-Digit PIN Code Fallback Box
            Text("OR SHARE 6-DIGIT PIN CODE", style = MaterialTheme.typography.labelSmall, color = TextMuted)
            Spacer(modifier = Modifier.height(6.dp))

            Surface(
                color = Color(0xFFF1F5F9),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.clickable {
                    state.pinCode?.let {
                        clipboardManager.setText(AnnotatedString(it))
                        Toast.makeText(context, "PIN copied to clipboard", Toast.LENGTH_SHORT).show()
                    }
                }
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = state.pinCode ?: "------",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 8.sp,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Icon(Icons.Default.ContentCopy, contentDescription = "Copy", tint = Brand500, modifier = Modifier.size(20.dp))
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 3. Expiration Countdown Timer
            Text(
                text = "Session expires in: ${state.remainingTimeFormatted}",
                style = MaterialTheme.typography.bodyMedium,
                color = if (state.isExpiringSoon) ErrorRed else TextSecondary,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.weight(1f))

            // 4. Polling Status Pulse
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp, color = Brand500)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Waiting for buyer to scan...", style = MaterialTheme.typography.bodySmall, color = TextMuted)
            }
        }
    }
}
```

---

## 4. Buyer: CameraX Barcode Scanner (`BuyerScannerScreen.kt`)

Uses **CameraX Analysis UseCase** and **Google ML Kit Barcode Scanning** (`Barcode.FORMAT_QR_CODE`):

```kotlin
@Composable
fun BuyerScannerScreen(
    offerId: Int,
    viewModel: HandoverViewModel,
    onVerified: () -> Unit,
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var selectedTab by remember { mutableIntStateOf(0) } // 0: Camera Scan, 1: Enter PIN
    var manualPinInput by remember { mutableStateOf("") }

    val barcodeScanner = remember {
        val options = BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .build()
        BarcodeScanning.getClient(options)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Verify Handover") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            TabRow(selectedTabIndex = selectedTab) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("Scan QR") })
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("Enter 6-Digit PIN") })
            }

            if (selectedTab == 0) {
                // CameraX QR Viewfinder
                Box(modifier = Modifier.fillMaxSize()) {
                    AndroidView(
                        factory = { ctx ->
                            val previewView = PreviewView(ctx)
                            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                            cameraProviderFuture.addListener({
                                val cameraProvider = cameraProviderFuture.get()
                                val preview = Preview.Builder().build().also {
                                    it.setSurfaceProvider(previewView.surfaceProvider)
                                }

                                val imageAnalysis = ImageAnalysis.Builder()
                                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                    .build()

                                imageAnalysis.setAnalyzer(ContextCompat.getMainExecutor(ctx)) { imageProxy ->
                                    val mediaImage = imageProxy.image
                                    if (mediaImage != null) {
                                        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                                        barcodeScanner.process(image)
                                            .addOnSuccessListener { barcodes ->
                                                barcodes.firstOrNull()?.rawValue?.let { qrValue ->
                                                    viewModel.verifyScannedToken(qrValue, onSuccess = onVerified)
                                                }
                                            }
                                            .addOnCompleteListener { imageProxy.close() }
                                    } else {
                                        imageProxy.close()
                                    }
                                }

                                cameraProvider.unbindAll()
                                cameraProvider.bindToLifecycle(
                                    lifecycleOwner,
                                    CameraSelector.DEFAULT_BACK_CAMERA,
                                    preview,
                                    imageAnalysis
                                )
                            }, ContextCompat.getMainExecutor(ctx))
                            previewView
                        },
                        modifier = Modifier.fillMaxSize()
                    )

                    // Viewfinder Box Overlay with Target Corners
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val boxSize = size.width * 0.7f
                        val left = (size.width - boxSize) / 2
                        val top = (size.height - boxSize) / 2

                        drawRect(color = Color(0x99000000)) // Scrim
                        drawRect(
                            color = Color.Transparent,
                            topLeft = Offset(left, top),
                            size = Size(boxSize, boxSize),
                            blendMode = BlendMode.Clear
                        )
                        drawRect(
                            color = Brand500,
                            topLeft = Offset(left, top),
                            size = Size(boxSize, boxSize),
                            style = Stroke(width = 3.dp.toPx())
                        )
                    }
                }
            } else {
                // Manual 6-Digit PIN Input Fallback
                Column(
                    modifier = Modifier.fillMaxSize().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Enter the 6-digit PIN shown on the Seller's screen", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                    Spacer(modifier = Modifier.height(24.dp))

                    OutlinedTextField(
                        value = manualPinInput,
                        onValueChange = { if (it.length <= 6 && it.all { c -> c.isDigit() }) manualPinInput = it },
                        textStyle = TextStyle(fontSize = 32.sp, letterSpacing = 12.sp, textAlign = TextAlign.Center, fontWeight = FontWeight.Bold),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(0.85f)
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = { viewModel.verifyManualPin(offerId, manualPinInput, onSuccess = onVerified) },
                        enabled = manualPinInput.length == 6,
                        colors = ButtonDefaults.buttonColors(containerColor = Brand500),
                        modifier = Modifier.fillMaxWidth().height(50.dp)
                    ) {
                        Text("Confirm & Complete Handover", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
```
