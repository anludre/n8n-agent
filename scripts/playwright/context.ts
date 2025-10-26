import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const authConfig: any = require('../../auth/config');

export interface SharedContext {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export const sharedConfig = authConfig as {
  selectors: Record<string, string>;
  timeouts: { short: number; normal: number; long: number };
  retry: { attempts: number; backoffMs: number };
};

export async function createSharedContext(): Promise<SharedContext> {
  const isDemo = process.env.DEMO === '1';
  const headless = process.env.HEADLESS ? process.env.HEADLESS !== 'false' : !isDemo;
  const slowMo = Number(process.env.SLOWMO || process.env.SLOW_MO || (isDemo ? 250 : 0));
  const statePath = process.env.STATE_PATH || 'auth/state.json';

  const browser = await chromium.launch({ headless, slowMo });
  const context = await browser.newContext({ storageState: statePath });
  const page = await context.newPage();
  return { browser, context, page };
}

export async function closeSharedContext(shared: SharedContext | undefined): Promise<void> {
  try {
    if (!shared) return;
    await shared.context.close();
    await shared.browser.close();
  } catch (_) {
    // ignore close errors
  }
}


