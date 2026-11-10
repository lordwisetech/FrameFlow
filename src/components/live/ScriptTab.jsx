export default function ScriptTab({ script, onChange, onParse }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-xs font-semibold text-slate-300">Script Text Source</label>
          <span className="text-[10px] text-slate-500">Auto-matches Pixabay videos</span>
        </div>
        <textarea rows={10} value={script} onChange={(e) => onChange(e.target.value)} placeholder="Paste script text..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60 resize-none font-mono leading-relaxed placeholder:text-slate-600" />
      </div>
      <button onClick={onParse} className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-xs font-semibold text-white flex items-center justify-center gap-2 shadow-md">
        <i className="fa-solid fa-wand-magic-sparkles"></i><span>Parse &amp; Auto-Match Media</span>
      </button>
    </div>
  );
}
