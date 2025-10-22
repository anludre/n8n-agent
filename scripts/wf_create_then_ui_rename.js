const { chromium } = require('playwright');

(async () => {
  const url = process.env.N8N_URL || 'https://n8n.aicontenthub.ru';
  const desiredName = process.env.WORKFLOW_NAME || 'test_v6_cursor';

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: 'auth/state.json' });
  const page = await context.newPage();

  await page.goto(url);
  await page.waitForSelector('text=/New Workflow|Create Workflow/i', { timeout: 30000 });
  await page.click('text=/New Workflow|Create Workflow/i');
  await page.waitForLoadState('domcontentloaded');

  // Save once to persist and get ID
  const saveSelectors = ["[data-test-id='workflow-save']", 'text=Save'];
  let saved = false;
  for (const sel of saveSelectors) {
    const loc = page.locator(sel).first();
    if (await loc.count()) { try { await loc.click({ timeout: 5000 }); saved = true; break; } catch {} }
  }
  if (!saved) throw new Error('Could not click Save to persist workflow.');
  await page.waitForLoadState('networkidle');

  // Try to rename inline with retries
  const nameInput = page.locator("[data-test-id='inline-edit-input'], [contenteditable='true']").first();
  const label = page.locator("[data-test-id='workflow-name']").first();
  const inlineEdit = page.locator("[data-test-id='inline-edit']").first();

  async function attemptRename() {
    try {
      // Activate editor
      if (await inlineEdit.count()) {
        try { await inlineEdit.dblclick({ timeout: 2000 }); } catch { try { await inlineEdit.click({ timeout: 2000 }); } catch {} }
      } else if (await label.count()) {
        try { await label.dblclick({ timeout: 2000 }); } catch { try { await label.click({ timeout: 2000 }); } catch {} }
      }
      await nameInput.waitFor({ state: 'attached', timeout: 3000 });

      // Fill or type
      let done = false;
      if (await nameInput.isVisible()) {
        try { await nameInput.fill(desiredName); done = true; } catch {}
        if (!done) { try { await page.type("[data-test-id='inline-edit-input'], [contenteditable='true']", desiredName); done = true; } catch {} }
      }
      if (!done) {
        const handle = await nameInput.elementHandle();
        if (handle) {
          await page.evaluate((el, value) => {
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
              el.value = value;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (el && el.getAttribute && el.getAttribute('contenteditable') === 'true') {
              el.textContent = value;
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }, handle, desiredName);
          done = true;
        }
      }

      // Commit
      try { await nameInput.evaluate(el => el && el.blur && el.blur()); } catch {}
      try { await page.keyboard.press('Enter'); } catch {}

      // Verify
      await page.waitForFunction((expected) => {
        const l = document.querySelector('[data-test-id="workflow-name"]');
        const t = (l?.textContent || '').trim();
        return t === expected;
      }, desiredName, { timeout: 4000 });
      return true;
    } catch {
      return false;
    }
  }

  let ok = false;
  for (let i = 0; i < 3; i++) {
    ok = await attemptRename();
    if (ok) break;
    try { await page.waitForTimeout(500); } catch {}
  }
  if (!ok) throw new Error('Inline rename failed after retries.');

  // Save again
  saved = false;
  for (const sel of saveSelectors) {
    const loc = page.locator(sel).first();
    if (await loc.count()) { try { await loc.click({ timeout: 5000 }); saved = true; break; } catch {} }
  }
  if (!saved) throw new Error('Could not click Save after rename.');
  await page.waitForLoadState('networkidle');

  console.log('CREATED_AND_RENAMED_UI');
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
