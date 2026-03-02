/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        accent: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 2px 15px -3px rgba(6, 78, 59, 0.08), 0 4px 6px -2px rgba(6, 78, 59, 0.04)',
        card: '0 1px 3px rgba(6, 78, 59, 0.06), 0 8px 24px rgba(6, 78, 59, 0.06)',
        elevated: '0 12px 40px -12px rgba(6, 78, 59, 0.15)',
      },
    },
  },
  plugins: [],
};

