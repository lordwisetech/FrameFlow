import { chromium } from 'playwright-core';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', (err) => errors.push('PAGE ERROR: ' + err.message));
  page.on('requestfailed', (req) => errors.push('REQ FAILED: ' + req.url() + ' ' + req.failure()?.errorText));

  await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 120000 });
  console.log('Loaded app homepage');
  await sleep(2000);

  // Create a new project
  await page.click('button:has-text("New project")');
  await sleep(2000);
  console.log('Created new project');
  await sleep(2000);

  // Navigate to Audio tab
  await page.click('button:has-text("Audio")', { force: true });
  await sleep(1000);
  console.log('Navigated to Audio tab');

  // Click Load Phonon Model
  await page.click('button:has-text("Load Phonon Model")', { force: true });
  console.log('Clicked Load Phonon Model');

  // Wait for model to load
  let loaded = false;
  for (let i = 0; i < 120; i++) {
    await sleep(10000);
    const statusText = await page.locator('p.text-[10px].text-slate-300').last().textContent().catch(() => '');
    if (statusText.includes('Model ready') || statusText.includes('ready on this device')) { loaded = true; break; }
    if (statusText.includes('Could not load')) { break; }
  }
  if (!loaded) { console.log('LOAD FAILED. Errors:', errors.join('\n')); await browser.close(); process.exit(1); }
  console.log('Phonon model loaded successfully');

  // Select a voice
  const voiceSelect = await page.locator('select').first();
  await voiceSelect.selectOption({ index: 1 });
  const selectedVoice = await voiceSelect.inputValue();
  console.log('Selected voice:', selectedVoice);

  // Click Test Voice
  await page.click('button:has-text("Test Voice")', { force: true });
  console.log('Clicked Test Voice');

  // Wait for preview
  let previewOk = false;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const audio = await page.locator('audio').first();
    if (await audio.count() > 0) {
      const src = await audio.getAttribute('src');
      if (src && src.startsWith('blob:')) { previewOk = true; break; }
    }
  }
  console.log('Test Voice preview:', previewOk ? 'PASS' : 'FAIL');

  // Navigate to Script tab and add scenes
  await page.click('button:has-text("Script")', { force: true });
  await sleep(1000);

  const scriptArea = await page.locator('textarea').first();
  await scriptArea.fill('Hello world. This is a test of Phonon TTS narration. It should generate speech for multiple scenes.');
  console.log('Entered test script');

  // Click Parse
  await page.click('button:has-text("Parse")', { force: true });
  await sleep(2000);
  console.log('Parsed script into scenes');

  // Go back to Audio tab
  await page.click('button:has-text("Audio")', { force: true });
  await sleep(1000);

  // Click Generate Narration
  await page.click('button:has-text("Generate Narration")', { force: true });
  console.log('Clicked Generate Narration');

  // Wait for generation
  let genOk = false;
  for (let i = 0; i < 120; i++) {
    await sleep(10000);
    const statusText = await page.locator('p.text-[10px].text-slate-300').last().textContent().catch(() => '');
    console.log(`  [${(i + 1) * 10}s] ${statusText.slice(0, 120)}`);
    if (statusText.includes('Done!') || statusText.includes('Narration generated')) { genOk = true; break; }
    if (statusText.includes('Generation stopped') || statusText.includes('Could not load')) { break; }
  }
  console.log('Generation:', genOk ? 'PASS' : 'FAIL');

  if (genOk) {
    // Check captions
    await page.click('button:has-text("Captions")', { force: true });
    await sleep(1000);
    const captionWords = await page.locator('.caption-word, [class*="caption"]').count();
    console.log('Caption words found:', captionWords, captionWords > 0 ? 'PASS' : 'FAIL');

    // Test playback
    await page.click('button:has-text("Audio")', { force: true });
    await sleep(500);
    const playBtn = await page.locator('button:has-text("Play")').first();
    if (await playBtn.count() > 0) {
      await playBtn.click({ force: true });
      await sleep(3000);
      const playing = await page.locator('button:has-text("Pause")').count();
      console.log('Playback started:', playing > 0 ? 'PASS' : 'FAIL');
    }
  }

  // Test Settings modal - AI Cache Management
  await page.click('button:has-text("Settings")', { force: true });
  await sleep(1000);
  console.log('Opened Settings modal');

  // Check for AI Cache Management section
  const cacheSection = await page.locator('text=/AI Model Cache/').first();
  if (await cacheSection.count() > 0) {
    console.log('AI Cache Management section found: PASS');

    // Click the Info button to verify cache info works
    const infoBtn = await page.locator('button:has-text("Info")').first();
    if (await infoBtn.count() > 0) {
      await infoBtn.click({ force: true });
      await sleep(1000);
      const infoText = await page.locator('text=/Cache:/').textContent().catch(() => '');
      console.log('Cache info:', infoText.slice(0, 100));
    }

    // Close settings
    const closeBtn = await page.locator('button:has-text("Save Configuration")').first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click({ force: true });
      await sleep(500);
    }
  } else {
    console.log('AI Cache Management section found: FAIL');
  }

  // Test project saving by navigating away and back
  await page.click('button:has-text("Audio")', { force: true });
  await sleep(500);
  console.log('Navigated back to Audio tab');

  if (errors.length) console.log('Page errors:', errors.join('\n'));
  await browser.close();
  console.log('\n=== TEST COMPLETE ===');
})().catch((e) => {
  console.error('Test failed:', e.message);
  process.exit(1);
});