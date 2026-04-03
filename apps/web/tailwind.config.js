/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#059669', // Emerald 600
          light: '#34d399', // Emerald 400
          dark: '#047857', // Emerald 700
        },
        sidebar: {
          DEFAULT: '#ffffff',
        },
      },
      fontFamily: {
        handwriting: ['"Comic Sans MS"', '"Chalkboard SE"', 'sans-serif'], // Simple fallback for now
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Emerald to Tealish
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'soft': '0 10px 40px -10px rgba(0,0,0,0.05)',
        'glow': '0 0 20px rgba(16, 185, 129, 0.15)',
      }
    },
  },
  plugins: [],
}
