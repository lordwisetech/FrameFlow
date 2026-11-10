# Phase 2 — Pixabay downloads and local media library

## Added
- Pixabay search results can be downloaded into browser IndexedDB storage.
- A Downloads view lists saved clips, file sizes, dimensions and saved status.
- Saved clips can be reused in any project in the same browser profile on the same device.
- Applying a search result downloads it first and applies the local asset to the active scene.
- Scene preview and FFmpeg export resolve local media IDs to stored video blobs, so saved clips can be reused offline.
- Media metadata and video blobs use separate IndexedDB object stores to avoid loading every large video into memory just to display the library.
- Storage quota checks and best-effort persistent-storage requests are included.
- Existing project records are preserved through an IndexedDB version upgrade.
- The existing Android-safe ID generation, structured-clone fallback, Wi-Fi Vite host settings and PWA icons are retained.

## Important limits
- New Pixabay searches and downloads still need internet access and a valid Pixabay API key.
- Browser video downloads depend on the source allowing cross-origin requests. A blocked download is reported; it is not falsely marked as saved.
- Media is stored per browser profile/device. It is not automatically embedded in exported project JSON files.
- Browser storage can still be cleared by the user or browser. Persistent storage is requested where supported but cannot be guaranteed.
- PWA installation over the local HTTP QR address is intentionally not addressed in this phase. Deploying behind HTTPS is the later installation step.

## Verification
- All 26 JavaScript/JSX source files passed a TypeScript parser syntax check.
- A full Vite production build could not be run in this environment because `npm ci` timed out and the package cache did not contain all dependencies. Run `npm install` and `npm run build` locally before deployment.
