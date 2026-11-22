import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: { include: ['qrcode'] },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { sourcemap: false, target: 'esnext' },
  test: { include: ['tests/**/*.test.js'] },
});
