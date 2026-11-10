import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { ASPECTS, getClipBlob } from './helpers';
import { captionFontSize, fontString, hexToRgba } from './captionStyle';

const FPS = 30;
let ffmpeg = null;

async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;
  const f = new FFmpeg();
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'; // single-thread core: no special server headers needed
  await f.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  return (ffmpeg = f);
}

// Captions are drawn on a transparent PNG and overlaid by FFmpeg (wasm builds have no fonts for drawtext)
async function captionPng(text, W, H, st, highlightWord = null) {
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const g = c.getContext('2d');
  if (st.show) {
    try { await document.fonts.load(`bold 24px ${st.font}`); } catch {}
    if (st.uppercase) text = text.toUpperCase();
    const fs = captionFontSize(Math.min(W, H), st.size);
    g.font = fontString(st, fs); g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = []; let cur = '';
    for (const w of text.split(' ')) {
      const t = cur ? `${cur} ${w}` : w;
      if (g.measureText(t).width > W * 0.82 - fs * 1.4 && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    lines.push(cur);
    const lh = fs * 1.3, px = fs * 0.7, py = fs * 0.4;
    const bw = Math.max(...lines.map((l) => g.measureText(l).width)) + px * 2;
    const bh = lines.length * lh + py * 2;
    const y0 = st.position === 'top' ? H * 0.06 : st.position === 'middle' ? (H - bh) / 2 : H - bh - H * 0.06;
    if (st.bgStyle === 'box') {
      g.fillStyle = hexToRgba(st.bgColor, st.bgOpacity);
      g.beginPath(); g.roundRect(W / 2 - bw / 2, y0, bw, bh, fs * 0.4); g.fill();
    }
    lines.forEach((l, i) => {
      const y = y0 + py + lh * (i + 0.5);
      if (st.bgStyle === 'outline') { g.lineJoin = 'round'; g.lineWidth = fs * 0.2; g.strokeStyle = st.bgColor; g.strokeText(l, W / 2, y); }
      if (st.bgStyle === 'shadow') { g.shadowColor = 'rgba(0,0,0,0.95)'; g.shadowBlur = fs * 0.3; g.shadowOffsetY = 2; }
      const tokens = l.split(' ');
      if (highlightWord && tokens.length > 1) {
        const widths = tokens.map((word) => g.measureText(`${word} `).width);
        let x = W / 2 - widths.reduce((sum, width) => sum + width, 0) / 2;
        tokens.forEach((word, index) => {
          g.fillStyle = word.toLowerCase() === highlightWord.toLowerCase() ? '#facc15' : st.color;
          g.textAlign = 'left'; g.fillText(`${word} `, x, y); x += widths[index];
        });
        g.textAlign = 'center';
      } else {
        g.fillStyle = st.color; g.fillText(l, W / 2, y);
      }
      g.shadowColor = 'transparent'; g.shadowBlur = 0;
    });
  }
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function exportVideo({ scenes, aspect, voice, bg, bgVol, total, caption, onProgress }) {
  const [W, H] = ASPECTS[aspect].out;
  onProgress(0, 'Loading FFmpeg (first time downloads ~30 MB)…');
  const ff = await loadFFmpeg();

  const tail = [];
  const onLog = ({ message }) => { tail.push(message); if (tail.length > 6) tail.shift(); };
  const onProg = ({ progress }) => onProgress(0.15 + Math.min(1, Math.max(0, progress)) * 0.85, 'Encoding video…');
  ff.on('log', onLog); ff.on('progress', onProg);

  const files = [];
  const put = async (name, data) => { await ff.writeFile(name, data); files.push(name); };
  let missing = 0;

  try {
    const args = []; const filters = [];

    let inputIndex = 0;
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      onProgress(0.01 + 0.14 * (i / scenes.length), `Preparing scene ${i + 1} of ${scenes.length}…`);
      const blob = await getClipBlob(s.videoUrl, s.localMediaId);
      const videoInput = inputIndex++;
      if (blob) {
        await put(`clip${i}.mp4`, new Uint8Array(await blob.arrayBuffer()));
        args.push('-stream_loop', '-1', '-t', String(s.duration), '-i', `clip${i}.mp4`);
      } else {
        missing++;
        args.push('-f', 'lavfi', '-t', String(s.duration), '-i', `color=c=black:s=${W}x${H}:r=${FPS}`);
      }
      filters.push(`[${videoInput}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${FPS},setpts=PTS-STARTPTS[vbase${i}]`);
      let currentLabel = `vbase${i}`;
      const timedWords = Array.isArray(s.captionWords) && s.captionWords.length && caption.show;
      const snapshots = timedWords
        ? s.captionWords.map((word, j) => ({
            text: caption.mode === 'one-word' ? word.word : s.captionWords.slice(0, j + 1).map((w) => w.word).join(' '),
            highlight: caption.mode === 'highlight' || caption.mode === 'karaoke' ? word.word : null,
            start: word.start,
            end: s.captionWords[j + 1]?.start ?? s.duration,
          })).filter((item) => item.end > item.start)
        : [{ text: s.text, start: 0, end: s.duration }];
      for (let j = 0; j < snapshots.length; j++) {
        const item = snapshots[j];
        const name = `cap${i}_${j}.png`;
        await put(name, await captionPng(item.text, W, H, caption, item.highlight));
        args.push('-i', name);
        const captionInput = inputIndex++;
        const nextLabel = `v${i}_${j}`;
        filters.push(`[${currentLabel}][${captionInput}:v]overlay=0:0:enable='between(t,${Math.max(0, item.start).toFixed(3)},${Math.max(item.start, item.end).toFixed(3)})'[${nextLabel}]`);
        currentLabel = nextLabel;
      }
      filters.push(`[${currentLabel}]null[v${i}]`);
    }
    filters.push(`${scenes.map((_, i) => `[v${i}]`).join('')}concat=n=${scenes.length}:v=1:a=0,format=yuv420p[vout]`);

    let n = inputIndex, vi = -1, bi = -1;
    const ext = (f) => (f.name.split('.').pop() || 'mp3').toLowerCase();
    if (voice) { await put(`voice.${ext(voice.file)}`, await fetchFile(voice.file)); args.push('-i', `voice.${ext(voice.file)}`); vi = n++; }
    if (bg) { await put(`bg.${ext(bg.file)}`, await fetchFile(bg.file)); args.push('-stream_loop', '-1', '-i', `bg.${ext(bg.file)}`); bi = n++; }

    if (vi >= 0 && bi >= 0) filters.push(`[${vi}:a]aresample=48000[a0];[${bi}:a]volume=${bgVol},aresample=48000[a1];[a0][a1]amix=inputs=2:duration=longest:dropout_transition=0,volume=2[aout]`);
    else if (vi >= 0) filters.push(`[${vi}:a]aresample=48000[aout]`);
    else if (bi >= 0) filters.push(`[${bi}:a]volume=${bgVol},aresample=48000[aout]`);

    const map = ['-map', '[vout]', ...(vi >= 0 || bi >= 0 ? ['-map', '[aout]'] : [])];
    const code = await ff.exec([
      ...args, '-filter_complex', filters.join(';'), ...map,
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '27', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-t', total.toFixed(2), 'out.mp4',
    ]);
    if (code !== 0) throw new Error(`FFmpeg exited with code ${code}. ${tail.join(' | ').slice(0, 300)}`);

    files.push('out.mp4');
    const data = await ff.readFile('out.mp4');
    return { blob: new Blob([data], { type: 'video/mp4' }), missing };
  } finally {
    ff.off('log', onLog); ff.off('progress', onProg);
    for (const f of files) { try { await ff.deleteFile(f); } catch {} }
  }
}
