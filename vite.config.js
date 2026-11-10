import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Keep the existing FFmpeg worker handling.
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@huggingface/transformers', 'onnxruntime-web'] },
  // Allow the existing QR-code workflow to reach Vite from a phone on the same Wi-Fi.
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true },
});
