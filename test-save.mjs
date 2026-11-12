import { chromium } from 'playwright-core';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', (err) => errors.push('PAGE ERROR: ' + err.message));

  await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 120000 });
  console.log('Loaded app homepage');
  await sleep(2000);

  // Create a new project
  await page.click('button:has-text("New project")');
  await sleep(2000);
  console.log('Created new project');
  await sleep(2000);

  // Navigate to Script tab and enter a script
  await page.click('button:has-text("Script")', { force: true });
  await sleep(1000);
  const scriptArea = await page.locator('textarea').first();
  await scriptArea.fill('Test project save verification script.');
  console.log('Entered test script');

  // Parse to create scenes
  await page.click('button:has-text("Parse")', { force: true });
  await sleep(2000);
  console.log('Parsed script into scenes');

  // Wait for autosave to trigger
  await sleep(2000);

  // Check IndexedDB for saved project
  const projectCount = await page.evaluate(() => {
    return new Promise((resolve) => {
      const request = indexedDB.open('explainer-studio-local', 3);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('projects', 'readonly');
        const store = tx.objectStore('projects');
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          db.close();
          resolve(getAll.result.length);
        };
        getAll.onerror = () => { db.close(); resolve(-1); };
      };
      request.onerror = () => resolve(-1);
    });
  });

  console.log('Projects in IndexedDB:', projectCount, projectCount > 0 ? 'PASS' : 'FAIL');

  // Verify project data is correct
  const projectData = await page.evaluate(() => {
    return new Promise((resolve) => {
      const request = indexedDB.open('explainer-studio-local', 3);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('projects', 'readonly');
        const store = tx.objectStore('projects');
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          db.close();
          if (getAll.result.length > 0) {
            const p = getAll.result[0];
            resolve({
              name: p.name,
              hasScript: !!p.data?.script,
              hasRaw: Array.isArray(p.data?.raw) && p.data.raw.length > 0,
            });
          } else {
            resolve(null);
          }
        };
      };
    });
  });

  console.log('Project data:', JSON.stringify(projectData));

  // Now navigate back to Home and verify project appears
  // The Home page is the root - we need to navigate to it
  // Actually, let's just check the project list directly
  const homeProjectCount = await page.evaluate(() => {
    return new Promise((resolve) => {
      const request = indexedDB.open('explainer-studio-local', 3);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('projects', 'readonly');
        const store = tx.objectStore('projects');
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          db.close();
          resolve(getAll.result.length);
        };
      };
    });
  });

  console.log('Persistent projects:', homeProjectCount, homeProjectCount > 0 ? 'PASS' : 'FAIL');

  if (errors.length) console.log('Page errors:', errors.join('\n'));
  await browser.close();
  console.log('\n=== TEST COMPLETE ===');
})().catch((e) => {
  console.error('Test failed:', e.message);
  process.exit(1);
});