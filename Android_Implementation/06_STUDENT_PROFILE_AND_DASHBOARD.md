# 👤 Module 06: Student Profile, Orders Tracker & DPDP Reputation

This document specifies the native Android architecture for the **CampXChange** student profile dashboard, dual Orders & Sales trackers, offline Room database wishlist, ID verification viewer, and DPDP Act (2023) compliant public seller profile.

---

## 1. Profile Dashboard Layout & Sub-Tabs

```text
┌────────────────────────────────────────────────────────┐
│ [Avatar + Trust Ring]  Rohan Sharma  (🛡️ Verified)     │
│ Reg No: @1201**** • Trust Score: 85/100 • Role: SELLER │
├────────────────────────────────────────────────────────┤
│ Navigation Tabs:                                       │
│ [ 👤 Personal Info ] [ 📦 Orders & Sales ]             │
│ [ 🛡️ ID Verification ] [ 🤍 Saved Items ]             │
├────────────────────────────────────────────────────────┤
│ Tab 1: Personal Info                                   │
│ - Edit: Name, Phone, WhatsApp, Profile Avatar          │
│ - Read-Only: Email, Reg No, Trust Score                │
│ - Change Password Modal                                │
├────────────────────────────────────────────────────────┤
│ Tab 2: Orders & Sales Tracker                          │
│ ┌─────────────────────────┬──────────────────────────┐ │
│ │ "My Sales" (Seller)     │ "My Orders" (Buyer)      │ │
│ │ - Active items          │ - Sent purchase requests │ │
│ │ - Incoming offers       │ - Counter-offer decisions│ │
│ │ - [Generate QR] trigger │ - [Scan QR] trigger      │ │
│ └─────────────────────────┴──────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ Public Profile Route (/seller/{id}):                   │
│ - Sanitized Display: "Rohan S." (DPDP Minimized)       │
│ - Active Items Grid & Verified Student Review Feed     │
└────────────────────────────────────────────────────────┘
```

---

## 2. API Endpoints & Request/Response Contracts

### 2.1 Profile & Reputation Api Service (`ProfileApiService.kt`)

```kotlin
package com.campxchange.app.data.remote.api

import com.campxchange.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface ProfileApiService {

    @GET("auth/profile/")
    suspend fun getMyProfile(): Response<UserProfileDto>

    @PATCH("auth/profile/")
    suspend fun updateProfile(
        @Body request: UpdateProfileRequestDto
    ): Response<UserProfileDto>

    @POST("auth/change-password/")
    suspend fun changePassword(
        @Body request: ChangePasswordRequestDto
    ): Response<GenericMessageDto>

    @GET("marketplace/my-orders/")
    suspend fun getMyOrders(): Response<List<OrderHistoryDto>>

    @GET("marketplace/seller/{id}/")
    suspend fun getPublicSellerProfile(
        @Path("id") sellerId: Int
    ): Response<PublicSellerProfileDto>

    @GET("marketplace/seller/{id}/reviews/")
    suspend fun getSellerReviews(
        @Path("id") sellerId: Int
    ): Response<List<ReviewDto>>
}
```

### 2.2 Data Transfer Objects (`ProfileDtos.kt`)

```kotlin
package com.campxchange.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class UserProfileDto(
    @SerializedName("id") val id: Int,
    @SerializedName("username") val username: String,
    @SerializedName("full_name") val fullName: String,
    @SerializedName("email") val email: String,
    @SerializedName("phone_number") val phoneNumber: String?,
    @SerializedName("whatsapp_number") val whatsappNumber: String?,
    @SerializedName("role") val role: String,
    @SerializedName("trust_score") val trustScore: Int,
    @SerializedName("is_id_verified") val isIdVerified: Boolean,
    @SerializedName("id_card_data") val idCardData: Map<String, String>?,
    @SerializedName("profile_photo") val profilePhotoUrl: String?,
    @SerializedName("joined_date") val joinedDate: String
)

data class UpdateProfileRequestDto(
    @SerializedName("full_name") val fullName: String?,
    @SerializedName("phone_number") val phoneNumber: String?,
    @SerializedName("whatsapp_number") val whatsappNumber: String?,
    @SerializedName("profile_photo") val profilePhotoBase64: String?
)

data class OrderHistoryDto(
    @SerializedName("offer_id") val offerId: Int,
    @SerializedName("listing_id") val listingId: Int,
    @SerializedName("listing_title") val listingTitle: String,
    @SerializedName("listing_image") val listingImageUrl: String?,
    @SerializedName("agreed_price") val agreedPrice: Double,
    @SerializedName("status") val status: String, // "PENDING", "ACCEPTED", "COUNTERED", "COMPLETED", "CANCELLED"
    @SerializedName("counter_amount") val counterAmount: Double?,
    @SerializedName("seller_name") val sellerName: String,
    @SerializedName("created_at") val createdAt: String
)

data class PublicSellerProfileDto(
    @SerializedName("id") val id: Int,
    @SerializedName("display_name") val displayName: String, // "Rohan S."
    @SerializedName("masked_email") val maskedEmail: String, // "r***@lpu.in"
    @SerializedName("trust_score") val trustScore: Int,
    @SerializedName("completed_deals") val completedDeals: Int,
    @SerializedName("average_rating") val averageRating: Double,
    @SerializedName("ratings_count") val ratingsCount: Int,
    @SerializedName("member_since") val memberSince: String,
    @SerializedName("profile_photo") val profilePhotoUrl: String?,
    @SerializedName("active_listings") val activeListings: List<ListingSummaryDto>
)
```

