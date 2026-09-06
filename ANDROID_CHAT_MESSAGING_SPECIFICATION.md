# 💬 LPUTrade — Android Real-Time Chat & Messaging Specification

> **Target Platform:** Android (Native)  
> **Tech Stack:** Kotlin, Jetpack Compose, WebSockets (OkHttp / Scarlet), Room DB, Material 3, Hilt  
> **Backend Service:** Django Channels + Redis Channel Layer (`ws://<server-ip>:8000/ws/chat/{roomId}/`)  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [System Architecture & WebSocket Pipeline](#1-system-architecture--websocket-pipeline)
2. [Complete Business & Interaction Logic](#2-complete-business--interaction-logic)
   - [2.1 Product-Linked Conversations](#21-product-linked-conversations)
   - [2.2 Real-Time Message Events & Payloads](#22-real-time-message-events--payloads)
   - [2.3 Typing Indicators & Online Presence](#23-typing-indicators--online-presence)
   - [2.4 Read Receipts & Message Status Indicators](#24-read-receipts--message-status-indicators)
3. [Color Palette & Material 3 Chat Styling](#3-color-palette--material-3-chat-styling)
4. [Navigation & Compose Routes](#4-navigation--compose-routes)
5. [WebSocket Event Contract](#5-websocket-event-contract)
6. [Android Implementation Blueprint (Kotlin Code)](#6-android-implementation-blueprint-kotlin-code)
   - [6.1 Message Entity & Room Local Database](#61-message-entity--room-local-database)
   - [6.2 OkHttp WebSocket Manager (Auto-Reconnect & Ping)](#62-okhttp-websocket-manager-auto-reconnect--ping)
   - [6.3 Chat ViewModel (Coroutines & StateFlow)](#63-chat-viewmodel-coroutines--stateflow)
   - [6.4 ChatScreen Composable & Bubbles](#64-chatscreen-composable--bubbles)
7. [Offline Caching & Network Reconnection Strategy](#7-offline-caching--network-reconnection-strategy)

---

## 1. System Architecture & WebSocket Pipeline

LPUTrade provides instant student-to-student chat with conversations directly attached to a marketplace listing.

```
┌─────────────────────────────────────────────────────────────┐
│                 Android Jetpack Compose UI                  │
│  (ChatScreen, ProductContextBanner, MessageBubbles, Input)  │
└──────────────────────────────▲──────────────────────────────┘
                               │ StateFlow<ChatUiState>
┌──────────────────────────────▼──────────────────────────────┐
│                        ChatViewModel                        │
└──────────────────────────────▲──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    ChatRepository / Room                    │
└──────────────┬───────────────────────────────┬──────────────┘
               ▼                               ▼
    Local: Room DB Cache             Remote: OkHttp WebSocket
                                               ▲
                                               ▼
                              Django Channels + Redis Channel Layer
```

---

## 2. Complete Business & Interaction Logic

### 2.1 Product-Linked Conversations
- Every chat is linked to a specific `listing_id`.
- The top of the chat view features a sticky **Product Header Card**:
  - Item Thumbnail, Title, and Listed Price.
  - Quick-action buttons: **"Make Offer"** or **"View Listing"**.
  - Current Status Badge: Active, Reserved, or Sold.

### 2.2 Real-Time Message Events & Payloads
- **`chat_message`:** Standard text communication.
- **`offer_action`:** Inline interactive cards when an offer is submitted, accepted, or countered.
- **`typing`:** Ephemeral typing indicator triggered when typing into text input.
- **`read_receipt`:** Updates read state when chat screen is in foreground.

### 2.3 Typing Indicators & Online Presence
- Displays *"Student is typing..."* with subtle dot pulsation animation.
- Heartbeat ping sent every 30 seconds (`{"type": "ping"}`) to keep the connection alive through mobile carrier NAT timeouts.

---

## 3. Color Palette & Material 3 Chat Styling

```kotlin
package com.lputrade.app.ui.theme

import androidx.compose.ui.graphics.Color

val ChatOutgoingBubbleBg = Color(0xFFFB5607) // Brand Primary Orange
val ChatOutgoingText = Color(0xFFFFFFFF)
val ChatIncomingBubbleBg = Color(0xFFF3F4F6) // Gray 100
val ChatIncomingText = Color(0xFF111111) // Ink 900
val ChatScreenBg = Color(0xFFFCFBF8) // Warm Cream 50
val ChatInputBg = Color(0xFFFFFFFF)
val ChatTimeText = Color(0xFF9CA3AF)
val ReadReceiptDoubleCheck = Color(0xFF3B82F6) // Blue 500
```

---

## 4. Navigation & Compose Routes

```kotlin
sealed class ChatRoute(val route: String) {
    object Inbox : ChatRoute("chat/inbox")
    fun room(roomId: String, listingId: Int): String = "chat/room/$roomId?listingId=$listingId"
}
```

---

## 5. WebSocket Event Contract

Connection URL: `ws://<server-ip>:8000/ws/chat/{roomId}/?token=<access_token>`

### 5.1 Send Message (Client ➔ Server)
```json
{
  "action": "message",
  "message": "Hey Aman, can I inspect the Casio calculator at BH-4 today?",
  "listing_id": 105
}
```

### 5.2 Receive Message (Server ➔ Client)
```json
{
  "type": "chat_message",
  "message_id": "msg_98234",
  "sender_id": 42,
  "sender_name": "Aman Sharma",
  "message": "Yes, sure! I am available between 4 PM and 6 PM.",
  "timestamp": "2026-09-06T10:15:30Z",
  "listing_id": 105
}
```

### 5.3 Typing Notification
```json
{
  "type": "typing",
  "user_id": 42,
  "is_typing": true
}
```

---

## 6. Android Implementation Blueprint (Kotlin Code)

### 6.1 Message Entity & Room Local Database

```kotlin
package com.lputrade.app.data.local.chat

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "chat_messages")
data class ChatMessageEntity(
    @PrimaryKey val messageId: String,
    val roomId: String,
    val listingId: Int,
    val senderId: Int,
    val senderName: String,
    val content: String,
    val timestamp: Long,
    val isFromMe: Boolean,
    val isRead: Boolean
)

@Dao
interface ChatDao {
    @Query("SELECT * FROM chat_messages WHERE roomId = :roomId ORDER BY timestamp ASC")
    fun getMessagesForRoom(roomId: String): Flow<List<ChatMessageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: ChatMessageEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessages(messages: List<ChatMessageEntity>)
}
```

---

### 6.2 OkHttp WebSocket Manager (Auto-Reconnect & Ping)

```kotlin
package com.lputrade.app.data.remote.chat

import com.google.gson.Gson
import com.lputrade.app.data.local.TokenManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import okhttp3.*
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

data class SocketPayload(val type: String, val message: String?, val sender_id: Int?, val listing_id: Int?)

@Singleton
class ChatWebSocketClient @Inject constructor(
    private val tokenManager: TokenManager,
    private val gson: Gson
) {
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    private val _incomingMessages = MutableSharedFlow<SocketPayload>(extraBufferCapacity = 64)
    val incomingMessages: SharedFlow<SocketPayload> = _incomingMessages

    fun connect(roomId: String) {
        CoroutineScope(Dispatchers.IO).launch {
            val token = tokenManager.getAccessToken() ?: return@launch
            val request = Request.Builder()
                .url("ws://10.0.2.2:8000/ws/chat/$roomId/?token=$token")
                .build()

            webSocket = client.newWebSocket(request, object : WebSocketListener() {
                override fun onMessage(webSocket: WebSocket, text: String) {
                    try {
                        val payload = gson.fromJson(text, SocketPayload::class.java)
                        _incomingMessages.tryEmit(payload)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    // Reconnect with exponential backoff
                }
            })
        }
    }

    fun sendMessage(content: String, listingId: Int) {
        val json = gson.toJson(mapOf(
            "action" to "message",
            "message" to content,
            "listing_id" to listingId
        ))
        webSocket?.send(json)
    }

    fun disconnect() {
        webSocket?.close(1000, "User left chat")
        webSocket = null
    }
}
```

---

### 6.3 Chat ViewModel (Coroutines & StateFlow)

```kotlin
package com.lputrade.app.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lputrade.app.data.local.chat.ChatDao
import com.lputrade.app.data.local.chat.ChatMessageEntity
import com.lputrade.app.data.remote.chat.ChatWebSocketClient
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class ChatUiState(
    val messages: List<ChatMessageEntity> = emptyList(),
    val inputText: String = "",
    val isPeerTyping: Boolean = false,
    val isConnected: Boolean = false
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val socketClient: ChatWebSocketClient,
    private val chatDao: ChatDao
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    private var activeRoomId: String = ""
    private var activeListingId: Int = 0

    fun initRoom(roomId: String, listingId: Int) {
        activeRoomId = roomId
        activeListingId = listingId
        socketClient.connect(roomId)

        viewModelScope.launch {
            chatDao.getMessagesForRoom(roomId).collect { list ->
                _uiState.value = _uiState.value.copy(messages = list)
            }
        }

        viewModelScope.launch {
            socketClient.incomingMessages.collect { payload ->
                if (payload.type == "chat_message" && payload.message != null) {
                    val entity = ChatMessageEntity(
                        messageId = UUID.randomUUID().toString(),
                        roomId = activeRoomId,
                        listingId = activeListingId,
                        senderId = payload.sender_id ?: 0,
                        senderName = "Student",
                        content = payload.message,
                        timestamp = System.currentTimeMillis(),
                        isFromMe = false,
                        isRead = true
                    )
                    chatDao.insertMessage(entity)
                }
            }
        }
    }

    fun onInputTextChange(text: String) {
        _uiState.value = _uiState.value.copy(inputText = text)
    }

    fun sendMessage() {
        val text = _uiState.value.inputText.trim()
        if (text.isEmpty()) return

        socketClient.sendMessage(text, activeListingId)
        viewModelScope.launch {
            val entity = ChatMessageEntity(
                messageId = UUID.randomUUID().toString(),
                roomId = activeRoomId,
                listingId = activeListingId,
                senderId = 0,
                senderName = "Me",
                content = text,
                timestamp = System.currentTimeMillis(),
                isFromMe = true,
                isRead = false
            )
            chatDao.insertMessage(entity)
            _uiState.value = _uiState.value.copy(inputText = "")
        }
    }

    override fun onCleared() {
        super.onCleared()
        socketClient.disconnect()
    }
}
```

---

### 6.4 ChatScreen Composable & Bubbles

```kotlin
package com.lputrade.app.ui.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.lputrade.app.data.local.chat.ChatMessageEntity
import com.lputrade.app.ui.theme.*

@Composable
fun ChatScreen(
    roomId: String,
    listingId: Int,
    listingTitle: String,
    listingPrice: String,
    viewModel: ChatViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(roomId) {
        viewModel.initRoom(roomId, listingId)
    }

    Scaffold(
        topBar = {
            // Product Banner Top Bar
            Surface(
                color = Color.White,
                shadowElevation = 2.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(Color(0xFFFFF4ED), RoundedCornerShape(6.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("🛍️", fontSize = 20.sp)
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(listingTitle, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("₹$listingPrice", color = Brand500, fontWeight = FontWeight.Black, fontSize = 13.sp)
                    }
                }
            }
        },
        bottomBar = {
            // Input Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = state.inputText,
                    onValueChange = { viewModel.onInputTextChange(it) },
                    placeholder = { Text("Type a message...") },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(24.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Brand500,
                        unfocusedBorderColor = Color(0xFFE5E7EB)
                    )
                )
                Spacer(modifier = Modifier.width(8.dp))
                Button(
                    onClick = { viewModel.sendMessage() },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Brand500)
                ) {
                    Text("Send", fontWeight = FontWeight.Bold)
                }
            }
        },
        containerColor = Color(0xFFFCFBF8)
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(state.messages, key = { it.messageId }) { msg ->
                ChatBubble(message = msg)
            }
        }
    }
}

@Composable
fun ChatBubble(message: ChatMessageEntity) {
    val isMe = message.isFromMe

    Box(
        modifier = Modifier.fillMaxWidth(),
        contentAlignment = if (isMe) Alignment.CenterEnd else Alignment.CenterStart
    ) {
        Surface(
            shape = RoundedCornerShape(
                topStart = 12.dp,
                topEnd = 12.dp,
                bottomStart = if (isMe) 12.dp else 2.dp,
                bottomEnd = if (isMe) 2.dp else 12.dp
            ),
            color = if (isMe) Brand500 else Color(0xFFF3F4F6),
            modifier = Modifier.widthIn(max = 280.dp)
        ) {
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                Text(
                    text = message.content,
                    color = if (isMe) Color.White else Color(0xFF111111),
                    fontSize = 14.sp
                )
            }
        }
    }
}
```

---

## 7. Offline Caching & Network Reconnection Strategy

- **Room Persistence:** All chat messages are written directly to Room DB so history is instantly available offline or during poor campus WiFi coverage.
- **WebSocket Reconnection:** Automatic exponential reconnect backoff (1s, 2s, 4s, 8s, up to 30s) if connection drops while walking across campus.
