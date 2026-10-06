# 🎨 CampXChange — Android Theme, Background & Design System Specification

> **Target Platform:** Android (Jetpack Compose / Material 3)  
> **Source Component:** `client/src/components/ThemeBackground.jsx` & `client/src/index.css`  
> **Last Updated:** September 2026

---

## 📑 Table of Contents
1. [Design Philosophy & Visual Language](#1-design-philosophy--visual-language)
2. [Color Palette & Theme Tokens (`Color.kt`)](#2-color-palette--theme-tokens)
3. [Typography Scale (`Type.kt`)](#3-typography-scale)
4. [Shapes & Glassmorphic Modifiers (`Shape.kt` & Extensions)](#4-shapes--glassmorphic-modifiers)
5. [Native Animated Background (`CampXChangeBackground.kt`)](#5-native-animated-background)
6. [Material 3 Theme Setup (`Theme.kt`)](#6-material-3-theme-setup)
7. [Component Design Standards (Cards, Badges, Trust Chips)](#7-component-design-standards)

---

## 1. Design Philosophy & Visual Language

CampXChange uses a vibrant, student-centric marketplace aesthetic:
- **Brand Identity:** High-energy Warm Amber/Orange (`#FB5607` / `#F97316`) representing campus hustle, creativity, and student commerce.
- **Surface Elevation:** Clean white and light-slate surfaces with soft ambient drop-shadows and frosted glassmorphism (`blur(16dp)` + `rgba(255,255,255,0.85)`).
- **Geometric Ambient Background:** Subtle floating geometric cubes, rotated accent squares, and pulsing dots kept strictly in the outer side gutters (margins), keeping the center content clean and readable.
- **GPU-Accelerated Zero Battery Drain:** Animations run via Compose `rememberInfiniteTransition()` without triggering recomposition of content layouts.

---

## 2. Color Palette & Theme Tokens (`Color.kt`)

```kotlin
package com.campxchange.app.ui.theme

import androidx.compose.ui.graphics.Color

// ========================================================================
// Primary Brand Colors (Campus Orange Spectrum)
// ========================================================================
val BrandPrimary = Color(0xFFFB5607)      // Vibrant Campus Orange
val BrandHover = Color(0xFFEA580C)        // Brand 600
val BrandLight = Color(0xFFFFF7ED)        // Brand 50 - Subtle accent tint
val BrandBorder = Color(0xFFFED7AA)       // Brand 200 - Card accent borders
val BrandAccent = Color(0xFFF97316)       // Brand 500

// ========================================================================
// Neutral Background & Surface Tokens (Light Mode)
// ========================================================================
val BackgroundLight = Color(0xFFF9FAFB)    // Gray 50 - App canvas
val SurfaceLight = Color(0xFFFFFFFF)       // Pure White - Cards & sheets
val SurfaceVariantLight = Color(0xFFF3F4F6)// Gray 100 - Inputs & chips
val BorderSubtleLight = Color(0xFFE5E7EB)  // Gray 200 - Borders

// Text Colors (Light)
val TextPrimaryLight = Color(0xFF111827)   // Gray 900 - Headings & titles
val TextSecondaryLight = Color(0xFF4B5563) // Gray 600 - Body text
val TextMutedLight = Color(0xFF9CA3AF)     // Gray 400 - Captions & timestamps

// ========================================================================
// Dark Mode Palette
// ========================================================================
val BackgroundDark = Color(0xFF0F172A)     // Slate 900 - Deep campus dark
val SurfaceDark = Color(0xFF1E293B)        // Slate 800 - Elevated card dark
val SurfaceVariantDark = Color(0xFF334155) // Slate 700 - Inputs
val BorderSubtleDark = Color(0xFF334155)   // Slate 700

// Text Colors (Dark)
val TextPrimaryDark = Color(0xFFF8FAFC)    // Slate 50
val TextSecondaryDark = Color(0xFF94A3B8)  // Slate 400
val TextMutedDark = Color(0xFF64748B)      // Slate 500

// ========================================================================
// Semantic Feedback Colors
// ========================================================================
val SuccessGreen = Color(0xFF10B981)       // Verified Badge / Deal Completed
val SuccessBg = Color(0xFFECFDF5)
val WarningAmber = Color(0xFFF59E0B)       // Pending / Caution
val WarningBg = Color(0xFFFFFBEB)
val ErrorRed = Color(0xFFEF4444)           // Rejections / Urgent Alerts
val ErrorBg = Color(0xFFFEF2F2)
val InfoBlue = Color(0xFF3B82F6)           // Campus Broadcasts
val InfoBg = Color(0xFFEFF6FF)
```

---

## 3. Typography Scale (`Type.kt`)

Using Google's **Plus Jakarta Sans** or **Inter** font family for a modern tech feel:

```kotlin
package com.campxchange.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val CampusTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Black,
        fontSize = 28.sp,
        lineHeight = 34.sp,
        letterSpacing = (-0.5).sp
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 22.sp,
        lineHeight = 28.sp,
        letterSpacing = (-0.3).sp
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 18.sp,
        lineHeight = 24.sp
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 15.sp,
        lineHeight = 20.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 13.sp,
        lineHeight = 18.sp
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 10.sp,
        lineHeight = 14.sp,
        letterSpacing = 0.5.sp
    )
)
```

---

## 4. Shapes & Glassmorphic Modifiers

```kotlin
package com.campxchange.app.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

val CardCornerRadius = 12.dp
val ButtonCornerRadius = 8.dp
val ChipCornerRadius = 20.dp

/**
 * Reusable Glassmorphism Surface Modifier
 * Mirrors the Web Client's backdrop-blur & translucent white borders.
 */
fun Modifier.glassmorphic(
    backgroundColor: Color = Color.White.copy(alpha = 0.82f),
    borderColor: Color = Color.White.copy(alpha = 0.60f),
    cornerRadius: Dp = CardCornerRadius,
    blurRadius: Dp = 16.dp
): Modifier = this
    .clip(RoundedCornerShape(cornerRadius))
    .background(backgroundColor)
    .border(
        width = 1.dp,
        brush = Brush.linearGradient(
            listOf(borderColor, borderColor.copy(alpha = 0.2f))
        ),
        shape = RoundedCornerShape(cornerRadius)
    )
```

---

## 5. Native Animated Background (`CampXChangeBackground.kt`)

This Jetpack Compose component renders the exact ambient floating geometric cubes, squares, and dots from `ThemeBackground.jsx` using `Canvas` and `rememberInfiniteTransition()`:

```kotlin
package com.campxchange.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.dp
import com.campxchange.app.ui.theme.*

@Composable
fun CampXChangeBackground(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    val isDark = isSystemInDarkTheme()

    // 1. Smooth Infinite Floating Transitions
    val infiniteTransition = rememberInfiniteTransition(label = "GeoBackgroundAnimation")

    val floatOffset1 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 18f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 5000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "FloatSlow"
    )

    val floatOffset2 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -14f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 4200, easing = LinearOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "FloatReverse"
    )

    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.85f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "DotPulse"
    )

    // Base background colors
    val bgColor = if (isDark) BackgroundDark else BackgroundLight
    val primaryGradientTint = if (isDark) Color(0xFFFB5607).copy(alpha = 0.08f) else Color(0xFFFB5607).copy(alpha = 0.04f)

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(bgColor)
    ) {
        // 2. Ambient Radial Background Glows
        Canvas(modifier = Modifier.fillMaxSize()) {
            val width = size.width
            val height = size.height

            // Top-Left Radial Glow
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(primaryGradientTint, Color.Transparent),
                    center = Offset(width * 0.05f, height * 0.12f),
                    radius = width * 0.45f
                )
            )

            // Bottom-Right Radial Glow
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(primaryGradientTint, Color.Transparent),
                    center = Offset(width * 0.95f, height * 0.88f),
                    radius = width * 0.45f
                )
            )

            // ==============================================================
            // LEFT GUTTER (Floating Cubes & Squares in outer 5-10% margin)
            // ==============================================================
            val leftGutterX = width * 0.03f

            // Top Solid Orange Rounded Cube
            rotate(degrees = 12f + floatOffset1 * 0.5f, pivot = Offset(leftGutterX + 24f, height * 0.08f + floatOffset1)) {
                drawRoundRect(
                    color = BrandAccent.copy(alpha = if (isDark) 0.35f else 0.70f),
                    topLeft = Offset(leftGutterX, height * 0.08f + floatOffset1),
                    size = Size(40f, 40f),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(8f, 8f)
                )
            }

            // Upper-Mid Hollow Accent Square
            rotate(degrees = 45f + floatOffset2 * 0.4f, pivot = Offset(leftGutterX + 30f, height * 0.35f + floatOffset2)) {
                drawRoundRect(
                    color = BrandBorder.copy(alpha = 0.50f),
                    topLeft = Offset(leftGutterX + 10f, height * 0.35f + floatOffset2),
                    size = Size(36f, 36f),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(6f, 6f),
                    style = Stroke(width = 3f)
                )
            }

            // Pulsing Accent Dot
            drawCircle(
                color = BrandPrimary.copy(alpha = 0.65f),
                radius = 7f * pulseScale,
                center = Offset(leftGutterX + 15f, height * 0.55f + floatOffset1 * 0.3f)
            )

            // Bottom Large Solid Orange Cube
            rotate(degrees = -12f + floatOffset2 * 0.3f, pivot = Offset(leftGutterX + 25f, height * 0.82f + floatOffset2)) {
                drawRoundRect(
                    color = BrandHover.copy(alpha = if (isDark) 0.30f else 0.65f),
                    topLeft = Offset(leftGutterX - 5f, height * 0.82f + floatOffset2),
                    size = Size(48f, 48f),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(10f, 10f)
                )
            }

            // ==============================================================
            // RIGHT GUTTER (Floating Cubes & Squares in outer 5-10% margin)
            // ==============================================================
            val rightGutterX = width * 0.93f

            // Top Right Solid Drift Cube
            rotate(degrees = 45f + floatOffset2 * 0.5f, pivot = Offset(rightGutterX, height * 0.14f + floatOffset2)) {
                drawRoundRect(
                    color = BrandAccent.copy(alpha = if (isDark) 0.30f else 0.65f),
                    topLeft = Offset(rightGutterX - 20f, height * 0.14f + floatOffset2),
                    size = Size(42f, 42f),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(8f, 8f)
                )
            }

            // Center Right Pulsing Dot
            drawCircle(
                color = BrandAccent.copy(alpha = 0.70f),
                radius = 8f * pulseScale,
                center = Offset(rightGutterX - 10f, height * 0.48f + floatOffset1 * 0.4f)
            )

            // Lower Right Hollow Outline Square
            rotate(degrees = -18f + floatOffset1 * 0.4f, pivot = Offset(rightGutterX, height * 0.72f + floatOffset1)) {
                drawRoundRect(
                    color = BrandBorder.copy(alpha = 0.45f),
                    topLeft = Offset(rightGutterX - 25f, height * 0.72f + floatOffset1),
                    size = Size(38f, 38f),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(6f, 6f),
                    style = Stroke(width = 3.5f)
                )
            }
        }

        // 3. Render Foreground Content Above Background
        content()
    }
}
```

---

## 6. Material 3 Theme Setup (`Theme.kt`)

```kotlin
package com.campxchange.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = BrandPrimary,
    onPrimary = Color.White,
    primaryContainer = BrandLight,
    onPrimaryContainer = BrandHover,
    secondary = TextSecondaryLight,
    background = BackgroundLight,
    surface = SurfaceLight,
    surfaceVariant = SurfaceVariantLight,
    outline = BorderSubtleLight
)

private val DarkColorScheme = darkColorScheme(
    primary = BrandAccent,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF431407),
    onPrimaryContainer = Color(0xFFFFEDD5),
    secondary = TextSecondaryDark,
    background = BackgroundDark,
    surface = SurfaceDark,
    surfaceVariant = SurfaceVariantDark,
    outline = BorderSubtleDark
)

@Composable
fun CampXChangeTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = CampusTypography,
        content = content
    )
}
```

---

## 7. Component Design Standards

### 7.1 Trust Score Radial Badge
- **0–24 (New Trader):** Gray badge (`#94A3B8`), Gray text.
- **25–49 (Rising Peer):** Amber badge (`#F59E0B`), Amber outline.
- **50–74 (Verified Student):** Emerald badge (`#10B981`), Green outline.
- **75–100 (Campus Legend / Top Seller):** Purple/Indigo gradient with shimmer.

### 7.2 Price Tags & Transaction Chips
- **Sell Item:** `₹` prefix, bold black text (`TextPrimaryLight`), orange accent tag if negotiable.
- **Free Donation:** Green badge `₹0 Free Campus Goodwill`.
