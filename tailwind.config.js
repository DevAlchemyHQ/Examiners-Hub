/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        slideDown: {
          from: { height: 0, opacity: 0 },
          to: { height: 'var(--radix-accordion-content-height)', opacity: 1 },
        },
      },
      animation: {
        slideDown: 'slideDown 300ms ease-out',
      },
    },
  },
  plugins: [],
};