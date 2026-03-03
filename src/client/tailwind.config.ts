import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' },
        peach: { 50: '#fef7ee', 100: '#fdebd3', 200: '#fad5a5', 300: '#f7b96e', 400: '#f49535', 500: '#f17a13' },
        lavender: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6' },
        mint: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e' },
        cream: '#fef7f0',
      },
      fontFamily: {
        display: ['DM Serif Display', 'serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        accent: ['Caveat', 'cursive'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'bloom': 'bloom 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        bloom: { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.05)' } },
      },
    },
  },
  plugins: [],
} satisfies Config;
