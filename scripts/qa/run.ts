#!/usr/bin/env tsx
import path from 'path';
import { run as verify } from './verify';

export interface QARunResult { ok: boolean; reportPath: string; result: 'PASSED' | 'FAILED' | 'RETRIED' | 'FLAKY' }

export async function run(): Promise<QARunResult> {
  const r = await verify();
  const reportPath = path.join('reports', 'qa', 'report.json');
  const result: 'PASSED' | 'FAILED' = r === undefined ? 'PASSED' : (process.exitCode === 0 ? 'PASSED' : 'FAILED');
  return { ok: result === 'PASSED', reportPath, result };
}

if (require.main === module) {
  run().then(r => { console.log(r.reportPath); process.exit(r.ok ? 0 : 1); }).catch(e => { console.error(e.message); process.exit(1); });
}


