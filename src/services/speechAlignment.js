let worker;
let sequence = 0;
const pending = new Map();

function getWorker() {
  if (typeof Worker === 'undefined') throw new Error('This browser does not support the offline caption alignment worker.');
  if (!worker) {
    worker = new Worker(new URL('../workers/alignment.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const task = pending.get(data.id);
      if (!task) return;
      if (data.type === 'progress') { task.onProgress?.(data); return; }
      pending.delete(data.id);
      if (data.type === 'error') task.reject(new Error(data.message));
      else task.resolve(data);
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || 'Offline alignment worker failed.');
      pending.forEach((task) => task.reject(error));
      pending.clear();
      worker?.terminate(); worker = null;
    };
  }
  return worker;
}

function request(type, payload = {}, onProgress, transfer = []) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    try { getWorker().postMessage({ id, type, ...payload }, transfer); }
    catch (error) { pending.delete(id); reject(error); }
  });
}

export async function loadSpeechAligner(onProgress) {
  await request('load', {}, onProgress);
  return true;
}

/** Clear the cached Whisper model from the browser cache. Safe to call when the
 *  worker is not actively aligning. The model will be re-downloaded on next use. */
export async function clearSpeechAlignerCache() {
  try {
    // Clear the transformers browser cache for the Whisper model.
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key.includes('transformers') || key.includes('whisper') || key.includes('onnx')) {
          await caches.delete(key);
        }
      }
    }
    // Also clear the IndexedDB cache used by @huggingface/transformers.
    if (typeof indexedDB !== 'undefined') {
      try {
        const dbs = ['transformers-cache', 'huggingface-transformers', 'onnxruntime-cache'];
        for (const name of dbs) {
          try { indexedDB.deleteDatabase(name); } catch {}
        }
      } catch {}
    }
  } catch (error) {
    console.warn('Whisper cache clear partially failed:', error);
  }
}

/** Dispose the alignment worker and free its memory. */
export function disposeSpeechAligner() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

function resampleTo16k(buffer) {
  const sourceRate = buffer.sampleRate;
  const length = Math.max(1, Math.ceil(buffer.duration * 16000));
  const mono = new Float32Array(length);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  const ratio = sourceRate / 16000;
  for (let i = 0; i < length; i++) {
    const sourceIndex = i * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(left + 1, buffer.length - 1);
    const mix = sourceIndex - left;
    let sample = 0;
    for (const channel of channels) sample += channel[left] * (1 - mix) + channel[right] * mix;
    mono[i] = sample / channels.length;
  }
  return mono;
}

export async function alignSpeechBlob(blob, sourceText, onProgress) {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Audio decoding is not supported in this browser.');
  const context = new AudioContextClass();
  let decoded;
  try { decoded = await context.decodeAudioData(await blob.arrayBuffer()); }
  finally { await context.close(); }
  const samples = resampleTo16k(decoded);
  const result = await request('align', { samples, sourceText, duration: decoded.duration }, onProgress, [samples.buffer]);
  return result.words;
}
