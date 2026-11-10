# Phase 3 — Mobile studio + Kokoro local narration

## Mobile studio improvements
- Reworked the studio workspace on narrow screens into a stacked touch layout: preview and compact timeline above, editing tabs and scrollable panel below.
- Added mobile-safe sizing for the header, preview frame, timeline controls, tab buttons and safe-area padding.
- Kept the existing desktop two-pane layout at larger widths.
- Kept the dashboard, project storage, Pixabay media library and existing editor workflow intact.

## Kokoro local narration
- Added `kokoro-js` with Kokoro-82M v1.0 ONNX model.
- Added a module Web Worker to load the model and run speech generation away from the React UI thread.
- Uses q8 weights with the WASM backend as the lower-memory default for phones and 8 GB computers.
- Added a Kokoro panel to Audio with model loading, English voice selection, shared speaking-speed control, progress/status and scene narration generation.
- Generated WAV clips are combined into a voiceover track and stored through the existing project autosave.
- Kokoro voice choice is saved with the project.
- Existing Gemini generation remains available and unchanged.
- Bumped the service-worker shell cache version to refresh the updated app assets.

## Important behavior and limits
- The first model load requires internet access and downloads the model from Hugging Face. Transformers.js uses browser-side caching; cache persistence and offline reuse depend on the browser's storage policy and available space.
- The current implementation uses approximate proportional word timings for Kokoro captions. It does not claim forced alignment. Gemini continues to provide its existing word alignment workflow.
- WASM/q8 is selected to reduce memory demand. Kokoro can still be slow or fail on low-memory phones; generated audio and FFmpeg rendering also use memory.
- This environment could not complete npm dependency installation or a production build. Run `npm install` (to resolve and update the lockfile for the new `kokoro-js` dependency), then `npm run build` on the development PC before deployment.
