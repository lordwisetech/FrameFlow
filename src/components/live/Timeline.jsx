import { useRef } from 'react';
import { formatTime } from '../../utils/helpers';

export default function Timeline({ scenes, total, time, playing, hasVoice, onToggle, onStop, onRestart, onSeek, onResize }) {
  const wrap = useRef(null);
  const pct = total ? (time / total) * 100 : 0;

  const drag = (onMove) => {
    const up = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', up);
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

  const btn = 'w-8 h-8 rounded-lg text-white flex items-center justify-center text-xs shadow-md';

  return (
    <div className="studio-timeline h-64 border-t border-slate-800 bg-slate-900 flex flex-col shrink-0">
      <div className="h-12 border-b border-slate-800/80 px-4 flex items-center justify-between text-xs text-slate-300 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <button onClick={onToggle} className={`${btn} bg-indigo-600 hover:bg-indigo-500`}><i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`}></i></button>
          <button onClick={onStop} className={`${btn} bg-slate-700 hover:bg-slate-600`}><i className="fa-solid fa-stop"></i></button>
          <button onClick={onRestart} className={`${btn} bg-slate-700 hover:bg-slate-600`}><i className="fa-solid fa-rotate-left"></i></button>
          <span className="font-mono font-semibold">{formatTime(time)} / {formatTime(total)}</span>
        </div>
        <div className="text-[11px] text-slate-400"><i className="fa-solid fa-hand-pointer text-indigo-400 mr-1"></i> Drag scene blocks horizontally</div>
      </div>

      <div className="flex-1 p-4 overflow-x-auto select-none bg-slate-950/80">
        <div ref={wrap} className="relative min-w-[800px] h-full flex flex-col justify-center space-y-3">
          <div onPointerDown={dragHead} style={{ left: `${pct}%` }} className="absolute top-0 bottom-0 w-1 bg-indigo-500 z-30 cursor-pointer flex flex-col items-center">
            <div className="w-3.5 h-3.5 bg-indigo-500 rotate-45 -mt-1.5 rounded-sm shadow-md"></div>
          </div>
          <div className="h-16 bg-slate-900/90 rounded-xl border border-slate-800 flex overflow-hidden p-1 gap-1">
            {scenes.map((s, i) => (
              <div key={s.id} onPointerDown={(e) => startResize(e, s)} onClick={() => onSeek(s.startTime)}
                style={{ width: `${(s.duration / total) * 100}%` }}
                className="timeline-block h-full rounded-lg bg-indigo-600/40 border border-indigo-500/50 hover:bg-indigo-600/60 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing text-xs font-semibold text-white">
                <span className="truncate">#{i + 1} {s.text}</span>
                <i className="fa-solid fa-grip-lines-vertical text-slate-400 text-xs opacity-60"></i>
              </div>
            ))}
          </div>
          <div className="h-10 bg-indigo-950/40 rounded-xl border border-indigo-900/50 flex items-center px-3 text-xs text-indigo-300">
            <i className="fa-solid fa-microphone mr-2 text-indigo-400"></i>
            <span className="font-medium">{hasVoice ? 'Voiceover track loaded' : 'Voiceover Track (Global Audio Sync)'}</span>
          </div>
        </div>
        <div className="mt-3 px-3 h-6 flex items-center">
          <input type="range" min="0" max="100" step="0.1" value={pct} onChange={(e) => onSeek((e.target.value / 100) * total)} className="w-full h-1.5 cursor-pointer accent-indigo-500" />
        </div>
      </div>
    </div>
  );
}
