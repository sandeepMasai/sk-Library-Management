import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget =
    env.VITE_API_URL?.replace(/\/$/, '') ||
    (mode === 'development'
      ? 'http://127.0.0.1:1998'
      : 'https://sk-library-management-production.up.railway.app');

  const proxySecure = apiTarget.startsWith('https://');

  return {
    plugins: [react(), tailwindcss()],
    build: {
      sourcemap: false,
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
    server: {
      host: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: proxySecure,
        },
      },
    },
  };
});
