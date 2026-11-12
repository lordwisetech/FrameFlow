import { PhononTTS, encodeWav, concatPcm, clearCache } from 'phonon-tts';

let instance = null;
let loadingPromise = null;
let loadProgress = '';

const VOICES = [
  { name: 'default', label: 'Default (Reuben)' },
  { name: 'Zoey', label: 'Zoey' },
  { name: 'Ruth', label: 'Ruth' },
  { name: 'June', label: 'June' },
  { name: 'Bella', label: 'Bella' },
  { name: 'Aria', label: 'Aria' },
  { name: 'Sara', label: 'Sara' },
  { name: 'Natalie', label: 'Natalie' },
  { name: 'Daisy', label: 'Daisy' },
  { name: 'Fiona', label: 'Fiona' },
  { name: 'Mason', label: 'Mason' },
  { name: 'Kai', label: 'Kai' },
  { name: 'Leo', label: 'Leo' },
  { name: 'Felix', label: 'Felix' },
];

export const phononVoices = VOICES;

export function getPhononLoadProgress() {
  return loadProgress;
}

export async function loadPhononModel({ onProgress, quant = 'q8' } = {}) {
  if (instance) return instance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    loadProgress = 'Downloading Phonon TTS model (first run downloads ~64 MB + voice). Keep this tab open.';
    try {
      instance = await PhononTTS.load({
        lang: 'en',
        quant,
        voices: ['default'],
        onProgress: (p) => {
          loadProgress = `${p.file}: ${p.loaded}/${p.total ?? '?'}${p.cached ? ' (cached)' : ''}`;
          onProgress?.(loadProgress);
        },
      });
      loadProgress = 'Phonon TTS model ready.';
      return instance;
    } catch (error) {
      instance = null;
      loadingPromise = null;
      loadProgress = '';
      throw error;
    }
  })();

  return loadingPromise;
}

export async function addPhononVoice(name, source) {
  const tts = await loadPhononModel();
  await tts.addVoice(name, source);
}

export async function phononSynth({ text, voice = 'default', speed = 1, signal } = {}) {
  const tts = await loadPhononModel();
  // Map speed 0.5..2.0 to duration_delta: 0.0 is normal, positive = slower
  const durationDelta = (1 - speed) * 0.5;
  const wavBlob = await tts.synthWav(text, {
    voice: voice || undefined,
    conditions: { duration_delta: durationDelta },
    signal,
  });
  return { blob: wavBlob, duration: wavBlob.size };
}

export async function phononSynthFloat({ text, voice = 'default', speed = 1, signal } = {}) {
  const tts = await loadPhononModel();
  const durationDelta = (1 - speed) * 0.5;
  const pcm = await tts.synth(text, {
    voice: voice || undefined,
    conditions: { duration_delta: durationDelta },
    signal,
  });
  return { pcm, duration: pcm.length / tts.sampleRate };
}

export async function phononPreview({ text, voice = 'default', speed = 1 }) {
  const { blob } = await phononSynth({ text, voice, speed });
  return blob;
}

export function phononIsLoaded() {
  return !!instance;
}

/** Returns approximate cache info for display in Settings. */
export async function phononCacheInfo() {
  let cacheSize = 0;
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key.includes('phonon') || key.includes('huggingface') || key.includes('hf')) {
          const cache = await caches.open(key);
          const entries = await cache.keys();
          for (const req of entries) {
            const resp = await cache.match(req);
            if (resp) {
              const cloned = resp.clone();
              const blob = await cloned.blob();
              cacheSize += blob.size;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Could not read Phonon cache size:', e);
  }
  return { cacheSize, loaded: !!instance };
}

export async function phononClearCache() {
  // Only clear if not actively generating.
  if (instance) {
    try { instance.dispose(); } catch (e) { console.warn('Phonon dispose during clear:', e); }
    instance = null;
  }
  loadingPromise = null;
  loadProgress = '';
  try {
    await clearCache();
  } catch (e) {
    console.warn('Phonon cache clear partially failed:', e);
  }
  // Also clear the browser Cache Storage entries for phonon/huggingface.
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key.includes('phonon') || key.includes('huggingface') || key.includes('hf-')) {
          await caches.delete(key);
        }
      }
    }
  } catch (e) {
    console.warn('Could not delete Phonon Cache Storage entries:', e);
  }
}

export function phononDispose() {
  if (instance) {
    instance.dispose();
    instance = null;
  }
  loadingPromise = null;
  loadProgress = '';
}

export { encodeWav, concatPcm, clearCache };