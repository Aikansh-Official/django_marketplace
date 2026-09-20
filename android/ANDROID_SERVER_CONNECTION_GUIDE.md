# 🔌 CampusXChange — Android Server Connection, Security Headers & Network Architecture Guide

> **Target Platform:** Android (API 26+ / Android 8.0 to Android 15+)  
> **Architecture:** Kotlin, Jetpack Compose, Retrofit 2, OkHttp 4, Kotlinx Serialization / Gson  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [Server Environment Endpoints (Production & Local)](#1-server-environment-endpoints)
2. [Mandatory Security Headers & Shield Architecture](#2-mandatory-security-headers--shield-architecture)
3. [OkHttp Security & Auth Interceptor Pipeline](#3-okhttp-security--auth-interceptor-pipeline)
4. [Automatic JWT Token Refresh (`Authenticator`)](#4-automatic-jwt-token-refresh)
5. [Complete Kotlin NetworkModule Setup](#5-complete-kotlin-networkmodule-setup)
6. [Android Manifest & Network Security Config](#6-android-manifest--network-security-config)
7. [Local Emulator & Physical Device Setup (ADB Tunnel)](#7-local-emulator--physical-device-setup)
8. [Troubleshooting & Verification Matrix](#8-troubleshooting--verification-matrix)

---

## 1. Server Environment Endpoints

CampusXChange uses the same unified Django REST backend across Web Client, Admin Panel, and Android App.

| Environment | Base URL | Usage |
|---|---|---|
| **Production Server (Primary)** | `https://cxc.anshuman892494.online/` | Live Android Play Store release / Staging builds |
| **Production Fallback (Render Backend)** | `https://cxc-marketplace.onrender.com/` | Direct cloud server alias |
| **Local Emulator (Default)** | `http://10.0.2.2:8000/` | Standard Android Studio Emulator |
| **Local Device / Emulator (ADB Reverse)** | `http://127.0.0.1:8000/` | USB debugging with `adb reverse tcp:8000 tcp:8000` |
| **Physical Phone (Campus/Hostel Wi-Fi)** | `http://<PC_LAN_IP>:8000/` | Physical device over same Wi-Fi subnet |

> ⚠️ **Important:** Retrofit base URLs **MUST ALWAYS** end with a trailing slash (`/`).

---

## 2. Mandatory Security Headers & Shield Architecture

The backend implements `DataSecurityMiddleware` which guards all `/api/` endpoints against unauthorized crawlers, bots, and unsigned traffic.

### Required HTTP Headers

```http
X-App-Security-Key: campusXchange_secure_key_2026_@nshuman892494
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
Accept: application/json
```

### Header Specification Table

| Header | Value / Format | Scope | Required? |
|---|---|---|:---:|
| `X-App-Security-Key` | `campusXchange_secure_key_2026_@nshuman892494` | All `/api/*` endpoints | **YES** (Enforced by Django Shield) |
| `Authorization` | `Bearer <access_token>` | Authenticated endpoints (`profile`, `create listing`, `offers`, `chat`) | **YES** for logged-in users |
| `Accept` | `application/json` | All API queries | **YES** |
| `Content-Type` | `application/json` | `POST`, `PATCH`, `PUT` requests | **YES** |

> 🔒 **Security Best Practice:** Store `X-App-Security-Key` inside Android `local.properties` and inject it into `BuildConfig.APP_SECURITY_KEY` at build time so it is never exposed in plain text in public repositories.

---

## 3. OkHttp Security & Auth Interceptor Pipeline

To ensure **every single request** carries the required security keys and Bearer JWT tokens, use an OkHttp `Interceptor`:

```kotlin
package com.campusxchange.app.data.remote.interceptor

import com.campusxchange.app.BuildConfig
import com.campusxchange.app.data.local.TokenManager
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

class SecurityHeaderInterceptor(
    private val tokenManager: TokenManager
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val builder = original.newBuilder()

        // 1. Mandatory Data Security Shield Key
        builder.addHeader(
            "X-App-Security-Key",
            "campusXchange_secure_key_2026_@nshuman892494"
        )

        // 2. Standard JSON Headers
        builder.addHeader("Accept", "application/json")
        if (original.body != null && original.header("Content-Type") == null) {
            builder.addHeader("Content-Type", "application/json")
        }

        // 3. Attach JWT Bearer token if present and not already specified
        val accessToken = runBlocking { tokenManager.getAccessToken() }
        if (!accessToken.isNullOrBlank() && original.header("Authorization") == null) {
            builder.addHeader("Authorization", "Bearer $accessToken")
        }

        return chain.proceed(builder.build())
    }
}
```

---

## 4. Automatic JWT Token Refresh (`Authenticator`)

When an access token expires (HTTP 401 Unauthorized), OkHttp's `Authenticator` automatically hits `/api/auth/token/refresh/` using the stored refresh token, updates DataStore, and retries the original request seamlessly without user intervention:

```kotlin
package com.campusxchange.app.data.remote.authenticator

import com.campusxchange.app.data.local.TokenManager
import com.campusxchange.app.data.remote.api.AuthApiService
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import javax.inject.Inject
import javax.inject.Provider

class TokenAuthenticator @Inject constructor(
    private val tokenManager: TokenManager,
    private val authApiServiceProvider: Provider<AuthApiService>
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        // Prevent infinite loops if retry also returns 401
        if (responseCount(response) >= 2) return null

        val refreshToken = runBlocking { tokenManager.getRefreshToken() } ?: return null

        // Execute synchronous refresh call
        val refreshResponse = runBlocking {
            try {
                authApiServiceProvider.get().refreshToken(mapOf("refresh" to refreshToken))
            } catch (e: Exception) {
                null
            }
        }

        if (refreshResponse != null && refreshResponse.isSuccessful) {
            val newAccessToken = refreshResponse.body()?.get("access") ?: return null
            runBlocking {
                tokenManager.saveAccessToken(newAccessToken)
            }
            return response.request.newBuilder()
                .header("Authorization", "Bearer $newAccessToken")
                .build()
        } else {
            // Refresh token expired -> clear credentials and trigger login event
            runBlocking { tokenManager.clearTokens() }
            return null
        }
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
```

---

## 5. Complete Kotlin NetworkModule Setup

```kotlin
package com.campusxchange.app.di

import com.campusxchange.app.BuildConfig
import com.campusxchange.app.data.local.TokenManager
import com.campusxchange.app.data.remote.authenticator.TokenAuthenticator
import com.campusxchange.app.data.remote.interceptor.SecurityHeaderInterceptor
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideBaseUrl(): String {
        return if (BuildConfig.DEBUG) {
            // Local dev with 'adb reverse tcp:8000 tcp:8000'
            "http://127.0.0.1:8000/"
            // Alternative without adb reverse: "http://10.0.2.2:8000/"
        } else {
            // Live Production Server
            "https://cxc.anshuman892494.online/"
        }
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        tokenManager: TokenManager,
        tokenAuthenticator: TokenAuthenticator
    ): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(SecurityHeaderInterceptor(tokenManager))
            .addInterceptor(loggingInterceptor)
            .authenticator(tokenAuthenticator)
            .retryOnConnectionFailure(true)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(baseUrl: String, okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
}
```

---

## 6. Android Manifest & Network Security Config

### 6.1 `res/xml/network_security_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Production: Strict HTTPS Enforcement -->
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">cxc.anshuman892494.online</domain>
        <domain includeSubdomains="true">cxc-marketplace.onrender.com</domain>
        <domain includeSubdomains="true">cloudinary.com</domain>
    </domain-config>

    <!-- Local Development: Cleartext HTTP Permitted -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
        <domain includeSubdomains="true">localhost</domain>
    </domain-config>
</network-security-config>
```

### 6.2 `AndroidManifest.xml`

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.campusxchange.app">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />

    <application
        android:name=".CampusXChangeApp"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.CampusXChange"
        android:networkSecurityConfig="@xml/network_security_config"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

## 7. Local Emulator & Physical Device Setup (ADB Tunnel)

To connect from Android Emulator or a physical USB-connected device to your PC's Django backend without getting blocked by Windows Firewall:

### Step 1: Start Django on `0.0.0.0:8000`
```powershell
cd server
python manage.py runserver 0.0.0.0:8000
```

### Step 2: Establish ADB Reverse Tunnel
In a new terminal:
```powershell
adb reverse tcp:8000 tcp:8000
```
*(Maps the phone's port 8000 directly to your PC's port 8000)*

### Step 3: Verify Reverse Tunnel Status
```powershell
adb reverse --list
# Expected output: (reverse) tcp:8000 tcp:8000
```

Now, in your Android app:
- `BASE_URL = "http://127.0.0.1:8000/"` connects directly and instantly!

---

## 8. Troubleshooting & Verification Matrix

| Symptom | Root Cause | Fix |
|---|---|---|
| `HTTP 403 Forbidden` (`Missing or invalid X-App-Security-Key`) | Request omitted security shield key | Ensure `SecurityHeaderInterceptor` adds `X-App-Security-Key: campusXchange_secure_key_2026_@nshuman892494`. |
| `java.net.ConnectException: Failed to connect to /10.0.2.2:8000` | Django listening only on 127.0.0.1 | Start Django with `0.0.0.0:8000` or run `adb reverse tcp:8000 tcp:8000`. |
| `CLEARTEXT communication to ... not permitted by network security policy` | Android 9+ default cleartext block | Add `android:networkSecurityConfig="@xml/network_security_config"` with 10.0.2.2 whitelisted. |
| `HTTP 401 Unauthorized` on protected calls | Token expired or missing `Bearer ` prefix | Verify `SecurityHeaderInterceptor` formats as `"Bearer $token"`, check `TokenAuthenticator`. |
| `SSLHandshakeException` on Production | Device clock out of sync or stale cert | Verify device time settings; check SSL cert on `cxc.anshuman892494.online`. |
