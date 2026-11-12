
import { useState } from 'react';
import { phononClearCache, phononCacheInfo } from '../../services/phononTts';
import { clearSpeechAlignerCache, disposeSpeechAligner } from '../../services/speechAlignment';

const createId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const providers = {
  gemini: {
    name: 'Google Gemini',
    description: 'Google AI Studio API',
  },
  openrouter: {
    name: 'OpenRouter',
    description: 'OpenRouter API',
  },
};

export default function SettingsModal({ keys, onSave, onClose, onClearAiCache }) {
  const [draft, setDraft] = useState(() => ({
    pixabay: keys.pixabay || '',
    coverr: keys.coverr || '',
    aiKeys: Array.isArray(keys.aiKeys)
      ? keys.aiKeys.map((item) => ({ ...item }))
      : keys.openrouter
        ? [{
            id: createId(),
            provider: 'openrouter',
            key: keys.openrouter,
          }]
        : [],
  }));

  const [newProvider, setNewProvider] = useState('gemini');
  const [statuses, setStatuses] = useState({});
  const [testing, setTesting] = useState(null);
  const [coverrStatus, setCoverrStatus] = useState(null);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheMessage, setCacheMessage] = useState(null);

  const field =
    'w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-base sm:p-2.5 sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 min-h-[44px]';

  const updateKey = (id, value) => {
    setDraft((previous) => ({
      ...previous,
      aiKeys: previous.aiKeys.map((item) =>
        item.id === id ? { ...item, key: value } : item
      ),
    }));

    setStatuses((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  };

  const addKey = () => {
    const item = {
      id: createId(),
      provider: newProvider,
      key: '',
    };

    setDraft((previous) => ({
      ...previous,
      aiKeys: [...previous.aiKeys, item],
    }));
  };

  const removeKey = (id) => {
    setDraft((previous) => ({
      ...previous,
      aiKeys: previous.aiKeys.filter((item) => item.id !== id),
    }));

    setStatuses((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  };

  const testConnection = async (item) => {
    const apiKey = item.key.trim();

    if (!apiKey) {
      setStatuses((previous) => ({
        ...previous,
        [item.id]: {
          type: 'error',
          message: 'Enter an API key first.',
        },
      }));
      return;
    }

    setTesting(item.id);
    setStatuses((previous) => ({
      ...previous,
      [item.id]: {
        type: 'checking',
        message: 'Testing connection...',
      },
    }));

    try {
      let response;

      if (item.provider === 'gemini') {
        response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models',
          {
            method: 'GET',
            headers: {
              'x-goog-api-key': apiKey,
            },
          }
        );
      } else if (item.provider === 'openrouter') {
        response = await fetch(
          'https://openrouter.ai/api/v1/key',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          }
        );
      } else {
        throw new Error('Unsupported AI provider.');
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          data?.error?.message ||
          data?.message ||
          `Server returned HTTP ${response.status}.`;

        throw new Error(message);
      }

      setStatuses((previous) => ({
        ...previous,
        [item.id]: {
          type: 'success',
          message: `${providers[item.provider].name} connection successful!`,
        },
      }));
    } catch (error) {
      const networkError =
        error instanceof TypeError ||
        error.message === 'Failed to fetch';

      setStatuses((previous) => ({
        ...previous,
        [item.id]: {
          type: 'error',
          message: networkError
            ? 'Network or browser connection error. Check your internet connection and try again.'
            : error.message,
        },
      }));
    } finally {
      setTesting(null);
    }
  };

  const testCoverr = async () => {
    const apiKey = draft.coverr.trim();
    if (!apiKey) { setCoverrStatus({ type: 'error', message: 'Enter your Coverr API key first.' }); return; }
    setCoverrStatus({ type: 'checking', message: 'Testing Coverr video search…' });
    try {
      const response = await fetch('https://api.coverr.co/videos?query=nature&page=0&page_size=1&urls=true', {
        headers: { 'x-api-key': apiKey },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || `Coverr returned HTTP ${response.status}.`);
      if (!Array.isArray(data.hits)) throw new Error('Coverr responded, but its video results format was unexpected.');
      setCoverrStatus({ type: 'success', message: `Connected! Coverr returned ${data.hits.length} test result(s).` });
    } catch (error) {
      setCoverrStatus({ type: 'error', message: error instanceof TypeError ? 'Could not reach Coverr. Check internet access and whether browser requests are allowed.' : error.message });
    }
  };

  const saveSettings = () => {
    const aiKeys = draft.aiKeys
      .filter((item) => item.key.trim())
      .map((item) => ({
        ...item,
        key: item.key.trim(),
      }));

    onSave({
      pixabay: draft.pixabay.trim(),
      coverr: draft.coverr.trim(),
      aiKeys,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 max-h-[95dvh] overflow-y-auto settings-modal-mobile">

        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <i className="fa-solid fa-sliders text-indigo-400"></i>
            API Settings
          </h3>

          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-sm"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* PIXABAY SETTINGS */}
        <div className="space-y-2">
          <label className="block font-semibold text-slate-300 text-xs">
            Pixabay API Key
          </label>

          <input
            type="password"
            className={field}
            value={draft.pixabay}
            onChange={(e) =>
              setDraft((previous) => ({
                ...previous,
                pixabay: e.target.value,
              }))
            }
            placeholder="Enter Pixabay API Key"
          />
        </div>

        {/* COVERR SETTINGS */}
        <div className="space-y-2 border-t border-slate-800 pt-4">
          <label className="block font-semibold text-slate-300 text-xs">Coverr Video API Key</label>
          <input
            type="password"
            autoComplete="off"
            className={field}
            value={draft.coverr}
            onChange={(e) => { setDraft((previous) => ({ ...previous, coverr: e.target.value })); setCoverrStatus(null); }}
            placeholder="Paste your Coverr API key"
          />
          <button onClick={testCoverr} className="w-full rounded-lg py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white">
            Test Coverr Connection
          </button>
          {coverrStatus && <div className={`rounded-lg p-2 text-xs ${coverrStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : coverrStatus.type === 'checking' ? 'bg-indigo-500/10 text-indigo-300' : 'bg-red-500/10 text-red-400'}`}>{coverrStatus.message}</div>}
          <p className="text-[10px] text-slate-500">Coverr keys are saved in this browser's local storage. Do not share this project with your key embedded.</p>
        </div>

        {/* AI API SETTINGS */}
        <div className="border-t border-slate-800 pt-5 space-y-4">

          <div>
            <h4 className="text-sm font-bold text-slate-100">
              AI API Keys
            </h4>

            <p className="text-xs text-slate-500 mt-1">
              Add and test your Gemini or OpenRouter API keys.
            </p>
          </div>

          {draft.aiKeys.map((item) => {
            const status = statuses[item.id];
            const provider = providers[item.provider];

            return (
              <div
                key={item.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-200">
                      {provider?.name || 'Unknown provider'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {provider?.description}
                    </p>
                  </div>

                  <button
                    onClick={() => removeKey(item.id)}
                    className="text-slate-500 hover:text-red-400 text-xs"
                    title="Remove API key"
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>

                <input
                  type="password"
                  className={field}
                  value={item.key}
                  onChange={(e) => updateKey(item.id, e.target.value)}
                  placeholder="Paste your API key here"
                />

                <button
                  onClick={() => testConnection(item)}
                  disabled={testing !== null}
                  className="w-full rounded-lg py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white"
                >
                  {testing === item.id
                    ? 'Testing connection...'
                    : 'Test Connection'}
                </button>

                {status && (
                  <div
                    className={`rounded-lg p-2 text-xs flex items-start gap-2 ${
                      status.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : status.type === 'checking'
                          ? 'bg-indigo-500/10 text-indigo-300'
                          : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    <i
                      className={`fa-solid mt-0.5 ${
                        status.type === 'success'
                          ? 'fa-circle-check'
                          : status.type === 'checking'
                            ? 'fa-spinner fa-spin'
                            : 'fa-circle-exclamation'
                      }`}
                    ></i>

                    <span>{status.message}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* ADD ANOTHER KEY */}
          <div className="flex gap-2">
            <select
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value)}
              className={`${field} flex-1 text-xs`}
            >
              <option value="gemini">Google Gemini</option>
              <option value="openrouter">OpenRouter</option>
            </select>

            <button
              onClick={addKey}
              className="px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold whitespace-nowrap"
            >
              <i className="fa-solid fa-plus mr-1"></i>
              Add Key
            </button>
          </div>

          {draft.aiKeys.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-3">
              No AI API keys added yet.
            </p>
          )}
        </div>

        {/* AI CACHE MANAGEMENT */}
        <div className="border-t border-slate-800 pt-5 space-y-3">
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <i className="fa-solid fa-cloud-arrow-down text-sky-400"></i>
              AI Model Cache
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Phonon TTS and Whisper caption-sync models are cached locally (~140 MB total). They are never deleted automatically.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setClearingCache(true);
                setCacheMessage(null);
                try {
                  // Load cache info for display.
                  const info = await phononCacheInfo();
                  setCacheInfo(info);
                  // Clear both model caches.
                  await phononClearCache();
                  await clearSpeechAlignerCache();
                  // Dispose the alignment worker.
                  disposeSpeechAligner();
                  setCacheMessage({ type: 'success', message: 'AI model cache cleared. Models will re-download on next use.' });
                } catch (error) {
                  setCacheMessage({ type: 'error', message: `Cache clear partially failed: ${error.message}` });
                } finally {
                  setClearingCache(false);
                  // Notify parent so it can update loaded state.
                  onClearAiCache?.();
                }
              }}
              disabled={clearingCache}
              className="flex-1 rounded-lg py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white"
            >
              <i className={`fa-solid ${clearingCache ? 'fa-spinner fa-spin' : 'fa-trash-can'} mr-1.5`}></i>
              {clearingCache ? 'Clearing…' : 'Clear AI Model Cache'}
            </button>
            <button
              onClick={async () => {
                setClearingCache(true);
                try {
                  const info = await phononCacheInfo();
                  setCacheInfo(info);
                  setCacheMessage({ type: 'info', message: info ? `Cached models: ${(info.cacheSize / (1024 * 1024)).toFixed(1)} MB` : 'No cached models found.' });
                } catch (error) {
                  setCacheMessage({ type: 'error', message: `Could not read cache info: ${error.message}` });
                } finally {
                  setClearingCache(false);
                }
              }}
              disabled={clearingCache}
              className="px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              <i className="fa-solid fa-info mr-1"></i>Info
            </button>
          </div>
          {cacheMessage && (
            <div className={`rounded-lg p-2 text-xs ${
              cacheMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
              cacheMessage.type === 'info' ? 'bg-indigo-500/10 text-indigo-300' :
              'bg-red-500/10 text-red-400'
            }`}>
              {cacheMessage.message}
            </div>
          )}
          {cacheInfo && (
            <p className="text-[10px] text-slate-500">
              Phonon model: {cacheInfo.loaded ? 'loaded in memory' : 'not loaded'} · Cache: {(cacheInfo.cacheSize / (1024 * 1024)).toFixed(1)} MB
            </p>
          )}
        </div>

        {/* SAVE */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={saveSettings}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
          >
            Save Configuration
          </button>
        </div>

      </div>
    </div>
  );
}
