import { useEffect, useRef, useState, useCallback } from 'react';

export default function usePlayback(total) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const tRef = useRef(0), totalRef = useRef(total), last = useRef(0), raf = useRef(0);
  totalRef.current = total;

  useEffect(() => {
    if (!playing) return;
    last.current = 0;
    const loop = (ts) => {
      if (!last.current) last.current = ts;
      tRef.current += (ts - last.current) / 1000; last.current = ts;
      if (tRef.current >= totalRef.current) { tRef.current = 0; setTime(0); setPlaying(false); return; }
      setTime(tRef.current);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const seek = useCallback((t) => {
    tRef.current = Math.max(0, Math.min(totalRef.current, t));
    setTime(tRef.current);
  }, []);
  const stop = useCallback(() => { setPlaying(false); seek(0); }, [seek]);
  const toggle = useCallback(() => setPlaying((p) => !p), []);

  return { time, playing, setPlaying, toggle, stop, seek };
}
