# 💬 CampXChange — Android In-App Peer Chat & Messaging Specification

> **Target Platform:** Android (Native Jetpack Compose)  
> **Architecture:** Clean Architecture, Kotlin Coroutines, StateFlow, Room DB, Retrofit 2 (3s Polling Lifecycle)  
> **Backend Service:** Django REST Framework (`/api/marketplace/chat/`, `/api/marketplace/conversations/`)  
> **DPDP Compliance:** Privacy-Shielded — Peer names masked (e.g. "Aman S."), no phone numbers or personal emails exchanged  
> **Last Updated:** October 2026 (Production Sync)

---

## 📑 Table of Contents
1. [Architecture & Protocol (REST Polling vs WebSockets)](#1-architecture--protocol)
2. [Security Headers & Endpoints](#2-security-headers--endpoints)
3. [REST API Contract & Accurate DTOs](#3-rest-api-contract--accurate-dtos)
4. [Retrofit 2 API Service (`ChatApiService.kt`)](#4-retrofit-2-api-service)
5. [Room Local Database (Offline Cache & Sync)](#5-room-local-database)
6. [Chat Lifecycle & Polling Engine (`ChatViewModel.kt`)](#6-chat-lifecycle--polling-engine)
7. [Jetpack Compose UI Screen (`ChatScreen.kt`)](#7-jetpack-compose-ui-screen)

---

## 1. Architecture & Protocol

CampXChange uses a **zero-infrastructure, resilient REST polling protocol** across web and mobile:
- **No Redis / WebSocket daemon required:** Guaranteed 100% uptime without socket disconnections over unstable hostel Wi-Fi or mobile carrier handoffs.
- **Listing & Deal Scoped:** Each conversation thread is strictly bound to a `(listing_id, peer_id)` pair. The GET response bundles the listing details (image, title, price, transaction type) and peer verification status in the response payload for instant header binding.
- **Auto Read-Receipts:** Querying the thread marks all incoming unread messages as read automatically on the Django server (`is_read=True`).
- **Active Thread List:** The Conversations screen (`/api/marketplace/conversations/`) aggregates recent threads with live unread badge counters.

---

## 2. Security Headers & Endpoints

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

---

## 3. REST API Contract & Accurate DTOs

### 3.1 Fetch Thread Messages & Metadata
- **URL:** `GET /api/marketplace/chat/{listing_id}/{peer_id}/`
- **Headers:** `Authorization: Bearer <token>`, `X-App-Security-Key: campusXchange_secure_key_2026_@nshuman892494`
- **Response `200 OK` (Full JSON Object):**
```json
{
  "listing": {
    "id": 101,
    "title": "Scientific Calculator Casio fx-991EX",
    "price": "750.00",
    "transaction_type": "SELL",
    "image": "https://res.cloudinary.com/campxchange/image/upload/v1/casio.jpg",
    "seller_id": 42
  },
  "peer": {
    "id": 42,
    "name": "Aman S.",
    "is_verified": true
  },
  "messages": [
    {
      "id": 1042,
      "listing": 101,
      "sender": 42,
      "sender_name": "Aman S.",
      "recipient": 88,
      "recipient_name": "Anshuman V.",
      "message": "Hey! Is the calculator still available for handover today at BH-4?",
      "is_read": true,
      "created_at": "2026-09-06T10:14:00Z",
      "is_mine": false
    },
    {
      "id": 1043,
      "listing": 101,
      "sender": 88,
      "sender_name": "Anshuman V.",
      "recipient": 42,
      "recipient_name": "Aman S.",
      "message": "Yes, available! Can we meet near the BH-4 common room at 5 PM?",
      "is_read": false,
      "created_at": "2026-09-06T10:15:30Z",
      "is_mine": true
    }
  ]
}
```

### 3.2 Send Chat Message
- **URL:** `POST /api/marketplace/chat/{listing_id}/{peer_id}/`
- **Headers:** `Authorization: Bearer <token>`, `X-App-Security-Key: campusXchange_secure_key_2026_@nshuman892494`
- **Request Body:**
```json
{
  "message": "Yes, available! Can we meet near the BH-4 common room at 5 PM?"
}
```
- **Response `201 Created`:**
```json
{
  "id": 1043,
  "listing": 101,
  "sender": 88,
  "sender_name": "Anshuman V.",
  "recipient": 42,
  "recipient_name": "Aman S.",
  "message": "Yes, available! Can we meet near the BH-4 common room at 5 PM?",
  "is_read": false,
  "created_at": "2026-09-06T10:15:30Z",
  "is_mine": true
}
```

### 3.3 List Active Conversations
- **URL:** `GET /api/marketplace/conversations/`
- **Response `200 OK`:**
```json
[
  {
    "listing_id": 101,
    "listing_title": "Scientific Calculator Casio fx-991EX",
    "listing_price": "750.00",
    "listing_image": "https://res.cloudinary.com/campxchange/image/upload/v1/casio.jpg",
    "peer_id": 42,
    "peer_name": "Aman S.",
    "last_message": "Can we meet near the BH-4 common room at 5 PM?",
    "last_message_at": "2026-09-06T10:15:30Z",
    "unread_count": 1
  }
]
```

### 3.4 Kotlin DTO Declarations (`ChatDtos.kt`)

```kotlin
package com.campxchange.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ChatThreadResponseDto(
    @SerializedName("listing") val listing: ChatListingDto,
    @SerializedName("peer") val peer: ChatPeerDto,
    @SerializedName("messages") val messages: List<ChatMessageDto>
)

data class ChatListingDto(
    @SerializedName("id") val id: Long,
    @SerializedName("title") val title: String,
    @SerializedName("price") val price: String,
    @SerializedName("transaction_type") val transactionType: String,
    @SerializedName("image") val imageUrl: String?,
    @SerializedName("seller_id") val sellerId: Long
)

data class ChatPeerDto(
    @SerializedName("id") val id: Long,
    @SerializedName("name") val name: String,
    @SerializedName("is_verified") val isVerified: Boolean
)

data class ChatMessageDto(
    @SerializedName("id") val id: Long,
    @SerializedName("listing") val listingId: Long,
    @SerializedName("sender") val senderId: Long,
    @SerializedName("sender_name") val senderName: String,
    @SerializedName("recipient") val recipientId: Long,
    @SerializedName("recipient_name") val recipientName: String,
    @SerializedName("message") val message: String,
    @SerializedName("is_read") val isRead: Boolean,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("is_mine") val isMine: Boolean // Crucial: backend returns 'is_mine'
)

data class SendChatMessageRequest(
    @SerializedName("message") val message: String
)

data class ConversationSummaryDto(
    @SerializedName("listing_id") val listingId: Long,
    @SerializedName("listing_title") val listingTitle: String,
    @SerializedName("listing_price") val listingPrice: String,
    @SerializedName("listing_image") val listingImage: String?,
    @SerializedName("peer_id") val peerId: Long,
    @SerializedName("peer_name") val peerName: String,
    @SerializedName("last_message") val lastMessage: String,
    @SerializedName("last_message_at") val lastMessageAt: String,
    @SerializedName("unread_count") val unreadCount: Int
)
```

---

## 4. Retrofit 2 API Service

```kotlin
package com.campxchange.app.data.remote.api

import com.campxchange.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface ChatApiService {

    @GET("api/marketplace/conversations/")
    suspend fun getConversations(): Response<List<ConversationSummaryDto>>

    @GET("api/marketplace/chat/{listingId}/{peerId}/")
    suspend fun getChatThread(
        @Path("listingId") listingId: Long,
        @Path("peerId") peerId: Long
    ): Response<ChatThreadResponseDto>

    @POST("api/marketplace/chat/{listingId}/{peerId}/")
    suspend fun sendMessage(
        @Path("listingId") listingId: Long,
        @Path("peerId") peerId: Long,
        @Body request: SendChatMessageRequest
    ): Response<ChatMessageDto>
}
```

---

## 5. Room Local Database (Offline Cache & Sync)

### 5.1 Room Entity
```kotlin
package com.campxchange.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "chat_messages",
    indices = [
        Index(value = ["listingId", "senderId", "recipientId"])
    ]
)
data class ChatMessageEntity(
    @PrimaryKey val id: Long,
    val listingId: Long,
    val senderId: Long,
    val senderName: String,
    val recipientId: Long,
    val recipientName: String,
    val message: String,
    val isRead: Boolean,
    val isMine: Boolean,
    val createdAt: String
)
```

### 5.2 Room DAO
```kotlin
package com.campxchange.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.campxchange.app.data.local.entity.ChatMessageEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ChatDao {
    @Query("""
        SELECT * FROM chat_messages 
        WHERE listingId = :listingId 
          AND ((senderId = :peerId) OR (recipientId = :peerId))
        ORDER BY id ASC
    """)
    fun getMessagesForThread(listingId: Long, peerId: Long): Flow<List<ChatMessageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertMessages(messages: List<ChatMessageEntity>)
}
```

---

## 6. Chat Lifecycle & Polling Engine (`ChatViewModel.kt`)

The ViewModel manages:
1. **No-Duplicate Polling:** Cancels any existing polling Job before starting a new one.
2. **Lifecycle Control:** Stops polling when UI leaves foreground or ViewModel clears.
3. **Deduplication:** Merges incoming polling payloads with optimistic sent messages using `.distinctBy { it.id }`.
4. **Resilient Send:** Input is only cleared after successful response; emits errors to `sendError` SharedFlow on network drop.

```kotlin
package com.campxchange.app.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.campxchange.app.data.remote.api.ChatApiService
import com.campxchange.app.data.remote.dto.ChatListingDto
import com.campxchange.app.data.remote.dto.ChatMessageDto
import com.campxchange.app.data.remote.dto.ChatPeerDto
import com.campxchange.app.data.remote.dto.SendChatMessageRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatApi: ChatApiService
) : ViewModel() {

    private val _messages = MutableStateFlow<List<ChatMessageDto>>(emptyList())
    val messages = _messages.asStateFlow()

    private val _listingInfo = MutableStateFlow<ChatListingDto?>(null)
    val listingInfo = _listingInfo.asStateFlow()

    private val _peerInfo = MutableStateFlow<ChatPeerDto?>(null)
    val peerInfo = _peerInfo.asStateFlow()

    private val _isSending = MutableStateFlow(false)
    val isSending = _isSending.asStateFlow()

    private val _errorMessage = MutableSharedFlow<String>()
    val errorMessage = _errorMessage.asSharedFlow()

    private var pollingJob: Job? = null

    fun startPolling(listingId: Long, peerId: Long) {
        // Cancel existing job to prevent multiple parallel polling loops
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            while (isActive) {
                try {
                    val response = chatApi.getChatThread(listingId, peerId)
                    if (response.isSuccessful && response.body() != null) {
                        val body = response.body()!!
                        _listingInfo.value = body.listing
                        _peerInfo.value = body.peer
                        
                        // Deduplicate and maintain chronological order
                        _messages.update { current ->
                            (current + body.messages).distinctBy { it.id }.sortedBy { it.id }
                        }
                    }
                } catch (e: Exception) {
                    // Silently ignore transient network drops during 3s polling cycle
                }
                delay(3000) // 3-second cycle
            }
        }
    }

    fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
    }

    fun sendMessage(listingId: Long, peerId: Long, text: String, onSentSuccess: () -> Unit) {
        val trimmed = text.trim()
        if (trimmed.isBlank() || _isSending.value) return

        viewModelScope.launch {
            _isSending.value = true
            try {
                val res = chatApi.sendMessage(
                    listingId = listingId,
                    peerId = peerId,
                    request = SendChatMessageRequest(message = trimmed)
                )
                if (res.isSuccessful && res.body() != null) {
                    val sentMsg = res.body()!!
                    _messages.update { current ->
                        (current + sentMsg).distinctBy { it.id }.sortedBy { it.id }
                    }
                    onSentSuccess() // Clear UI input text ONLY on success
                } else {
                    _errorMessage.emit("Failed to send (${res.code()}). Please try again.")
                }
            } catch (e: Exception) {
                _errorMessage.emit(e.localizedMessage ?: "Network error while sending")
            } finally {
                _isSending.value = false
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        stopPolling()
    }
}
```

---

## 7. Jetpack Compose UI Screen (`ChatScreen.kt`)

```kotlin
package com.campxchange.app.ui.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.campxchange.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    listingId: Long,
    peerId: Long,
    initialPeerName: String,
    initialListingTitle: String,
    onBack: () -> Unit,
    viewModel: ChatViewModel
) {
    val messages by viewModel.messages.collectAsState()
    val listingInfo by viewModel.listingInfo.collectAsState()
    val peerInfo by viewModel.peerInfo.collectAsState()
    val isSending by viewModel.isSending.collectAsState()
    
    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val snackbarHostState = remember { SnackbarHostState() }

    // Lifecycle-Aware Polling: Start when RESUMED, stop on ON_PAUSE
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.startPolling(listingId, peerId)
    }
    LifecycleEventEffect(Lifecycle.Event.ON_PAUSE) {
        viewModel.stopPolling()
    }

    // Observe send errors
    LaunchedEffect(Unit) {
        viewModel.errorMessage.collect { errorMsg ->
            snackbarHostState.showSnackbar(errorMsg)
        }
    }

    // Auto-scroll to bottom on incoming or newly sent message
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = peerInfo?.name ?: initialPeerName,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            if (peerInfo?.isVerified == true) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = "Verified Student",
                                    tint = BrandPrimary,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                        Text(
                            text = listingInfo?.let { "${it.title} • ₹${it.price}" } ?: initialListingTitle,
                            fontSize = 11.sp,
                            color = TextMutedLight
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SurfaceLight)
            )
        },
        bottomBar = {
            Surface(
                color = SurfaceLight,
                tonalElevation = 3.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = inputText,
                        onValueChange = { inputText = it },
                        placeholder = { Text("Type your message...", fontSize = 13.sp) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(24.dp),
                        maxLines = 4,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BrandPrimary,
                            unfocusedBorderColor = Color(0xFFE2E8F0)
                        )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(
                        onClick = {
                            val textToSend = inputText
                            viewModel.sendMessage(
                                listingId = listingId,
                                peerId = peerId,
                                text = textToSend,
                                onSentSuccess = {
                                    inputText = "" // Only reset if message accepted
                                }
                            )
                        },
                        enabled = inputText.isNotBlank() && !isSending
                    ) {
                        if (isSending) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = BrandPrimary
                            )
                        } else {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.Send,
                                contentDescription = "Send",
                                tint = if (inputText.isNotBlank()) BrandPrimary else Color.Gray
                            )
                        }
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(items = messages, key = { it.id }) { msg ->
                val isMine = msg.isMine
                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = if (isMine) Alignment.CenterEnd else Alignment.CenterStart
                ) {
                    Surface(
                        shape = RoundedCornerShape(
                            topStart = 16.dp,
                            topEnd = 16.dp,
                            bottomStart = if (isMine) 16.dp else 4.dp,
                            bottomEnd = if (isMine) 4.dp else 16.dp
                        ),
                        color = if (isMine) BrandPrimary else SurfaceLight,
                        shadowElevation = 1.dp
                    ) {
                        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                            Text(
                                text = msg.message,
                                color = if (isMine) Color.White else TextPrimaryLight,
                                fontSize = 14.sp
                            )
                        }
                    }
                }
            }
        }
    }
}
```
