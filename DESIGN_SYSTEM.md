# LPUTrade Design System & Theme Guide

This document serves as the single source of truth for the project's design system. Refer to this guide whenever you are building new components or pages to maintain a consistent aesthetic and user experience across both the `client` and `admin` applications.

---

## 🎨 Colors (Tailwind Config)

We use a custom, warm, and highly-contrasting color palette to evoke a premium and approachable feel.

### Brand (Primary Actions & Highlights)
A vibrant orange scale used for primary buttons, active states, and highlights.
- **`brand-50`**: `#fff4ed` (Subtle backgrounds)
- **`brand-100`**: `#ffe5d3`
- **`brand-500`**: `#fb5607` (Main brand color / Primary buttons)
- **`brand-600`**: `#ea4300` (Hover state for primary buttons)
- **`brand-900`**: `#7d220b` (Deep contrast text)

### Cream (Backgrounds & Surfaces)
Warm off-whites instead of stark whites for a softer, more modern canvas.
- **`cream-50`**: `#fcfbf8` (Main app background)
- **`cream-100`**: `#f6f3eb`
- **`cream-200`**: `#eee8d9` (Borders or secondary surfaces)

### Ink (Typography & Dark Elements)
Rich, dark grays instead of pure black for better readability.
- **`ink-800`**: `#222222` (Secondary text, slightly softer)
- **`ink-900`**: `#111111` (Primary headings, high-contrast text)

---

## 🔤 Typography

We utilize Google Fonts for a modern and clean typographical hierarchy. Ensure you use the proper classes provided in the `tailwind.config.js`.

- **Primary Font (Body/UI Text):** `Inter`
  - **Class:** `.font-sans` (Default for body)
  - **Usage:** Paragraphs, form inputs, buttons, and general UI text.

- **Display Font (Headings/Titles):** `Outfit`
  - **Class:** `.font-display`
  - **Usage:** Big headings (`h1`, `h2`, `h3`), hero sections, and marketing text.

---

## 🖼️ Icons

We use **Google Material Icons** exclusively for all iconography.

- **Usage:** Use a `<span>` tag with the corresponding classes.
- **Variant:** We predominantly use the `Outlined` variant for a sleek, modern look.
- **Example Code:**
  ```jsx
  <span className="material-icons-outlined text-gray-500 text-2xl">
    home
  </span>
  ```
- **Reference List:** [Google Fonts Icon Library](https://fonts.google.com/icons)

---

## 🧱 UI Components & Patterns

### 1. Glassmorphism Surfaces
We use a frosted-glass effect for cards, modals, and floating navigation bars. These utility classes are defined in `index.css`.
- **`.glass`**: Light frosted glass (White-based, used on `cream` backgrounds).
- **`.glass-dark`**: Dark frosted glass (Dark-gray based, used for dark mode or contrasting dark sections).

**Example:**
```jsx
<div className="glass p-6 rounded-xl shadow-lg">
  <h3 className="font-display text-xl text-ink-900">Card Title</h3>
  <p className="text-gray-600">This is a glassmorphic card.</p>
</div>
```

### 2. Primary Buttons
Always use a combination of bold typography and clear contrast for main actions.

**Example:**
```jsx
<button className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-6 rounded-md shadow-sm transition-colors uppercase tracking-wider">
  Submit
</button>
```

### 3. Form Inputs
Inputs should have clear borders that highlight with the brand color when focused.

**Example:**
```jsx
<input
  type="text"
  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
  placeholder="Enter your name"
/>
```

---

## 📝 Best Practices for Future Development

1. **Never use inline styles:** Always stick to the Tailwind classes predefined in this system.
2. **Don't hardcode colors:** Always use `text-brand-500` instead of `#fb5607`.
3. **Use micro-animations:** Implement smooth transitions on hover (`transition-colors`, `transition-all`, `hover:scale-105`) to make the interface feel alive.
4. **Spacing:** Stick to the Tailwind default spacing scale (`p-4`, `m-2`, `gap-6`). Do not use arbitrary values unless strictly necessary.
