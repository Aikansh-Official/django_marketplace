# 🔌 CampusXChange — Android to Django Server Connection & Troubleshooting Guide

> **Issue:** `failed to connect to /10.0.2.2 (port 8000) from /10.0.2.16 after 15000ms`  
> **Target:** Android Emulator & Physical Device connecting to local Django backend  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [Error Diagnosis: Why It Happens](#1-error-diagnosis-why-it-happens)
2. [Instant Fix Steps (Do This Right Now)](#2-instant-fix-steps-do-this-right-now)
3. [The Golden Solution: ADB Reverse Tunnel](#3-the-golden-solution-adb-reverse-tunnel)
4. [Django Server Configuration (`0.0.0.0:8000` & `ALLOWED_HOSTS`)](#4-django-server-configuration)
5. [Android App Requirements (`AndroidManifest.xml` & Retrofit)](#5-android-app-requirements)
6. [Testing Connection Directly from Emulator](#6-testing-connection-directly-from-emulator)
7. [Physical Phone Testing (Over Campus/Hostel Wi-Fi)](#7-physical-phone-testing-over-campushostel-wi-fi)

---

## 1. Error Diagnosis: Why It Happens

When running an Android app in an **Android Emulator**, the emulator operates inside a virtual router NAT network:
- **`10.0.2.16`** = The Android Emulator's own IP address.
- **`10.0.2.2`** = The virtual alias mapped to your PC host machine's loopback (`127.0.0.1`).
- **`15000ms (15 seconds)` Timeout** = The socket tried to connect, but packets were silently dropped.

### The 3 Causes of this Failure:
1. **Django bound strictly to `127.0.0.1` instead of `0.0.0.0`:**  
   If Django runs as `python manage.py runserver`, it only listens on IPv4 loopback. Packets from virtual network adapters (`10.0.2.16`) are dropped by Windows kernel.
2. **Windows Defender Firewall on Public / Hostel Wi-Fi:**  
   On university or hostel Wi-Fi (e.g. `Hostel Wi-Fi 3` / `lpu.com`), Windows sets the network profile to **Public**. Windows Firewall blocks all incoming connections on port 8000 unless tunneled or explicitly whitelisted.
3. **`10.0.2.2` not in Django's `ALLOWED_HOSTS`:**  
   Django drops requests with `Invalid HTTP_HOST header: '10.0.2.2:8000'`.

---

## 2. Instant Fix Steps (Do This Right Now)

### Step 1: Start Django on `0.0.0.0:8000`
In your terminal, navigate to the `server/` directory and run:

```powershell
cd c:\Users\anshu\OneDrive\Desktop\Projects\CampusXChange\server
python manage.py runserver 0.0.0.0:8000
```
> ⚠️ **Important:** Do NOT just write `python manage.py runserver`. Always include `0.0.0.0:8000`.

---

### Step 2: Run ADB Reverse (Bypasses Firewall Completely)
Open a new PowerShell terminal and run:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:8000 tcp:8000
```

If you have `adb` in your system PATH, you can simply run:
```bash
adb reverse tcp:8000 tcp:8000
```

> 💡 **What this does:** It bridges your Android Emulator / USB connected device directly to your PC's port 8000. It works 100% of the time, even on restricted hostel Wi-Fi networks!

---

### Step 3: Tap "Retry" on the App!
Go back to your Android Emulator screen and tap the orange **"Retry"** button. The app will immediately load data!

---

## 3. The Golden Solution: ADB Reverse Tunnel

`adb reverse` creates a direct TCP tunnel from inside Android to your PC over the ADB bridge:

```
[ Android App inside Emulator ]
             │
      http://127.0.0.1:8000  OR  http://10.0.2.2:8000
             │
      ┌──────▼──────┐
      │ ADB Tunnel  │ (Bypasses Windows Firewall completely)
      └──────┬──────┘
             │
             ▼
[ Django Server on PC (Port 8000) ]
```

To enable this automatically whenever you start development:

```powershell
# PowerShell script to start server & reverse port
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:8000 tcp:8000
cd c:\Users\anshu\OneDrive\Desktop\Projects\CampusXChange\server
python manage.py runserver 0.0.0.0:8000
```

To verify active reverse tunnels:
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse --list
# Output: (reverse) tcp:8000 tcp:8000
```

---

## 4. Django Server Configuration

In `server/server/settings.py`, ensure `ALLOWED_HOSTS` accepts `10.0.2.2` and wildcard in development:

```python
# server/server/settings.py
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = [h.strip() for h in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,10.0.2.2').split(',') if h.strip()]
if DEBUG and '*' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('*')
```

And in `server/.env`:
```env
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,10.0.2.2,*
```

---

## 5. Android App Requirements

### 5.1 Android Manifest (`AndroidManifest.xml`)
Android 9.0+ (API level 28+) blocks non-HTTPS (`http://`) cleartext network traffic by default. You **must** enable cleartext traffic:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.CampusXChange.app">

    <!-- 1. Internet Permission -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.CampusXChange"
        <!-- 2. REQUIRED: Enable HTTP Cleartext Traffic for local dev -->
        android:usesCleartextTraffic="true">

        <activity android:name=".MainActivity" ... />
    </application>
</manifest>
```

---

### 5.2 Retrofit BASE_URL Configuration

```kotlin
// In your NetworkModule.kt or Retrofit builder:

object NetworkConstants {
    // Option A: Standard Emulator Alias
    const val BASE_URL_EMULATOR = "http://10.0.2.2:8000/"

    // Option B: With 'adb reverse tcp:8000 tcp:8000'
    const val BASE_URL_ADB_REVERSE = "http://127.0.0.1:8000/"

    // Active Base URL
    const val BASE_URL = BASE_URL_EMULATOR
}

@Provides
@Singleton
fun provideOkHttpClient(): OkHttpClient {
    return OkHttpClient.Builder()
        // Increase timeouts during local debugging
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .build()
}

@Provides
@Singleton
fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
    return Retrofit.Builder()
        .baseUrl(NetworkConstants.BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
}
```

---

## 6. Testing Connection Directly from Emulator

You can test whether the emulator can talk to your Django server without rebuilding the app:

### Test via ADB Shell:
Run this command from your PC terminal:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell "echo -e 'GET /api/marketplace/categories/ HTTP/1.1\r\nHost: 10.0.2.2:8000\r\n\r\n' | toybox nc -4 -w 2 -W 2 10.0.2.2 8000"
```

If it returns:
```http
HTTP/1.1 200 OK
Content-Type: application/json
[{"id":1,"name":"Books & Notes"...}]
```
👉 **The server connection is 100% working and ready!**

### Test via Google Chrome Inside Emulator:
1. Open **Chrome** inside your Android Emulator.
2. Navigate to:
   ```
   http://10.0.2.2:8000/api/marketplace/categories/
   ```
3. You will see the JSON response directly on the screen!

---

## 7. Physical Phone Testing (Over Campus/Hostel Wi-Fi)

If you connect a physical Android phone via Wi-Fi:
1. Find your PC's Wi-Fi IP address using `ipconfig`:
   - e.g., `10.36.102.32`
2. Connect your phone to the same Wi-Fi (`Hostel Wi-Fi 3`).
3. Set your Android app's `BASE_URL`:
   ```kotlin
   const val BASE_URL = "http://10.36.102.32:8000/"
   ```
4. **Better Alternative (via USB Cable):**  
   Plug your phone via USB with USB Debugging enabled, run `adb reverse tcp:8000 tcp:8000`, and keep `BASE_URL = "http://localhost:8000/"`. This works even if the hostel Wi-Fi isolates devices from each other!

---

## 8. Summary Checklist

- [x] Django is running with `0.0.0.0:8000` (NOT just `127.0.0.1:8000`).
- [x] `ALLOWED_HOSTS` has `10.0.2.2` and `*` in `server/server/settings.py`.
- [x] `adb reverse tcp:8000 tcp:8000` is active.
- [x] `AndroidManifest.xml` has `android:usesCleartextTraffic="true"`.
- [x] `BASE_URL` ends with a trailing slash: `http://10.0.2.2:8000/`.
