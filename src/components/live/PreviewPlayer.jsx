import { useEffect, useRef, useState } from 'react';
import { ASPECTS } from '../../utils/helpers';
import { previewCaptionStyle } from '../../utils/captionStyle';

const POS = { top: 'top-[6%]', middle: 'top-1/2 -translate-y-1/2', bottom: 'bottom-[6%]' };

export default function PreviewPlayer({ active, pool, aspect, onAspect, caption, time = 0 }) {
  const canvas = useRef(null);
  const latest = useRef({});
  const [isMobile, setIsMobile] = useState(false);

  latest.current = { active, pool, aspect };
  const [cw, ch] = ASPECTS[aspect].preview;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 769);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Continuously paint the active scene's video (cover-fit) onto the canvas
  useEffect(() => {
    let raf;
    const draw = () => {
      const { active: sc, pool: p } = latest.current;
      const c = canvas.current;
      if (c) {
        const g = c.getContext('2d');
        g.fillStyle = '#000';
        g.fillRect(0, 0, c.width, c.height);
        if (sc && p.current[sc.id]?.video) {
          const v = p.current[sc.id].video;
          if (v.readyState >= 2 && v.videoWidth) {
            const s = Math.max(c.width / v.videoWidth, c.height / v.videoHeight);
            const dw = v.videoWidth * s, dh = v.videoHeight * s;
            g.drawImage(v, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const localTime = active ? Math.max(0, time - (active.startTime || 0)) : 0;
  const words = active?.captionWords || [];
  const spoken = words.filter((w) => w.start <= localTime);
  const current = words.find((w) => w.start <= localTime && w.end > localTime);
  let captionText = active?.text || 'Click Parse Script to start...';
  if (words.length) {
    if (caption.mode === 'one-word') captionText = current?.word || '';
    else captionText = spoken.map((w) => w.word).join(' ');
  }

  return (
    <div className="studio-preview flex-1 flex items-center justify-center p-2 sm:p-4 relative">
      <div className="absolute top-2 sm:top-4 left-2 sm:left-6 flex items-center gap-1 bg-slate-900/80 backdrop-blur border border-slate-800 p-0.5 sm:p-1 rounded-xl text-xs z-10">
        {Object.keys(ASPECTS).map((a) => (
          <button
            key={a}
            onClick={() => onAspect(a)}
            className={`px-2 sm:px-3 py-1 sm:py-1 rounded-lg font-medium min-w-[36px] sm:min-w-0 ${a === aspect ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {a}
          </button>
        ))}
      </div>
      <div
        style={{ width: isMobile ? '100%' : cw, height: isMobile ? 'auto' : ch, aspectRatio: `${cw} / ${ch}` }}
        className="studio-preview-frame relative bg-black rounded-2xl overflow-hidden shadow-2xl shadow-indigo-950/30 border border-slate-800 transition-all duration-300 max-w-full"
      >
        <canvas
          ref={canvas}
          width={cw}
          height={ch}
          className="w-full h-full"
        />
        {caption.show && (
          <div className={`absolute inset-x-0 text-center pointer-events-none ${POS[caption.position]}`}>
            <span style={previewCaptionStyle(caption, cw, ch)}>
              {caption.mode === 'highlight' || caption.mode === 'karaoke'
                ? spoken.map((w, i) => (
                    <span key={`${w.index}-${i}`} style={current?.index === w.index ? { color: '#facc15' } : undefined}>
                      {w.word}{i < spoken.length - 1 ? ' ' : ''}
                    </span>
                  ))
                : captionText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}