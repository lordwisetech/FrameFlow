import { createId } from './id';

export const FALLBACK_VIDEOS = [
  'https://assets.mixkit.co/videos/preview/mixkit-circuit-board-microchip-technology-43288-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smartphone-with-a-green-screen-41529-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-datacenter-server-racks-42934-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-network-lines-and-dots-in-cyber-space-41541-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-woman-working-on-her-laptop-at-home-42892-large.mp4',
];

export const DEFAULT_SCRIPT = `Have you noticed that the internet feels a bit different lately?

More than half of the articles and posts you scroll past today were written by artificial intelligence.

Entire websites are now generated automatically, publishing thousands of articles every single minute.

This massive wave of synthetic content is changing how search engines and social feeds show you information.

When algorithms feed on other algorithms, the line between real human thought and machine code begins to blur.

So the real question is: how much of what you read today was actually created by a human being?`;

// preview = on-screen size, out = exported video size (even numbers for H.264)
export const ASPECTS = {
  '16:9': { preview: [640, 360], out: [854, 480] },
  '9:16': { preview: [240, 426], out: [480, 854] },
  '1:1': { preview: [360, 360], out: [576, 576] },
};

export const formatTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const STOP = new Set(['have','you','that','the','internet','feels','a','bit','different','lately','is','on','and','or','to','in','this','was','were','by']);

export const extractKeywords = (text) => {
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  return words.filter((w) => !STOP.has(w) && w.length > 3).slice(0, 2).join(' ') || 'technology';
};

export const makeScene = (text, i) => ({
  id: createId(),
  text,
  duration: 5,
  videoUrl: FALLBACK_VIDEOS[i % FALLBACK_VIDEOS.length],
  keywords: extractKeywords(text),
});

export const withStarts = (scenes) => {
  let t = 0;
  return scenes.map((s) => { const r = { ...s, startTime: t }; t += s.duration; return r; });
};

export const sceneIndexAt = (scenes, t) => {
  const i = scenes.findIndex((s) => t >= s.startTime && t < s.startTime + s.duration);
  return i < 0 ? Math.max(0, scenes.length - 1) : i;
};

// Downloading clips as Blobs gives same-origin video elements (no tainted canvas)
// and lets FFmpeg read the bytes during export. Resolves to null if CORS blocks it.
const blobCache = new Map();
export const getClipBlob = async (url, localMediaId = null) => {
  if (localMediaId) {
    try {
      const { getMediaBlob } = await import('../services/projectStore');
      const localBlob = await getMediaBlob(localMediaId);
      if (localBlob) return localBlob;
    } catch { /* fall back to the original remote URL if local storage is unavailable */ }
  }
  if (!url) return null;
  if (!blobCache.has(url)) {
    blobCache.set(url, fetch(url).then((r) => (r.ok ? r.blob() : null)).catch(() => null));
  }
  return blobCache.get(url);
};

export const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
