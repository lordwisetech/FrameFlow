export default function AnimationExplainerPage({ onBack }) {
  return (
    <div className="h-full flex flex-col">
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700">
          <i className="fa-solid fa-arrow-left mr-2"></i>Home
        </button>
        <h1 className="font-bold text-sm text-white">Animation Explainer Video</h1>
      </header>
      <main className="flex-1">{/* Intentionally empty for now */}</main>
    </div>
  );
}