---

## 3. Offline Room Database Wishlist (`WishlistDao.kt`)

Enables students to save items locally without mandatory authentication:

```kotlin
package com.campxchange.app.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "saved_items")
data class SavedItemEntity(
    @PrimaryKey val listingId: Int,
    val title: String,
    val price: Double,
    val location: String,
    val condition: String,
    val imageUrl: String?,
    val savedAtTimestamp: Long = System.currentTimeMillis()
)

@Dao
interface WishlistDao {
    @Query("SELECT * FROM saved_items ORDER BY savedAtTimestamp DESC")
    fun getAllSavedItems(): Flow<List<SavedItemEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSavedItem(item: SavedItemEntity)

    @Query("DELETE FROM saved_items WHERE listingId = :listingId")
    suspend fun deleteSavedItem(listingId: Int)

    @Query("SELECT EXISTS(SELECT 1 FROM saved_items WHERE listingId = :listingId)")
    fun isItemSaved(listingId: Int): Flow<Boolean>
}
```

---

## 4. DPDP-Compliant Public Seller Profile Screen (`SellerProfileScreen.kt`)

Adheres strictly to the **Digital Personal Data Protection (DPDP) Act 2023**:
- No raw 8-digit registration numbers exposed (`@12012345` is hidden).
- Institutional email is masked (`r***@lpu.in`).
- Student phone numbers are never rendered publicly.
- Physical ID card photos are restricted to verified staff moderation queues.

```kotlin
@Composable
fun PublicSellerProfileScreen(
    sellerId: Int,
    viewModel: SellerProfileViewModel,
    onNavigateToProduct: (Int) -> Unit,
    onStartChat: (Int) -> Unit,
    onNavigateBack: () -> Unit
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(sellerId) {
        viewModel.loadSeller(sellerId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Seller Reputation Hub") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        state.seller?.let { seller ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp)
            ) {
                // 1. Reputation Summary Header
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(
                                progress = { seller.trustScore / 100f },
                                modifier = Modifier.size(76.dp),
                                color = Brand500,
                                strokeWidth = 4.dp
                            )
                            AsyncImage(
                                model = seller.profilePhotoUrl,
                                contentDescription = null,
                                modifier = Modifier.size(62.dp).clip(CircleShape),
                                contentScale = ContentScale.Crop
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(seller.displayName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text(seller.maskedEmail, style = MaterialTheme.typography.bodySmall, color = TextSecondary)

                        Spacer(modifier = Modifier.height(14.dp))

                        // Stats Grid (Deals, Trust Score, Average Rating)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            StatBox(label = "Trust Score", value = "${seller.trustScore}/100", tint = Brand500)
                            StatBox(label = "Completed", value = "${seller.completedDeals} Deals", tint = SuccessGreen)
                            StatBox(label = "Peer Rating", value = "${seller.averageRating} ★", tint = Color(0xFFFBBF24))
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Chat CTA Button
                        Button(
                            onClick = { onStartChat(seller.id) },
                            colors = ButtonDefaults.buttonColors(containerColor = Brand500),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth().height(46.dp)
                        ) {
                            Icon(Icons.Default.Chat, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Chat with Student", fontWeight = FontWeight.SemiBold)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // 2. Active Items Sold by This Student
                Text("ACTIVE LISTINGS (${seller.activeListings.size})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(12.dp))

                seller.activeListings.forEach { listing ->
                    ListingSummaryRow(listing = listing, onClick = { onNavigateToProduct(listing.id) })
                    Spacer(modifier = Modifier.height(8.dp))
                }

                Spacer(modifier = Modifier.height(24.dp))

                // 3. Verified Student Reviews
                Text("VERIFIED PEER REVIEWS (${state.reviews.size})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(12.dp))

                state.reviews.forEach { review ->
                    ReviewFeedCard(review = review)
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        } ?: Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Brand500)
        }
    }
}
```
