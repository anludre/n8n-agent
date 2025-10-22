const { chromium } = require('playwright');

(async () => {
  const url = process.env.N8N_URL || 'https://n8n.aicontenthub.ru';
  const newName = process.env.WORKFLOW_NAME || 'Test_2_cursor';

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: 'auth/state.json' });
  const page = await context.newPage();

  // 1) Open n8n root and navigate to Workflows list via sidebar
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  // Try to click sidebar item "Workflows"
  const workflowsNavSelectors = [
    "[data-test-id='menu-workflows']",
    "nav >> text=/Workflows/i",
    "text=/Workflows/i"
  ];
  for (const sel of workflowsNavSelectors) {
    const nav = page.locator(sel).first();
    if (await nav.count()) {
      try { await nav.click({ timeout: 5000 }); break; } catch {}
    }
  }
  // Fallback: navigate directly to /workflows
  try { await page.goto(url.replace(/\/?$/, '/') + 'workflows'); } catch {}
  await page.waitForLoadState('domcontentloaded');

  // 2) Resolve latest workflow via REST and open it directly
  let latestWorkflowId = null;
  try {
    // Wait for a workflows list API response if page triggers it
    const listResp = await page.waitForResponse(r => /\/rest\/workflows/.test(r.url()) && r.status() === 200, { timeout: 6000 });
    const payload = await listResp.json();
    const items = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
    if (items.length) {
      items.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      latestWorkflowId = items[0].id || items[0]._id || items[0].workflowId || String(items[0].id || '');
    }
  } catch {}

  if (!latestWorkflowId) {
    // Fallback: direct fetch inside the page context
    try {
      const payload = await page.evaluate(async () => {
        try {
          const res = await fetch('/rest/workflows', { credentials: 'include' });
          if (!res.ok) return null;
          return await res.json();
        } catch { return null; }
      });
      const items = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
      if (items.length) {
        items.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        latestWorkflowId = items[0].id || items[0]._id || items[0].workflowId || String(items[0].id || '');
      }
    } catch {}
  }

  if (!latestWorkflowId) throw new Error('Could not resolve latest workflow via REST.');
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/workflow/${latestWorkflowId}`);

  // 3) Wait for editor canvas and inline name
  await page.waitForLoadState('domcontentloaded');
  const inlineEdit = page.locator("[data-test-id='inline-edit']").first();
  const visibleTitle = page.locator("[data-test-id='workflow-name']").first();
  const nameInput = page.locator("[data-test-id='inline-edit-input']").first();

  // Activate inline editor for the workflow name
  const activators = ["[data-test-id='inline-edit']", "[data-test-id='workflow-name']"]; 
  for (const sel of activators) {
    const loc = page.locator(sel).first();
    if (await loc.count()) {
      try {
        await loc.dblclick({ timeout: 3000 });
      } catch {
        try { await loc.click({ timeout: 3000 }); } catch {}
      }
      if (await nameInput.count()) break;
    }
  }

  // Ensure input appears
  try { await nameInput.waitFor({ state: 'attached', timeout: 7000 }); } catch {}

  // 4) Fill new name with robust fallbacks
  let renamed = false;
  try {
    if (await nameInput.isVisible()) {
      const isMac = process.platform === 'darwin';
      try { await page.keyboard.press(isMac ? 'Meta+A' : 'Control+A'); } catch {}
      await nameInput.fill(newName);
      renamed = true;
    } else {
      const handle = await nameInput.elementHandle();
      if (handle) {
        await page.evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, handle, newName);
        renamed = true;
      } else {
        try { await page.type("[data-test-id='inline-edit-input']", newName); renamed = true; } catch {}
      }
    }
  } catch {}

  if (!renamed) {
    throw new Error('Failed to set workflow name.');
  }

  // 5) Commit inline edit (blur + Enter), then verify
  try {
    const handle = await nameInput.elementHandle();
    if (handle) {
      try { await nameInput.evaluate(el => el && el.blur()); } catch {}
    }
    try { await page.keyboard.press('Enter'); } catch {}
  } catch {}

  let verified = false;
  try {
    await page.waitForFunction((expected) => {
      const el = document.querySelector('[data-test-id="workflow-name"]') || document.querySelector('[data-test-id="inline-edit"]');
      if (!el) return false;
      const text = (el.textContent || '').trim();
      return text === expected;
    }, newName, { timeout: 8000 });
    verified = true;
  } catch {}

  if (!verified) {
    throw new Error('Rename not verified — aborting without saving.');
  }

  // 6) Save workflow (only after verification)
  const saveSelectors = ["[data-test-id='workflow-save']", 'text=Save'];
  let saved = false;
  for (const sel of saveSelectors) {
    const loc = page.locator(sel).first();
    if (await loc.count()) {
      try { await loc.click({ timeout: 5000 }); saved = true; break; } catch {}
    }
  }
  if (!saved) throw new Error('Could not click Save button.');
  await page.waitForLoadState('networkidle');

  console.log('RENAMED');
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });


