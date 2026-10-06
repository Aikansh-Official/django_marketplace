# 💬 CampXChange — Android In-App Peer Chat & Messaging Specification

> **Target Platform:** Android (Native Jetpack Compose)  
> **Architecture:** Kotlin Coroutines, StateFlow, Room DB, Retrofit 2 (3s Polling Lifecycle)  
> **Backend Service:** Django REST Framework (`/api/marketplace/chat/`, `/api/marketplace/conversations/`)  
> **DPDP Compliance:** Privacy-Shielded — No personal phone numbers or emails exchanged  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [Architecture & Protocol (REST Polling vs WebSockets)](#1-architecture--protocol)
2. [Security Headers & Endpoints](#2-security-headers--endpoints)
3. [REST API Contract & DTOs](#3-rest-api-contract--dtos)
4. [Chat Lifecycle & 3-Second Coroutine Polling Engine](#4-chat-lifecycle--3-second-coroutine-polling-engine)
5. [Room Local Database (Offline Cache & Sync)](#5-room-local-database)
6. [Jetpack Compose UI Screen (`ChatScreen.kt`)](#6-jetpack-compose-ui-screen)

---

## 1. Architecture & Protocol

CampXChange uses a **zero-infrastructure, resilient REST polling protocol** across web and mobile:
- **No Redis / WebSocket daemon required:** Guaranteed 100% uptime without socket disconnections over unstable hostel Wi-Fi or mobile data switches.
- **Listing & Deal Scoped:** Each conversation thread is strictly bound to a `(listing_id, peer_id)` pair, displaying item thumbnail, price, and handover status in the chat header.
- **Auto Read-Receipts:** Opening the conversation automatically marks received messages as read on the server.
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

## 3. REST API Contract & DTOs

### 3.1 Fetch Thread Messages
- **URL:** `GET /api/marketplace/chat/{listing_id}/{peer_id}/`
- **Headers:** `Authorization: Bearer <token>`, `X-App-Security-Key: campusXchange_secure_key_2026_@nshuman892494`
- **Response `200 OK`:**
```json
[
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
    "is_me": false
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
    "is_me": true
  }
]
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
  "is_me": true
}
```

### 3.3 List Active Student Conversations
- **URL:** `GET /api/marketplace/conversations/`
- **Headers:** `Authorization: Bearer <token>`, `X-App-Security-Key: campusXchange_secure_key_2026_@nshuman892494`
- **Response `200 OK`:**
```json
[
  {
    "listing_id": 101,
    "listing_title": "Scientific Calculator Casio fx-991EX",
    "listing_price": "750.00",
    "listing_image": "https://res.cloudinary.com/.../casio.jpg",
    "peer_id": 42,
    "peer_name": "Aman S.",
    "last_message": "Can we meet near the BH-4 common room at 5 PM?",
    "last_message_at": "2026-09-06T10:15:30Z",
    "unread_count": 1
  }
]
```

---

## 4. Chat Lifecycle & 3-Second Coroutine Polling Engine

In Jetpack Compose, polling runs strictly while the chat screen is in the foreground (`RESUMED` state):

```kotlin
package com.campxchange.app.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.campxchange.app.data.remote.api.ChatApiService
import com.campxchange.app.data.remote.dto.ChatMessageDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatApi: ChatApiService
) : ViewModel() {

    private val _messages = MutableStateFlow<List<ChatMessageDto>>(emptyList())
    val messages = _messages.asStateFlow()

    private val _isSending = MutableStateFlow(false)
    val isSending = _isSending.asStateFlow()

    fun startPolling(listingId: String, peerId: String) {
        viewModelScope.launch {
            while (isActive) {
                try {
                    val response = chatApi.getMessages(listingId, peerId)
                    if (response.isSuccessful) {
                        _messages.value = response.body() ?: emptyList()
                    }
                } catch (e: Exception) {
                    // Silently continue polling on transient network drops
                }
                delay(3000) // 3-second polling interval
            }
        }
    }

    fun sendMessage(listingId: String, peerId: String, text: String) {
        if (text.isBlank()) return
        viewModelScope.launch {
            _isSending.value = true
            try {
                val res = chatApi.sendMessage(listingId, peerId, mapOf("message" to text.trim()))
                if (res.isSuccessful && res.body() != null) {
                    _messages.value = _messages.value + res.body()!!
                }
            } finally {
                _isSending.value = false
            }
        }
    }
}
```

---

## 5. Room Local Database (Offline Cache & Sync)

```kotlin
package com.campxchange.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "chat_messages")
data class ChatMessageEntity(
    @PrimaryKey val id: Long,
    val listingId: Long,
    val senderId: Long,
    val senderName: String,
    val recipientId: Long,
    val recipientName: String,
    val message: String,
    val isRead: Boolean,
    val isMe: Boolean,
    val createdAt: String
)
```

---

## 6. Jetpack Compose UI Screen (`ChatScreen.kt`)

```kotlin
package com.campxchange.app.ui.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.campxchange.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    listingId: String,
    peerId: String,
    peerName: String,
    listingTitle: String,
    onBack: () -> Unit,
    viewModel: ChatViewModel
) {
    val messages by viewModel.messages.collectAsState()
    val isSending by viewModel.isSending.collectAsState()
    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(listingId, peerId) {
        viewModel.startPolling(listingId, peerId)
    }

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(peerName, fontSize = 16.sp, style = MaterialTheme.typography.titleMedium)
                        Text(listingTitle, fontSize = 11.sp, color = TextMutedLight)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SurfaceLight)
            )
        },
        bottomBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = inputText,
                    onValueChange = { inputText = it },
                    placeholder = { Text("Type your message...", fontSize = 13.sp) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(24.dp),
                    maxLines = 3
                )
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = {
                        val toSend = inputText
                        inputText = ""
                        viewModel.sendMessage(listingId, peerId, toSend)
                    },
                    enabled = inputText.isNotBlank() && !isSending
                ) {
                    Icon(Icons.Default.Send, contentDescription = "Send", tint = BrandPrimary)
                }
            }
        }
    ) { padding ->
        LazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            items(messages) { msg ->
                val isMe = msg.isMe
                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = if (isMe) Alignment.CenterEnd else Alignment.CenterStart
                ) {
                    Surface(
                        shape = RoundedCornerShape(
                            topStart = 16.dp,
                            topEnd = 16.dp,
                            bottomStart = if (isMe) 16.dp else 4.dp,
                            bottomEnd = if (isMe) 4.dp else 16.dp
                        ),
                        color = if (isMe) BrandPrimary else SurfaceLight,
                        shadowElevation = 1.dp
                    ) {
                        Text(
                            text = msg.message,
                            color = if (isMe) Color.White else TextPrimaryLight,
                            fontSize = 14.sp,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                        )
                    }
                }
            }
        }
    }
}
```
