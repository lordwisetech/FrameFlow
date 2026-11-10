import { useEffect, useRef, useState } from 'react';

import { createId } from '../../utils/id';
import { saveMediaAsset } from '../../services/projectStore';

async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
const titleOf = (item) => item.title || item.name || item.description || 'Untitled media';

export default function SearchSwapTab({ seed, sceneNumber, apiKey, onApply, onAudioApply }) {
  const [kind, setKind] = useState('video');
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('all');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [preview, setPreview] = useState('');
  const audioRef = useRef(null);

  useEffect(() => {
    if (seed?.n) { setKind('video'); setQuery(seed.q || ''); runSearch(seed.q || ''); }
  }, [seed?.n]); // eslint-disable-line

  useEffect(() => {
    if (!preview || !audioRef.current) return;
    const audio = audioRef.current;
    if (audio.canPlayType('application/vnd.apple.mpegurl')) { audio.src = preview; return; }
    const Hls = window.Hls;
    if (Hls?.isSupported()) {
      const hls = new Hls({ enableWorker: false, maxBufferLength: 20 });
      hls.loadSource(preview); hls.attachMedia(audio);
      return () => hls.destroy();
    }
  }, [preview]);

  const runSearch = async (term = query) => {
    const q = term.trim();
    if (!q) return;
    setError(''); setResults([]); setStatus('Searching connected libraries…'); setPreview('');
    const tasks = [];
    if (kind === 'video') {
      if (provider === 'all' || provider === 'coverr') tasks.push(api(`/api/coverr/search?q=${encodeURIComponent(q)}`).then(d => (d.hits || []).map(x => ({ ...x, provider: 'Coverr', mediaType: 'video', previewUrl: x.urls?.mp4_preview || x.urls?.mp4, downloadUrl: x.urls?.mp4_download || x.urls?.mp4, image: x.thumbnail || x.poster }))));
      if ((provider === 'all' || provider === 'pixabay') && apiKey) tasks.push(fetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(q)}&per_page=18&safesearch=true`).then(async r=>{if(!r.ok)throw new Error(`Pixabay returned HTTP ${r.status}`);return r.json();}).then(d=>(d.hits||[]).map(x=>({ ...x, provider:'Pixabay', mediaType:'video', previewUrl:x.videos?.small?.url||x.videos?.tiny?.url, downloadUrl:x.videos?.medium?.url||x.videos?.small?.url, image:x.userImageURL, duration:x.duration, title:(x.tags||'Pixabay video').split(',')[0] }))));
    } else if (provider === 'all' || provider === 'epidemic') {
      tasks.push(api(`/api/epidemic/search?type=${kind === 'sfx' ? 'sfx' : 'music'}&q=${encodeURIComponent(q)}`).then(d => {
        const list = kind === 'sfx' ? (d.soundEffects || d.results || []) : (d.tracks || d.results || []);
        return list.map(x => ({ ...x, provider: 'Epidemic Sound', mediaType: kind, image: x.images?.S || x.images?.default }));
      }));
    }
    try {
      const settled = await Promise.allSettled(tasks);
      const merged = settled.flatMap(x => x.status === 'fulfilled' ? x.value : []);
      const failures = settled.filter(x => x.status === 'rejected').map(x => x.reason.message);
      setResults(merged);
      setStatus(merged.length ? `${merged.length} results found.` : failures[0] || 'No results found.');
      if (failures.length) setError(failures.join(' · '));
    } catch (e) { setStatus(''); setError(e.message); }
  };

  const useVideo = async (item) => {
    setBusy(item.id); setError('');
    try {
      const url = item.downloadUrl || item.previewUrl;
      if (!url) throw new Error('This result has no downloadable video URL.');
      const downloadTarget = item.provider === 'Coverr' ? `/api/coverr/download?url=${encodeURIComponent(url)}` : url;
      const response = await fetch(downloadTarget);
      if (!response.ok) throw new Error(`Video download failed (${response.status}).`);
      const blob = await response.blob();
      if (!blob.size || (!blob.type.startsWith('video/') && blob.type !== 'application/octet-stream')) throw new Error('The provider did not return a video file.');
      const id = createId();
      const asset = { id, title: titleOf(item), source: item.provider, sourceUrl: url, mimeType: blob.type || 'video/mp4', size: blob.size, duration: item.duration || 0, width: item.max_width || 0, height: item.max_height || 0, downloadedAt: Date.now(), blob };
      await saveMediaAsset(asset);
      onApply?.(asset);
      setStatus(`Downloaded and applied to Scene #${sceneNumber}.`);
    } catch (e) { setError(`${e.message} If the browser blocks the provider download, run the app over HTTPS or use another result.`); }
    finally { setBusy(''); }
  };

  const previewAudio = async (item) => {
    setBusy(item.id); setError('');
    try {
      const data = await api(`/api/epidemic/stream/${kind === 'sfx' ? 'sfx' : 'music'}/${encodeURIComponent(item.id)}`);
      setPreview(data.url || '');
      setStatus(data.url ? `Preview ready: ${titleOf(item)}` : 'Preview URL was not returned.');
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  const useAudio = async (item) => {
    setBusy(item.id); setError('');
    try {
      const data = await api(`/api/epidemic/download/${kind === 'sfx' ? 'sfx' : 'music'}/${encodeURIComponent(item.id)}`);
      if (!data.url) throw new Error('No download URL was returned.');
      const response = await fetch(`/api/epidemic/audio?url=${encodeURIComponent(data.url)}`);
      if (!response.ok) throw new Error(`Audio download failed (${response.status}).`);
      const blob = await response.blob();
      const filename = `${titleOf(item).replace(/[^a-z0-9-_]/gi, '_')}.mp3`;
      const file = new File([blob], filename, { type: blob.type || 'audio/mpeg' });
      const assetId = createId();
      await saveMediaAsset({ id: assetId, title: titleOf(item), source: 'Epidemic Sound', sourceUrl: data.url, mimeType: blob.type || 'audio/mpeg', size: blob.size, downloadedAt: Date.now(), blob });
      onAudioApply?.(file);
      setStatus(`Downloaded and added "${titleOf(item)}" to background audio. It is also saved in Resources.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  const changeKind = (next) => { setKind(next); setProvider(next === 'video' ? 'all' : 'epidemic'); setResults([]); setStatus(''); setError(''); setPreview(''); };

  return <div className="space-y-4 min-w-0">
    <div className="rounded-xl border border-indigo-500/25 bg-indigo-950/20 p-3">
      <div className="text-xs font-bold text-slate-100 flex items-center gap-2"><i className="fa-solid fa-wand-magic-sparkles text-indigo-300"/> Search Swap</div>
      <p className="text-[10px] text-slate-400 mt-1">Search video, music and sound effects from connected providers without leaving the editor.</p>
    </div>
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950 border border-slate-800 p-1">
      {['video','music','sfx'].map(k => <button key={k} onClick={() => changeKind(k)} className={`py-2 rounded-lg text-[11px] font-semibold capitalize ${kind===k?'bg-indigo-600 text-white':'text-slate-400'}`}>{k === 'sfx' ? 'Sound FX' : k}</button>)}
    </div>
    <div className="flex gap-2 min-w-0">
      <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runSearch()} placeholder={kind==='video'?'Search stock videos…':'Describe the sound or music…'} className="min-w-0 flex-1 w-0 bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-slate-100"/>
      <button onClick={()=>runSearch()} className="shrink-0 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold"><i className="fa-solid fa-search mr-1"/>Search</button>
    </div>
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-slate-500">Sources</span>
      <select value={provider} onChange={e=>setProvider(e.target.value)} className="max-w-[70%] bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200">
        {kind==='video' ? <><option value="all">All video providers</option><option value="coverr">Coverr</option><option value="pixabay">Pixabay</option></> : <option value="epidemic">Epidemic Sound</option>}
      </select>
    </div>
    {kind==='video' && !apiKey && <p className="text-[9px] text-slate-500">Pixabay is not connected yet. Add its key in Settings to include it in combined searches.</p>}
    {status && <p className="text-[11px] text-slate-400">{status}</p>}
    {error && <p className="text-[10px] leading-relaxed text-amber-300 bg-amber-950/20 rounded-lg p-2">{error}</p>}
    {preview && <div className="rounded-xl border border-slate-800 p-3 space-y-2"><p className="text-[11px] text-slate-300">Epidemic Sound preview stream</p><audio ref={audioRef} controls autoPlay className="w-full"/></div>}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {results.map(item => <article key={`${item.provider}-${item.id}`} className="min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70">
        {kind==='video' ? <video src={item.previewUrl} poster={item.image} controls playsInline preload="none" className="w-full aspect-video object-cover bg-black"/> : <div className="h-24 flex items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950"><i className={`fa-solid ${kind==='sfx'?'fa-volume-high':'fa-music'} text-3xl text-indigo-300`}/></div>}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2"><span className="text-[9px] rounded-full bg-slate-800 px-2 py-1 text-indigo-200">{item.provider}</span>{item.duration || item.length ? <span className="text-[9px] text-slate-500">{Math.round(item.duration || item.length/1000)}s</span>:null}</div>
          <p className="text-xs font-semibold text-slate-100 line-clamp-2">{titleOf(item)}</p>
          {kind==='video' ? <button disabled={!!busy} onClick={()=>useVideo(item)} className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold disabled:opacity-50">{busy===item.id?'Downloading…':'Use Video · Replace Scene'}</button> :
            <div className="grid grid-cols-2 gap-2"><button disabled={!!busy} onClick={()=>previewAudio(item)} className="py-2 rounded-lg border border-slate-700 text-slate-200 text-[11px] disabled:opacity-50">{busy===item.id?'Loading…':'Preview'}</button><button disabled={!!busy || item.isPreviewOnly} onClick={()=>useAudio(item)} className="py-2 rounded-lg bg-indigo-600 text-white text-[11px] font-bold disabled:opacity-40">{item.isPreviewOnly?'Preview only':busy===item.id?'Adding…':'Add to Timeline'}</button></div>}
          {item.isPreviewOnly && <p className="text-[9px] text-amber-300">Preview-only track — your current Epidemic access does not include downloads.</p>}
        </div>
      </article>)}
    </div>
    {kind!=='video' && <p className="text-[9px] text-amber-300/90 leading-relaxed">Epidemic Sound's free developer tier is for prototyping only, includes up to 50 downloads and does not grant a commercial publishing licence. Do not publish exported videos containing these tracks until you have the required licence.</p>}
  </div>;
}
