import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const csp = [
  "default-src 'self'",
  "script-src 'self' 'sha256-vvt4KWwuNr51XfE5m+hzeNEGhiOfZzG97ccfqGsPwvE='",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self' ws:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

export default defineConfig({
  plugins: [vue()],
  appType: 'spa',
  server: {
    strictPort: true,
    port: 5173,
    headers: { 'Content-Security-Policy': csp }
  },
  preview: {
    strictPort: true,
    port: 4173,
    headers: { 'Content-Security-Policy': csp }
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: { app: 'index.html', legacy: 'index_mejoras.html' }
    }
  }
});
