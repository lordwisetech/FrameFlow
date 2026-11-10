export default function StudioHeader({ onBack, onSettings, onExport, exporting, projectName, onRename, saveStatus }) {
  return (
    <header className="studio-header h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onBack} title="Back to home" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700">
          <i className="fa-solid fa-arrow-left text-xs"></i>
        </button>
        <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
          <i className="fa-solid fa-wand-magic-sparkles text-lg"></i>
        </div>
        <div>
          <h1 className="font-bold text-base leading-none tracking-wide text-white">
            Live Explainer <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 ml-1">Pro</span>
          </h1>
          <div className="header-project-meta"><input aria-label="Project name" value={projectName || 'Untitled project'} onChange={(event) => onRename?.(event.target.value)} /><span className="save-indicator"><i className={`fa-solid ${saveStatus === 'Saved' ? 'fa-cloud-check' : 'fa-cloud-arrow-up'}`} /> {saveStatus || 'Saving…'}</span></div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onSettings} className="studio-settings-btn flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700">
          <i className="fa-solid fa-key text-amber-400"></i><span>Settings</span>
        </button>
        <button onClick={onExport} disabled={exporting} className="studio-export-btn flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-xs font-semibold text-white shadow-md shadow-indigo-600/30">
          <i className="fa-solid fa-file-video"></i><span>Render Export</span>
        </button>
      </div>
    </header>
  );
}
