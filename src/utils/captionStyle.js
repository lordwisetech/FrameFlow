export const FONTS = [
  { label: 'Inter', css: 'Inter, sans-serif' },
  { label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', css: 'Georgia, serif' },
  { label: 'Courier New', css: "'Courier New', monospace" },
  { label: 'Impact', css: 'Impact, Haettenschweiler, sans-serif' },
];

export const DEFAULT_CAPTION = {
  show: true,
  mode: 'progressive', // progressive | highlight | one-word | karaoke
  font: FONTS[0].css,
  size: 100,            // % of the base size
  bold: true,
  italic: false,
  uppercase: false,
  color: '#ffffff',
  bgStyle: 'box',       // 'box' | 'shadow' | 'outline'
  bgColor: '#000000',
  bgOpacity: 0.75,
  position: 'bottom',   // 'top' | 'middle' | 'bottom'
};

export const PRESETS = {
  Classic: DEFAULT_CAPTION,
  'Bold Shorts': { ...DEFAULT_CAPTION, font: FONTS[4].css, size: 130, bold: false, uppercase: true, bgStyle: 'outline', position: 'middle' },
  Minimal: { ...DEFAULT_CAPTION, size: 90, bold: false, bgStyle: 'shadow' },
};

// Shared by the live preview and the FFmpeg export so both look the same
export const captionFontSize = (minDim, size) => minDim * 0.06 * (size / 100);
export const fontString = (st, fs) => `${st.italic ? 'italic ' : ''}${st.bold ? 'bold ' : ''}${fs}px ${st.font}`;
export const hexToRgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// CSS for the on-screen caption (cw/ch = preview size)
export function previewCaptionStyle(st, cw, ch) {
  const fs = captionFontSize(Math.min(cw, ch), st.size);
  return {
    fontFamily: st.font, fontSize: fs, fontWeight: st.bold ? 700 : 400, fontStyle: st.italic ? 'italic' : 'normal',
    textTransform: st.uppercase ? 'uppercase' : 'none', color: st.color, lineHeight: 1.3,
    padding: `${fs * 0.4}px ${fs * 0.7}px`, borderRadius: fs * 0.4, maxWidth: '82%', display: 'inline-block',
    background: st.bgStyle === 'box' ? hexToRgba(st.bgColor, st.bgOpacity) : 'transparent',
    textShadow: st.bgStyle === 'shadow' ? `0 2px ${fs * 0.3}px rgba(0,0,0,0.95)` : 'none',
    WebkitTextStroke: st.bgStyle === 'outline' ? `${fs * 0.2}px ${st.bgColor}` : '0',
    paintOrder: 'stroke fill',
  };
}
