# 💬 Module 07: Real-Time In-App Student Chat & Messaging

This document defines the native Android implementation for the **CampXChange** listing-scoped messaging engine, conversations list, lifecycle-aware polling engine, message bubble UI, privacy contact filter, and offline Room database caching.

---

## 1. Architecture & Privacy Shield

```text
┌────────────────────────────────────────────────────────┐
│            Active Conversations List (/messages)       │
│ - Item Thumbnail + Title + Agreed Price                │
│ - Peer Name (Masked) + Unread Badge (e.g. 2)           │
└──────────────────────────┬─────────────────────────────┘
                           │ Tap Conversation
                           ▼
┌────────────────────────────────────────────────────────┐
│      Listing-Scoped Chat Thread (listingId, peerId)    │
├────────────────────────────────────────────────────────┤
│ Context Header: [Thumbnail] Vol 1 Maths (₹450) [View]  │
├────────────────────────────────────────────────────────┤
│ [Date Divider: "Today"]                                │
│                                                        │
│ [Left: Received Bubble]                                │
│ "Hey, can you meet at BH-4 around 5 PM?"   16:42       │
│                                                        │
│                                [Right: Sent Bubble]    │
│                        "Yes, see you near Gate 1!" 16:44 ✓✓
├────────────────────────────────────────────────────────┤
│ Input Bar: [Type a message...]                [✈️ Send]│
├────────────────────────────────────────────────────────┤
│ 🛡️ Privacy Shield: Auto-sanitizes external phone/links │
│ 🔄 Polling Engine: 3s lifecycle-aware foreground loop  │
└────────────────────────────────────────────────────────┘
```

---

## 2. API Endpoints & Request/Response Contracts

### 2.1 Chat Api Service (`ChatApiService.kt`)

```kotlin
package com.campxchange.app.data.remote.api

import com.campxchange.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface ChatApiService {

    @GET("marketplace/conversations/")
    suspend fun getConversations(): Response<List<ConversationSummaryDto>>

    @GET("marketplace/chat/{listingId}/{peerId}/")
    suspend fun getChatThread(
        @Path("listingId") listingId: Long,
        @Path("peerId") peerId: Long
    ): Response<ChatThreadResponseDto>

    @POST("marketplace/chat/{listingId}/{peerId}/")
    suspend fun sendMessage(
        @Path("listingId") listingId: Long,
        @Path("peerId") peerId: Long,
        @Body request: SendMessageRequestDto
    ): Response<ChatMessageDto>
}
```

### 2.2 Data Transfer Objects (`ChatDtos.kt`)

```kotlin
package com.campxchange.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ChatThreadResponseDto(
    @SerializedName("listing") val listing: ChatListingBriefDto,
    @SerializedName("peer") val peer: ChatPeerBriefDto,
    @SerializedName("messages") val messages: List<ChatMessageDto>
)

data class ChatListingBriefDto(
    @SerializedName("id") val id: Long,
    @SerializedName("title") val title: String,
    @SerializedName("price") val price: String,
    @SerializedName("transaction_type") val transactionType: String,
    @SerializedName("image") val imageUrl: String?,
    @SerializedName("seller_id") val sellerId: Long
)

data class ChatPeerBriefDto(
    @SerializedName("id") val id: Long,
    @SerializedName("name") val name: String,
    @SerializedName("is_verified") val isVerified: Boolean
)

data class ConversationSummaryDto(
    @SerializedName("listing_id") val listingId: Long,
    @SerializedName("listing_title") val listingTitle: String,
    @SerializedName("listing_price") val listingPrice: String,
    @SerializedName("listing_image") val listingImageUrl: String?,
    @SerializedName("peer_id") val peerId: Long,
    @SerializedName("peer_name") val peerName: String,
    @SerializedName("last_message") val lastMessage: String,
    @SerializedName("last_message_at") val lastMessageTimestamp: String,
    @SerializedName("unread_count") val unreadCount: Int
)

data class ChatMessageDto(
    @SerializedName("id") val id: Long,
    @SerializedName("sender") val senderId: Long,
    @SerializedName("sender_name") val senderName: String,
    @SerializedName("recipient") val recipientId: Long,
    @SerializedName("recipient_name") val recipientName: String,
    @SerializedName("listing") val listingId: Long,
    @SerializedName("message") val message: String,
    @SerializedName("is_read") val isRead: Boolean,
    @SerializedName("is_mine") val isMine: Boolean,
    @SerializedName("created_at") val createdAt: String
)

data class SendMessageRequestDto(
    @SerializedName("message") val message: String
)
```

---

## 3. Offline Room Database Caching (`ChatDao.kt`)

```kotlin
package com.campxchange.app.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "chat_messages")
data class ChatMessageEntity(
    @PrimaryKey val id: Int,
    val listingId: Int,
    val senderId: Int,
    val recipientId: Int,
    val message: String,
    val isRead: Boolean,
    val createdAt: String,
    val timestamp: Long
)

@Dao
interface ChatDao {
    @Query("SELECT * FROM chat_messages WHERE listingId = :listingId AND (senderId = :peerId OR recipientId = :peerId) ORDER BY timestamp ASC")
    fun getMessagesForThread(listingId: Int, peerId: Int): Flow<List<ChatMessageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessages(messages: List<ChatMessageEntity>)
}
```

---

## 4. UI Composable Implementations

