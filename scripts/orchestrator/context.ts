import fs from 'fs';
import path from 'path';
import { createSharedContext, closeSharedContext, sharedConfig } from '../playwright/context';

export interface OrchestratorContext {
  preflightOk: boolean;
}

export async function preflightAuth(): Promise<OrchestratorContext> {
  const res = await runCmd('node', ['auth/check_auth.js']);
  return { preflightOk: res.code === 0 };
}

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

export const OrchestratorPlaywright = {
  createSharedContext,
  closeSharedContext,
  config: sharedConfig
};


