Explainer Studio Pro: How It Works and How to Write Your Script

A guide to the Live Explainer Video studio: what each part does, how a script becomes a finished MP4, and how to write scripts that turn out well.
1. What the program does
Explainer Studio Pro turns a written script into a short video. You paste your text, and the program:
1. Splits the script into scenes (one scene per line).
2. Picks a stock video clip for each scene (from Pixabay, or built-in fallback clips).
3. Shows captions over the clips in a live preview.
4. Lets you add a voiceover and background music.
5. Lets you adjust timing on a timeline.
6. Exports everything as one MP4 file, using FFmpeg inside your browser.
The home page gives you two choices:
• Live Explainer Video: the studio described in this guide.
• Animation Explainer Video: empty for now. It is reserved for a future 2D animation tool.
2. Getting started
Run the app
1. Unzip the project and open a terminal in the folder.
2. Run npm install (one time).
3. Run npm run dev and open the address it prints (usually http://localhost:5173).
Tailwind CSS and Font Awesome load from a CDN in index.html, so there is nothing extra to set up for styling.
Add your Pixabay key (recommended)
1. Create a free account at pixabay.com and copy your API key from the API documentation page.
2. In the studio, click API Keys, paste the key into Pixabay API Key, and click Save Configuration.
3. The key is stored in your browser (localStorage). It is not sent anywhere except to Pixabay.
Without a key the studio still works, but every scene uses one of five built-in fallback clips and the Pixabay tab cannot search. The OpenRouter field is saved but not used yet.
3. The workflow in six steps
1. Write or paste your script in the Script tab.
2. Click Parse & Auto-Match Media. Scenes are created and, if you saved a Pixabay key, each one is matched to a clip.
3. Open the Scenes tab to fix text, durations and clips.
4. Open the Audio tab to add a voiceover and optional background music.
5. Use the preview and timeline to play it back and adjust timing.
6. Click Render Export and wait for the MP4 to download.
Important: clicking Parse again rebuilds all scenes from the script text. Any edits you made in the Scenes tab, and any clips you applied, are replaced. Finish your script first, then parse once, then fine-tune.
4. How to write the script
The one rule that matters
Every line becomes one scene. The program splits your text wherever there is a line break. Blank lines are ignored, so you can leave a gap between lines for readability. A long paragraph with no line breaks becomes a single very long scene, so press Enter after each sentence or idea.
Write one idea per scene
Each scene gets one clip and one caption. Keep it to a single thought:
• Length: aim for 8 to 20 words per line. Most people speak about 2.5 words per second, so a 12-word line fits the default 5-second scene.
• Style: short, spoken sentences. Read each line aloud. If you run out of breath, split it.
• Captions: the line is shown on screen exactly as you type it, so punctuation and spelling count.
Put concrete nouns early in the sentence
To choose a clip, the program creates a search phrase from the line:
1. Lowercases the text and removes punctuation.
2. Removes common filler words and every word of three letters or fewer.
3. Keeps the first two words that remain.
4. Falls back to "technology" if nothing is left.
So the opening words of each line control which video appears.
Line
Search phrase
Result
"Entire websites are now generated automatically."
entire websites
Weak match
"Websites now publish thousands of articles every minute."
websites publish
Better match
"Solar panels turn sunlight into electricity."
solar panels
Strong match
"It is a very big problem for all of us."
very problem
Poor match
Start lines with a visual subject such as solar panels, busy street, server room or doctor. Avoid openings like "It is", "There are" or "So the real question".
If the automatic clip is wrong, use Search Swap on the scene, or type your own search in the Pixabay tab (see section 5).
A simple structure that works
Part
Scenes
Purpose
Hook
1
A question or surprising fact that makes people keep watching
Problem
1 to 2
What is wrong or confusing
Explanation
2 to 4
How it works, one step per line
Example
1 to 2
Something concrete the viewer can picture
Close
1
A takeaway or a call to action
For a 30 to 60 second video, 6 to 10 lines is a good target.
Example script
Have you ever wondered where your electricity comes from?

Power stations burn fuel to spin giant turbines.

Solar panels skip the burning and turn sunlight straight into power.

Wind turbines catch moving air and spin a generator.

Cities then send that energy through cables to every home.

So next time you flip a switch, you will know the journey behind it.
Each line is one idea, starts with something you can see, and fits in about five seconds.
If you will use a voiceover
Write the script first, record the narration reading it line by line, and keep the lines similar in length. The Sync Timeline to Audio button divides the audio length equally across all scenes, so lines of very different length will not line up with the speech. If one line is much longer, adjust its duration afterwards in the Scenes tab or by dragging on the timeline.
5. The tabs, one by one
Script tab
Paste your text and click Parse & Auto-Match Media. The studio loads with a sample script so you can see it working immediately.
Scenes tab
Each scene card shows:
• Scene number and duration in seconds (minimum 1). Changing it moves every later scene.
• Caption text, which you can edit directly. Editing the text does not change the clip search phrase.
• Search Swap, which opens the Pixabay tab and searches using the scene's original phrase.
Add Scene appends a new scene at the end with the text "New scene".
The card for the scene at the playhead is highlighted.
Pixabay tab
1. Type a search and press Enter or click Search.
2. Hover a result to preview it.
3. Click Apply to put that clip on the scene currently at the playhead. The tab confirms which scene number was changed.
To change a different scene, first click its block on the timeline (or move the playhead into it), then apply. The Audio switch in this tab only explains that Pixabay has no music search. Add music from the Audio tab instead.
Audio tab
• Voiceover: upload one narration file (MP3, WAV, M4A, OGG) for the whole video. Use the built-in player to check it, Sync Timeline to Audio to fit scene durations to it, and the trash button to remove it.
• Background music: upload a music file. It loops for the whole video. The Music Volume slider (default 20%) sets how loud it is under the voiceover.
Kokoro offline narration

The Audio tab includes a separate Kokoro Offline Voice panel alongside the existing Gemini option.

1. While online, open Audio and click **Download / Load Model**. The first run downloads the Kokoro-82M q8 model files from Hugging Face.
2. Keep the tab open while the model loads. The app uses the WASM runtime and q8 weights to reduce memory pressure on phones and 8 GB computers.
3. Choose an American or British English voice and use the existing speaking-speed control.
4. Click **Generate Narration**. Each scene is generated locally, then combined into one voiceover track and applied to the project.
5. After the model has been cached by the browser, it can usually be loaded again without downloading it. Browser storage policies, cache eviction and available device memory still apply; offline availability is not guaranteed if the browser clears its cache.

Kokoro runs locally after its model assets are available and does not require a Gemini key. Unlike Gemini's transcription alignment, the current Kokoro workflow estimates word timings proportionally for animated captions. The resulting captions are useful for karaoke-style display but are not phoneme-accurate forced alignment. Gemini remains available for its existing word-alignment workflow.

The model is loaded in a Web Worker so inference does not run directly on the React UI thread. If a device runs out of memory or does not support the required browser features, use Gemini or upload a recorded narration instead.

6. Preview and timeline
• Aspect buttons (16:9, 9:16, 1:1) change the shape of the preview and of the exported video. Use 16:9 for YouTube, 9:16 for Reels, Shorts and TikTok, and 1:1 for square posts.
• Play, Stop and Restart control playback. Stop returns to the start. Restart jumps to the start and keeps playing if it was playing.
• Scene blocks are shown in order along the timeline. Click a block to jump to that scene. Press and drag a block left or right to shorten or lengthen it (minimum 1.5 seconds).
• Playhead is the vertical line. Drag it to scrub, or use the slider under the timeline.
• Clock shows the current time and the total length. Total length is the sum of all scene durations.
Voiceover and music follow the playhead, so scrubbing keeps sound in sync. If a clip is shorter than its scene, it loops.
7. How the program works inside
The data
The studio keeps a list of scenes. Each scene has:
Field
Meaning
id
A unique ID used to track the scene's video
text
The caption
duration
Length in seconds
videoUrl
The chosen stock clip
keywords
The search phrase made from the text
Start times are never stored. They are calculated by adding up the durations of the scenes before each one, so changing one duration moves everything after it automatically.
From script to scenes
1. Split the script on line breaks and drop blank lines.
2. Create a scene for each line with a 5-second default and a fallback clip.
3. If a Pixabay key exists, search for each scene's phrase one at a time and swap in the first result as it arrives.
Clip handling
For each scene the program keeps a hidden <video> element. It first downloads the clip as a file and plays that local copy. This matters for two reasons: the picture can be copied to the canvas without browser security errors, and FFmpeg can read the same file at export time. If a website blocks the download (a CORS restriction), the clip still plays in the preview, but it cannot be exported.
The live preview
A canvas repaints the current scene's video many times per second, scaled to fill the frame. Captions are a text layer on top. A playback timer advances the playhead, and the video, voiceover and music elements are nudged to match it whenever they drift more than a fraction of a second.
Export with FFmpeg
Clicking Render Export runs this sequence entirely in your browser:
1. Load FFmpeg. The first export downloads the FFmpeg engine (about 30 MB). Later exports reuse it.
2. Prepare each scene. The clip file is loaded into FFmpeg's memory, and the caption is drawn as a transparent PNG image sized for the output.
3. Build one filter chain. Every clip is scaled and cropped to fill the output size, set to 30 frames per second, overlaid with its caption, and trimmed to its scene duration. The scenes are joined in order.
4. Mix audio. The voiceover and the music (at your chosen volume) are blended. If you added neither, the video has no sound.
5. Encode. The result is encoded as an H.264 video with AAC audio and saved as explainer-studio-export.mp4.
6. Clean up. Temporary files are removed from memory and the download starts.
Export sizes:
Aspect
Exported size
16:9
854 × 480
9:16
480 × 854
1:1
576 × 576
These sizes keep rendering fast and memory use low. They can be raised in the ASPECTS setting in src/utils/helpers.js.
Project layout
Path
Role
src/App.jsx
Switches between home, live studio and animation page
src/pages/HomePage.jsx
The two-choice start screen
src/pages/LiveExplainerPage.jsx
Holds the studio state and connects all parts
src/pages/AnimationExplainerPage.jsx
Empty placeholder
src/components/live/
Header, sidebar, tabs, preview, timeline, settings and export overlay
src/hooks/usePlayback.js
Playhead timer and play, stop and seek
src/hooks/useVideoPool.js
One video element per scene
src/utils/helpers.js
Keyword extraction, timing helpers, sizes, clip download
src/utils/exportVideo.js
The FFmpeg export pipeline
8. Tips for better videos
• Use Pixabay clips rather than the built-in fallbacks. They download more reliably and match your topic.
• Keep captions to two lines or fewer on screen. Shorter lines look better, especially in 9:16.
• Choose the aspect ratio before exporting. Changing it afterwards means rendering again.
• Keep total length reasonable. Long videos use more browser memory. For a long project, export in parts.
• Use music at 10 to 20% so the voice stays clear.
• Preview the whole video once before exporting, since rendering takes longer than playing.
9. Troubleshooting
Problem
Likely cause and fix
Every scene shows the same kind of clip
No Pixabay key saved. Add it under API Keys, then parse again.
A clip does not match the line
The first two meaningful words were too vague. Rewrite the start of the line, or use Search Swap or the Pixabay tab.
Pixabay tab says "No API key set" or "Search failed"
Check the key, and check your internet connection.
Preview is black for a scene
The clip is still loading, or the site blocked it. Apply a Pixabay clip instead.
Export says clips were replaced with a black frame
Those clips were blocked by CORS. Replace them with Pixabay clips and export again.
Export fails or the tab runs out of memory
Lower the number or length of scenes, close other tabs, or export a shorter video.
Export stays at "Loading FFmpeg"
The engine could not download. Check your connection and that unpkg.com is reachable.
Voiceover ends before the video
Run Sync Timeline to Audio, or lengthen the narration.
Voiceover is longer than the video
Audio is cut at the end of the last scene. Increase scene durations.
My scene edits disappeared
Parse rebuilds all scenes. Avoid clicking it after you start editing.
No music option in Pixabay
Pixabay has no music API. Upload a music file in the Audio tab.
10. Current limits
• The Animation Explainer Video page is empty on purpose.
• The OpenRouter key is stored but nothing uses it yet.
• Automatic clip matching uses only the first two meaningful words of each line.
• Exports run in the browser, so speed and maximum length depend on your computer.
## Mobile-first foundation (FrameFlow 1.2 update)

This update adds the first foundation layer for the planned offline-first PWA:

- A web app manifest, install metadata, app icon, and service worker shell/runtime caching.
- A local IndexedDB project library with create, open, rename, duplicate, delete, autosave, import, and export.
- Project snapshots include script, scene data, aspect ratio, caption settings, narration settings, and selected voice/background audio blobs.
- The home dashboard has been refreshed for narrow mobile screens while retaining the existing dark indigo/purple visual identity.
- The editor header now exposes the project name and autosave status.

### Current boundaries

This is the foundation milestone, not the complete offline conversion. Pixabay video URLs are still URL references; selected footage is not yet downloaded into durable local project storage. The current FFmpeg loading path and external runtime dependencies also still need to be made fully offline-safe. Kokoro is not included yet. Project export currently packages project metadata and audio assets, not full video footage. Test production builds and Android device behavior before relying on it for production work.


## Android testing and PWA installation

- Start the Vite development server with `npm run dev`. Vite listens on `0.0.0.0:5173`, so a phone on the same Wi-Fi can open the LAN address printed by your QR-code helper.
- The project ID generator includes a compatibility fallback for local HTTP addresses where `crypto.randomUUID()` is unavailable.
- A plain `http://<LAN-IP>:5173` address is for testing only. Android Chrome does not treat an ordinary LAN HTTP address as a secure origin, so it cannot provide full PWA installation or service-worker behaviour there.
- To install the PWA, create a production build with `npm run build` and serve/deploy the `dist` folder from an HTTPS origin. The manifest includes 192×192 and 512×512 PNG icons, and the production service worker precaches the app shell.
- Do not use `vite --host` on an untrusted public network; the development server is intended for your private local network.

## 8. Downloaded media library (offline reuse)

The Pixabay tab now has two views: **Find videos** and **Downloads**.

1. Add your Pixabay API key under API Keys.
2. Search for a clip and preview the result.
3. Choose **Download** to save it in the browser's IndexedDB storage on this device, or **Apply** to download it and apply it to the active scene.
4. Open **Downloads** to reuse saved clips in other scenes or projects, or delete clips you no longer need.

Saved clips are read from local browser storage for preview and FFmpeg export, so they can be reused without another network download. The media library is shared by projects in the same browser profile on the same device. It is not automatically included when exporting a project file, and clearing browser site data or uninstalling the browser can remove it. Browser storage limits vary by device. A Pixabay API key and internet connection are still needed to search and download new clips. Some remote video hosts may block browser downloads; when that happens the app displays an error instead of silently claiming the clip was saved.


## Phase 4 — Kokoro voice preview, offline word timing, and resource links

- Added a voice preview action and an audio player so users can listen to each selected Kokoro voice before generating full narration.
- Added a separate Whisper tiny timestamped ONNX model through Transformers.js. It runs in a Web Worker with WASM and q8 weights. Users can explicitly download/load the sync model before going offline; later use is browser-cached where storage permits.
- Kokoro scene audio is analysed locally for word-level timestamps. The recognised words are aligned back to the scene script. If speech matching is too weak or alignment fails, that scene falls back to proportional timing and the status message reports the fallback instead of pretending it was accurate.
- Added a Resources tab with external links for Pixabay, Vecteezy, Shutterstock, Envato Elements, Internet Archive, LottieFiles, and Mixkit, including licence reminders. The tab does not scrape or redistribute third-party catalogues.

### Important alignment notes

Whisper provides audio-derived word timestamps, not a mathematical guarantee of perfect forced alignment. Its word boundaries can be off by roughly a tenth of a second or more, especially on short function words, accents, or noisy audio. Users should review and adjust captions when exact frame-level timing matters. The sync model is a separate first-time download from Kokoro and is processed locally after download.

### Install and build

Run `npm install` to resolve the new `@huggingface/transformers` dependency and refresh `package-lock.json`, then run `npm run build`. This environment could not finish npm dependency installation, so a full production build has not been verified here.
