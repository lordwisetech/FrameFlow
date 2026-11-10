let worker;
let sequence = 0;
const pending = new Map();

function getWorker() {
  if (typeof Worker === 'undefined') throw new Error('This browser does not support background workers required by Kokoro.');
  if (!worker) {
    worker = new Worker(new URL('../workers/kokoro.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const task = pending.get(data.id);
      if (!task) return;
      if (data.type === 'progress') { task.onProgress?.(data); return; }
      pending.delete(data.id);
      if (data.type === 'error') task.reject(new Error(data.message));
      else task.resolve(data);
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || 'Kokoro worker failed to start.');
      pending.forEach((task) => task.reject(error));
      pending.clear();
      worker?.terminate(); worker = null;
    };
  }
  return worker;
}

function request(type, payload = {}, onProgress) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    try { getWorker().postMessage({ id, type, ...payload }); }
    catch (error) { pending.delete(id); reject(error); }
  });
}

export async function loadKokoro(onProgress) {
  const result = await request('load', {}, onProgress);
  return result.voices || [];
}

export async function generateKokoroAudio({ text, voice = 'af_heart', speed = 1, onProgress }) {
  const result = await request('generate', { text, voice, speed }, onProgress);
  return new Blob([result.buffer], { type: 'audio/wav' });
}
