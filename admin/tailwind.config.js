/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    borderRadius: {
      'none': '0px',
      'xs': '0.375rem',     // 6px
      'sm': '0.5rem',       // 8px (was 2px)
      DEFAULT: '0.625rem',  // 10px (was 4px)
      'md': '0.75rem',      // 12px (was 6px)
      'lg': '1rem',         // 16px (was 8px)
      'xl': '1.25rem',      // 20px (was 12px)
      '2xl': '1.5rem',      // 24px (was 16px)
      '3xl': '2rem',        // 32px (was 24px)
      'full': '9999px',
    },
    extend: {
      colors: {
        brand: {
          50: '#fff4ed',
          100: '#ffe5d3',
          200: '#ffc6a2',
          300: '#ffa16a',
          400: '#ff732c',
          500: '#fb5607',
          600: '#ea4300',
          700: '#c33002',
          800: '#9b2608',
          900: '#7d220b',
        },
        ink: {
          900: '#111111',
          800: '#222222',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        }
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
      }
    },
  },
  plugins: [],
}
