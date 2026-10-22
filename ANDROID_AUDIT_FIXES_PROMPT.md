# 🛠️ Android Codebase Health & Bug-Fixing Master Prompt
**Target Project:** `CXC_Marketplace_Android` (CampusXChange / LPUTrade)  
**Date:** October 2026  
**Language/Framework:** Kotlin, Jetpack Compose, Coroutines, OkHttp / Retrofit  

---

## 📌 Instructions for AI Assistant / Developer
> You are tasked with resolving 6 verified high-priority bugs (Lifecycle State Loss, Memory Leaks, and Compose Performance issues) in the native Android application `CXC_Marketplace_Android`.  
> Follow the exact file locations, imports, and before/after code blocks specified below. Ensure existing business logic and code comments are preserved.

---

## 📋 Table of Bug Fixes

| Bug # | Type | Target File | Impact |
|---|---|---|---|
| **Fix 1** | Lifecycle State Loss | `CreateListingScreen.kt` | Form fields reset on screen rotation/camera switch |
| **Fix 2** | Lifecycle State Loss | `EditProfileScreen.kt` | User name & phone reset on screen rotation |
| **Fix 3** | Lifecycle State Loss | `RegisterScreen.kt` | Multi-step registration flow resets back to Step 1 |
| **Fix 4** | Coroutine Memory Leak | `ChatWebSocketClient.kt` | Unmanaged scopes leak reconnect timers on disconnect |
| **Fix 5** | Recomposition Performance | `CreateListingScreen.kt` | Thumbnails flicker on deletion/reorder |
| **Fix 6** | Recomposition Performance | `ChatScreen.kt` | Suggestion chips re-render needlessly |

---

## 🔧 Step-by-Step Implementation Instructions

### 1. Fix State Loss on Configuration Change (CreateListingScreen)
* **File:** `app/src/main/java/com/campxchange/app/ui/marketplace/CreateListingScreen.kt`
* **Root Cause:** 16 user-input fields are managed with `remember { mutableStateOf(...) }`. Screen rotation or switching to the camera/gallery immediately destroys the typed listing data.
* **Fix:** Add `rememberSaveable` import and replace `remember` with `rememberSaveable` for all primitive states.

#### Required Imports:
```kotlin
import androidx.compose.runtime.saveable.rememberSaveable
```

#### Code Modification (Lines 131–146):
```diff
-    var title by remember { mutableStateOf("") }
-    var categoryId by remember { mutableStateOf("6aadf2ca480098f068bb0243") }
-    var categoryName by remember { mutableStateOf("Books & Notes") }
-    var description by remember { mutableStateOf("") }
-    var price by remember { mutableStateOf("") }
-    var originalPrice by remember { mutableStateOf("") }
-    var isNegotiable by remember { mutableStateOf(true) }
-    var hasCountdownTimer by remember { mutableStateOf(false) }
-    var allowExchange by remember { mutableStateOf(false) }
-    var transactionType by remember { mutableStateOf("SELL") } // SELL, EXCHANGE, DONATE
-    var rentPeriod by remember { mutableStateOf("month") }
-    var condition by remember { mutableStateOf("GOOD") }
-    var location by remember { mutableStateOf("") }
-    var contactPreference by remember { mutableStateOf("ALL") } // ALL, CHAT, WHATSAPP, PHONE
-    var contactPhone by remember { mutableStateOf("") }
-    var contactWhatsapp by remember { mutableStateOf("") }
+    var title by rememberSaveable { mutableStateOf("") }
+    var categoryId by rememberSaveable { mutableStateOf("6aadf2ca480098f068bb0243") }
+    var categoryName by rememberSaveable { mutableStateOf("Books & Notes") }
+    var description by rememberSaveable { mutableStateOf("") }
+    var price by rememberSaveable { mutableStateOf("") }
+    var originalPrice by rememberSaveable { mutableStateOf("") }
+    var isNegotiable by rememberSaveable { mutableStateOf(true) }
+    var hasCountdownTimer by rememberSaveable { mutableStateOf(false) }
+    var allowExchange by rememberSaveable { mutableStateOf(false) }
+    var transactionType by rememberSaveable { mutableStateOf("SELL") } // SELL, EXCHANGE, DONATE
+    var rentPeriod by rememberSaveable { mutableStateOf("month") }
+    var condition by rememberSaveable { mutableStateOf("GOOD") }
+    var location by rememberSaveable { mutableStateOf("") }
+    var contactPreference by rememberSaveable { mutableStateOf("ALL") } // ALL, CHAT, WHATSAPP, PHONE
+    var contactPhone by rememberSaveable { mutableStateOf("") }
+    var contactWhatsapp by rememberSaveable { mutableStateOf("") }
```

---

### 2. Fix State Loss on Configuration Change (EditProfileScreen)
* **File:** `app/src/main/java/com/campxchange/app/ui/profile/EditProfileScreen.kt`
* **Root Cause:** User name and phone inputs reset if the user rotates the device or triggers process death.
* **Fix:** Add `rememberSaveable` import and wrap states with `rememberSaveable`.

