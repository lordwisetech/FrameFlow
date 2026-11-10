const MEMORY_KEY = 'espro_ai_memory';
const CHAT_KEY = 'espro_ai_chat';
const REQUEST_TIMEOUT = 28000;

export const readAIMemory = () => {
  try { return localStorage.getItem(MEMORY_KEY) || ''; } catch { return ''; }
};
export const saveAIMemory = (value) => {
  try { localStorage.setItem(MEMORY_KEY, String(value || '').slice(0, 12000)); } catch {}
};
export const readAIChat = () => {
  try {
    const value = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]');
    return Array.isArray(value) ? value.slice(-30) : [];
  } catch { return []; }
};
export const saveAIChat = (messages) => {
  try { localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-30))); } catch {}
};

const SYSTEM = `You are the AI Director inside Explainer Studio Pro. Address the user as Escarnor. Be practical, concise, friendly and knowledgeable about this app. Never claim an action was applied unless the app confirms it. Never invent app features. The editor turns each non-empty script line into a scene; scenes have text, duration and videoUrl. The user can edit scene text/duration, add scenes, choose Pixabay footage, add one voiceover and background music, style captions, preview the timeline and export MP4 in-browser using FFmpeg. Projects are saved locally in IndexedDB with autosave. Downloaded Pixabay videos are stored in a reusable local media library and can be applied to scenes offline on the same device. Animation Explainer is a placeholder. Pixabay is used for stock video matching. Audio is uploaded by the user. Rendering can be slow on weaker computers and some remote clips may fail due to CORS.

You may propose safe editor actions. When useful, append exactly one JSON object on its own line, wrapped in <ACTION> and </ACTION>. Supported actions only:
{"type":"replace_script","script":"one scene per line"}
{"type":"append_script","script":"one scene per line"}
{"type":"add_scenes","script":"one scene per line"}
{"type":"update_scene","sceneId":"existing id","text":"new scene text","duration":6}
{"type":"add_scene","text":"new scene text","duration":5}
Do not emit actions for general questions. Never emit JavaScript, HTML, code execution, arbitrary file operations, API key changes, or export actions. Keep the explanation outside the action block. If the user asks to apply an edit, produce the appropriate action proposal and wait for approval.`;

const getError = async (response) => {
  const data = await response.json().catch(() => ({}));
  return data?.error?.message || data?.message || `HTTP ${response.status}`;
};

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function askGemini(key, messages) {
  const models = ['gemini-3.5-flash', 'gemini-2.5-flash'];
  let lastError;
  for (const model of models) {
    try {
      const contents = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents, generationConfig: { temperature: 0.7, maxOutputTokens: 1800 } }),
      });
      if (!response.ok) throw new Error(await getError(response));
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
      if (!text) throw new Error('The model returned an empty response.');
      return { text, provider: 'Google Gemini', model };
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error('Gemini request failed.');
}

async function askOpenRouter(key, messages) {
  const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'X-OpenRouter-Title': 'Explainer Studio Pro' },
    body: JSON.stringify({ model: 'openrouter/free', messages: [{ role: 'system', content: SYSTEM }, ...messages.map(m => ({ role: m.role, content: m.content }))], temperature: 0.7, max_tokens: 1800 }),
  });
  if (!response.ok) throw new Error(await getError(response));
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenRouter returned an empty response.');
  return { text, provider: 'OpenRouter', model: data.model || 'openrouter/free' };
}

export async function askAIDirector({ keys = [], history = [], prompt, memory = '', editorContext = {} }) {
  const activeKeys = keys.filter(k => k?.key?.trim() && ['gemini', 'openrouter'].includes(k.provider));
  if (!activeKeys.length) throw new Error('Add a Gemini or OpenRouter API key in API Settings first.');
  const context = `\n\nUSER MEMORY (user-editable):\n${memory || 'No saved personal memory yet.'}\n\nCURRENT EDITOR STATE:\n${JSON.stringify(editorContext).slice(0, 14000)}\n\nCURRENT REQUEST:\n${prompt}`;
  const messages = [...history.slice(-10), { role: 'user', content: context }];
  const errors = [];
  // Try every saved key in order. A failed provider/key is skipped for this request.
  for (const item of activeKeys) {
    try {
      return item.provider === 'gemini'
        ? await askGemini(item.key.trim(), messages)
        : await askOpenRouter(item.key.trim(), messages);
    } catch (error) {
      errors.push(`${item.provider}: ${error.message}`);
    }
  }
  throw new Error(`All configured AI connections failed. ${errors.join(' | ')}`);
}

export function extractAIActions(text) {
  const match = text.match(/<ACTION>\s*([\s\S]*?)\s*<\/ACTION>/i);
  if (!match) return { message: text, action: null };
  try {
    const action = JSON.parse(match[1]);
    const valid = action && ['replace_script', 'append_script', 'add_scenes', 'update_scene', 'add_scene'].includes(action.type);
    if (!valid) throw new Error('Unsupported action');
    if (['replace_script', 'append_script', 'add_scenes'].includes(action.type) && typeof action.script !== 'string') throw new Error('Invalid script action');
    if (action.type === 'update_scene' && (!action.sceneId || typeof action.text !== 'string')) throw new Error('Invalid scene action');
    if (action.type === 'add_scene' && typeof action.text !== 'string') throw new Error('Invalid add-scene action');
    return { message: text.replace(match[0], '').trim(), action };
  } catch {
    return { message: text.replace(match[0], '').trim(), action: null };
  }
}

// Gemini-powered speech for the assistant's spoken replies. The browser speech
// engine remains the fallback when Gemini TTS is unavailable.
export async function speakWithGemini(key, text) {
  const response = await fetchWithTimeout('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `Speak this reply naturally, warmly and conversationally. Transcript: ${String(text).slice(0, 1800)}` }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }, temperature: 1 },
    }),
  });
  if (!response.ok) throw new Error(await getError(response));
  const data = await response.json();
  const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (!part) throw new Error('Gemini did not return audio.');
  const raw = Uint8Array.from(atob(part.inlineData.data), c => c.charCodeAt(0));
  const wav = pcmToWav(raw, 24000, 1);
  const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
  const audio = new Audio(url);
  await new Promise((resolve, reject) => {
    audio.onended = resolve;
    audio.onerror = () => reject(new Error('Could not play Gemini voice audio.'));
    audio.play().catch(reject);
  });
  URL.revokeObjectURL(url);
}

function pcmToWav(pcm, sampleRate, channels) {
  const buffer = new ArrayBuffer(44 + pcm.length);
  const view = new DataView(buffer);
  const write = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, 36 + pcm.length, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, pcm.length, true);
  new Uint8Array(buffer, 44).set(pcm);
  return buffer;
}
