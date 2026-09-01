# LPUTrade Platform - Design System & UI Guidelines

This document outlines the core design tokens and UI components used in the LPUTrade platform. Always reference this guide when creating new components to ensure consistency across the Client and Admin portals.

> [!IMPORTANT]
> The platform uses a modern, light-themed geometric aesthetic with orange accents and soft glassmorphism. Avoid using generic flat colors or sharp square corners.

## 1. Color Palette

The primary brand color is a vibrant orange. We use Tailwind CSS utility classes configured in `tailwind.config.js` to apply these colors.

| Token Name | Tailwind Class | Usage |
| :--- | :--- | :--- |
| **Brand 500 (Primary)** | `bg-brand-500` / `text-brand-500` | Primary buttons, main call-to-actions, active states. |
| **Brand 600 (Hover)** | `bg-brand-600` / `text-brand-600` | Button hover states, emphasized elements. |
| **Brand 400 (Light)** | `bg-brand-400` / `text-brand-400` | Decorative background elements, secondary accents. |
| **Background (Light)**| `bg-gray-50` | Main application background color. |
| **Surface (Card)** | `bg-white` | Cards, modals, dropdowns. |
| **Text (Primary)** | `text-gray-900` | Main headings and primary body text. |
| **Text (Secondary)** | `text-gray-500` / `text-gray-600` | Subtitles, placeholders, and meta information. |

## 2. Typography

We rely on modern, clean sans-serif typography (system defaults like Inter or Roboto).

- **Headings (H1/H2)**: Font weight `font-bold` or `font-extrabold`, tracking `tracking-tight`, color `text-gray-900`.
- **Subheadings**: Font weight `font-medium`, color `text-gray-500`.
- **Body Text**: Font weight `font-normal`, color `text-gray-600`.
- **Labels/Buttons**: Font weight `font-medium` or `font-semibold`, uppercase `uppercase` for small badges (`text-xs`).

## 3. Shapes & Border Radius

To achieve a uniform, structured, and modern look, we use consistent rounding on all elements.

| Element | Tailwind Class | Example |
| :--- | :--- | :--- |
| **Main Cards/Modals** | `rounded-md` | Login container, product display cards. |
| **Buttons** | `rounded-md` | Primary and secondary buttons. |
| **Inputs/Fields** | `rounded-md` | Text inputs, dropdowns, search bars. |
| **Badges/Tags** | `rounded-full` | Status indicators, small labels. |

## 4. Shadows & Depth (Glassmorphism)

The UI relies heavily on depth and floating elements. Avoid flat borders where a soft shadow would work better.

- **Primary Cards**: `shadow-xl` or custom soft shadow `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`.
- **Floating Elements**: `shadow-2xl` for high elevation (modals).
- **Glassmorphism**: When placing panels over the geometric background, use this pattern:
  ```jsx
  <div className="bg-white/80 backdrop-blur-md border border-white/20 shadow-xl rounded-md">
     {/* Content */}
  </div>
  ```

## 5. UI Components Guidelines

### Primary Button
Solid orange background, white text, subtle hover effect.
```jsx
<button className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg">
  Submit
</button>
```

### Secondary Button
White background, light border, gray text.
```jsx
<button className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-3 px-4 rounded-md transition-all">
  Cancel
</button>
```

### Text Input
Light gray background or white with a soft border, focuses to brand color.
```jsx
<input className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none" />
```

## 6. Icons
We use **Lucide React** (`lucide-react`) for all icons across the platform. 
- **Stroke width**: `strokeWidth={2}` (default) or `strokeWidth={1.5}` for larger decorative icons.
- **Size**: `w-5 h-5` (Tailwind) or `size={20}` (Lucide prop) for standard inline icons.

## 7. Global Theme Layout (`ThemeBackground.jsx`)
The `ThemeBackground` component is placed at the root level of the application (`App.jsx` in Client and `AdminLayout.jsx` in Admin). It provides the organic, full-screen scattered geometric shapes.

> [!WARNING]
> Do not add solid opaque backgrounds (like `bg-white` or `bg-gray-100`) to main wrapper `div`s that sit on top of the layout, as it will hide the background theme. Use `bg-transparent` or glassmorphism (`bg-white/80 backdrop-blur-md`) for wrappers.

## 7. Notifications
All user notifications (success, errors, warnings) should use react-hot-toast. Avoid using native alert() or inline error states where a toast is sufficient. The <Toaster /> component is globally configured in App.jsx.
