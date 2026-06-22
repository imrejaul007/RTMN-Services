#!/usr/bin/env node
/**
 * audit-smoke-tests.mjs — Audit smoke tests for weak assertions
 *
 * A smoke test passes "no matter what" if it uses `expect_code="any"`, `4xx`,
 * or `5xx` — these assertions accept any HTTP code in the matching range,
 * which means a 500 error is just as "pass" as a 200 success.
 *
 * This script counts such assertions across all smoke test files so we can
 * measure how many tests are actually verifying behavior vs. just exercising
 * the endpoint.
 *
 * Exit 0 = all assertions are specific; exit 1 = at least one weak assertion.
 *
 * Usage:
 *   node scripts/audit-smoke-tests.mjs                # summary
 *   node scripts/audit-smoke-tests.mjs --strict       # exit 1 if any weak
 *   node scripts/audit-smoke-tests.mjs --json         # JSON output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ARGS = process.argv.slice(2);
const STRICT = ARGS.includes('--strict');
const JSON_OUT = ARGS.includes('--json');

const SCAN_DIRS = ['products', 'platform', 'sutar-os', 'blr-ai-marketplace', 'shared'];
const SKIP_DIRS = new Set(['node_modules', 'docs', 'scripts', 'data', 'dist', 'infrastructure']);
// Note: NOT skipping 'tests' — smoke.sh lives there

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(p, out);
    } else if (e.isFile() && /smoke.*\.sh$/.test(e.name)) {
      out.push(p);
    }
  }
}

function auditFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const findings = [];

  let lineNo = 0;
  for (const line of lines) {
    lineNo++;
    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    // Look for "any", "4xx", or "5xx" used as an expect_code value (quoted)
    // Match either:  expect_code="any"   ... or  ... "any" (last positional arg)
    const weakCodes = ['any', '4xx', '5xx'];
    for (const code of weakCodes) {
      // Pattern 1: explicit expect_code="X"
      if (new RegExp(`expect_code=["']${code}["']`).test(line)) {
        findings.push({ line: lineNo, code, snippet: trimmed.slice(0, 120) });
        break;
      }
      // Pattern 2: positional last arg (run ... "any" at end of line)
      // Match: `... "X"` where X is one of weakCodes and there's no following arg
      const re = new RegExp(`["']${code}["']\\s*$`);
      if (re.test(trimmed) && /\brun\b/.test(trimmed)) {
        findings.push({ line: lineNo, code, snippet: trimmed.slice(0, 120) });
        break;
      }
    }
  }
  return findings;
}

function main() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    walk(full, files);
  }

  const summary = { totalFiles: files.length, filesWithIssues: 0, totalWeak: 0 };
  const allFindings = [];

  for (const f of files) {
    const findings = auditFile(f);
    if (findings.length > 0) {
      summary.filesWithIssues++;
      summary.totalWeak += findings.length;
      allFindings.push({ file: path.relative(ROOT, f), findings });
    }
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`\n=== Smoke Test Audit ===`);
  console.log(`Scanned ${summary.totalFiles} smoke test files.\n`);
  if (summary.totalWeak === 0) {
    console.log(`✅ No weak assertions (every test checks for specific status codes).\n`);
    process.exit(0);
  }

  console.log(`⚠️  Found ${summary.totalWeak} weak assertion(s) across ${summary.filesWithIssues} file(s):\n`);
  for (const { file, findings } of allFindings) {
    console.log(`  ${file}:`);
    for (const f of findings) {
      console.log(`    L${f.line}: expect_code="${f.code}"`);
    }
  }
  console.log(`\nThese assertions pass on ANY HTTP code (any), any 4xx, or any 5xx.`);
  console.log(`Fix: change to specific codes like "200", "201", "401", "404".\n`);

  if (STRICT) process.exit(1);
}

main();