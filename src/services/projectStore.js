import { createId, cloneValue } from '../utils/id';

const DB_NAME = 'explainer-studio-local';
const STORE = 'projects';
const MEDIA_STORE = 'media';
const MEDIA_BLOB_STORE = 'mediaBlobs';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(MEDIA_STORE)) db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(MEDIA_BLOB_STORE)) db.createObjectStore(MEDIA_BLOB_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction(mode, action, storeName = STORE) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    try { result = action(store); } catch (error) { reject(error); db.close(); return; }
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

export const listProjects = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.updatedAt - a.updatedAt));
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
};
export const getProject = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
};
export const saveProject = (project) => transaction('readwrite', (store) => store.put(project));
export const deleteProject = (id) => transaction('readwrite', (store) => store.delete(id));
export const createProject = (name = 'Untitled explainer') => ({
  id: createId(), name, createdAt: Date.now(), updatedAt: Date.now(),
  data: { script: '', raw: [], aspect: '16:9', caption: null, bgVol: 0.2, voiceName: 'Kore', speechStyle: 'Warm, clear, natural educational narrator.', speechSpeed: 1 },
});

const blobToDataURL = (blob) => new Promise((resolve, reject) => {
  if (!blob) return resolve(null);
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});
const dataURLToBlob = (url) => {
  if (!url) return null;
  const [meta, data] = url.split(',');
  const mime = meta.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};
export async function exportProjectFile(project) {
  const copy = cloneValue(project);
  copy.data.voiceData = await blobToDataURL(project.data.voiceBlob);
  copy.data.bgData = await blobToDataURL(project.data.bgBlob);
  delete copy.data.voiceBlob;
  delete copy.data.bgBlob;
  const blob = new Blob([JSON.stringify({ format: 'explainer-studio-project', version: 1, project: copy })], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${(project.name || 'explainer-project').replace(/[^a-z0-9-_]/gi, '-').toLowerCase()}.esp.json`; a.click();
  URL.revokeObjectURL(url);
}
export async function importProjectFile(file) {
  const parsed = JSON.parse(await file.text());
  if (parsed.format !== 'explainer-studio-project' || !parsed.project?.data) throw new Error('This is not a supported Explainer Studio project file.');
  const project = parsed.project;
  project.id = createId();
  project.name = `${project.name || 'Imported project'} (Imported)`;
  project.createdAt = Date.now(); project.updatedAt = Date.now();
  project.data.voiceBlob = dataURLToBlob(project.data.voiceData); project.data.bgBlob = dataURLToBlob(project.data.bgData);
  delete project.data.voiceData; delete project.data.bgData;
  return project;
}


// Downloaded Pixabay clip metadata and binary data are stored separately. This
// keeps the library list lightweight even when the user has many large videos.
export async function saveMediaAsset(asset) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([MEDIA_STORE, MEDIA_BLOB_STORE], 'readwrite');
    const metadata = { ...asset };
    delete metadata.blob;
    tx.objectStore(MEDIA_STORE).put(metadata);
    tx.objectStore(MEDIA_BLOB_STORE).put({ id: asset.id, blob: asset.blob });
    tx.oncomplete = () => { db.close(); resolve(asset.id); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

export async function listMediaAssets() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readonly');
    const request = tx.objectStore(MEDIA_STORE).getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.downloadedAt - a.downloadedAt));
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getMediaBlob(id) {
  if (!id) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_BLOB_STORE, 'readonly');
    const request = tx.objectStore(MEDIA_BLOB_STORE).get(id);
    request.onsuccess = () => resolve(request.result?.blob || null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function deleteMediaAsset(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([MEDIA_STORE, MEDIA_BLOB_STORE], 'readwrite');
    tx.objectStore(MEDIA_STORE).delete(id);
    tx.objectStore(MEDIA_BLOB_STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}
