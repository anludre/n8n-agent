#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';

export interface ControllerRunOptions { desiredPath?: string }
export interface ControllerRunResult { ok: boolean; planPath: string; status: 'PLAN' | 'CONVERGED' | 'FAILED' }

export async function run(opts: ControllerRunOptions = {}): Promise<ControllerRunResult> {
  const desiredPath = opts.desiredPath || process.env.DESIRED_PATH || 'desired/example_workflow.json';
  let desired: any = { version: '1', name: 'example', nodes: [], links: [] };
  if (fs.existsSync(desiredPath)) desired = JSON.parse(fs.readFileSync(desiredPath, 'utf-8'));

  // Placeholder deterministic diff: if no nodes, consider converged
  const hasActions = (desired.nodes || []).length > 0;
  const status: 'PLAN' | 'CONVERGED' = hasActions ? 'PLAN' : 'CONVERGED';
  const plan = { version: '1', generatedAt: new Date().toISOString(), status, actions: [] as any[] };
  const outPath = path.join('reports', 'control', 'plan.json');
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(plan, null, 2));
  return { ok: true, planPath: outPath, status };
}

if (require.main === module) {
  run().then(r => { console.log(r.planPath); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });
}


