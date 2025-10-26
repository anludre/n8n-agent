// auth/login.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const config = require('./config');

(async () => {
  const N8N_URL = process.env.N8N_URL;
  const USER = process.env.N8N_USERNAME || process.env.N8N_EMAIL;
  const PASS = process.env.N8N_PASSWORD || process.env.N8N_PASS;
  const STATE_PATH = process.env.STATE_PATH || 'auth/state.json';

  const IS_DEMO = process.env.DEMO === '1';
  if (Object.prototype.hasOwnProperty.call(process.env, 'HEADFUL')) {
    console.warn('HEADFUL is deprecated. Use HEADLESS=false or DEMO=1 instead.');
  }
  const HEADLESS = process.env.HEADLESS ? process.env.HEADLESS !== 'false' : !IS_DEMO;
  const SLOW_MO = Number(process.env.SLOWMO || process.env.SLOW_MO || (IS_DEMO ? 250 : 0));
  const DEMO_PAUSE_MS = Number(process.env.DEMO_PAUSE_MS || (IS_DEMO ? 3000 : 0));

  if (!N8N_URL) {
    console.error('Missing N8N_URL env var.');
    process.exit(1);
  }

  if (!USER || !PASS) {
    console.error('Missing credentials. Set N8N_USERNAME (or N8N_EMAIL) and N8N_PASSWORD (or N8N_PASS).');
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOW_MO });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Tracing disabled

  try {
    const { selectors, timeouts, retry } = config;

    // Ensure directory for STATE_PATH exists
    const stateDir = path.dirname(STATE_PATH);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    // open homepage
    await page.goto(N8N_URL, { waitUntil: 'domcontentloaded', timeout: timeouts.long });

    // if already logged in — just save state
    const loggedIn = await page.locator(selectors.editorReady).first().isVisible().catch(() => false);
    if (loggedIn) {
      await context.storageState({ path: STATE_PATH });
      const size = fs.statSync(STATE_PATH).size;
      console.log(`Already logged in. Saved state.json (${size} bytes)`);
      return;
    }

    let attempt = 0;
    while (attempt <= retry.attempts) {
      try {
        // locate and fill login form
        await page.waitForSelector(selectors.email, { timeout: timeouts.normal });
        await page.fill(selectors.email, USER);
        await page.fill(selectors.password, PASS);
        await page.waitForSelector(selectors.loginButton, { timeout: timeouts.normal });
        await page.click(selectors.loginButton);

        // wait for successful login indicator
        await page.waitForSelector(selectors.editorReady, { timeout: timeouts.long });

        if (DEMO_PAUSE_MS > 0) {
          await page.waitForTimeout(DEMO_PAUSE_MS);
        }

        await context.storageState({ path: STATE_PATH });
        const size = fs.statSync(STATE_PATH).size;
        console.log(`Login succeeded. Saved auth/state.json (${size} bytes)`);
        return;
      } catch (err) {
        attempt += 1;
        if (attempt > retry.attempts) {
          console.error('Login failed after retries:', err.message);
          process.exit(10);
        }
        await page.waitForTimeout(retry.backoffMs * attempt);
        await page.goto(N8N_URL, { waitUntil: 'domcontentloaded', timeout: timeouts.long });
      }
    }
  } finally {
    await browser.close();
  }
})();


