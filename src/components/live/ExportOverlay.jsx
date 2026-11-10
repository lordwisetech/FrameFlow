export default function ExportOverlay({ progress, label }) {
  const pct = Math.round(progress * 100);
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-center">
        <i className="fa-solid fa-film text-3xl text-indigo-400 animate-pulse"></i>
        <p className="text-sm font-semibold text-white">Rendering MP4 with FFmpeg</p>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all" style={{ width: `${pct}%` }}></div></div>
        <p className="text-xs text-slate-400">{label} {pct}%</p>
        <p className="text-[10px] text-slate-500">Keep this tab open. Longer videos take longer.</p>
      </div>
    </div>
  );
}
