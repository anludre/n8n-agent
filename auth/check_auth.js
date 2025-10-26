// auth/check_auth.js
const { chromium } = require('playwright');
const config = require('./config');

(async () => {
  const N8N_URL = process.env.N8N_URL;
  const STATE_PATH = process.env.STATE_PATH || 'auth/state.json';

  if (!N8N_URL) {
    console.error('Missing N8N_URL env var.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: STATE_PATH });
  const page = await context.newPage();

  try {
    const { selectors, timeouts } = config;
    await page.goto(N8N_URL, { waitUntil: 'domcontentloaded', timeout: timeouts.long });

    const editorVisible = await page
      .locator(selectors.editorReady)
      .first()
      .isVisible()
      .catch(() => false);

    if (editorVisible) {
      console.log('OK: authorized (editor visible)');
      process.exitCode = 0;
      return;
    }

    const loginFormVisible = await page
      .locator(`${selectors.email}, ${selectors.password}, ${selectors.loginButton}`)
      .first()
      .isVisible()
      .catch(() => false);

    if (loginFormVisible) {
      console.log('NEEDS_LOGIN: login form detected');
      process.exitCode = 2;
      return;
    }

    // Fallback: try navigating directly to workflows list
    await page.goto(N8N_URL.replace(/\/$/, '') + '/home/workflows', { waitUntil: 'domcontentloaded', timeout: timeouts.long });
    const workflowsVisible = await page
      .locator(selectors.workflowsListReady)
      .first()
      .isVisible()
      .catch(() => false);

    if (workflowsVisible) {
      console.log('OK: authorized (workflows visible)');
      process.exitCode = 0;
    } else {
      console.log('UNKNOWN: could not confirm auth state');
      process.exitCode = 3;
    }
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();


