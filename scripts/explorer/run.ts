#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import { OrchestratorPlaywright } from '../orchestrator/context';

export interface ExplorerRunResult { ok: boolean; inventoryPath: string }

export async function run(): Promise<ExplorerRunResult> {
  const { createSharedContext, closeSharedContext, config } = OrchestratorPlaywright;
  const shared = await createSharedContext();
  try {
    const page = shared.page;
    const N8N_URL = process.env.N8N_URL as string;
    if (!N8N_URL) throw new Error('Missing N8N_URL');
    await page.goto(N8N_URL, { waitUntil: 'domcontentloaded', timeout: config.timeouts.long });

    const inventory = { version: '1', generatedAt: new Date().toISOString(), items: [] as any[] };
    const outPath = path.join('reports', 'explore', 'inventory.json');
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(inventory, null, 2));
    return { ok: true, inventoryPath: outPath };
  } finally {
    await closeSharedContext(shared);
  }
}

if (require.main === module) {
  run().then(r => { console.log(r.inventoryPath); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });
}


