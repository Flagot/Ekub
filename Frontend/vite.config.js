import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// Tailwind is wired through PostCSS (see postcss.config.js),
// so we don't need the @tailwindcss/vite plugin here.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});

