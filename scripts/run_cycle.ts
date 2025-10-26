#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import * as explorer from './explorer/run';
import * as controller from './controller/run';
import * as developer from './developer/run';

type CycleResult = 'INITIATED' | 'PLANNED' | 'EXECUTED' | 'VERIFIED' | 'CONVERGED' | 'COMPLETED' | 'FAILED';

interface CycleLogEntry {
  timestamp: string;
  stage: string;
  status: string;
  message?: string;
}

function writeJsonl(targetPath: string, obj: unknown) {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(targetPath, JSON.stringify(obj) + '\n');
}

function nowIso() { return new Date().toISOString(); }

async function runCmd(cmd: string, args: string[] = [], env: NodeJS.ProcessEnv = {}): Promise<{ code: number; stdout: string; stderr: string; }> {
  const { spawn } = await import('child_process');
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => stdout += d.toString());
    child.stderr.on('data', (d) => stderr += d.toString());
    child.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

async function main() {
  const goal = process.argv.slice(2).join(' ').trim() || 'No goal provided';
  const cycleLog = path.join('reports', 'orchestrator', 'cycle.jsonl');
  const controllerMaxAttempts = Number(process.env.CONTROLLER_MAX_ATTEMPTS || 2);
  const developerStepTimeoutSec = Number(process.env.DEV_STEP_TIMEOUT_SEC || 30);

  writeJsonl(cycleLog, <CycleLogEntry>{ timestamp: nowIso(), stage: 'INIT', status: 'INITIATED', message: goal });

  // Preflight auth check
  const pre = await runCmd('node', ['auth/check_auth.js']);
  writeJsonl(cycleLog, { timestamp: nowIso(), stage: 'PREFLIGHT', status: `EXIT_${pre.code}`, message: pre.stdout.trim() || pre.stderr.trim() });
  if (pre.code === 2) {
    writeJsonl(cycleLog, { timestamp: nowIso(), stage: 'PREFLIGHT', status: 'NEEDS_LOGIN', message: 'Run npm run auth:refresh or auth:demo' });
    process.exit(2);
  }
  if (pre.code !== 0) {
    writeJsonl(cycleLog, { timestamp: nowIso(), stage: 'PREFLIGHT', status: 'ERROR' });
    process.exit(1);
  }

  // 1) Explorer (read-only discovery)
  writeJsonl(cycleLog, { timestamp: nowIso(), stage: 'EXPLORER', status: 'START' });
  // Placeholder: integrate actual MCP Explorer command if available
  writeJsonl(cycleLog, { timestamp: nowIso(), stage: 'EXPLORER', status: 'DONE' });

  // 2) Controller (plan)
  let attempt = 0;
  let converged = false;
  while (attempt < controllerMaxAttempts && !converged) {
    attempt++;
    writeJsonl(cycleLog, { timestamp: nowIso(), stage: 'CONTROLLER', status: `ATTEMPT_${attempt}` });
    // Placeholder: compute plan and write to reports/control/plan.json
    // For now, simulate a plan exists only on first attempt
    const planPath = path.join('reports', 'control', 'plan.json');
    const plan = { version: '1', generatedAt: nowIso(), status: attempt === 1 ? 'PLAN' : 'CONVERGED', actions: [] as any[] };
    const dir = path.dirname(planPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    converged = plan.status === 'CONVERGED' || plan.actions.length === 0 && attempt > 1;
    if (converged) break;

    // 3) Developer (execute plan with timeout policy)
    writeJsonl(cycleLog, { timestamp: nowIso(), stage: 'DEVELOPER', status: 'EXECUTE', message: `timeout=${developerStepTimeoutSec}s` });
    // Placeholder: execute steps, log to reports/developer/execution.jsonl
    const devLog = path.join('reports', 'developer', 'execution.jsonl');
    writeJsonl(devLog, { timestamp: nowIso(), actionId: 'noop', status: 'DONE' });

    // 4) QA (verify) - external verifier produces report.json per schema
    writeJsonl(cycleLog, { timestamp: nowIso(), stage: 'QA', status: 'VERIFY' });
    const qaRun = await runCmd('npx', ['tsx', 'scripts/qa/verify.ts']);
    const qaReportPath = path.join('reports', 'qa', 'report.json');
    let qaResult = 'FAILED';
    try {
      const rpt = JSON.parse(fs.readFileSync(qaReportPath, 'utf-8')) as { result: string; artifacts?: string[] };
      qaResult = rpt.result || 'FAILED';
      if (qaResult !== 'PASSED') {
        writeJsonl(cycleLog, { timestamp: nowIso(), stage: 'QA', status: 'FAILED', message: qaResult });
        // Attempt another controller loop
        continue;
      }
    } catch (e) {
      writeJsonl(cycleLog, { timestamp: nowIso(), stage: 'QA', status: 'ERROR', message: 'Invalid QA report' });
      process.exit(1);
    }
  }

  if (converged) {
    writeJsonl(cycleLog, { timestamp: nowIso(), stage: 'CONTROLLER', status: 'CONVERGED' });
    // 5) Manager (optional operational updates placeholder)
    writeJsonl(cycleLog, { timestamp: nowIso(), stage: 'MANAGER', status: 'NOOP' });
    writeJsonl(cycleLog, { timestamp: nowIso(), stage: 'ORCHESTRATOR', status: 'COMPLETED' });
    process.exit(0);
  } else {
    writeJsonl(cycleLog, { timestamp: nowIso(), stage: 'ORCHESTRATOR', status: 'FAILED', message: 'Convergence not reached' });
    process.exit(2);
  }
}

main().catch((e) => {
  writeJsonl(path.join('reports', 'orchestrator', 'cycle.jsonl'), { timestamp: nowIso(), stage: 'ORCHESTRATOR', status: 'ERROR', message: String(e?.message || e) });
  process.exit(1);
});


