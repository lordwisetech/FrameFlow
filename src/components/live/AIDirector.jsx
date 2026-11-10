import { useEffect, useRef, useState } from 'react';
import { askAIDirector, extractAIActions, readAIMemory, saveAIMemory, readAIChat, saveAIChat, speakWithGemini } from '../../services/aiDirector';

const tasks = [
  { id: 'write', label: 'Write a script', icon: 'fa-file-pen', prompt: 'Help me create a new video script. First ask me what the video is about and its intended audience.' },
  { id: 'improve', label: 'Improve my script', icon: 'fa-wand-magic-sparkles', prompt: 'Review my current script and produce an improved version. Keep the original meaning but improve the hook, clarity, flow and ending.' },
  { id: 'scenes', label: 'Improve my scenes', icon: 'fa-clapperboard', prompt: 'Review my current scenes and suggest specific improvements to pacing, scene text and visual direction.' },
  { id: 'visuals', label: 'Suggest visuals', icon: 'fa-images', prompt: 'Suggest better footage and visual ideas for each of my current scenes.' },
  { id: 'help', label: 'Help me use the studio', icon: 'fa-circle-question', prompt: 'Give me practical guidance for using the current studio features.' },
];
const starter = { role: 'assistant', content: 'Hey Escarnor! I’m ready. Pick a task below and we’ll work directly with your studio.' };

