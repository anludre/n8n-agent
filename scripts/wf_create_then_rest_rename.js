const { chromium } = require('playwright');

(async () => {
  const url = process.env.N8N_URL || 'https://n8n.aicontenthub.ru';
  const desiredName = process.env.WORKFLOW_NAME || 'test_v6_cursor';

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: 'auth/state.json' });
  const page = await context.newPage();

  // 1) Open root and create new workflow
  await page.goto(url);
  await page.waitForSelector('text=/New Workflow|Create Workflow/i', { timeout: 30000 });
  await page.click('text=/New Workflow|Create Workflow/i');
  await page.waitForLoadState('domcontentloaded');

  // 2) Save immediately to get an ID
  const saveSelectors = ["[data-test-id='workflow-save']", 'text=Save'];
  let saved = false;
  for (const sel of saveSelectors) {
    const loc = page.locator(sel).first();
    if (await loc.count()) { try { await loc.click({ timeout: 5000 }); saved = true; break; } catch {} }
  }
  if (!saved) throw new Error('Could not click Save to persist workflow.');
  await page.waitForLoadState('networkidle');

  // 3) Extract workflow ID from URL
  const wfUrl = page.url();
  const m = /\/workflow\/(\w[\w-]*)/.exec(wfUrl);
  if (!m) throw new Error('Could not parse workflow id from URL: ' + wfUrl);
  const workflowId = m[1];

  // 4) Rename via REST API
  // Fetch existing to get full payload, then update name
  const renamed = await page.evaluate(async ({ id, name }) => {
    try {
      const getRes = await fetch(`/rest/workflows/${id}`, { credentials: 'include' });
      if (!getRes.ok) return { ok: false, step: 'get', status: getRes.status };
      const existing = await getRes.json();
      const body = { ...existing, name };
      const putRes = await fetch(`/rest/workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!putRes.ok) return { ok: false, step: 'put', status: putRes.status };
      const after = await putRes.json();
      return { ok: true, after };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }, { id: workflowId, name: desiredName });

  if (!renamed?.ok) throw new Error('REST rename failed: ' + JSON.stringify(renamed));

  // 5) Refresh and verify title
  await page.reload();
  let verified = false;
  try {
    await page.waitForFunction((expected) => {
      const el = document.querySelector('[data-test-id="workflow-name"]') || document.querySelector('[data-test-id="inline-edit"]');
      if (!el) return false;
      const text = (el.textContent || '').trim();
      return text === expected;
    }, desiredName, { timeout: 8000 });
    verified = true;
  } catch {}
  if (!verified) throw new Error('Title not verified after REST rename.');

  console.log('CREATED_AND_RENAMED', workflowId);
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });


