const { chromium } = require('playwright');

(async () => {
  const url = process.env.N8N_URL || 'https://n8n.aicontenthub.ru';
  const fromTitle = process.env.FROM_TITLE || 'My workflow 3';
  const toTitle = process.env.TO_TITLE || 'Test_2_cursor';

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: 'auth/state.json' });
  const page = await context.newPage();

  // Go to workflows list
  await page.goto(url.replace(/\/?$/, '/') + 'workflows');
  await page.waitForLoadState('domcontentloaded');

  // Click workflow card/link by text
  const clicked = await page.evaluate((title) => {
    const candidates = Array.from(document.querySelectorAll('a, [data-test-id="workflow-card"], [data-test-id="workflow-card"] a'));
    const el = candidates.find(n => (n.textContent || '').trim().includes(title));
    if (el) { (el).dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }
    const link = document.querySelector('a[href*="/workflow/"]');
    if (link) { (link).click(); return true; }
    return false;
  }, fromTitle);
  if (!clicked) throw new Error('Workflow with given title not found to open.');

  await page.waitForLoadState('domcontentloaded');

  // Inline edit rename
  const nameInput = page.locator("[data-test-id='inline-edit-input']");
  const inlineEdit = page.locator("[data-test-id='inline-edit']");
  const visibleTitle = page.locator("[data-test-id='workflow-name']");

  if (await inlineEdit.count()) {
    try { await inlineEdit.dblclick({ timeout: 3000 }); } catch { try { await inlineEdit.click({ timeout: 3000 }); } catch {} }
  } else if (await visibleTitle.count()) {
    try { await visibleTitle.dblclick({ timeout: 3000 }); } catch { try { await visibleTitle.click({ timeout: 3000 }); } catch {} }
  }
  await nameInput.waitFor({ state: 'attached', timeout: 8000 });

  if (await nameInput.isVisible()) {
    const isMac = process.platform === 'darwin';
    try { await page.keyboard.press(isMac ? 'Meta+A' : 'Control+A'); } catch {}
    await nameInput.fill(toTitle);
  } else {
    const handle = await nameInput.elementHandle();
    if (handle) {
      await page.evaluate((el, value) => {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, handle, toTitle);
    }
  }

  // Commit and verify
  try { await nameInput.evaluate(el => el && el.blur()); } catch {}
  try { await page.keyboard.press('Enter'); } catch {}

  let verified = false;
  try {
    await page.waitForFunction((expected) => {
      const el = document.querySelector('[data-test-id="workflow-name"]') || document.querySelector('[data-test-id="inline-edit"]');
      if (!el) return false;
      const text = (el.textContent || '').trim();
      return text === expected;
    }, toTitle, { timeout: 8000 });
    verified = true;
  } catch {}

  if (!verified) throw new Error('Rename not verified — aborting without saving.');

  // Save
  const saveSelectors = ["[data-test-id='workflow-save']", 'text=Save'];
  for (const sel of saveSelectors) {
    const loc = page.locator(sel).first();
    if (await loc.count()) { try { await loc.click({ timeout: 5000 }); break; } catch {} }
  }
  await page.waitForLoadState('networkidle');

  console.log('RENAMED_BY_TITLE');
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