export default function AIDirector({ keys = [], editorContext, onApplyAction, onOpenSettings }) {
  const [position, setPosition] = useState(() => { try { return JSON.parse(localStorage.getItem('espro_ai_position')) || { x: null, y: null }; } catch { return { x: null, y: null }; } });
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => readAIChat().length ? readAIChat() : [starter]);
  const [memory, setMemory] = useState(readAIMemory);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState('');
  const [draft, setDraft] = useState(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [task, setTask] = useState(null);
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const panelEnd = useRef(null);

  useEffect(() => { saveAIChat(messages); panelEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (position.x !== null) localStorage.setItem('espro_ai_position', JSON.stringify(position)); }, [position]);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  // Track dragging on window without pointer capture. Pointer capture on the
  // wrapper retargeted the click away from the robot button on some browsers.
  const startDrag = (e) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, startX: e.clientX, startY: e.clientY, moved: false };
    suppressClick.current = false;
  };
  useEffect(() => {
    const move = (e) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true;
      if (!drag.current.moved) return;
      const x = Math.max(8, Math.min(window.innerWidth - 76, e.clientX - drag.current.dx));
      const y = Math.max(8, Math.min(window.innerHeight - 76, e.clientY - drag.current.dy));
      setPosition({ x, y });
    };
    const up = () => {
      if (!drag.current) return;
      suppressClick.current = drag.current.moved;
      drag.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);
  const togglePanel = () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    setOpen(v => !v);
  };

  const say = async (text) => {
    if (!voiceOn || !text) return;
    setSpeaking(true);
    try {
      const geminiKey = keys.find(k => k.provider === 'gemini' && k.key?.trim())?.key;
      if (geminiKey) await speakWithGemini(geminiKey, text);
      else if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1; utterance.pitch = 0.95;
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
        return;
      }
    } catch (error) {
      if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(text); u.onend = () => setSpeaking(false); window.speechSynthesis.speak(u); return; }
      console.warn('AI voice unavailable:', error);
    }
    setSpeaking(false);
  };

  const send = async (value = input, selectedTask = null) => {
    const prompt = String(value || '').trim();
    if (!prompt || busy) return;
    const next = [...messages, { role: 'user', content: prompt }];
    setMessages(next); setInput(''); setBusy(true); setDraft(null); setTask(selectedTask);
    try {
      const result = await askAIDirector({ keys, history: next.slice(0, -1).slice(-10), prompt, memory, editorContext });
      const parsed = extractAIActions(result.text);
      const response = parsed.message || 'I have a suggestion ready.';
      setProvider(`${result.provider} · ${result.model}`);
      if (parsed.action) setDraft({ content: response, action: parsed.action });
      else if (selectedTask === 'write' || selectedTask === 'improve') setDraft({ content: response, action: null });
      setMessages(previous => [...previous, { role: 'assistant', content: response }]);
      say(response.replace(/[*#`]/g, '').slice(0, 700));
    } catch (error) {
      const response = `I couldn't reach an AI model: ${error.message}`;
      setMessages(previous => [...previous, { role: 'assistant', content: response }]);
      say(response);
    } finally { setBusy(false); }
  };

  const applyDraft = (mode) => {
    if (!draft) return;
    let action = draft.action;
    if (!action && draft.content) {
      const script = draft.content.replace(/^```(?:text|markdown)?\s*/i, '').replace(/```\s*$/,'').trim();
      action = mode === 'replace' ? { type: 'replace_script', script } : mode === 'append' ? { type: 'append_script', script } : { type: 'add_scenes', script };
    } else if (action?.type === 'replace_script' && mode === 'append') action = { type: 'append_script', script: action.script };
    else if (action?.type === 'replace_script' && mode === 'scenes') action = { type: 'add_scenes', script: action.script };
    const ok = action && onApplyAction?.(action);
    if (ok) {
      const note = mode === 'replace' ? 'Replaced the script.' : mode === 'append' ? 'Added the draft to your script.' : 'Added the draft as new scenes.';
      setMessages(p => [...p, { role: 'assistant', content: `${note} Your existing work was handled according to your selection.` }]);
      setDraft(null); setTask(null);
    }
  };

  const runTask = (item) => {
    if (item.id === 'write') { setTask('write'); setMessages(p => [...p, { role: 'assistant', content: 'What is your video about, and who is it for? Tell me the topic and audience.' }]); say('What is your video about, and who is it for?'); return; }
    send(item.prompt, item.id);
  };

  const defaultStyle = { right: 22, bottom: 22 };
  const botStyle = position.x === null ? defaultStyle : { left: position.x, top: position.y };
  return <>
    <div className="fixed z-[60] touch-none select-none" style={{ ...botStyle, cursor: 'grab' }} onPointerDown={startDrag}>
      <button type="button" onClick={togglePanel} title="Open AI Director" className={`w-[62px] h-[62px] rounded-full border-2 border-indigo-300/60 bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white text-2xl shadow-2xl shadow-indigo-950/70 transition-transform hover:scale-105 ${speaking ? 'animate-pulse' : 'ai-director-bot'}`}>
        <i className="fa-solid fa-robot" />
      </button>
      {!open && <button type="button" onClick={() => { if (!suppressClick.current) setOpen(true); else suppressClick.current = false; }} className="block mx-auto mt-1 rounded-full bg-slate-950/95 border border-indigo-400/30 px-2 py-1 text-[9px] font-bold text-indigo-200">AI Director</button>}
    </div>

    {open && <section className="fixed z-[59] w-[min(370px,calc(100vw-20px))] max-h-[min(610px,calc(100vh-100px))] flex flex-col overflow-hidden rounded-2xl border border-indigo-400/30 bg-slate-950 shadow-2xl shadow-black/70" style={position.x === null ? { right: 18, bottom: 100 } : { left: Math.min(position.x, window.innerWidth - 390), top: Math.max(8, Math.min(position.y - 490, window.innerHeight - 610)) }}>
      <header className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-950 to-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white"><i className="fa-solid fa-robot" /></div><div><h3 className="text-sm font-bold text-white">AI Director</h3><p className="text-[10px] text-indigo-200">Your studio co-pilot · Escarnor</p></div></div>
        <div className="flex items-center gap-3"><button onClick={() => { setVoiceOn(v => !v); if (voiceOn) window.speechSynthesis?.cancel(); }} title="Toggle AI voice" className={`text-sm ${voiceOn ? 'text-emerald-300' : 'text-slate-400'}`}><i className={`fa-solid ${voiceOn ? 'fa-volume-high' : 'fa-volume-xmark'}`} /></button><button onClick={() => setMemoryOpen(v => !v)} title="Edit memory" className="text-slate-300"><i className="fa-solid fa-brain" /></button><button onClick={() => setOpen(false)} className="text-slate-400"><i className="fa-solid fa-xmark" /></button></div>
      </header>
      {memoryOpen && <div className="p-3 border-b border-slate-800 bg-slate-900 space-y-2"><div className="text-xs font-semibold text-indigo-200">Assistant memory · saved in this browser</div><textarea value={memory} onChange={e => setMemory(e.target.value)} className="w-full h-24 resize-y rounded-lg bg-slate-950 border border-slate-700 p-2 text-xs text-slate-200"/><div className="flex justify-end"><button onClick={() => { saveAIMemory(memory); setMemoryOpen(false); }} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs">Save memory</button></div></div>}
      <div className="p-3 border-b border-slate-800"><p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">What should we work on?</p><div className="grid grid-cols-2 gap-2">{tasks.map(item => <button key={item.id} onClick={() => runTask(item)} disabled={busy} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 hover:border-indigo-500 px-3 py-2.5 text-left text-[11px] text-slate-200 disabled:opacity-50"><i className={`fa-solid ${item.icon} text-indigo-300`} />{item.label}</button>)}</div></div>
      <div className="flex-1 min-h-20 overflow-y-auto p-3 space-y-2">{messages.slice(-8).map((m, i) => <div key={i} className={`max-w-[95%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'ml-auto bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-200'}`}>{m.content}</div>)}{busy && <div className="text-xs text-indigo-300"><i className="fa-solid fa-circle-notch fa-spin mr-2"/>Working on your studio...</div>}<div ref={panelEnd}/></div>
      {draft && <div className="p-3 border-t border-indigo-500/30 bg-indigo-950/30 space-y-2"><p className="text-xs font-bold text-indigo-200">Your draft is ready. What should I do with it?</p><div className="grid grid-cols-1 gap-1.5"><button onClick={() => applyDraft('replace')} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 py-2 text-xs font-semibold text-white">Replace current script</button><button onClick={() => applyDraft('append')} className="rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-xs text-white">Add to existing script</button><button onClick={() => applyDraft('scenes')} className="rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-xs text-white">Add as new scenes</button></div><button onClick={() => setDraft(null)} className="w-full text-[10px] text-slate-400">Keep it in chat for now</button></div>}
      <form onSubmit={e => { e.preventDefault(); if (task === 'write') { send(`Create a complete explainer video script about: ${input}. Use one scene per paragraph, no numbering, concise narration.`, 'write'); } else send(input); }} className="p-3 border-t border-slate-800 bg-slate-900/80"><div className="flex gap-2"><textarea value={input} onChange={e => setInput(e.target.value)} rows={2} placeholder={task === 'write' ? 'Describe your video topic and audience...' : 'Tell me what you want to change...'} className="flex-1 resize-none rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-xs text-white outline-none focus:border-indigo-500"/><button disabled={busy || !input.trim()} className="w-10 rounded-xl bg-indigo-600 disabled:opacity-40 text-white"><i className="fa-solid fa-arrow-up"/></button></div><div className="flex justify-between mt-2"><span className="text-[9px] text-slate-500">{provider || (keys.length ? 'AI connection ready' : 'Add an AI key in settings')}</span><button type="button" onClick={onOpenSettings} className="text-[10px] text-indigo-300">AI API settings</button></div></form>
    </section>}
  </>;
}
