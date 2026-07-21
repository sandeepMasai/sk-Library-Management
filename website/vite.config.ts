import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Dev server only: proxy /api to local backend. Do not use VITE_API_URL here —
  // that value is for production builds (apiConfig.ts).
  const apiTarget =
    env.VITE_DEV_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:1998';

  const proxySecure = apiTarget.startsWith('https://');
  const apiProxy = {
    '/api': {
      target: apiTarget,
      changeOrigin: true,
      secure: proxySecure,
    },
  };

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
      proxy: apiProxy,
    },
    preview: {
      host: true,
      port: Number(process.env.PORT) || 3000,
      proxy: apiProxy,
    },
  };
});
