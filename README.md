# 🎓 CampusXChange Platform

![React](https://img.shields.io/badge/React-19.2-blue?logo=react)
![Django](https://img.shields.io/badge/Django-6.1-green?logo=django)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)

CampusXChange is an exclusive campus marketplace designed for university students to buy, sell, and rent items securely. The platform ensures that only verified students can access and trade, providing a safe and reliable environment right on campus.

## 🌟 Key Features

- **🎓 100% Student Verified**: Only users with a valid university email domain can join, ensuring a closed and safe community.
- **🛒 Dynamic Marketplace**: Easily browse fresh recommendations, search for specific items, and filter by categories like Textbooks, Electronics, and more.
- **🤝 Direct Offers & Negotiation**: Buyers can make direct offers to sellers and negotiate the best deals without leaving the platform.
- **📍 Campus Meetups**: Integrated location tags for convenient exchanges at safe, designated campus spots.
- **🛡️ Secure & Fast**: Built on a robust Django REST Framework backend with a lightning-fast React frontend.

## 🏗️ Architecture & Tech Stack

This repository is organized into three main components:

- **`client/`**: The primary user-facing web application. Built with React, Vite, and Tailwind CSS.
- **`admin/`**: A separate React + Vite frontend dedicated for platform administrators to manage users and listings.
- **`server/`**: The backend API powering the platform. Built with Python, Django, Django REST Framework, and uses SimpleJWT for authentication.

### 📱 Android Native App Documentation Suite
- [ANDROID_SERVER_CONNECTION_GUIDE.md](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/ANDROID_SERVER_CONNECTION_GUIDE.md): 🔌 **Fix Server Connection Timeout** (`10.0.2.2:8000`), ADB Reverse Tunneling, Windows Firewall fixes, and Emulator networking.
- [ANDROID_LOGIN_REGISTRATION.md](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/ANDROID_LOGIN_REGISTRATION.md): Student registration, OTP verification, login, JWT token lifecycle, Material 3 theme & Jetpack Compose UI.
- [ANDROID_PROFILE_SPECIFICATION.md](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/ANDROID_PROFILE_SPECIFICATION.md): Profile view & edit, student ID card verification, trust score calculation, saved wishlist items, and logout.
- [ANDROID_MARKETPLACE_SPECIFICATION.md](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/ANDROID_MARKETPLACE_SPECIFICATION.md): Marketplace feed, category chips, debounced search, transaction & condition filters, 2-column product grid.
- [ANDROID_PRODUCT_DETAIL_SPECIFICATION.md](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/ANDROID_PRODUCT_DETAIL_SPECIFICATION.md): Image carousel with zoom, seller trust badge, campus location tags, direct call/WhatsApp/chat intents, make offer bottom sheet, report listing.
- [ANDROID_LISTING_MANAGEMENT_SPECIFICATION.md](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/ANDROID_LISTING_MANAGEMENT_SPECIFICATION.md): Create/edit listing wizard, on-device image compression, Cloudinary upload, My Listings management (Active, Sold, Hidden tabs).
- [ANDROID_OFFERS_HANDOVER_SPECIFICATION.md](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/ANDROID_OFFERS_HANDOVER_SPECIFICATION.md): Purchase offers, 5-minute handover QR generation, 6-digit backup PIN, CameraX + ML Kit scanner, atomic completion & +3 trust score boost.
- [ANDROID_NOTIFICATIONS_SPECIFICATION.md](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/ANDROID_NOTIFICATIONS_SPECIFICATION.md): Firebase Cloud Messaging (FCM) push alerts, notification channels, in-app notification center, deep linking.
- [ANDROID_CHAT_MESSAGING_SPECIFICATION.md](file:///c:/Users/anshu/OneDrive/Desktop/Projects/LPUTrade/ANDROID_CHAT_MESSAGING_SPECIFICATION.md): Real-time WebSockets (OkHttp / Scarlet + Django Channels), product-context header, typing indicators, Room DB offline cache.

## 🚀 Getting Started

Follow these instructions to get a local copy up and running.

### 1. Backend (Server) Setup

1. **Navigate to the root directory.**
2. **Activate the virtual environment**:
   ```powershell
   .\venv\Scripts\activate
   ```
3. **Change to the server directory**:
   ```powershell
   cd server
   ```
4. **Run database migrations**:
   ```powershell
   python manage.py migrate
   ```
5. **Start the development server**:
   ```powershell
   python manage.py runserver
   ```
   *The API will be available at `http://localhost:8000/`.*

### 2. Frontend (Client) Setup

1. **Open a new terminal** and navigate to the client directory:
   ```powershell
   cd client
   ```
2. **Install dependencies**:
   ```powershell
   npm install
   ```
3. **Start the development server**:
   ```powershell
   npm run dev
   ```
   *The client application will run on `http://localhost:5173/`.*

### 3. Admin Dashboard Setup

1. **Open a new terminal** and navigate to the admin directory:
   ```powershell
   cd admin
   ```
2. **Install dependencies**:
   ```powershell
   npm install
   ```
3. **Start the development server**:
   ```powershell
   npm run dev -- --port 5174
   ```
   *The admin dashboard will run on `http://localhost:5174/`.*
