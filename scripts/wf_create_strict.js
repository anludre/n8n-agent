const { chromium } = require('playwright');
(async () => {
  const url = process.env.N8N_URL || 'https://n8n.aicontenthub.ru';
  const workflowName = process.env.WORKFLOW_NAME || 'test_cursor';
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: 'auth/state.json' });
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForSelector('text=/New Workflow|Create Workflow/i', { timeout: 30000 });
  await page.click('text=/New Workflow|Create Workflow/i');

  // Ensure canvas loaded
  await page.waitForLoadState('domcontentloaded');
  try { await page.waitForTimeout(300); } catch {}

  // Try to activate the workflow name inline editor (prefer data-test-id path)
  const inlineEdit = page.locator("[data-test-id='inline-edit']").first();
  const visibleTitle = page.locator("[data-test-id='workflow-name']").first();
  const nameInput = page.locator("[data-test-id='inline-edit-input'], [contenteditable='true']").first();
  try {
    if (await inlineEdit.count()) {
      try { await inlineEdit.dblclick({ timeout: 4000 }); } catch { try { await inlineEdit.click({ timeout: 4000 }); } catch {} }
    } else if (await visibleTitle.count()) {
      try { await visibleTitle.dblclick({ timeout: 4000 }); } catch { try { await visibleTitle.click({ timeout: 4000 }); } catch {} }
    }
    await nameInput.waitFor({ state: 'attached', timeout: 12000 });
  } catch {}

  if (!(await nameInput.isVisible())) {
    const clickableTargets = [
      "[data-test-id='workflow-name']",
      "[data-test-id='inline-edit']",
    ];
    let activated = false;
    for (const sel of clickableTargets) {
      const loc = page.locator(sel).first();
      if (await loc.count()) {
        try {
          await loc.dblclick({ timeout: 4000 }).catch(async () => { await loc.click({ timeout: 4000 }); });
          activated = true;
          break;
        } catch {}
      }
    }
    if (!activated) {
      // Fallback: click the visible title text if present
      try { await page.click('text=/My workflow|Untitled|Workflow/i', { timeout: 4000 }); } catch {}
    }
    await nameInput.waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
  }

  // Select all and type new name; fallback to DOM set if still hidden
  let renamed = false;
  try {
    if (await nameInput.count()) {
      if (await nameInput.isVisible()) {
        // Try fill for inputs/textareas
        try { await nameInput.fill(workflowName); renamed = true; } catch {}
        if (!renamed) {
          // Fallback: select-all + type
          const isMac = process.platform === 'darwin';
          try { await page.keyboard.press(isMac ? 'Meta+A' : 'Control+A'); } catch {}
          try { await page.type("[data-test-id='inline-edit-input'], [contenteditable='true']", workflowName); renamed = true; } catch {}
        }
      }
      if (!renamed) {
        // programmatically set value for input or contenteditable
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
          }, handle, workflowName);
          renamed = true;
        }
      }
    }
  } catch {}
  if (!renamed) {
    try { await page.type("[data-test-id='inline-edit-input'], [contenteditable='true']", workflowName); } catch {}
  }

  // Commit inline edit: blur and/or press Enter, then verify title
  try {
    const handle = await nameInput.elementHandle();
    if (handle) {
      try { await nameInput.evaluate(el => el && el.blur && el.blur()); } catch {}
    }
    try { await page.keyboard.press('Enter'); } catch {}
    try { await page.waitForTimeout(200); } catch {}
  } catch {}

  // Wait until the visible title reflects the new name (best-effort)
  let titleVerified = false;
  try {
    await page.waitForFunction((expected) => {
      const label = document.querySelector('[data-test-id="workflow-name"]');
      const input = document.querySelector('[data-test-id="inline-edit-input"]');
      const editable = document.querySelector('[contenteditable="true"]');
      const labelText = (label?.textContent || '').trim();
      if (labelText === expected) return true;
      if (input && input instanceof HTMLInputElement && input.value === expected) return true;
      if (editable && (editable.textContent || '').trim() === expected) return true;
      return false;
    }, workflowName, { timeout: 20000 });
    titleVerified = true;
  } catch (e) {
    titleVerified = false;
  }

  // Strict mode: do not save unless title is verified
  if (!titleVerified) {
    console.error('Title was not verified. Aborting without saving to avoid creating a default draft.');
    await browser.close();
    process.exit(2);
  }

  await page.click('text=Save');
  await page.waitForLoadState('networkidle');
  console.log('DONE');
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
