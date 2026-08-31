/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
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
      }
    },
  },
  plugins: [],
}
