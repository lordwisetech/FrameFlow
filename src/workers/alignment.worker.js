import { pipeline, env } from '@huggingface/transformers';

const MODEL_ID = 'onnx-community/whisper-tiny_timestamped';
let transcriber = null;
let loading = false;

env.allowLocalModels = false;
env.useBrowserCache = true;

function normalize(word) {
  return String(word || '').toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
}

function alignTokens(sourceWords, timedWords, duration) {
  const a = sourceWords.map(normalize);
  const b = timedWords.map((item) => normalize(item.text));
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => new Uint16Array(cols));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const mapped = new Array(sourceWords.length).fill(null);
  let i = sourceWords.length;
  let j = timedWords.length;
  let matches = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      if (a[i - 1] && a[i - 1] === b[j - 1]) {
        mapped[i - 1] = timedWords[j - 1];
        matches++;
      }
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) i--;
    else j--;
  }
  const ratio = sourceWords.length ? matches / sourceWords.length : 0;
  if (ratio < 0.55) throw new Error(`Speech match was too low (${Math.round(ratio * 100)}%). Check the narration text and try again.`);

  // Fill words Whisper did not recognise by interpolating between the nearest real timestamps.
  for (let index = 0; index < mapped.length; index++) {
    if (mapped[index]) continue;
    let prev = index - 1;
    while (prev >= 0 && !mapped[prev]) prev--;
    let next = index + 1;
    while (next < mapped.length && !mapped[next]) next++;
    const left = prev >= 0 ? Number(mapped[prev].timestamp?.[1]) || 0 : 0;
    const right = next < mapped.length ? Number(mapped[next].timestamp?.[0]) || duration : duration;
    const gapCount = next - prev;
    const slot = index - prev;
    const start = left + Math.max(0, right - left) * ((slot - 1) / gapCount);
    const end = left + Math.max(0, right - left) * (slot / gapCount);
    mapped[index] = { timestamp: [start, end] };
  }
  return sourceWords.map((word, index) => {
    const timestamp = mapped[index]?.timestamp || [0, duration];
    const start = Math.max(0, Number(timestamp[0]) || 0);
    const end = Math.max(start + 0.025, Number(timestamp[1]) || start + 0.08);
    return { word, start, end: Math.min(duration, end), index };
  });
}

self.onmessage = async ({ data }) => {
  const { id, type } = data || {};
  try {
    if (type === 'load') {
      if (transcriber) { self.postMessage({ id, type: 'loaded', cached: true }); return; }
      if (loading) throw new Error('The caption sync model is already loading. Please wait.');
      loading = true;
      self.postMessage({ id, type: 'progress', message: 'Preparing offline word-sync model…' });
      try {
        transcriber = await pipeline('automatic-speech-recognition', MODEL_ID, {
          dtype: 'q8',
          device: 'wasm',
          progress_callback: (progress) => {
            const file = progress?.file || progress?.name || 'Whisper sync model';
            const percent = Number.isFinite(progress?.progress) ? ` · ${Math.round(progress.progress)}%` : '';
            self.postMessage({ id, type: 'progress', message: `Downloading ${file}${percent}` });
          },
        });
        self.postMessage({ id, type: 'loaded' });
      } finally { loading = false; }
      return;
    }
    if (type === 'align') {
      if (!transcriber) throw new Error('Load the offline caption sync model first.');
      const sourceText = String(data.sourceText || '').trim();
      const sourceWords = sourceText.match(/\S+/g) || [];
      if (!sourceWords.length) throw new Error('There is no narration text to align.');
      self.postMessage({ id, type: 'progress', message: 'Listening to the generated narration and finding word timings…' });
      const audio = new Float32Array(data.samples);
      const result = await transcriber(audio, {
        return_timestamps: 'word',
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'english',
        task: 'transcribe',
      });
      const timedWords = (result.chunks || []).filter((chunk) => chunk.text?.trim() && Array.isArray(chunk.timestamp) && Number.isFinite(chunk.timestamp[0]) && Number.isFinite(chunk.timestamp[1]));
      if (!timedWords.length) throw new Error('The sync model could not find word timestamps in this audio.');
      const words = alignTokens(sourceWords, timedWords, Number(data.duration) || 0);
      self.postMessage({ id, type: 'aligned', words });
    }
  } catch (error) {
    self.postMessage({ id, type: 'error', message: error?.message || 'Caption alignment failed.' });
  }
};
