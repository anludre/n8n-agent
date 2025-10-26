#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true, strict: false });

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function validateFile(schemaPath, targetPath, isJsonl = false) {
  const schema = loadJson(schemaPath);
  const validate = ajv.compile(schema);
  let ok = true;

  if (!fs.existsSync(targetPath)) {
    console.warn(`[skip] ${targetPath} not found`);
    return true;
  }

  if (!isJsonl) {
    const data = loadJson(targetPath);
    if (!validate(data)) {
      console.error(`[fail] ${targetPath}`);
      console.error(ajv.errorsText(validate.errors, { separator: '\n' }));
      ok = false;
    } else {
      console.log(`[ok] ${targetPath}`);
    }
  } else {
    const lines = fs.readFileSync(targetPath, 'utf-8').split(/\r?\n/).filter(Boolean);
    lines.forEach((line, idx) => {
      try {
        const obj = JSON.parse(line);
        if (!validate(obj)) {
          console.error(`[fail] ${targetPath}:${idx + 1}`);
          console.error(ajv.errorsText(validate.errors, { separator: '\n' }));
          ok = false;
        }
      } catch (e) {
        console.error(`[fail] ${targetPath}:${idx + 1} invalid JSON`);
        ok = false;
      }
    });
    if (ok) console.log(`[ok] ${targetPath} (JSONL)`);
  }

  return ok;
}

const root = process.cwd();
const schemasDir = path.join(root, 'schemas');
const checks = [
  { schema: 'explore.inventory.schema.json', target: 'reports/explore/inventory.json' },
  { schema: 'control.plan.schema.json', target: 'reports/control/plan.json' },
  { schema: 'developer.execution.schema.json', target: 'reports/developer/execution.jsonl', jsonl: true },
  { schema: 'qa.report.schema.json', target: 'reports/qa/report.json' },
  { schema: 'manager.operations.schema.json', target: 'reports/manager/operations.jsonl', jsonl: true }
];

let allOk = true;
for (const c of checks) {
  const schemaPath = path.join(schemasDir, c.schema);
  const targetPath = path.join(root, c.target);
  const ok = validateFile(schemaPath, targetPath, !!c.jsonl);
  if (!ok) allOk = false;
}

process.exit(allOk ? 0 : 1);


