const { chromium } = require('playwright');

(async () => {
  const url = process.env.N8N_URL || 'https://n8n.aicontenthub.ru';
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: 'auth/state.json' });
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForSelector('text=/New Workflow|Create Workflow/i', { timeout: 30000 });
  await page.click('text=/New Workflow|Create Workflow/i');
  await page.waitForLoadState('domcontentloaded');
  // keep the editor open for further manual actions
  console.log('WORKFLOW_OPENED');
  // Do not close browser to keep session active; comment the next line if you want window left open
  // await browser.close();
})().catch(err => { console.error(err); process.exit(1); });



