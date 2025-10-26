#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import { createSharedContext, closeSharedContext, sharedConfig } from '../playwright/context';

interface ExpectSpec {
  nodes?: Array<{ selector?: string; text?: string }>;
}

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '');
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '1';
      out[key] = val;
    }
  }
  return out;
}

function ensureDir(p: string) {
  const d = path.dirname(p);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const workflowUrl = args['workflow-url'] || process.env.WORKFLOW_URL || '';
  const expectPath = args['expect'] || '';
  const reportPath = path.join('reports', 'qa', 'report.json');
  const screenshotPath = path.join('reports', 'qa', `verify-${Date.now()}.png`);

  let expectSpec: ExpectSpec | undefined;
  if (expectPath && fs.existsSync(expectPath)) {
    expectSpec = JSON.parse(fs.readFileSync(expectPath, 'utf-8')) as ExpectSpec;
  }

  const { selectors, timeouts } = sharedConfig;
  const shared = await createSharedContext();
  try {
    const page = shared.page;

    if (workflowUrl) {
      await page.goto(workflowUrl, { waitUntil: 'domcontentloaded', timeout: timeouts.long });
    } else {
      const n8nUrl = process.env.N8N_URL;
      if (!n8nUrl) throw new Error('Missing N8N_URL for QA verify');
      await page.goto(n8nUrl, { waitUntil: 'domcontentloaded', timeout: timeouts.long });
    }

    // Editor visible check
    const editorVisible = await page.locator(selectors.editorReady).first().isVisible().catch(() => false);
    const checks: Array<{ name: string; status: 'PASSED' | 'FAILED' | 'RETRIED'; message?: string }> = [];
    checks.push({ name: 'editorReady', status: editorVisible ? 'PASSED' : 'FAILED', message: editorVisible ? undefined : 'Editor not visible' });

    // Nodes expectations (best-effort via selector or text)
    if (expectSpec?.nodes?.length) {
      for (const [idx, n] of expectSpec.nodes.entries()) {
        let ok = false;
        try {
          if (n.selector) {
            ok = await page.locator(n.selector).first().isVisible({ timeout: timeouts.normal });
          } else if (n.text) {
            ok = await page.getByText(n.text, { exact: false }).first().isVisible({ timeout: timeouts.normal });
          }
        } catch (_) {
          ok = false;
        }
        checks.push({ name: `node[${idx}]`, status: ok ? 'PASSED' : 'FAILED', message: ok ? undefined : `Missing node by ${n.selector ? 'selector' : 'text'}` });
      }
    }

    ensureDir(screenshotPath);
    await shared.page.screenshot({ path: screenshotPath, fullPage: true });

    const allPassed = checks.every(c => c.status === 'PASSED');
    const report = {
      version: '1',
      generatedAt: new Date().toISOString(),
      result: allPassed ? 'PASSED' : 'FAILED',
      artifacts: [screenshotPath],
      checks
    };
    ensureDir(reportPath);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(allPassed ? 'PASSED' : 'FAILED');
    process.exit(allPassed ? 0 : 1);
  } catch (e: any) {
    const msg = String(e?.message || e);
    const report = {
      version: '1', generatedAt: new Date().toISOString(), result: 'FAILED', artifacts: [], checks: [{ name: 'exception', status: 'FAILED', message: msg }]
    };
    ensureDir(reportPath);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    process.stderr.write(msg + '\n');
    process.exit(1);
  } finally {
    await closeSharedContext(shared);
  }
}

main();


