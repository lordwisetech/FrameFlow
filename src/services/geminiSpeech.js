
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function decodeBase64(value) {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function pcmToWav(pcm, sampleRate = 24000, channels = 1) {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, pcm.length + 36, true); write(8, 'WAVE');
  write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, pcm.length, true);
  return new Blob([header, pcm], { type: 'audio/wav' });
}

async function geminiRequest(key, model, body) {
  const response = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Gemini request failed (${response.status})`);
  return data;
}

export async function generateGeminiSceneSpeech({ apiKey, text, voiceName, style, speed }) {
  const prompt = `${style || 'Speak naturally and clearly.'} Read the following text exactly as written. Do not add or omit words: ${text}`;
  const data = await geminiRequest(apiKey, 'gemini-3.1-flash-tts-preview', {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) throw new Error('Gemini returned no speech audio. Check that your API key and TTS model are available.');
  const pcm = decodeBase64(part.inlineData.data);
  // Gemini TTS currently returns 24 kHz PCM. Speed is applied by playback/export rate only when supported.
  return pcmToWav(pcm, 24000, 1);
}

async function uploadGeminiAudio(apiKey, audioBlob) {
  const startResponse = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(audioBlob.size),
      'X-Goog-Upload-Header-Content-Type': audioBlob.type || 'audio/wav',
    },
    body: JSON.stringify({ file: { display_name: `explainer-scene-${Date.now()}.wav` } }),
  });
  if (!startResponse.ok) {
    const body = await startResponse.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Gemini audio upload could not start (${startResponse.status}).`);
  }
  const uploadUrl = startResponse.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Gemini did not provide an audio upload URL. Check API key permissions and try again.');

  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Type': audioBlob.type || 'audio/wav',
    },
    body: audioBlob,
  });
  const uploaded = await uploadResponse.json().catch(() => ({}));
  if (!uploadResponse.ok) throw new Error(uploaded?.error?.message || `Gemini audio upload failed (${uploadResponse.status}).`);
  const file = uploaded.file || uploaded;
  if (!file.uri) throw new Error('Gemini uploaded the audio but did not return a file URI.');
  return file;
}

function secondsFromOffset(value) {
  if (typeof value === 'number') return value;
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  // Gemini returns offsets such as "0.400s". Also accept numeric strings.
  const parsed = Number.parseFloat(raw.replace(/s$/i, ''));
  return Number.isFinite(parsed) ? parsed : NaN;
}

export async function alignGeminiSpeech({ apiKey, text, audioBlob }) {
  if (!apiKey) throw new Error('Gemini API key is missing.');
  const file = await uploadGeminiAudio(apiKey, audioBlob);
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model: 'gemini-3.5-transcribe',
      input: [{ type: 'audio', uri: file.uri, mime_type: file.mimeType || audioBlob.type || 'audio/wav' }],
      generation_config: {
        transcription_config: {
          mode: { type: 'verbatim', timestamp_granularities: ['word'] },
        },
      },
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error?.message || `Gemini transcription failed (${response.status}).`);
  if (result.status && result.status !== 'completed') {
    throw new Error(`Gemini transcription status: ${result.status}. Try a shorter scene.`);
  }

  // Interactions API returns word_info annotations under steps[].content[].annotations.
  const annotations = (result.steps || []).flatMap((step) => (step.content || []).flatMap((content) => content.annotations || []));
  const duration = await audioBlobDuration(audioBlob);
  const words = annotations
    .filter((item) => item.type === 'word_info')
    .map((item, index) => ({
      word: String(item.text || item.word || '').trim(),
      start: secondsFromOffset(item.start_offset ?? item.startOffset),
      end: secondsFromOffset(item.end_offset ?? item.endOffset),
      index,
    }))
    .filter((item) => item.word && Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start)
    .map((item) => ({ ...item, start: Math.max(0, item.start), end: Math.min(duration, item.end) }))
    .filter((item) => item.end > item.start);

  if (!words.length) {
    const transcript = result.output_text || (result.steps || []).flatMap((step) => (step.content || []).map((part) => part.text || '')).join(' ');
    throw new Error(transcript
      ? 'Gemini returned a transcript but no word timing annotations. Confirm that Gemini 3.5 Transcribe word timestamps are enabled for this API key, then try again.'
      : 'Gemini returned no transcription or word timestamps for this audio. Try a shorter scene or check whether Gemini 3.5 Transcribe is available for this API key.');
  }
  return words;
}

async function audioBlobDuration(blob) {
  const ctx = new AudioContext();
  try { return (await ctx.decodeAudioData(await blob.arrayBuffer())).duration; }
  finally { await ctx.close(); }
}

export async function combineAudioBlobs(blobs, speed = 1) {
  const context = new AudioContext();
  try {
    const buffers = [];
    for (const blob of blobs) buffers.push(await context.decodeAudioData(await blob.arrayBuffer()));
    const sampleRate = context.sampleRate;
    const totalFrames = buffers.reduce((sum, buffer) => sum + Math.ceil(buffer.duration / speed * sampleRate), 0);
    const offline = new OfflineAudioContext(2, totalFrames, sampleRate);
    let offset = 0;
    buffers.forEach((buffer) => {
      const source = offline.createBufferSource();
      source.buffer = buffer; source.connect(offline.destination); source.start(offset);
      offset += buffer.duration;
    });
    const rendered = await offline.startRendering();
    const channels = rendered.numberOfChannels;
    const frames = rendered.length;
    const wav = new ArrayBuffer(44 + frames * channels * 2);
    const view = new DataView(wav);
    const write = (o, s) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
    write(0, 'RIFF'); view.setUint32(4, 36 + frames * channels * 2, true); write(8, 'WAVE');
    write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true);
    write(36, 'data'); view.setUint32(40, frames * channels * 2, true);
    let pos = 44;
    for (let i = 0; i < frames; i++) for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, rendered.getChannelData(c)[i]));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true); pos += 2;
    }
    return new File([wav], 'gemini-scene-narration.wav', { type: 'audio/wav' });
  } finally { await context.close(); }
}
