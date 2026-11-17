const CARTESIA_BASE = 'https://api.cartesia.ai';
export const CARTESIA_VERSION = '2026-08-14';
export const CARTESIA_MODEL = 'sonic-3.6';

async function cartesiaFetch(path, apiKey, options = {}) {
  if (!apiKey?.trim()) throw new Error('Add your Cartesia API key in Settings first.');
  const response = await fetch(`${CARTESIA_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Cartesia-Version': CARTESIA_VERSION,
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error?.message || data?.message || `Cartesia request failed (${response.status}).`);
  }
  return response;
}

export async function listCartesiaVoices(apiKey) {
  const voices = []; let cursor = '';
  // Load all available pages so the selector includes the full public and owned voice library.
  for (let page = 0; page < 20; page++) {
    const query = new URLSearchParams({ limit: '100' });
    if (cursor) query.set('starting_after', cursor);
    const response = await cartesiaFetch(`/voices?${query.toString()}`, apiKey);
    const data = await response.json();
    voices.push(...(Array.isArray(data.data) ? data.data : []));
    if (!data.has_more || !data.data?.length) break;
    cursor = data.data[data.data.length - 1].id;
  }
  return voices.filter((voice) => voice.status !== 'archived');
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pcmToWav(pcm, sampleRate = 24000) {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  write(0, 'RIFF'); view.setUint32(4, pcm.length + 36, true); write(8, 'WAVE');
  write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, pcm.length, true);
  return new Blob([header, pcm], { type: 'audio/wav' });
}

export async function generateCartesiaSpeech({ apiKey, text, voiceId, speed = 1, volume = 1, emotion = 'neutral', language = 'en', pronunciationDictId = '' }) {
  if (!String(text || '').trim()) throw new Error('This scene has no narration text.');
  if (!voiceId) throw new Error('Choose a Cartesia voice first.');
  const response = await cartesiaFetch('/tts/sse', apiKey, {
    method: 'POST',
    body: JSON.stringify({
      model_id: CARTESIA_MODEL,
      transcript: String(text),
      voice: voiceId,
      output_format: { container: 'raw', encoding: 'pcm_s16le', sample_rate: 24000 },
      language,
      add_timestamps: true,
      use_normalized_timestamps: true,
      ...(pronunciationDictId.trim() ? { pronunciation_dict_id: pronunciationDictId.trim() } : {}),
      generation_config: {
        speed: Math.max(0.6, Math.min(1.5, Number(speed) || 1)),
        volume: Math.max(0.5, Math.min(2, Number(volume) || 1)),
        ...(emotion && emotion !== 'neutral' ? { emotion } : {}),
      },
    }),
  });

  const eventStream = await response.text();
  const audioChunks = []; const words = [];
  for (const frame of eventStream.split(/\r?\n\r?\n/)) {
    const dataLine = frame.split(/\r?\n/).find((line) => line.startsWith('data:'));
    if (!dataLine) continue;
    let event;
    try { event = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }
    if (event.type === 'error') throw new Error(event.error?.message || event.message || 'Cartesia speech generation failed.');
    if (event.type === 'chunk' && event.data) audioChunks.push(base64ToBytes(event.data));
    if (event.type === 'timestamps' && event.word_timestamps) {
      const timing = event.word_timestamps;
      (timing.words || []).forEach((word, index) => {
        const start = Number(timing.start?.[index]); const end = Number(timing.end?.[index]);
        if (word && Number.isFinite(start) && Number.isFinite(end) && end > start) {
          words.push({ word: String(word), start, end, index: words.length });
        }
      });
    }
  }
  const byteLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (!byteLength) throw new Error('Cartesia returned no audio. Check your voice, model access, and API credits.');
  const pcm = new Uint8Array(byteLength); let offset = 0;
  for (const chunk of audioChunks) { pcm.set(chunk, offset); offset += chunk.length; }
  const duration = pcm.byteLength / (24000 * 2);
  return { blob: pcmToWav(pcm, 24000), words, duration };
}

export async function cloneCartesiaVoice({ apiKey, file, name, language = 'en', description = '' }) {
  if (!file) throw new Error('Choose an audio recording to clone.');
  if (file.size > 16 * 1024 * 1024) throw new Error('Voice recordings must be 16 MB or smaller.');
  const form = new FormData();
  form.append('clip', file, file.name || 'voice-recording.wav');
  form.append('name', name.trim());
  form.append('language', language);
  form.append('description', description.trim());
  form.append('access', 'private');
  const response = await cartesiaFetch('/voices/clone', apiKey, { method: 'POST', body: form });
  return await response.json();
}

export async function testCartesiaConnection(apiKey) {
  await listCartesiaVoices(apiKey);
  return true;
}
