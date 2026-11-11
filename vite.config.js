import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Keep the existing FFmpeg worker handling.
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@huggingface/transformers', 'onnxruntime-web', 'phonon-tts'] },
  // phonon-tts's worker.js is an ES module with imports. Vite's default
  // worker format ('iife') is invalid for code-splitting builds, so emit
  // it as an ES module instead. The browser resolves the worker URL at
  // runtime via `new URL('./worker.js', import.meta.url)`.
  worker: { format: 'es' },
  // Allow the existing QR-code workflow to reach Vite from a phone on the same Wi-Fi.
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true },
});