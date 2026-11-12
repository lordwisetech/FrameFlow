import { useEffect, useRef } from 'react';

// Keeps one hidden <video> per scene, keyed by scene id. Returns a ref: pool.current[id].video
// Videos stream directly from their source URL during preview. IndexedDB blobs are only
// fetched on demand (e.g. for export) via getClipBlob(), not eagerly cached here.
export default function useVideoPool(scenes) {
  const pool = useRef({});

  useEffect(() => {
    const ids = new Set(scenes.map((s) => s.id));
    Object.keys(pool.current).forEach((id) => {
      if (!ids.has(id)) {
        const entry = pool.current[id];
        if (entry) {
          entry.video.removeAttribute('src');
          if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
        }
        delete pool.current[id];
      }
    });
    scenes.forEach((s) => {
      const existing = pool.current[s.id];
      // If the same scene with the same URL and media id, keep it.
      if (existing && existing.url === s.videoUrl && existing.localMediaId === s.localMediaId) return;
      // Otherwise tear down the old entry and create a new one.
      if (existing && existing.objectUrl) URL.revokeObjectURL(existing.objectUrl);
      const v = document.createElement('video');
      Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' });
      // If CORS blocks the clip, still let it play in the preview (export will use a black frame)
      v.onerror = () => { if (v.crossOrigin) { v.removeAttribute('crossorigin'); v.src = s.videoUrl; v.load(); } };
      const entry = { video: v, url: s.videoUrl, localMediaId: s.localMediaId, objectUrl: null };
      pool.current[s.id] = entry;
      // Stream directly from the source URL. No IndexedDB download during preview.
      v.src = s.videoUrl;
      v.load();
    });
  }, [scenes]);

  useEffect(() => () => {
    Object.values(pool.current).forEach((entry) => {
      if (!entry) return;
      entry.video.removeAttribute('src');
      if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
    });
    pool.current = {};
  }, []);

  return pool;
}