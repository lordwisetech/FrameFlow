import { useRef, useState, useEffect } from 'react';
import { formatTime } from '../../utils/helpers';

export default function Timeline({ scenes, total, time, playing, hasVoice, onToggle, onStop, onRestart, onSeek, onResize }) {
  const wrap = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const pct = total ? (time / total) * 100 : 0;

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 769;
      setIsMobile(mobile);
      setExpanded(true);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const drag = (onMove) => {
    const up = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', up);
  };

  const startResize = (e, s) => {
    const x0 = e.clientX, d0 = s.duration, w = wrap.current.clientWidth;
    drag((m) => onResize(s.id, Math.max(1.5, +(d0 + ((m.clientX - x0) / w) * total).toFixed(1))));
  };

  const seekX = (x) => {
    const r = wrap.current.getBoundingClientRect();
    onSeek(Math.min(1, Math.max(0, (x - r.left) / r.width)) * total);
  };
  const dragHead = (e) => { e.preventDefault(); seekX(e.clientX); drag((m) => seekX(m.clientX)); };

  const btn = 'w-9 h-9 rounded-lg text-white flex items-center justify-center text-sm shadow-md min-w-[44px]';

  return (
    <div className={`studio-timeline border-t border-slate-800 bg-slate-900 flex flex-col shrink-0 transition-all duration-300 ${isMobile ? (expanded ? 'h-[60vh]' : 'h-14') : 'h-64'}`}>
      <div className={`h-12 border-b border-slate-800/80 px-3 sm:px-4 flex items-center justify-between text-xs text-slate-300 bg-slate-950/60 `}
>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`${btn} bg-indigo-600 hover:bg-indigo-500`}
          >
            <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`}></i>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onStop(); }}
            className={`${btn} bg-slate-700 hover:bg-slate-600`}
          >
            <i className="fa-solid fa-stop"></i>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRestart(); }}
            className={`${btn} bg-slate-700 hover:bg-slate-600 hidden sm:flex`}
          >
            <i className="fa-solid fa-rotate-left"></i>
          </button>
          <span className="font-mono font-semibold text-sm">{formatTime(time)} / {formatTime(total)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 hidden md:inline">
            <i className="fa-solid fa-hand-pointer text-indigo-400 mr-1"></i>
            Drag scene blocks horizontally
          </span>
          {isMobile && <span className="text-[10px] text-slate-400">TIMELINE</span>}
        </div>
      </div>

      <div className={`flex-1 overflow-x-auto select-none bg-slate-950/80 transition-all ${isMobile ? 'p-2 opacity-100 min-h-0' : 'p-4'}`}>
        <div ref={wrap} className={`relative h-full flex flex-col justify-center space-y-2 ${isMobile ? 'min-w-[560px]' : 'min-w-[800px]'}`}>
          <div onPointerDown={dragHead} style={{ left: `${pct}%` }} className="absolute top-0 bottom-0 w-1 bg-indigo-500 z-30 cursor-pointer flex flex-col items-center">
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-indigo-500 rotate-45 -mt-1 sm:-mt-1.5 rounded-sm shadow-md"></div>
          </div>
          <div className="h-10 sm:h-16 bg-slate-900/90 rounded-xl border border-slate-800 flex overflow-hidden p-1 gap-1">
            {scenes.map((s, i) => (
              <div
                key={s.id}
                onPointerDown={(e) => startResize(e, s)}
                onClick={() => onSeek(s.startTime)}
                style={{ width: `${(s.duration / total) * 100}%` }}
                className="timeline-block h-full rounded-lg bg-indigo-600/40 border border-indigo-500/50 hover:bg-indigo-600/60 flex items-center justify-between px-2 sm:px-3 cursor-grab active:cursor-grabbing text-xs font-semibold text-white min-w-[40px]"
              >
                <span className="truncate text-[10px] sm:text-xs">#{i + 1}</span>
                <i className="fa-solid fa-grip-lines-vertical text-slate-400 text-[10px] opacity-60 hidden sm:inline"></i>
              </div>
            ))}
          </div>
          <div className="h-7 sm:h-10 bg-indigo-950/40 rounded-xl border border-indigo-900/50 flex items-center px-3 text-xs text-indigo-300">
            <i className="fa-solid fa-microphone mr-2 text-indigo-400"></i>
            <span className="font-medium truncate">{hasVoice ? 'Voiceover track loaded' : 'Voiceover Track (Global Audio Sync)'}</span>
          </div>
          <div className="h-8 sm:h-10 bg-amber-950/30 rounded-xl border border-amber-800/40 flex overflow-hidden gap-1 p-1" aria-label="Caption timeline">
            {scenes.map((scene, index) => {
              const words = Array.isArray(scene.captionWords) ? scene.captionWords : [];
              const captionText = words.length
                ? words.map((word) => typeof word === 'string' ? word : (word.word || word.text || '')).filter(Boolean).join(' ')
                : (scene.text || 'No caption');
              return (
                <button
                  key={`caption-${scene.id}`}
                  type="button"
                  title={`Scene ${index + 1} caption: ${captionText}`}
                  onClick={() => onSeek(scene.startTime)}
                  style={{ width: `${(scene.duration / total) * 100}%` }}
                  className="min-w-[40px] h-full rounded-md bg-amber-500/10 border border-amber-500/30 px-2 text-left text-[9px] sm:text-[10px] text-amber-200 truncate hover:bg-amber-500/20"
                >
                  <i className="fa-solid fa-closed-captioning mr-1 opacity-70" />
                  {captionText}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-3 px-3 h-6 flex items-center">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={pct}
            onChange={(e) => onSeek((e.target.value / 100) * total)}
            className="w-full h-2 cursor-pointer accent-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}