export default function ScenesTab({ scenes, activeId, onChange, onAdd, onSwap }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-300">Scene Sequence</span>
        <button
          onClick={onAdd}
          className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium min-h-[44px] px-3 rounded-lg bg-slate-800/50"
        >
          <i className="fa-solid fa-plus"></i>
          <span className="hidden sm:inline">Add Scene</span>
        </button>
      </div>
      <div className="space-y-2.5">
        {scenes.map((s, i) => (
          <div
            key={s.id}
            className={`p-3 sm:p-3 rounded-xl border space-y-2 transition-all scene-card-mobile ${s.id === activeId ? 'border-indigo-500 bg-indigo-950/30' : 'border-slate-800 bg-slate-950/60'}`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400">Scene #{i + 1}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={s.duration}
                  onChange={(e) => onChange(s.id, { duration: Math.max(1, parseFloat(e.target.value) || 3) })}
                  className="w-16 sm:w-14 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-right font-mono text-sm text-indigo-300 min-h-[40px]"
                />
                <span className="text-slate-500 text-xs">sec</span>
              </div>
            </div>
            <textarea
              rows={2}
              value={s.text}
              onChange={(e) => onChange(s.id, { text: e.target.value, keywords: s.keywords })}
              className="w-full bg-transparent text-base sm:text-sm text-slate-200 font-medium leading-relaxed resize-none focus:outline-none min-h-[50px]"
            />
            <div className="flex items-center justify-between text-[11px] pt-1">
              <button
                onClick={() => onSwap(s.keywords, i)}
                className="text-indigo-400 hover:underline flex items-center gap-1 min-h-[40px] px-2 rounded-lg bg-slate-800/50"
              >
                <i className="fa-solid fa-magnifying-glass"></i>
                <span className="hidden sm:inline">Search Swap</span>
              </button>
              <span className="text-slate-500 text-[10px]">Media Ready</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}