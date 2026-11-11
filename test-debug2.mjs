import { chromium } from 'playwright-core';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', (err) => errors.push('PAGE ERROR: ' + err.message));
  page.on('requestfailed', (req) => errors.push('REQ FAILED: ' + req.url() + ' ' + req.failure()?.errorText));

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 120000 });
  console.log('Loaded app homepage');

  // Wait a bit for React to render
  await sleep(3000);

  // Log all buttons
  const buttons = await page.locator('button').allTextContents();
  console.log('Buttons:', buttons.join(' | '));

  // Take a screenshot
  await page.screenshot({ path: 'debug-page.png' });
  console.log('Screenshot saved');

  // Try to find and click a create button
  const createBtn = await page.locator('button').filter({ hasText: /New|Create|Start/ }).first();
  if (await createBtn.count() > 0) {
    const text = await createBtn.textContent();
    console.log('Clicking:', text);
    await createBtn.click();
    await sleep(3000);
  } else {
    console.log('No create button found');
  }

  // Check buttons again
  const buttons2 = await page.locator('button').allTextContents();
  console.log('After click buttons:', buttons2.join(' | '));

  if (errors.length) {
    console.log('Page errors:', errors.join('\n'));
  }

  await browser.close();
})().catch((e) => {
  console.error('Test failed:', e.message);
  process.exit(1);
});