#### Required Imports:
```kotlin
import androidx.compose.runtime.saveable.rememberSaveable
```

#### Code Modification (Lines 44–45):
```diff
-    var fullName by remember { mutableStateOf(user?.fullName ?: user?.name ?: "") }
-    var phoneNumber by remember { mutableStateOf(user?.phoneNumber ?: user?.phone ?: "") }
+    var fullName by rememberSaveable { mutableStateOf(user?.fullName ?: user?.name ?: "") }
+    var phoneNumber by rememberSaveable { mutableStateOf(user?.phoneNumber ?: user?.phone ?: "") }
```

---

### 3. Fix Multi-Step Form Reset (RegisterScreen)
* **File:** `app/src/main/java/com/campxchange/app/ui/auth/RegisterScreen.kt`
* **Root Cause:** `currentSubStep` is stored with standard `remember`. If the user rotates during the OTP or password step, the screen resets back to Step 1.
* **Fix:** Add `rememberSaveable` import and use `rememberSaveable`.

#### Required Imports:
```kotlin
import androidx.compose.runtime.saveable.rememberSaveable
```

#### Code Modification (Line 35):
```diff
-    var currentSubStep by remember { mutableIntStateOf(1) }
+    var currentSubStep by rememberSaveable { mutableIntStateOf(1) }
```

---

### 4. Fix Coroutine Memory Leak & WebSocket Scope (ChatWebSocketClient)
* **File:** `app/src/main/java/com/campxchange/app/data/chat/ChatWebSocketClient.kt`
* **Root Cause:** Connections and backoff reconnections use unmanaged `CoroutineScope(Dispatchers.IO).launch`. When `disconnect()` is invoked upon screen exit, these coroutines are never cancelled and keep running in the background.
* **Fix:** Introduce a dedicated `socketScope` with `SupervisorJob()` and call `socketScope.coroutineContext.cancelChildren()` inside `disconnect()`.

#### Required Imports:
```kotlin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.launch
```

#### Code Modification:
```diff
 class ChatWebSocketClient(context: Context) {
 
+    private val socketScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
     private val tokenManager = TokenManager.getInstance(context)
     private val gson = Gson()
     ...

     private fun initiateConnection(roomId: String) {
-        CoroutineScope(Dispatchers.IO).launch {
+        socketScope.launch {
             val token = tokenManager.getAccessToken() ?: "demo_token"
             // websocket request creation
         }
     }

     private fun handleReconnect(roomId: String) {
         if (activeRoomId != roomId) return
         if (reconnectAttempts < 5) {
             reconnectAttempts++
             val delayTime = (1L shl reconnectAttempts) * 1000L
-            CoroutineScope(Dispatchers.IO).launch {
+            socketScope.launch {
                 delay(delayTime)
                 if (activeRoomId == roomId && !isConnected) {
                     initiateConnection(roomId)
                 }
             }
         }
     }

     fun disconnect() {
         activeRoomId = null
+        socketScope.coroutineContext.cancelChildren()
         webSocket?.close(1000, "User left chat")
         webSocket = null
         isConnected = false
     }
 }
```

---

### 5. Fix Missing Key in LazyRow Thumbnails (CreateListingScreen)
* **File:** `app/src/main/java/com/campxchange/app/ui/marketplace/CreateListingScreen.kt`
* **Root Cause:** Thumbnails `LazyRow` lacks a key parameter. Deleting an image causes all thumbnail views to recompose and flicker.
* **Fix:** Add a stable key parameter to `itemsIndexed(uploadedImages)`.

#### Code Modification (Around Line 387):
```diff
 LazyRow(
     horizontalArrangement = Arrangement.spacedBy(10.dp),
     modifier = Modifier.fillMaxWidth()
 ) {
-    itemsIndexed(uploadedImages) { idx, url ->
+    itemsIndexed(uploadedImages, key = { idx, url -> url }) { idx, url ->
         val isSelectedCover = (idx == primaryImageIndex)
```

---

### 6. Fix Missing Key in Suggestion Chips (ChatScreen)
* **File:** `app/src/main/java/com/campxchange/app/ui/chat/ChatScreen.kt`
* **Root Cause:** `suggestionChips` in chat screen lack a stable key.
* **Fix:** Pass `key = { it }` into `items(suggestionChips)`.

#### Code Modification (Around Line 360):
```diff
-    items(suggestionChips) { chipText ->
+    items(suggestionChips, key = { it }) { chipText ->
         SuggestionChip(
             onClick = { messageText = chipText },
```

---

## ✅ Post-Fix Verification Checklist
1. **Compilation:** Run `./gradlew assembleDebug` or build in Android Studio to confirm zero compiler errors.
2. **Form Persistence:** On `CreateListingScreen`, enter title and price, then rotate the screen or switch to gallery; all text must remain intact.
3. **Registration Flow:** On `RegisterScreen`, advance to OTP/Password step, then rotate screen; it must remain on the current step.
4. **WebSocket Lifecycle:** Open a chat screen and exit; verify no continuous reconnect attempts occur in Logcat.
