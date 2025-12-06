// tailwind.config.js
import { defineConfig } from 'tailwindcss'

export default defineConfig({
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        marquee: 'marquee 15s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [],
})

/* tailwind.config.js -> extend theme */
extend: {
  animation: {
    'fade-in-up': 'fadeInUp 0.6s ease-out',
  },
  keyframes: {
    fadeInUp: {
      '0%': {
        opacity: '0',
        transform: 'translateY(20px)',
      },
      '100%': {
        opacity: '1',
        transform: 'translateY(0)',
      },
    },
  },
}
