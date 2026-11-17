export async function combineAudioBlobs(blobs, speed = 1) {
  const context = new AudioContext();
  try {
    const buffers = [];
    for (const blob of blobs) buffers.push(await context.decodeAudioData(await blob.arrayBuffer()));
    const sampleRate = context.sampleRate;
    const totalFrames = buffers.reduce((sum, buffer) => sum + Math.ceil(buffer.duration / speed * sampleRate), 0);
    const offline = new OfflineAudioContext(2, totalFrames, sampleRate);
    let offset = 0;
    buffers.forEach((buffer) => {
      const source = offline.createBufferSource();
      source.buffer = buffer; source.connect(offline.destination); source.start(offset);
      offset += buffer.duration;
    });
    const rendered = await offline.startRendering();
    const channels = rendered.numberOfChannels;
    const frames = rendered.length;
    const wav = new ArrayBuffer(44 + frames * channels * 2);
    const view = new DataView(wav);
    const write = (o, s) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
    write(0, 'RIFF'); view.setUint32(4, 36 + frames * channels * 2, true); write(8, 'WAVE');
    write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true);
    write(36, 'data'); view.setUint32(40, frames * channels * 2, true);
    let pos = 44;
    for (let i = 0; i < frames; i++) for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, rendered.getChannelData(c)[i]));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true); pos += 2;
    }
    return new File([wav], 'cartesia-scene-narration.wav', { type: 'audio/wav' });
  } finally { await context.close(); }
}