### 4.1 Chat Thread Screen (`ChatThreadScreen.kt`)

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatThreadScreen(
    listingId: Int,
    peerId: Int,
    viewModel: ChatViewModel,
    onNavigateBack: () -> Unit
) {
    val messages by viewModel.messages.collectAsStateWithLifecycle()
    val currentUserId by viewModel.currentUserId.collectAsStateWithLifecycle()
    val listingInfo by viewModel.listingInfo.collectAsStateWithLifecycle()

    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    // Start lifecycle-aware 3s polling
    DisposableEffect(listingId, peerId) {
        viewModel.startPolling(listingId, peerId)
        onDispose { viewModel.stopPolling() }
    }

    // Auto-scroll to bottom on new message
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AsyncImage(
                            model = listingInfo?.imageUrl,
                            contentDescription = null,
                            modifier = Modifier.size(36.dp).clip(RoundedCornerShape(6.dp)),
                            contentScale = ContentScale.Crop
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(listingInfo?.peerName ?: "Student Chat", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Text(
                                text = "${listingInfo?.title} • ₹${listingInfo?.price?.toInt()}",
                                style = MaterialTheme.typography.bodySmall,
                                color = Brand500,
                                maxLines = 1
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SurfaceWhite)
            )
        },
        bottomBar = {
            // Input Bar
            Surface(
                color = SurfaceWhite,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth().imePadding()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = inputText,
                        onValueChange = { inputText = it },
                        placeholder = { Text("Type campus meetup message...") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(24.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Brand500,
                            unfocusedBorderColor = BorderLight
                        ),
                        maxLines = 4
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(
                        onClick = {
                            if (inputText.isNotBlank()) {
                                viewModel.sendMessage(listingId, peerId, inputText.trim())
                                inputText = ""
                            }
                        },
                        enabled = inputText.isNotBlank(),
                        modifier = Modifier
                            .size(44.dp)
                            .background(if (inputText.isNotBlank()) Brand500 else Color(0xFFE2E8F0), CircleShape)
                    ) {
                        Icon(Icons.Default.Send, contentDescription = "Send", tint = Color.White, modifier = Modifier.size(20.dp))
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
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(vertical = 12.dp)
        ) {
            items(messages) { msg ->
                val isMe = msg.senderId == currentUserId
                MessageBubble(message = msg, isSentByMe = isMe)
            }
        }
    }
}
```

### 4.2 Message Bubble Composable (`MessageBubble.kt`)

```kotlin
@Composable
fun MessageBubble(
    message: ChatMessageDto,
    isSentByMe: Boolean
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (isSentByMe) Alignment.End else Alignment.Start
    ) {
        Surface(
            color = if (isSentByMe) Brand500 else Color(0xFFF1F5F9),
            shape = RoundedCornerShape(
                topStart = 14.dp,
                topEnd = 14.dp,
                bottomStart = if (isSentByMe) 14.dp else 2.dp,
                bottomEnd = if (isSentByMe) 2.dp else 14.dp
            ),
            modifier = Modifier.widthIn(max = 280.dp)
        ) {
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                Text(
                    text = message.message,
                    color = if (isSentByMe) Color.White else TextPrimary,
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(2.dp))
                Row(
                    modifier = Modifier.align(Alignment.End),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = message.createdAt.substring(11, 16), // "16:42"
                        color = if (isSentByMe) Color(0xCCFFFFFF) else TextMuted,
                        fontSize = 10.sp
                    )
                    if (isSentByMe) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            imageVector = if (message.isRead) Icons.Default.DoneAll else Icons.Default.Done,
                            contentDescription = null,
                            tint = if (message.isRead) Color(0xFFBAE6FD) else Color(0x80FFFFFF),
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }
            }
        }
    }
}
```

---

## 5. Lifecycle-Aware Polling Engine (`ChatViewModel.kt`)

```kotlin
package com.campxchange.app.presentation.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.campxchange.app.data.remote.api.ChatApiService
import com.campxchange.app.data.remote.dto.ChatMessageDto
import com.campxchange.app.data.remote.dto.SendMessageRequestDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatApi: ChatApiService
) : ViewModel() {

    private val _messages = MutableStateFlow<List<ChatMessageDto>>(emptyList())
    val messages: StateFlow<List<ChatMessageDto>> = _messages.asStateFlow()

    private var pollingJob: Job? = null

    fun startPolling(listingId: Long, peerId: Long) {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            while (isActive) {
                try {
                    val res = chatApi.getChatThread(listingId, peerId)
                    if (res.isSuccessful && res.body() != null) {
                        val threadData = res.body()!!
                        _messages.update { current ->
                            (current + threadData.messages).distinctBy { it.id }.sortedBy { it.id }
                        }
                    }
                } catch (e: Exception) {
                    // Fail silently to retry in next 3s interval
                }
                delay(3000L) // 3-second cycle
            }
        }
    }

    fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
    }

    fun sendMessage(listingId: Long, peerId: Long, text: String, onSentSuccess: () -> Unit = {}) {
        val trimmed = text.trim()
        if (trimmed.isBlank()) return
        viewModelScope.launch {
            val res = chatApi.sendMessage(listingId, peerId, SendMessageRequestDto(trimmed))
            if (res.isSuccessful && res.body() != null) {
                val newMsg = res.body()!!
                _messages.update { current ->
                    (current + newMsg).distinctBy { it.id }.sortedBy { it.id }
                }
                onSentSuccess()
            }
        }
    }
}
```
