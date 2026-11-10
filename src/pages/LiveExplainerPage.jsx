import { useEffect, useMemo, useRef, useState } from 'react';
import usePlayback from '../hooks/usePlayback';
import useVideoPool from '../hooks/useVideoPool';
import { DEFAULT_SCRIPT, makeScene, withStarts, sceneIndexAt, downloadBlob } from '../utils/helpers';
import { exportVideo } from '../utils/exportVideo';
import StudioHeader from '../components/live/StudioHeader';
import Sidebar from '../components/live/Sidebar';
import ScriptTab from '../components/live/ScriptTab';
import ScenesTab from '../components/live/ScenesTab';
import PixabayTab from '../components/live/PixabayTab';
import AudioTab from '../components/live/AudioTab';
import ResourcesTab from '../components/live/ResourcesTab';
import CaptionSettings from '../components/live/CaptionSettings';
import { DEFAULT_CAPTION } from '../utils/captionStyle';
import PreviewPlayer from '../components/live/PreviewPlayer';
import Timeline from '../components/live/Timeline';
import SettingsModal from '../components/live/SettingsModal';
import ExportOverlay from '../components/live/ExportOverlay';
import AIDirector from '../components/live/AIDirector';
import { generateGeminiSceneSpeech, alignGeminiSpeech, combineAudioBlobs } from '../services/geminiSpeech';
import { loadKokoro, generateKokoroAudio } from '../services/kokoroSpeech';
import { loadSpeechAligner, alignSpeechBlob } from '../services/speechAlignment';
import { saveProject } from '../services/projectStore';

const loadAudio = (file, set) => {
  if (!file) return set(null);
  const url = URL.createObjectURL(file);
  const a = new Audio(url);
  a.onloadedmetadata = () => set({ url, file, name: file.name, duration: a.duration });
};

