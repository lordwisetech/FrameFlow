import { useEffect, useRef } from 'react';
import { getClipBlob } from '../utils/helpers';

// Keeps one hidden <video> per scene, keyed by scene id. Returns a ref: pool.current[id].video
export default function useVideoPool(scenes) {
  const pool = useRef({});

  useEffect(() => {
    const ids = new Set(scenes.map((s) => s.id));
    Object.keys(pool.current).forEach((id) => {
      if (!ids.has(id)) { pool.current[id].video.removeAttribute('src'); if (pool.current[id].objectUrl) URL.revokeObjectURL(pool.current[id].objectUrl); delete pool.current[id]; }
    });
    scenes.forEach((s) => {
      if (pool.current[s.id]?.url === s.videoUrl && pool.current[s.id]?.localMediaId === s.localMediaId) return;
      if (pool.current[s.id]?.objectUrl) URL.revokeObjectURL(pool.current[s.id].objectUrl);
      const v = document.createElement('video');
      Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' });
      // If CORS blocks the clip, still let it play in the preview (export will use a black frame)
      v.onerror = () => { if (v.crossOrigin) { v.removeAttribute('crossorigin'); v.src = s.videoUrl; v.load(); } };
      const entry = { video: v, url: s.videoUrl, localMediaId: s.localMediaId, objectUrl: null };
      pool.current[s.id] = entry;
      getClipBlob(s.videoUrl, s.localMediaId).then((b) => {
        if (pool.current[s.id] === entry) {
          if (b) { entry.objectUrl = URL.createObjectURL(b); v.src = entry.objectUrl; }
          else v.src = s.videoUrl;
        }
      });
    });
  }, [scenes]);

  useEffect(() => () => {
    Object.values(pool.current).forEach((entry) => {
      entry.video.removeAttribute('src');
      if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
    });
    pool.current = {};
  }, []);

  return pool;
}
