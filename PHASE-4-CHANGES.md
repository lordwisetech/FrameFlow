# Phase 4 changes

## Kokoro voice preview
- Added a Preview Voice button beside the Kokoro voice selector.
- Generates a short sample using the selected voice and speaking speed, then exposes an audio player to listen.

## Local audio-based caption timing
- Added `@huggingface/transformers` and a dedicated Web Worker using `onnx-community/whisper-tiny_timestamped` with q8/WASM.
- Added browser-side audio decoding/resampling and word timestamp extraction.
- Matched the recognised audio words back to the original scene text.
- If transcript matching is weak, the scene safely falls back to approximate timing and the app reports that fallback.
- Added a separate Download Sync Model control so the Whisper model can be prepared before going offline. The Whisper model is a separate first-time download from Kokoro and can be reused from browser cache subject to storage policy.

## Resource library
- Added a Resources tab with external links and item-specific licence reminders for Pixabay, Vecteezy, Shutterstock, Envato Elements, Internet Archive, LottieFiles and Mixkit.
- No scraping, hotlinking, or automatic redistribution of external stock assets was added. Users browse, download under the source licence, and import the file into the editor.

## Verification
- Source syntax reviewed. `npm install` timed out in this environment, so the lockfile was not regenerated and a production build could not be completed. Run `npm install` then `npm run build` locally.
