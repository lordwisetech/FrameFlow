// UUID generation must also work when the app is opened over a local HTTP address.
export function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  // getRandomValues is available in more contexts than randomUUID.
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

// Preserve Blob/File values when structuredClone is unavailable on older browsers.
export function cloneValue(value) {
  if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(value);
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    if (typeof File !== 'undefined' && value instanceof File) {
      return new File([value], value.name, { type: value.type, lastModified: value.lastModified });
    }
    return value.slice(0, value.size, value.type);
  }
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  }
  return value;
}