export default function LiveExplainerPage({ onBack, project, onProjectChange }) {
  const initial = project?.data || {};
  const [projectName, setProjectName] = useState(project?.name || 'Untitled project');
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [raw, setRaw] = useState(initial.raw || []);
  const scenes = useMemo(() => withStarts(raw), [raw]);
  const total = useMemo(() => scenes.reduce((a, s) => a + s.duration, 0), [scenes]);

  const [script, setScript] = useState(initial.script || DEFAULT_SCRIPT);
  const [tab, setTab] = useState('script');
  const [aspect, setAspect] = useState(initial.aspect || '16:9');
  const [voice, setVoice] = useState(() => initial.voiceBlob ? { url: URL.createObjectURL(initial.voiceBlob), file: new File([initial.voiceBlob], 'saved-narration.mp3', { type: initial.voiceBlob.type || 'audio/mpeg' }), name: 'Saved narration', duration: 0 } : null);
  const [bg, setBg] = useState(() => initial.bgBlob ? { url: URL.createObjectURL(initial.bgBlob), file: new File([initial.bgBlob], 'saved-background.mp3', { type: initial.bgBlob.type || 'audio/mpeg' }), name: 'Saved background audio', duration: 0 } : null);
  const [bgVol, setBgVol] = useState(initial.bgVol ?? 0.2);
  const [voiceName, setVoiceName] = useState(initial.voiceName || 'Kore');
  const [speechStyle, setSpeechStyle] = useState(initial.speechStyle || 'Warm, clear, natural educational narrator.');
  const [speechSpeed, setSpeechSpeed] = useState(initial.speechSpeed || 1);
  const [generatingSpeech, setGeneratingSpeech] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('');
  const [kokoroVoice, setKokoroVoice] = useState(initial.kokoroVoice || 'af_heart');
  const [kokoroLoaded, setKokoroLoaded] = useState(false);
  const [kokoroLoading, setKokoroLoading] = useState(false);
  const [kokoroGenerating, setKokoroGenerating] = useState(false);
  const [kokoroStatus, setKokoroStatus] = useState('');
  const [alignmentLoaded, setAlignmentLoaded] = useState(false);
  const [alignmentLoading, setAlignmentLoading] = useState(false);
  const [kokoroPreviewing, setKokoroPreviewing] = useState(false);
  const [kokoroPreviewStatus, setKokoroPreviewStatus] = useState('');
  const [kokoroPreviewUrl, setKokoroPreviewUrl] = useState('');
  const previewUrlRef = useRef('');
  const [pixSeed, setPixSeed] = useState({ q: '', n: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [exp, setExp] = useState(null);
  const [caption, setCaption] = useState(() => {
    try { return { ...DEFAULT_CAPTION, ...(initial.caption || JSON.parse(localStorage.getItem('caption_style'))) }; } catch { return DEFAULT_CAPTION; }
  });
  useEffect(() => { localStorage.setItem('caption_style', JSON.stringify(caption)); }, [caption]);
  const [keys, setKeys] = useState(() => {
  let aiKeys = [];

  try {
    const saved = JSON.parse(localStorage.getItem('ai_api_keys'));
    if (Array.isArray(saved)) aiKeys = saved;
  } catch {}

  // Import an existing OpenRouter key from the old settings.
  if (aiKeys.length === 0) {
    const oldKey = localStorage.getItem('openrouter_key');
    if (oldKey) {
      aiKeys = [{
        id: 'legacy-openrouter',
        provider: 'openrouter',
        key: oldKey,
      }];
    }
  }

  return {
    pixabay: localStorage.getItem('pixabay_key') || '',
    coverr: localStorage.getItem('coverr_key') || '',
    aiKeys,
  };
});

  const pb = usePlayback(total);
  const pool = useVideoPool(scenes);
  const activeIndex = sceneIndexAt(scenes, pb.time);
  const active = scenes[activeIndex];

  // ---------- script -> scenes ----------
  const autoMatch = async (list) => {
    if (!keys.pixabay) return;
    for (const s of list) {
      try {
        const r = await fetch(`https://pixabay.com/api/videos/?key=${keys.pixabay}&q=${encodeURIComponent(s.keywords)}&per_page=3`);
        const d = await r.json();
        const url = d.hits?.[0]?.videos?.small?.url || d.hits?.[0]?.videos?.tiny?.url;
        if (url) setRaw((p) => p.map((x) => (x.id === s.id ? { ...x, videoUrl: url } : x)));
      } catch {}
    }
  };

  const parse = () => {
    const list = script.split(/\n+/).map((l) => l.trim()).filter(Boolean).map(makeScene);
    setRaw(list); pb.stop(); autoMatch(list);
  };
  useEffect(() => { if (!initial.raw?.length) parse(); }, []); // eslint-disable-line

  // Persist the complete editing state locally. Audio blobs are stored in IndexedDB with the project.
  useEffect(() => {
    if (!project?.id) return;
    setSaveStatus('Saving…');
    const timer = window.setTimeout(async () => {
      try {
        const updated = { ...project, name: projectName.trim() || 'Untitled project', updatedAt: Date.now(), data: { script, raw, aspect, caption, bgVol, voiceName, speechStyle, speechSpeed, kokoroVoice, voiceBlob: voice?.file || null, bgBlob: bg?.file || null } };
        await saveProject(updated);
        onProjectChange?.(updated);
        setSaveStatus('Saved');
      } catch (error) { console.error('Project autosave failed:', error); setSaveStatus('Save failed'); }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [project?.id, projectName, script, raw, aspect, caption, bgVol, voiceName, speechStyle, speechSpeed, kokoroVoice, voice?.file, bg?.file]);

  const updateScene = (id, patch) => setRaw((p) => p.map((s) => {
    if (s.id !== id) return s;
    const next = { ...s, ...patch };
    if (Object.prototype.hasOwnProperty.call(patch, 'text') && patch.text !== s.text) next.captionWords = undefined;
    return next;
  }));
  const addScene = () => setRaw((p) => [...p, makeScene('New scene', p.length)]);

  // AI Director actions are deliberately allowlisted; the assistant cannot execute code.
  const applyAIAction = (action) => {
    if (!action) return false;
    if (action.type === 'replace_script' && typeof action.script === 'string') {
      const list = action.script.split(/\n+/).map((line) => line.trim()).filter(Boolean).map(makeScene);
      setScript(action.script);
      setRaw(list);
      pb.stop();
      autoMatch(list);
      return true;
    }
    if (action.type === 'append_script' && typeof action.script === 'string') {
      const combined = [script.trim(), action.script.trim()].filter(Boolean).join('\n');
      setScript(combined);
      const additions = action.script.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line, index) => makeScene(line, raw.length + index));
      setRaw((previous) => [...previous, ...additions]);
      autoMatch(additions);
      return true;
    }
    if (action.type === 'add_scenes' && typeof action.script === 'string') {
      const additions = action.script.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line, index) => makeScene(line, raw.length + index));
      setRaw((previous) => [...previous, ...additions]);
      autoMatch(additions);
      return true;
    }
    if (action.type === 'update_scene') {
      const existing = raw.find((scene) => scene.id === action.sceneId);
      if (!existing) return false;
      const patch = { text: action.text };
      if (Number.isFinite(Number(action.duration))) patch.duration = Math.max(1, Math.min(120, Number(action.duration)));
      updateScene(action.sceneId, patch);
      return true;
    }
    if (action.type === 'add_scene' && typeof action.text === 'string') {
      const scene = makeScene(action.text, raw.length);
      if (Number.isFinite(Number(action.duration))) scene.duration = Math.max(1, Math.min(120, Number(action.duration)));
      setRaw((previous) => [...previous, scene]);
      return true;
    }
    return false;
  };

  const aiEditorContext = {
    script, aspect, totalDuration: total, activeScene: active ? { id: active.id, text: active.text, duration: active.duration } : null,
    scenes: scenes.map(({ id, text, duration, keywords }) => ({ id, text, duration, keywords })),
    hasVoiceover: !!voice, hasBackgroundMusic: !!bg, captionSettings: caption,
  };

  const generateAllSceneSpeech = async () => {
    const geminiKey = (keys.aiKeys || []).find((item) => item.provider === 'gemini' && item.key?.trim())?.key;
    if (!geminiKey) { setSpeechStatus('Add a Gemini API key in Settings first.'); return; }
    if (!raw.length) { setSpeechStatus('Parse your script into scenes first.'); return; }
    setGeneratingSpeech(true); setSpeechStatus('Starting Gemini narration…');
    try {
      const audioBlobs = [];
      const updated = [];
      for (let i = 0; i < raw.length; i++) {
        const scene = raw[i];
        setSpeechStatus(`Generating speech and aligning words for scene ${i + 1} of ${raw.length}…`);
        const audio = await generateGeminiSceneSpeech({ apiKey: geminiKey, text: scene.text, voiceName, style: speechStyle, speed: speechSpeed });
        const words = await alignGeminiSpeech({ apiKey: geminiKey, text: scene.text, audioBlob: audio });
        // Apply selected speed consistently to the clip and its word timestamps.
        const scaledWords = words.map((word) => ({ ...word, start: word.start / speechSpeed, end: word.end / speechSpeed }));
        const audioDuration = await new Promise((resolve, reject) => {
          const url = URL.createObjectURL(audio); const probe = new Audio(url);
          probe.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(probe.duration / speechSpeed); };
          probe.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read generated audio duration.')); };
        });
        updated.push({ ...scene, duration: Math.max(1, +audioDuration.toFixed(2)), captionWords: scaledWords });
        audioBlobs.push(audio);
      }
      const combinedFile = await combineAudioBlobs(audioBlobs, speechSpeed);
      setRaw(updated);
      loadAudio(combinedFile, setVoice);
      setSpeechStatus(`Done! Generated ${updated.length} scene narrations and synchronized word captions.`);
      setTab('captions');
    } catch (error) {
      console.error(error);
      setSpeechStatus(`Generation stopped: ${error.message}`);
    } finally { setGeneratingSpeech(false); }
  };

  const loadLocalKokoro = async () => {
    if (kokoroLoaded || kokoroLoading) return;
    setKokoroLoading(true);
    setKokoroStatus('Loading Kokoro. The first run downloads the model; later runs should use the browser cache.');
    try {
      await loadKokoro((progress) => setKokoroStatus(progress.message || 'Preparing Kokoro…'));
      setKokoroLoaded(true);
      setKokoroStatus('Kokoro is ready on this device. You can now generate narration offline while the cached model remains available.');
    } catch (error) {
      console.error('Kokoro load failed:', error);
      setKokoroStatus(`Could not load Kokoro: ${error.message}`);
    } finally { setKokoroLoading(false); }
  };

  const loadLocalAligner = async () => {
    if (alignmentLoaded) return true;
    if (alignmentLoading) return false;
    setAlignmentLoading(true);
    setKokoroStatus('Downloading / loading the separate offline word-sync model…');
    try {
      await loadSpeechAligner((progress) => setKokoroStatus(progress.message || 'Preparing offline word sync…'));
      setAlignmentLoaded(true);
      setKokoroStatus('Offline caption sync model is ready. It can analyse generated speech on this device.');
      return true;
    } catch (error) {
      console.error('Caption sync model load failed:', error);
      setKokoroStatus(`Could not load the offline caption sync model: ${error.message}`);
      throw error;
    } finally { setAlignmentLoading(false); }
  };

  const previewKokoroVoice = async () => {
    if (kokoroPreviewing || kokoroGenerating) return;
    setKokoroPreviewing(true);
    setKokoroPreviewStatus('Preparing voice sample…');
    try {
      if (!kokoroLoaded) await loadLocalKokoro();
      const sample = await generateKokoroAudio({
        text: 'Hello! This is a short preview of the selected Kokoro voice.',
        voice: kokoroVoice,
        speed: speechSpeed,
      });
      const url = URL.createObjectURL(sample);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = url;
      setKokoroPreviewUrl(url);
      setKokoroPreviewStatus('Voice sample ready. Press play to listen.');
    } catch (error) {
      console.error('Kokoro voice preview failed:', error);
      setKokoroPreviewStatus(`Preview failed: ${error.message}`);
    } finally { setKokoroPreviewing(false); }
  };

  const approximateWordTimings = (text, duration) => {
    const tokens = String(text || '').trim().split(/\s+/).filter(Boolean);
    const weights = tokens.map((word) => Math.max(1, word.length));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    let cursor = 0;
    return tokens.map((word, index) => {
      const start = cursor;
      cursor += duration * (weights[index] / totalWeight);
      return { word, start, end: index === tokens.length - 1 ? duration : cursor, index };
    });
  };

  const generateKokoroNarration = async () => {
    if (!kokoroLoaded) { setKokoroStatus('Load the Kokoro model first.'); return; }
    if (!raw.length) { setKokoroStatus('Parse your script into scenes first.'); return; }
    setKokoroGenerating(true);
    const audioBlobs = [];
    const updated = [];
    let approximateCount = 0;
    try {
      if (!alignmentLoaded) await loadLocalAligner();
      for (let i = 0; i < raw.length; i++) {
        const scene = raw[i];
        setKokoroStatus(`Generating Kokoro narration for scene ${i + 1} of ${raw.length}…`);
        const audio = await generateKokoroAudio({
          text: scene.text,
          voice: kokoroVoice,
          speed: speechSpeed,
          onProgress: (progress) => setKokoroStatus(`Scene ${i + 1}/${raw.length}: ${progress.message || 'Generating speech…'}`),
        });
        const context = new AudioContext();
        let duration;
        try { duration = (await context.decodeAudioData(await audio.arrayBuffer())).duration; }
        finally { await context.close(); }
        let captionWords;
        try {
          setKokoroStatus(`Analysing actual speech and synchronising words for scene ${i + 1} of ${raw.length}…`);
          captionWords = await alignSpeechBlob(audio, scene.text, (progress) => setKokoroStatus(`Scene ${i + 1}/${raw.length}: ${progress.message || 'Aligning spoken words…'}`));
        } catch (alignmentError) {
          console.warn(`Word alignment fallback for scene ${i + 1}:`, alignmentError);
          approximateCount++;
          captionWords = approximateWordTimings(scene.text, duration);
        }
        updated.push({ ...scene, duration: Math.max(1, +duration.toFixed(2)), captionWords });
        audioBlobs.push(audio);
      }
      const combinedFile = await combineAudioBlobs(audioBlobs, 1);
      setRaw(updated);
      loadAudio(combinedFile, setVoice);
      setKokoroStatus(approximateCount
        ? `Narration generated. ${updated.length - approximateCount} scene(s) received audio-based word timing; ${approximateCount} scene(s) used approximate timing because speech matching was inconclusive.`
        : `Done! Generated ${updated.length} local scene narrations and synchronised captions using word timestamps detected from the actual audio.`);
      setTab('captions');
    } catch (error) {
      console.error('Kokoro generation failed:', error);
      setKokoroStatus(`Generation stopped: ${error.message}`);
    } finally { setKokoroGenerating(false); }
  };

  const syncToVoice = () => {
    if (!voice?.duration || !raw.length) return;
    const d = +(voice.duration / raw.length).toFixed(2);
    setRaw((p) => p.map((s) => ({ ...s, duration: d })));
  };

  // ---------- audio + video sync with the playhead ----------
  useEffect(() => () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); }, []);

  const voiceEl = useRef(null), bgEl = useRef(null);
  useEffect(() => { voiceEl.current = voice ? new Audio(voice.url) : null; return () => voiceEl.current?.pause(); }, [voice]);
  useEffect(() => { bgEl.current = bg ? Object.assign(new Audio(bg.url), { loop: true }) : null; return () => bgEl.current?.pause(); }, [bg]);
  useEffect(() => { if (bgEl.current) bgEl.current.volume = bgVol; }, [bgVol, bg]);

  useEffect(() => {
    [voiceEl.current, bgEl.current].filter(Boolean).forEach((a) => {
      const t = a.loop && a.duration ? pb.time % a.duration : pb.time;
      if (Math.abs(a.currentTime - t) > 0.25) a.currentTime = t;
      if (pb.playing && a.paused) a.play().catch(() => {});
      if (!pb.playing && !a.paused) a.pause();
    });
    Object.entries(pool.current).forEach(([id, { video }]) => {
      if (!active || id !== active.id) { if (!video.paused) video.pause(); return; }
      const d = video.duration || Infinity, t = (pb.time - active.startTime) % d;
      if (!pb.playing || Math.abs(video.currentTime - t) > 0.3) { try { video.currentTime = t; } catch {} }
      if (pb.playing && video.paused) video.play().catch(() => {});
      if (!pb.playing && !video.paused) video.pause();
    });
  }, [pb.time, pb.playing, voice, bg, active?.id]); // eslint-disable-line

  // ---------- export ----------
  const doExport = async () => {
    if (!total) return alert('Nothing to render. Parse the script first.');
    pb.setPlaying(false); setExp({ p: 0, label: 'Starting…' });
    try {
      const { blob, missing } = await exportVideo({ scenes, aspect, voice, bg, bgVol, total, caption, onProgress: (p, label) => setExp({ p, label }) });
      downloadBlob(blob, 'explainer-studio-export.mp4');
      if (missing) alert(`${missing} clip(s) could not be downloaded (blocked by CORS) and were replaced with a black frame. Try Pixabay clips instead.`);
    } catch (e) {
      console.error(e); alert(`Export failed: ${e.message}`);
    } finally { setExp(null); }
  };

  return (
    <div className="studio-shell h-full flex flex-col overflow-hidden select-none">
      <StudioHeader onBack={onBack} onSettings={() => setShowSettings(true)} onExport={doExport} exporting={!!exp} projectName={projectName} onRename={setProjectName} saveStatus={saveStatus} />
      <div className="studio-workspace flex-1 flex overflow-hidden">
        <Sidebar tab={tab} onTab={setTab}>
          {tab === 'script' && <ScriptTab script={script} onChange={setScript} onParse={parse} />}
          {tab === 'scenes' && (
            <ScenesTab scenes={scenes} activeId={active?.id} onChange={updateScene} onAdd={addScene}
              onSwap={(q) => { setPixSeed((s) => ({ q, n: s.n + 1 })); setTab('pixabay'); }} />
          )}
          {tab === 'resources' && <ResourcesTab />}
          {tab === 'pixabay' && (
            <PixabayTab apiKey={keys.pixabay} coverrKey={keys.coverr} seed={pixSeed} sceneNumber={activeIndex + 1}
              onApply={(asset) => active && updateScene(active.id, { videoUrl: asset.sourceUrl, localMediaId: asset.id })} />
          )}
          {tab === 'captions' && <CaptionSettings value={caption} onChange={setCaption} />}
          {tab === 'audio' && (
            <AudioTab voice={voice} bg={bg} bgVol={bgVol} onSync={syncToVoice}
              aiKeys={keys.aiKeys} onGenerateSpeech={generateAllSceneSpeech} generating={generatingSpeech} speechStatus={speechStatus}
              voiceName={voiceName} onVoiceName={setVoiceName} speechStyle={speechStyle} onSpeechStyle={setSpeechStyle}
              speechSpeed={speechSpeed} onSpeechSpeed={setSpeechSpeed}
              kokoroLoaded={kokoroLoaded} kokoroLoading={kokoroLoading} kokoroGenerating={kokoroGenerating}
              kokoroStatus={kokoroStatus} kokoroVoice={kokoroVoice} onKokoroVoice={setKokoroVoice}
              onLoadKokoro={loadLocalKokoro} onLoadAligner={loadLocalAligner} alignmentLoaded={alignmentLoaded} alignmentLoading={alignmentLoading} onGenerateKokoro={generateKokoroNarration}
              onPreviewKokoro={previewKokoroVoice} kokoroPreviewUrl={kokoroPreviewUrl} kokoroPreviewing={kokoroPreviewing} kokoroPreviewStatus={kokoroPreviewStatus}
              onVoice={(f) => loadAudio(f, setVoice)} onBg={(f) => loadAudio(f, setBg)} onBgVol={setBgVol} />
          )}
        </Sidebar>
        <main className="studio-main flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
          <PreviewPlayer active={active} pool={pool} aspect={aspect} onAspect={setAspect} caption={caption} time={pb.time} />
          <Timeline scenes={scenes} total={total} time={pb.time} playing={pb.playing} hasVoice={!!voice}
            onToggle={pb.toggle} onStop={pb.stop} onRestart={() => pb.seek(0)} onSeek={pb.seek}
            onResize={(id, d) => updateScene(id, { duration: d })} />
        </main>
      </div>
      {showSettings && (
        <SettingsModal keys={keys} onClose={() => setShowSettings(false)}
          onSave={(k) => {
  setKeys(k);

  localStorage.setItem('pixabay_key', k.pixabay);
  localStorage.setItem('coverr_key', k.coverr || '');
  localStorage.setItem('ai_api_keys', JSON.stringify(k.aiKeys));

  // Keep the old OpenRouter setting compatible.
  const firstOpenRouter = k.aiKeys.find(
    (item) => item.provider === 'openrouter'
  );

  if (firstOpenRouter) {
    localStorage.setItem('openrouter_key', firstOpenRouter.key);
  } else {
    localStorage.removeItem('openrouter_key');
  }

  setShowSettings(false);
}} />
      )}
      {exp && <ExportOverlay progress={exp.p} label={exp.label} />}
      <AIDirector keys={keys.aiKeys || []} editorContext={aiEditorContext} onApplyAction={applyAIAction} onOpenSettings={() => setShowSettings(true)} />
    </div>
  );
}
