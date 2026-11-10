import { useEffect, useMemo, useState } from 'react';
import { deleteMediaAsset, getMediaBlob, listMediaAssets, saveMediaAsset } from '../../services/projectStore';

function LocalVideoPreview({ assetId }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    getMediaBlob(assetId).then((blob) => {
      if (active && blob) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
    }).catch(() => {});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [assetId]);
  return <video src={url || undefined} muted playsInline controls preload="metadata" className="w-24 h-20 object-cover rounded-lg bg-slate-950 shrink-0" />;
}

const formatBytes = (bytes = 0) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};


const makeAssetId = (source, id) => `${String(source || 'media').toLowerCase()}-${String(id)}`;

const tokensFor = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .filter((word) => word.length > 1 && !['the', 'and', 'with', 'for', 'from'].includes(word));

function relevanceScore(hit, query, source) {
  const text = source === 'Coverr'
    ? [hit.title, hit.description, ...(Array.isArray(hit.tags) ? hit.tags : [])].join(' ')
    : [hit.tags, hit.user].join(' ');
  const haystack = ` ${String(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  const terms = tokensFor(query);
  if (!terms.length) return 1;
  const matches = terms.filter((term) => haystack.includes(` ${term} `));
  return matches.length / terms.length;
}

export default function PixabayTab({ apiKey, coverrKey, seed, sceneNumber, onApply }) {
  const [view, setView] = useState('search');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [status, setStatus] = useState('');
  const [applied, setApplied] = useState('');
  const [assets, setAssets] = useState([]);
  const [busy, setBusy] = useState({});
  const [error, setError] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [lastQuery, setLastQuery] = useState('');

  const assetBySourceId = useMemo(() => new Map(
    assets.map((asset) => [`${asset.source || 'Pixabay'}:${String(asset.sourceMediaId ?? asset.pixabayId ?? '')}`, asset])
  ), [assets]);

  const refreshAssets = async () => {
    try { setAssets(await listMediaAssets()); }
    catch (e) { setError(`Could not open local media library: ${e.message}`); }
  };
  useEffect(() => { refreshAssets(); }, []);

  const search = async (rawQuery = query) => {
    const q = rawQuery.trim();
    if (!q) { setStatus('Enter a search phrase first.'); return; }
    setApplied(''); setError(''); setLastQuery(q); setHits([]);
    const requests = [];
    if (apiKey) {
      requests.push((async () => {
        const url = `https://pixabay.com/api/videos/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(q)}&per_page=30&safesearch=true`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Pixabay returned HTTP ${response.status}`);
        const data = await response.json();
        return (data.hits || []).map((hit) => ({ ...hit, source: 'Pixabay' }));
      })());
    }
    if (coverrKey) {
      requests.push((async () => {
        const url = `https://api.coverr.co/videos?query=${encodeURIComponent(q)}&page=0&page_size=30&urls=true&sort=popular`;
        const response = await fetch(url, { headers: { 'x-api-key': coverrKey } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const detail = data?.message || data?.error || `HTTP ${response.status}`;
          throw new Error(`Coverr: ${detail}`);
        }
        return (data.hits || []).map((hit) => ({ ...hit, source: 'Coverr' }));
      })());
    }
    if (!requests.length) {
      setStatus('Add your Pixabay and/or Coverr API key in Settings to search videos.');
      return;
    }
    setStatus('Searching Pixabay and Coverr…');
    const settled = await Promise.allSettled(requests);
    const combined = [];
    const providerErrors = [];
    settled.forEach((result) => {
      if (result.status === 'fulfilled') combined.push(...result.value);
      else providerErrors.push(result.reason?.message || 'A provider search failed.');
    });

    // Keep results tied to the actual query. A provider returning unrelated
    // popular content must never make it into the visible result list.
    const relevant = combined
      .map((hit) => ({ ...hit, relevance: relevanceScore(hit, q, hit.source) }))
      .filter((hit) => hit.relevance >= (tokensFor(q).length > 1 ? 0.5 : 1))
      .sort((a, b) => b.relevance - a.relevance);

    const unique = [];
    const seen = new Set();
    for (const hit of relevant) {
      const key = `${hit.source}:${hit.id}`;
      if (!seen.has(key)) { seen.add(key); unique.push(hit); }
    }
    setHits(unique);
    if (unique.length) {
      setStatus(providerErrors.length
        ? `${unique.length} relevant result(s). Some providers could not be reached: ${providerErrors.join(' · ')}`
        : `${unique.length} relevant result(s) for “${q}”.`);
    } else if (providerErrors.length) {
      setStatus(`No results returned. ${providerErrors.join(' · ')}`);
    } else {
      setStatus(`No relevant videos found for “${q}”. Try a more specific or different phrase.`);
    }
  };

  useEffect(() => {
    if (seed?.n) { setView('search'); setQuery(seed.q || ''); search(seed.q || ''); }
  }, [seed?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  const downloadAsset = async (hit, applyAfter = false) => {
    const source = hit.source || 'Pixabay';
    const sourceMediaId = String(hit.id);
    const existing = assetBySourceId.get(`${source}:${sourceMediaId}`);
    if (existing) {
      if (applyAfter) { onApply?.(existing); setApplied(`Saved ${source} clip applied to Scene #${sceneNumber}.`); }
      return existing;
    }
    const busyId = `${source}:${sourceMediaId}`;
    if (busy[busyId]) return null;
    setBusy((previous) => ({ ...previous, [busyId]: true }));
    setError('');
    try {
      let videoUrl = '';
      let width = 0;
      let height = 0;
      let duration = hit.duration || 0;
      if (source === 'Coverr') {
        videoUrl = hit.urls?.mp4_download || hit.urls?.mp4 || hit.urls?.mp4_preview;
        width = hit.max_width || 0;
        height = hit.max_height || 0;
      } else {
        const video = hit.videos?.medium || hit.videos?.small || hit.videos?.tiny || hit.videos?.large;
        videoUrl = video?.url || '';
        width = video?.width || 0;
        height = video?.height || 0;
      }
      if (!videoUrl) throw new Error(`${source} did not provide a downloadable video URL for this result.`);
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error(`Video download failed (${response.status}).`);
      const blob = await response.blob();
      if (!blob.size) throw new Error('The downloaded video file was empty.');
      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        const freeBytes = (estimate.quota || 0) - (estimate.usage || 0);
        if (estimate.quota && blob.size > freeBytes * 0.9) {
          throw new Error('There is not enough free browser storage for this video. Delete unused downloads and try again.');
        }
      }
      if (blob.type && !blob.type.startsWith('video/') && blob.type !== 'application/octet-stream') {
        throw new Error('The source did not return a video file. Try another result.');
      }
      const title = hit.title || (hit.tags || 'Stock video').split(',')[0].trim() || `${source} video`;
      const asset = {
        id: makeAssetId(source, sourceMediaId),
        sourceMediaId,
        pixabayId: source === 'Pixabay' ? sourceMediaId : undefined,
        title,
        tags: Array.isArray(hit.tags) ? hit.tags.join(', ') : (hit.tags || ''),
        user: hit.user || '',
        duration,
        width,
        height,
        sourceUrl: videoUrl,
        source,
        mimeType: blob.type || 'video/mp4',
        size: blob.size,
        downloadedAt: Date.now(),
        blob,
      };
      await saveMediaAsset(asset);
      try { await navigator.storage?.persist?.(); } catch {}
      await refreshAssets();
      if (applyAfter) {
        onApply?.(asset);
        setApplied(`Downloaded and applied to Scene #${sceneNumber}.`);
      }
      return asset;
    } catch (e) {
      setError(`${e.message} If the provider blocks browser downloads, try another result or use the provider's download link.`);
      return null;
    } finally {
      setBusy((previous) => { const next = { ...previous }; delete next[busyId]; return next; });
    }
  };

  const applySaved = (asset) => {
    onApply?.(asset);
    setApplied(`Local clip applied to Scene #${sceneNumber}. It is available offline on this device.`);
  };

  const removeAsset = async (asset) => {
    if (!window.confirm(`Delete “${asset.title}” from this device's media library?`)) return;
    try { await deleteMediaAsset(asset.id); await refreshAssets(); }
    catch (e) { setError(`Could not delete this file: ${e.message}`); }
  };

  const tabCls = (on) => `px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors ${on ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`;
  const visibleHits = hits.filter((hit) => sourceFilter === 'all' || hit.source === sourceFilter);

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <label className="text-xs font-semibold text-slate-200">Search Swap</label>
          <p className="text-[10px] text-slate-500 mt-0.5">Search Pixabay and Coverr together. Only keyword-matched clips are shown.</p>
        </div>
        <span className="text-[10px] text-slate-400 bg-slate-950 border border-slate-800 rounded-full px-2.5 py-1 shrink-0">{assets.length} saved</span>
      </div>

      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
        <button onClick={() => { setView('search'); setError(''); }} className={`flex-1 ${tabCls(view === 'search')}`}>
          <i className="fa-solid fa-magnifying-glass mr-1.5"></i>Search videos
        </button>
        <button onClick={() => { setView('library'); setError(''); refreshAssets(); }} className={`flex-1 ${tabCls(view === 'library')}`}>
          <i className="fa-solid fa-folder-open mr-1.5"></i>Downloads ({assets.length})
        </button>
      </div>

      {view === 'search' && <>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-[11px] font-semibold text-slate-300">Video sources: {apiKey ? 'Pixabay' : ''}{apiKey && coverrKey ? ' + ' : ''}{coverrKey ? 'Coverr' : ''}{!apiKey && !coverrKey ? 'None connected' : ''}</label>
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button onClick={() => setSourceFilter('all')} className={tabCls(sourceFilter === 'all')}>All</button>
              <button onClick={() => setSourceFilter('Pixabay')} className={tabCls(sourceFilter === 'Pixabay')}>Pixabay</button>
              <button onClick={() => setSourceFilter('Coverr')} className={tabCls(sourceFilter === 'Coverr')}>Coverr</button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Search e.g. waterfall, coding, city at night…"
              className="min-w-0 w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
            <button onClick={() => search()} className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold">
              <i className="fa-solid fa-magnifying-glass mr-1.5"></i>Search
            </button>
          </div>
        </div>
        {status && <p className="text-[11px] text-slate-400 text-center py-2 break-words">{status}</p>}
        {visibleHits.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
          {visibleHits.map((hit) => {
            const source = hit.source || 'Pixabay';
            const videoUrl = source === 'Coverr'
              ? (hit.urls?.mp4_preview || hit.urls?.mp4 || '')
              : (hit.videos?.medium?.url || hit.videos?.small?.url || hit.videos?.tiny?.url || '');
            const saved = assetBySourceId.get(`${source}:${String(hit.id)}`);
            const busyId = `${source}:${String(hit.id)}`;
            const downloading = !!busy[busyId];
            const title = hit.title || (hit.tags || 'Stock video').split(',')[0];
            const poster = hit.thumbnail || hit.poster || '';
            return <article key={busyId} className="min-w-0 rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
              {videoUrl ? <video src={videoUrl} poster={poster || undefined} muted loop playsInline controls preload="none" className="w-full aspect-video object-cover bg-slate-950" /> :
                <div className="w-full aspect-video bg-slate-950 flex items-center justify-center text-slate-600 text-xs">Preview unavailable</div>}
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={`inline-block mb-1 text-[9px] rounded px-1.5 py-0.5 ${source === 'Coverr' ? 'bg-violet-500/15 text-violet-300' : 'bg-blue-500/15 text-blue-300'}`}>{source}</span>
                    <p className="text-[11px] text-slate-100 font-semibold leading-snug">{title}</p>
                    <p className="text-[9px] text-slate-500 mt-1 line-clamp-2">{Array.isArray(hit.tags) ? hit.tags.join(', ') : hit.tags || hit.description || ''}</p>
                  </div>
                  <span className="text-[9px] text-slate-500 shrink-0">{Math.round(hit.duration || 0)}s</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button disabled={downloading} onClick={() => downloadAsset(hit)} className="flex-1 py-2 rounded-lg text-[10px] font-semibold border border-slate-700 text-slate-200 disabled:opacity-50">
                    {downloading ? 'Saving…' : saved ? '✓ Saved' : '↓ Download'}
                  </button>
                  <button disabled={downloading} onClick={() => downloadAsset(hit, true)} className="flex-1 py-2 rounded-lg text-[10px] font-semibold bg-indigo-600 text-white disabled:opacity-50">
                    Apply to scene
                  </button>
                </div>
                {hit.max_width || hit.videos ? <p className="text-[9px] text-slate-500">{hit.max_width ? `${hit.max_width} × ${hit.max_height}` : (() => { const v = hit.videos?.medium || hit.videos?.small || hit.videos?.tiny; return v?.width ? `${v.width} × ${v.height}` : ''; })()}</p> : null}
              </div>
            </article>;
          })}
        </div>}
      </>}

      {view === 'library' && <>
        {assets.length === 0 ? <div className="text-center py-12 text-slate-500 text-xs">
          <i className="fa-solid fa-cloud-arrow-down text-2xl mb-2"></i>
          <p>No downloaded videos yet.</p><p className="mt-1">Search videos and tap Download to keep clips on this device.</p>
        </div> : <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {assets.map((asset) => <article key={asset.id} className="flex flex-col sm:flex-row gap-2 p-2 rounded-xl border border-slate-800 bg-slate-900">
            <LocalVideoPreview assetId={asset.id} />
            <div className="min-w-0 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-[11px] text-slate-100 font-semibold">{asset.title}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">{asset.source || 'Pixabay'} · {formatBytes(asset.size)} · {asset.width || '—'} × {asset.height || '—'}</p>
                <p className="text-[9px] text-emerald-400 mt-1"><i className="fa-solid fa-circle-check mr-1"></i>Saved on this device</p>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <button onClick={() => applySaved(asset)} className="text-[10px] px-3 py-2 rounded-md bg-indigo-600 text-white font-semibold">Apply to scene</button>
                <button onClick={() => removeAsset(asset)} className="text-[10px] px-3 py-2 rounded-md text-rose-400 border border-rose-900/60">Delete</button>
              </div>
            </div>
          </article>)}
        </div>}
      </>}

      {applied && <p className="text-[10px] text-emerald-400">{applied}</p>}
      {error && <p className="text-[10px] text-rose-300 bg-rose-950/30 border border-rose-900/50 rounded-lg p-2 break-words">{error}</p>}
      <p className="text-[9px] text-slate-600 leading-relaxed">Downloaded media is stored in this browser on this device. Clearing site data or uninstalling the browser can remove it.</p>
    </div>
  );
}
