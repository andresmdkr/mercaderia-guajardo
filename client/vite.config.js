import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En desarrollo el front llama a /api y Vite lo reenvía al backend.
    proxy: { '/api': 'http://localhost:3001' },
  },
});
