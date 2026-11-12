import { useState, useEffect } from 'react';

export default function StudioHeader({ onBack, onSettings, onExport, exporting, projectName, onRename, saveStatus }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 769);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <header className="studio-header h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button onClick={onBack} title="Back to home" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shrink-0">
          <i className="fa-solid fa-arrow-left text-xs"></i>
        </button>
        <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-1.5 sm:p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20 shrink-0">
          <i className="fa-solid fa-wand-magic-sparkles text-base sm:text-lg"></i>
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-sm sm:text-base leading-none tracking-wide text-white truncate">
            Live Explainer <span className="text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 ml-1 hidden sm:inline">Pro</span>
          </h1>
          <div className="header-project-meta flex items-center gap-1 mt-0.5">
            <input
              aria-label="Project name"
              value={projectName || 'Untitled project'}
              onChange={(event) => onRename?.(event.target.value)}
              className="text-[10px] sm:text-xs text-slate-400 bg-transparent border-none focus:outline-none focus:border-indigo-500/60 w-24 sm:w-32 truncate"
            />
            <span className="save-indicator flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-500">
              <i className={`fa-solid ${saveStatus === 'Saved' ? 'fa-cloud-check' : 'fa-cloud-arrow-up'}`} />
              <span className="hidden sm:inline">{saveStatus || 'Saving…'}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button
          onClick={onSettings}
          className="studio-settings-btn flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 min-w-[40px]"
        >
          <i className="fa-solid fa-key text-amber-400 text-sm"></i>
          <span className="hidden sm:inline">Settings</span>
        </button>
        <button
          onClick={onExport}
          disabled={exporting}
          className="studio-export-btn flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 min-w-[44px]"
        >
          <i className="fa-solid fa-file-video text-sm"></i>
          <span className="hidden sm:inline">Render</span>
        </button>
      </div>
    </header>
  );
}