# Phase 5 — Coverr, Epidemic Sound & mobile UI

- Added Coverr search to the existing Scenes → Search Swap workflow.
- Added Epidemic Sound music and sound-effect search, preview, and download.
- API keys are accepted by Vite's Node middleware and remain server-side in process memory.
- Added local HLS proxy for Epidemic Sound previews so stream cookies are not exposed to the browser.
- Downloaded video/audio is stored in IndexedDB and surfaced in Resources as the local media library.
- Refined mobile header, tab bar, controls, settings modal, and search result layout.
- Epidemic Sound free developer access is prototype-only (50 downloads; no commercial publishing licence). Obtain appropriate commercial rights before publishing.
- Keys must be re-entered after restarting the local Vite server. Production hosting needs a real backend with secret storage.
