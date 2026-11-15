import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the browser talks only to Vite (port 5173); Vite forwards
// API calls and uploaded-image requests to Express, so no CORS setup or
// hard-coded backend URL is needed in the React code.
const API = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API, changeOrigin: true },
      '/uploads': { target: API, changeOrigin: true },
    },
  },
});
