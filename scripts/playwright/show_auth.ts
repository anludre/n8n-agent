import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const authConfig: any = require('../../auth/config');

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function inferN8nUrlFromState(statePath: string): string | undefined {
  try {
    const raw = fs.readFileSync(statePath, 'utf-8');
    const data = JSON.parse(raw);
    const origin = data?.origins?.[0]?.origin;
    if (typeof origin === 'string' && origin.startsWith('http')) return origin;
  } catch (_) {
    // ignore parse errors
  }
  return undefined;
}

(async () => {
  const selectors: Record<string, string> = authConfig.selectors;
  const timeouts: { short: number; normal: number; long: number } = authConfig.timeouts;

  const statePath = process.env.STATE_PATH || 'auth/state.json';
  const isDemo = process.env.DEMO === '1';
  const headless = process.env.HEADLESS ? process.env.HEADLESS !== 'false' : true;
  const slowMo = Number(process.env.SLOWMO || process.env.SLOW_MO || (isDemo ? 250 : 0));
  const keepOpen = process.env.KEEP_OPEN === '1' || process.env.PAUSE === '1';
  const urlEnv = process.env.N8N_URL;
  const targetUrl = (urlEnv && urlEnv.trim()) || inferN8nUrlFromState(statePath);

  if (!targetUrl) {
    console.error('Could not determine N8N_URL. Set env N8N_URL or ensure origins[] in auth/state.json.');
    process.exit(2);
  }

  const outDir = path.resolve('reports/explore');
  ensureDir(outDir);
  const screenshotPath = path.join(outDir, 'authorized.png');

  const browser = await chromium.launch({ headless, slowMo });
  const context = await browser.newContext({ storageState: statePath });
  const page = await context.newPage();

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: timeouts.long });

    // Check editor first, then workflows list as fallback
    const editorVisible = await page.locator(selectors.editorReady).first().isVisible().catch(() => false);
    if (!editorVisible) {
      const workflowsUrl = targetUrl.replace(/\/$/, '') + '/home/workflows';
      await page.goto(workflowsUrl, { waitUntil: 'domcontentloaded', timeout: timeouts.long });
    }

    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot: ${screenshotPath}`);
  } finally {
    if (keepOpen) {
      console.log('Browser is open. Press Ctrl+C to exit.');
      // keep the process alive to keep the browser window open
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      await new Promise<void>(() => {});
    } else {
      await context.close();
      await browser.close();
    }
  }
})();


