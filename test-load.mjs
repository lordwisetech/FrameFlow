import { chromium } from 'playwright-core';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', (err) => errors.push('PAGE ERROR: ' + err.message));
  page.on('requestfailed', (req) => errors.push('REQ FAILED: ' + req.url() + ' ' + req.failure()?.errorText));
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') errors.push('CONSOLE: ' + msg.text());
  });

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

  // Wait and log status every 10 seconds
  for (let i = 0; i < 120; i++) {
    await sleep(10000);
    const statusText = await page.locator('p.text-[10px].text-slate-300').last().textContent().catch(() => 'no status');
    console.log(`  [${(i + 1) * 10}s] ${statusText.slice(0, 200)}`);
    if (statusText.includes('Model ready') || statusText.includes('ready on this device')) {
      console.log('MODEL LOADED');
      break;
    }
    if (statusText.includes('Could not load')) {
      console.log('LOAD FAILED');
      break;
    }
  }

  if (errors.length) console.log('Errors:', errors.join('\n'));
  await browser.close();
})().catch((e) => {
  console.error('Test failed:', e.message);
  process.exit(1);
});