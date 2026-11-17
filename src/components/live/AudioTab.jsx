const fmt = (d) => (d ? `${d.toFixed(1)}s` : '');

export default function AudioTab({ voice, bg, bgVol, onVoice, onBg, onBgVol, onSync, cartesiaKey, cartesiaVoices = [], cartesiaVoice, onCartesiaVoice, onLoadCartesiaVoices, loadingVoices, onGenerateCartesia, generating, speechStatus, speechSpeed, onSpeechSpeed, speechVolume, onSpeechVolume, speechEmotion, onSpeechEmotion, speechLanguage, onSpeechLanguage, pronunciationDictId, onPronunciationDictId, onPreviewCartesia, previewUrl, previewing, cloneName, onCloneName, cloneFile, onCloneFile, onCloneVoice, cloning }) {
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

      <div className="p-3.5 rounded-xl border border-violet-500/30 bg-violet-950/10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><i className="fa-solid fa-wave-square text-violet-300"></i><span className="text-xs font-bold text-slate-100">Cartesia AI Narration</span></div>
          <span className="text-[10px] px-2 py-0.5 rounded-full border text-violet-200 bg-violet-500/10 border-violet-500/30">Sonic 3.6</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">Generate a separate Cartesia voice clip for every scene. Cartesia returns native word-level timestamps with the audio, so captions stay synchronized without a separate local AI model.</p>
        {!cartesiaKey && <p className="text-[10px] text-amber-300">Add your Cartesia API key in Settings → API Settings.</p>}
        <div className="flex gap-2">
          <select value={cartesiaVoice} onChange={(e) => onCartesiaVoice(e.target.value)} className="min-w-0 flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200">
            <option value="">Select a Cartesia voice…</option>
            {cartesiaVoices.map((v) => <option key={v.id} value={v.id}>{v.name}{v.is_owner ? ' · My voice' : ''}{v.language ? ` · ${v.language}` : ''}</option>)}
          </select>
          <button type="button" onClick={onLoadCartesiaVoices} disabled={!cartesiaKey || loadingVoices} className="shrink-0 px-3 rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-200 disabled:opacity-40 text-xs font-semibold"><i className={`fa-solid ${loadingVoices ? 'fa-spinner fa-spin' : 'fa-rotate'} mr-1`}></i> {loadingVoices ? 'Loading' : 'Refresh'}</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] text-slate-400">Speech speed <span className="text-violet-300">{Number(speechSpeed).toFixed(2)}×</span>
            <input type="range" min="0.6" max="1.5" step="0.05" value={speechSpeed} onChange={(e) => onSpeechSpeed(Number(e.target.value))} className="mt-2 w-full accent-violet-500" />
          </label>
          <label className="text-[10px] text-slate-400">Volume <span className="text-violet-300">{Number(speechVolume).toFixed(2)}×</span>
            <input type="range" min="0.5" max="2" step="0.05" value={speechVolume} onChange={(e) => onSpeechVolume(Number(e.target.value))} className="mt-2 w-full accent-violet-500" />
          </label>
        </div>
        <label className="block text-[10px] text-slate-400">Speech language / locale
          <select value={speechLanguage} onChange={(e) => onSpeechLanguage(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200">
            <option value="en">English · Auto</option><option value="en-US">English · US</option><option value="en-GB">English · UK</option><option value="en-IN">English · India</option><option value="en-AU">English · Australia</option>
            <option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="pt">Portuguese</option><option value="hi">Hindi</option><option value="ja">Japanese</option><option value="zh">Chinese</option>
          </select>
        </label>
        <label className="block text-[10px] text-slate-400">Pronunciation dictionary ID <span className="text-slate-600">(optional)</span>
          <input value={pronunciationDictId} onChange={(e) => onPronunciationDictId(e.target.value)} placeholder="Cartesia pronunciation dictionary ID" className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200" />
        </label>
        <label className="block text-[10px] text-slate-400">Voice emotion / delivery
          <select value={speechEmotion} onChange={(e) => onSpeechEmotion(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200">
            {['neutral','calm','happy','excited','enthusiastic','curious','content','peaceful','serene','grateful','sympathetic','mysterious','angry','frustrated','sad','nostalgic','apologetic','hesitant','confused','anxious','scared','proud','confident','skeptical','contemplative','determined'].map((v) => <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
          </select>
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={onPreviewCartesia} disabled={!cartesiaKey || !cartesiaVoice || previewing || generating} className="flex-1 py-2 rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-200 disabled:opacity-40 text-xs font-semibold"><i className={`fa-solid ${previewing ? 'fa-spinner fa-spin' : 'fa-play'} mr-1.5`}></i>{previewing ? 'Generating preview…' : 'Test selected voice'}</button>
        </div>
        {previewUrl && <audio key={previewUrl} controls preload="none" src={previewUrl} className="w-full h-8" />}
        <button onClick={onGenerateCartesia} disabled={!cartesiaKey || !cartesiaVoice || generating || loadingVoices} className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold"><i className={`fa-solid ${generating ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} mr-2`}></i>{generating ? 'Generating narration & syncing captions…' : 'Generate All Scene Narration + Captions'}</button>
        {speechStatus && <p className="text-[10px] text-slate-300 leading-relaxed break-words">{speechStatus}</p>}
        <div className="border-t border-slate-800 pt-3 space-y-2">
          <p className="text-[11px] font-semibold text-slate-200"><i className="fa-solid fa-fingerprint text-violet-300 mr-1.5"></i>Clone a Voice</p>
          <p className="text-[10px] text-slate-500">Upload a clean recording (maximum 16 MB). Only clone a voice you own or have explicit permission to use. Cloned voices are created as private voices.</p>
          <input value={cloneName} onChange={(e) => onCloneName(e.target.value)} placeholder="Name for your cloned voice" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200" />
          <input type="file" accept="audio/flac,audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/mp4" onChange={(e) => onCloneFile(e.target.files?.[0] || null)} className="w-full text-[10px] text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-slate-200" />
          {cloneFile && <p className="text-[10px] text-slate-500">{cloneFile.name} · {(cloneFile.size / 1048576).toFixed(1)} MB</p>}
          <button type="button" onClick={onCloneVoice} disabled={!cartesiaKey || !cloneName.trim() || !cloneFile || cloning} className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 text-xs font-semibold"><i className={`fa-solid ${cloning ? 'fa-spinner fa-spin' : 'fa-user-plus'} mr-1.5`}></i>{cloning ? 'Cloning voice…' : 'Create private voice clone'}</button>
        </div>
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
