const fmt = (d) => (d ? `${d.toFixed(1)}s` : '');

export default function AudioTab({ voice, bg, bgVol, onVoice, onBg, onBgVol, onSync, aiKeys = [], onGenerateSpeech, generating, speechStatus, voiceName, onVoiceName, speechStyle, onSpeechStyle, speechSpeed, onSpeechSpeed, phononLoaded, phononLoading, phononGenerating, phononStatus, phononVoices, phononVoice, onPhononVoice, onLoadPhonon, onGeneratePhonon, onPreviewPhonon, phononPreviewUrl, phononPreviewing, phononPreviewStatus }) {
  return (
    <div className="space-y-4">
      <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><i className="fa-solid fa-microphone text-indigo-400 text-sm"></i><span className="text-xs font-bold text-slate-200">Global Voiceover Track</span></div>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-semibold">Active</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">Upload a single narration track for the full video script.</p>
        <div className="relative group border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-4 text-center cursor-pointer bg-slate-950/50">
          <input type="file" accept="audio/*" onChange={(e) => e.target.files[0] && onVoice(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
          <i className="fa-solid fa-cloud-arrow-up text-xl text-slate-400 group-hover:text-indigo-400 mb-1"></i>
          <p className="text-xs font-medium text-slate-300">{voice ? `${voice.name} (${fmt(voice.duration)})` : 'Click or drop audio file here'}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Supports MP3, WAV, M4A, OGG</p>
        </div>
        {voice && (
          <div className="space-y-2 pt-1">
            <audio controls src={voice.url} className="w-full h-8" />
            <div className="flex gap-2">
              <button onClick={onSync} className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5">
                <i className="fa-solid fa-wand-magic"></i><span>Sync Timeline to Audio</span>
              </button>
              <button onClick={() => onVoice(null)} className="px-2.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-lg text-xs"><i className="fa-solid fa-trash"></i></button>
            </div>
          </div>
        )}
      </div>

      <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-3">
        <div className="flex items-center gap-2"><i className="fa-solid fa-wand-magic-sparkles text-emerald-400"></i><span className="text-xs font-bold text-slate-100">Gemini AI Scene Narration</span></div>
        <p className="text-[11px] text-slate-400">Generate a separate voice clip for every scene, then automatically align captions to the spoken words.</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] text-slate-400">Gemini voice
            <select value={voiceName} onChange={(e) => onVoiceName(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200">
              {['Kore','Puck','Charon','Fenrir','Aoede','Leda','Orus','Zephyr','Autonoe','Callirrhoe','Despina','Erinome','Gacrux','Laomedeia','Pulcherrima','Achernar','Achird','Zubenelgenubi','Vindemiatrix','Sadachbia','Sadaltager'].map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label className="text-[10px] text-slate-400">Speaking speed
            <select value={speechSpeed} onChange={(e) => onSpeechSpeed(Number(e.target.value))} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200">
              <option value="0.85">0.85× Slow</option><option value="1">1× Normal</option><option value="1.1">1.1× Fast</option><option value="1.2">1.2× Faster</option>
            </select>
          </label>
        </div>
        <label className="block text-[10px] text-slate-400">Voice direction / style
          <input value={speechStyle} onChange={(e) => onSpeechStyle(e.target.value)} placeholder="Warm, clear educational narrator..." className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200" />
        </label>
        <button disabled={generating || !aiKeys.some((k) => k.provider === 'gemini' && k.key)} onClick={onGenerateSpeech} className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold">
          <i className={`fa-solid ${generating ? 'fa-spinner fa-spin' : 'fa-microphone-lines'} mr-2`}></i>{generating ? 'Generating scene narration & captions…' : 'Generate All Scene Narration + Captions'}
        </button>
        {!aiKeys.some((k) => k.provider === 'gemini' && k.key) && <p className="text-[10px] text-amber-300">Add a Gemini API key in Settings first.</p>}
        {speechStatus && <p className="text-[10px] text-slate-300 leading-relaxed">{speechStatus}</p>}
      </div>

      <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-950/10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><i className="fa-solid fa-cloud-arrow-down text-sky-300"></i><span className="text-xs font-bold text-slate-100">Phonon TTS Narration</span></div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${phononLoaded ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' : 'text-sky-200 bg-sky-500/10 border-sky-500/30'}`}>{phononLoaded ? 'Model ready' : 'Local AI'}</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">Generate narration entirely on this device using Phonon TTS. No API key, no server, no internet required after the first model download. The model is ~64 MB and is cached by the browser where storage allows.</p>
        <label className="block text-[10px] text-slate-400">Phonon voice
          <div className="mt-1 flex gap-2">
          <select value={phononVoice} onChange={(e) => onPhononVoice(e.target.value)} className="min-w-0 flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200">
            <option value="">Select a voice…</option>
            {(phononVoices || []).map((v) => (
              <option key={v.name} value={v.name}>{v.label}</option>
            ))}
          </select>
          <button type="button" onClick={onPreviewPhonon} disabled={phononPreviewing || phononGenerating || phononLoading} className="shrink-0 px-3 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 disabled:opacity-50 text-xs font-semibold"><i className={`fa-solid ${phononPreviewing ? 'fa-spinner fa-spin' : 'fa-play'} mr-1.5`}></i>{phononPreviewing ? 'Creating…' : 'Test Voice'}</button>
          </div>
        </label>
        {phononPreviewStatus && <p className="text-[10px] text-slate-300">{phononPreviewStatus}</p>}
        {phononPreviewUrl && <audio key={phononPreviewUrl} controls preload="none" src={phononPreviewUrl} className="w-full h-8" />}
        <p className="text-[10px] text-slate-500">Preview uses a short sample so you can compare voices before generating the full narration.</p>
        <button onClick={onLoadPhonon} disabled={phononLoaded || phononLoading} className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold"><i className={`fa-solid ${phononLoading ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-down'} mr-1.5`}></i>{phononLoaded ? 'Model Ready' : phononLoading ? 'Loading model…' : 'Load Phonon Model'}</button>
        <button onClick={onGeneratePhonon} disabled={!phononLoaded || !phononVoice || phononGenerating || phononLoading} className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold"><i className={`fa-solid ${phononGenerating ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} mr-2`}></i>{phononGenerating ? 'Generating & syncing…' : 'Generate Narration + Auto-Sync Captions'}</button>
        {phononStatus && <p className="text-[10px] text-slate-300 leading-relaxed break-words">{phononStatus}</p>}
        <p className="text-[10px] text-slate-500">Uses the compact q8 model with WebAssembly for better compatibility on phones and lower-memory computers. First download may take a while. Keep this tab open.</p>
      </div>

      <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><i className="fa-solid fa-music text-purple-400 text-sm"></i><span className="text-xs font-bold text-slate-200">Background Music</span></div>
          <span className="text-[10px] text-slate-500">{bg ? 'Selected' : 'None Selected'}</span>
        </div>
        {bg ? (
          <div className="text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
            <div className="truncate flex items-center gap-2"><i className="fa-solid fa-compact-disc text-purple-400 animate-spin"></i><span className="truncate font-medium text-slate-200">{bg.name}</span></div>
            <button onClick={() => onBg(null)} className="text-slate-500 hover:text-red-400 text-xs px-1"><i className="fa-solid fa-xmark"></i></button>
          </div>
        ) : (
          <label className="block text-center text-xs py-2 rounded-lg border border-dashed border-slate-700 hover:border-purple-500 text-slate-400 cursor-pointer">
            <i className="fa-solid fa-upload mr-2"></i>Upload music
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files[0] && onBg(e.target.files[0])} />
          </label>
        )}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-slate-400"><span>Music Volume</span><span>{Math.round(bgVol * 100)}%</span></div>
          <input type="range" min="0" max="1" step="0.05" value={bgVol} onChange={(e) => onBgVol(parseFloat(e.target.value))} className="w-full accent-purple-500 h-1.5" />
        </div>
      </div>
    </div>
  );
}
