# 🎓 LPUTrade Platform

![React](https://img.shields.io/badge/React-19.2-blue?logo=react)
![Django](https://img.shields.io/badge/Django-6.1-green?logo=django)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)

LPUTrade is an exclusive campus marketplace designed for university students to buy, sell, and rent items securely. The platform ensures that only verified students can access and trade, providing a safe and reliable environment right on campus.

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
