const TABS = [
  ['script', 'fa-align-left', 'Script'],
  ['scenes', 'fa-film', 'Scenes'],
  ['pixabay', 'fa-magnifying-glass', 'Search Swap'],
  ['resources', 'fa-folder-open', 'Resources'],
  ['audio', 'fa-microphone-lines', 'Audio'],
  ['captions', 'fa-closed-captioning', 'Captions'],
];

export default function Sidebar({ tab, onTab, children }) {
  return (
    <aside className="studio-sidebar w-96 border-r border-slate-800 bg-slate-900 flex flex-col z-10 shrink-0">
      <div className="studio-tabbar flex border-b border-slate-800 bg-slate-950/60 p-1 gap-1 text-xs font-medium">
        {TABS.map(([id, icon, label]) => (
          <button key={id} onClick={() => onTab(id)}
            className={`flex-1 min-w-0 py-2 rounded-md flex flex-col items-center gap-1 transition-all ${tab === id ? 'text-indigo-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}>
            <i className={`fa-solid ${icon} text-sm`}></i><span>{label}</span>
          </button>
        ))}
      </div>
      <div className="studio-tab-content flex-1 overflow-y-auto p-4 space-y-4">{children}</div>
    </aside>
  );
}
