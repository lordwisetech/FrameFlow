import { KokoroTTS } from 'kokoro-js';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
let tts = null;
let loading = false;

function toWav(audio, sampleRate) {
  const samples = audio instanceof Float32Array ? audio : new Float32Array(audio);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  write(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); write(8, 'WAVE');
  write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, 'data'); view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (const sample of samples) {
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

self.onmessage = async ({ data }) => {
  const { id, type } = data || {};
  try {
    if (type === 'load') {
      if (tts) { self.postMessage({ id, type: 'loaded', cached: true }); return; }
      if (loading) throw new Error('Kokoro is already loading. Please wait.');
      loading = true;
      self.postMessage({ id, type: 'progress', message: 'Preparing Kokoro engine…', progress: 0 });
      try {
        // q8 + WASM is the safer memory profile for mobile devices and 8 GB laptops.
        tts = await KokoroTTS.from_pretrained(MODEL_ID, {
          dtype: 'q8',
          device: 'wasm',
          progress_callback: (progress) => {
            const file = progress?.file || progress?.name || 'Kokoro model';
            const percent = Number.isFinite(progress?.progress) ? progress.progress : null;
            self.postMessage({ id, type: 'progress', message: percent === null ? `Downloading ${file}…` : `Downloading ${file} · ${Math.round(percent)}%`, progress: percent });
          },
        });
        self.postMessage({ id, type: 'loaded', cached: false, voices: tts.list_voices?.() || [] });
      } finally { loading = false; }
      return;
    }
    if (type === 'generate') {
      if (!tts) throw new Error('Load the Kokoro model before generating speech.');
      const text = String(data.text || '').trim();
      if (!text) throw new Error('This scene has no narration text.');
      self.postMessage({ id, type: 'progress', message: 'Generating speech…' });
      const result = await tts.generate(text, { voice: data.voice || 'af_heart', speed: Number(data.speed) || 1 });
      const samples = result.audio;
      const sampleRate = result.sampling_rate || 24000;
      if (!samples || !samples.length) throw new Error('Kokoro returned empty audio.');
      const wav = toWav(samples, sampleRate);
      self.postMessage({ id, type: 'audio', buffer: wav, sampleRate }, [wav]);
      return;
    }
  } catch (error) {
    self.postMessage({ id, type: 'error', message: error?.message || 'Kokoro operation failed.' });
  }
};
