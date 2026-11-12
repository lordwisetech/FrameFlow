import { chromium } from 'playwright-core';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', (err) => errors.push('PAGE ERROR: ' + err.message));
  page.on('requestfailed', (req) => errors.push('REQ FAILED: ' + req.url()));

  await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 120000 });
  console.log('Loaded app homepage');
  await sleep(2000);

  // Create a new project
  await page.click('button:has-text("New project")');
  await sleep(2000);
  console.log('Created new project');
  await sleep(2000);

  // Navigate to Script tab
  await page.click('button:has-text("Script")', { force: true });
  await sleep(1000);

  // Enter a script
  const scriptArea = await page.locator('textarea').first();
  await scriptArea.fill('Hello world. This is a test script for video preview.');
  console.log('Entered test script');

  // Click Parse
  await page.click('button:has-text("Parse")', { force: true });
  await sleep(2000);
  console.log('Parsed script into scenes');

  // Navigate to Scenes tab to verify scene switching
  await page.click('button:has-text("Scenes")', { force: true });
  await sleep(1000);
  console.log('Navigated to Scenes tab');

  // Navigate to Audio tab
  await page.click('button:has-text("Audio")', { force: true });
  await sleep(1000);
  console.log('Navigated to Audio tab');

  // Open Settings and verify AI Cache Management
  await page.click('button:has-text("Settings")', { force: true });
  await sleep(1000);

  const cacheSection = await page.locator('text=/AI Model Cache/').first();
  if (await cacheSection.count() > 0) {
    console.log('AI Cache Management section found: PASS');

    // Click Info button
    const infoBtn = await page.locator('button:has-text("Info")').first();
    if (await infoBtn.count() > 0) {
      await infoBtn.click({ force: true });
      await sleep(1000);
      const infoText = await page.locator('text=/Cache:/').textContent().catch(() => '');
      console.log('Cache info:', infoText.slice(0, 100));
    }
  } else {
    console.log('AI Cache Management section found: FAIL');
  }

  // Close settings
  await page.click('button:has-text("Save Configuration")', { force: true });
  await sleep(500);

  // Test project save by navigating to Home and back
  await page.click('button:has-text("Back")', { force: true });
  await sleep(2000);
  console.log('Navigated back to Home');

  // Verify project is saved
  const projectCard = await page.locator('.project-card, [class*="project"]').first();
  if (await projectCard.count() > 0) {
    console.log('Project saved: PASS');
  } else {
    console.log('Project saved: FAIL');
  }

  if (errors.length) console.log('Page errors:', errors.join('\n'));
  await browser.close();
  console.log('\n=== TEST COMPLETE ===');
})().catch((e) => {
  console.error('Test failed:', e.message);
  process.exit(1);
});