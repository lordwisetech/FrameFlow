import { FONTS, PRESETS, DEFAULT_CAPTION } from '../../utils/captionStyle';

const Seg = ({ options, value, onPick }) => (
  <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
    {options.map(([id, label]) => (
      <button key={id} onClick={() => onPick(id)}
        className={`flex-1 px-2.5 py-1 rounded-md font-medium ${value === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>{label}</button>
    ))}
  </div>
);

const Row = ({ label, children }) => (
  <div className="space-y-1.5"><label className="text-[11px] font-semibold text-slate-300">{label}</label>{children}</div>
);

export default function CaptionSettings({ value: v, onChange }) {
  const set = (patch) => onChange({ ...v, ...patch });
  const toggle = (on) => `w-9 h-8 rounded-lg border text-xs ${on ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300">Caption Settings</span>
        <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
          Show captions
          <input type="checkbox" checked={v.show} onChange={(e) => set({ show: e.target.checked })} className="accent-indigo-500" />
        </label>
      </div>

      <div className={`space-y-4 ${v.show ? '' : 'opacity-40 pointer-events-none'}`}>
        <Row label="Presets">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PRESETS).map(([name, p]) => (
              <button key={name} onClick={() => onChange({ ...p })} className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-200">{name}</button>
            ))}
          </div>
        </Row>

        <Row label="Speech-synced caption mode">
          <div className="grid grid-cols-2 gap-2">
            {[['progressive', 'Progressive'], ['highlight', 'Word highlight'], ['one-word', 'One word'], ['karaoke', 'Karaoke']].map(([id, label]) => (
              <button key={id} onClick={() => set({ mode: id })} className={`py-2 rounded-lg border text-[11px] ${v.mode === id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>{label}</button>
            ))}
          </div>
        </Row>
        <Row label="Font">
          <select value={v.font} onChange={(e) => set({ font: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200">
            {FONTS.map((f) => <option key={f.label} value={f.css}>{f.label}</option>)}
          </select>
        </Row>

        <Row label={`Size: ${v.size}%`}>
          <input type="range" min="50" max="200" step="5" value={v.size} onChange={(e) => set({ size: +e.target.value })} className="w-full accent-indigo-500 h-1.5" />
        </Row>

        <Row label="Text style">
          <div className="flex items-center gap-2">
            <button onClick={() => set({ bold: !v.bold })} className={`${toggle(v.bold)} font-bold`}>B</button>
            <button onClick={() => set({ italic: !v.italic })} className={`${toggle(v.italic)} italic`}>I</button>
            <button onClick={() => set({ uppercase: !v.uppercase })} className={toggle(v.uppercase)}>AA</button>
            <label className="ml-auto flex items-center gap-2 text-[11px] text-slate-400">Text color
              <input type="color" value={v.color} onChange={(e) => set({ color: e.target.value })} className="w-8 h-8 rounded bg-transparent cursor-pointer" />
            </label>
          </div>
        </Row>

        <Row label="Background">
          <Seg options={[['box', 'Box'], ['shadow', 'Shadow'], ['outline', 'Outline']]} value={v.bgStyle} onPick={(bgStyle) => set({ bgStyle })} />
          {v.bgStyle !== 'shadow' && (
            <div className="flex items-center gap-3 pt-1.5">
              <input type="color" value={v.bgColor} onChange={(e) => set({ bgColor: e.target.value })} className="w-8 h-8 rounded bg-transparent cursor-pointer" />
              {v.bgStyle === 'box' && (
                <>
                  <input type="range" min="0" max="1" step="0.05" value={v.bgOpacity} onChange={(e) => set({ bgOpacity: +e.target.value })} className="flex-1 accent-indigo-500 h-1.5" />
                  <span className="text-[11px] text-slate-400 w-9 text-right">{Math.round(v.bgOpacity * 100)}%</span>
                </>
              )}
            </div>
          )}
        </Row>

        <Row label="Position">
          <Seg options={[['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']]} value={v.position} onPick={(position) => set({ position })} />
        </Row>
      </div>

      <button onClick={() => onChange({ ...DEFAULT_CAPTION })} className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700">
        <i className="fa-solid fa-rotate-left mr-1.5"></i>Reset to default
      </button>
    </div>
  );
}
