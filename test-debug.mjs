import { chromium } from 'playwright-core';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', (err) => errors.push('PAGE ERROR: ' + err.message));
  page.on('requestfailed', (req) => errors.push('REQ FAILED: ' + req.url() + ' ' + req.failure()?.errorText));

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('Loaded app homepage');

  // Log all buttons
  const buttons = await page.locator('button').allTextContents();
  console.log('Buttons:', buttons.join(' | '));

  // Log all links
  const links = await page.locator('a').allTextContents();
  console.log('Links:', links.join(' | '));

  // Try clicking "New project" or "Create your first project"
  const newProjectBtn = await page.locator('button:has-text("New project"), button:has-text("Create your first project"), button:has-text("Create")').first();
  if (await newProjectBtn.count() > 0) {
    const text = await newProjectBtn.textContent();
    console.log('Clicking button:', text);
    await newProjectBtn.click();
    await sleep(2000);
  } else {
    console.log('No create button found');
  }

  // Check what's on the page now
  const allButtons = await page.locator('button').allTextContents();
  console.log('After click, buttons:', allButtons.join(' | '));

  // Take a screenshot for debugging
  await page.screenshot({ path: 'debug-page.png' });
  console.log('Screenshot saved to debug-page.png');

  // Try to find Audio tab
  const audioTab = await page.locator('button:has-text("Audio")').first();
  if (await audioTab.count() > 0) {
    console.log('Found Audio tab, clicking...');
    await audioTab.click();
    await sleep(1000);
  } else {
    console.log('Audio tab not found. All tabs:');
    const tabs = await page.locator('button, [role="tab"]').allTextContents();
    console.log(tabs.join(' | '));
  }

  // Log page errors
  if (errors.length) {
    console.log('Page errors:', errors.join('\n'));
  }

  await browser.close();
})().catch((e) => {
  console.error('Test failed:', e.message);
  process.exit(1);
});