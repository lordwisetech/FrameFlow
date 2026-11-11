import { PhononTTS, DEFAULT_MODEL, encodeWav, concatPcm, clearCache } from 'phonon-tts';

const log = (...msgs) => {
  const el = document.getElementById('log');
  el.textContent += msgs.join(' ') + '\n';
  el.scrollTop = el.scrollHeight;
};

const $ = (id) => document.getElementById(id);
const setBtn = (id, disabled) => $(id).disabled = disabled;

let tts = null;

$('load').onclick = async () => {
  setBtn('load', true);
  try {
    log('Loading model:', DEFAULT_MODEL);
    tts = await PhononTTS.load({
      lang: 'en',
      quant: 'q8',
      onProgress: (p) => log(`  ${p.file}: ${p.loaded}/${p.total ?? '?'} ${p.cached ? '(cached)' : ''}`),
    });
    log(`Model loaded. sampleRate=${tts.sampleRate}, device=${tts.device} (${tts.deviceReason}), threads=${tts.threads}, voices=${tts.voices.length}`, 'ok');
    setBtn('listVoices', false);
    setBtn('synth', false);
    setBtn('synthFloat', false);
    setBtn('stream', false);
  } catch (e) {
    log('Load failed: ' + e.message, 'err');
  }
  setBtn('load', false);
};

$('listVoices').onclick = () => {
  log('Voices:', JSON.stringify(tts.voices), 'ok');
};

$('synth').onclick = async () => {
  const text = 'Hello from Phonon TTS in your browser.';
  try {
    const wav = await tts.synthWav(text);
    log(`synthWav: ${wav.size} bytes, type=${wav.type}`, 'ok');
    $('player').src = URL.createObjectURL(wav);
  } catch (e) {
    log('synthWav failed: ' + e.message, 'err');
  }
};

$('synthFloat').onclick = async () => {
  const text = 'The quick brown fox jumps over the lazy dog.';
  try {
    const pcm = await tts.synth(text);
    log(`synth: ${pcm.length} samples at ${tts.sampleRate} Hz = ${(pcm.length / tts.sampleRate).toFixed(2)}s`, 'ok');
    const wav = encodeWav(pcm, tts.sampleRate);
    $('player').src = URL.createObjectURL(wav);
  } catch (e) {
    log('synth failed: ' + e.message, 'err');
  }
};

$('stream').onclick = async () => {
  const text = 'Streaming speech plays as it is generated, chunk by chunk.';
  try {
    const stream = tts.stream(text);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
      log(`  chunk: ${chunk.length} samples`, 'muted');
    }
    const stats = await stream.done;
    const pcm = concatPcm(chunks);
    const wav = encodeWav(pcm, tts.sampleRate);
    log(`stream done: ${chunks.length} chunks, ${pcm.length} samples, stats=${JSON.stringify(stats)}`, 'ok');
    $('player').src = URL.createObjectURL(wav);
  } catch (e) {
    log('stream failed: ' + e.message, 'err');
  }
};

$('clear').onclick = async () => {
  const ok = await clearCache();
  log(`clearCache: ${ok}`, ok ? 'ok' : 'err');
};