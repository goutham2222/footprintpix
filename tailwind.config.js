/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#fbf9f5',
          100: '#f5f1ea',
          200: '#ebe1d3',
          300: '#decbb6',
          400: '#cdb094',
          500: '#ba9575',
          600: '#a37c5e',
          700: '#83614a',
          800: '#694e3e',
          900: '#564134',
        },
        terracotta: {
          500: '#e06d53',
          600: '#c8563d',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Playfair Display', 'serif'],
      }
    },
  },
  plugins: [],
}

