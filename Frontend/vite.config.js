import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

// Tailwind is wired through PostCSS (see postcss.config.js),
// so we don't need the @tailwindcss/vite plugin here.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiURL = (env.VITE_API_URL || '').trim().replace(/\/+$/, '');

  // If VITE_API_URL is empty, keep default local backend target.
  const proxyTarget = apiURL || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': proxyTarget,
      },
    },
  };
});

