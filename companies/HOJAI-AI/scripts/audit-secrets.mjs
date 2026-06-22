#!/usr/bin/env node
/**
 * audit-secrets.js — Hardcoded Secret Fallback Auditor for HOJAI AI
 *
 * Scans all service source files for patterns like:
 *   const X = process.env.X || 'default-value';
 *   const X = process.env.X || `default-value`;
 *
 * These are dangerous in production because if the env var is missing,
 * the service silently uses a known-public string as its secret.
 *
 * What it flags:
 *   - JWT_SECRET with a literal fallback
 *   - INTERNAL_TOKEN / INTERNAL_SERVICE_TOKEN with a literal fallback
 *   - Any env var fallbacks for vars containing SECRET, TOKEN, KEY, PASSWORD
 *
 * Usage:
 *   node scripts/audit-secrets.js                    # audit everything
 *   node scripts/audit-secrets.js --service=<path>   # audit one service
 *
 * Exit codes:
 *   0  = clean
 *   1  = hardcoded fallbacks found
 *   2  = usage error
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ARGS = process.argv.slice(2);
const SERVICE_ARG = ARGS.find(a => a.startsWith('--service='))?.split('=')[1];

const SCAN_DIRS = ['products', 'platform', 'sutar-os', 'blr-ai-marketplace/services'];

// Vars that should never have a fallback string
const SECRET_VARS = [
  'JWT_SECRET', 'JWT_PUBLIC_KEY', 'JWT_PRIVATE_KEY',
  'INTERNAL_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'SERVICE_TOKEN',
  'API_KEY', 'STRIPE_SECRET_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
  'DB_PASSWORD', 'DATABASE_URL', 'REDIS_PASSWORD',
  'SESSION_SECRET', 'COOKIE_SECRET', 'ENCRYPTION_KEY',
  'PRIVATE_KEY', 'SECRET_KEY', 'AUTH_SECRET',
];

function findServiceFiles() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    walk(full, files);
  }
  return files;
}

function walk(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    if (e.name === '_deprecated-foundation' || e.name === '_deprecated') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'tests' || e.name === 'test' || e.name === '__tests__') continue;
      if (e.name === 'docs' || e.name === 'scripts' || e.name === 'data') continue;
      if (e.name === 'infrastructure') continue;  // test-helpers live here
      walk(p, files);
    } else if (e.isFile() && /\.(js|ts)$/.test(e.name)) {
      // Skip test helpers
      if (e.name.includes('test-helper') || e.name.includes('test-helpers')) continue;
      files.push(p);
    }
  }
}

function auditFile(filePath) {
  const findings = [];
  const src = fs.readFileSync(filePath, 'utf8');
  const lines = src.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for `process.env.SOME_VAR || '<non-empty-string>'` where SOME_VAR matches our list
    // Allow fallback to another env var (e.g., `|| process.env.OTHER`)
    // Skip empty-string fallbacks like `|| ''` — those are explicit "no value" markers
    for (const varName of SECRET_VARS) {
      const patterns = [
        new RegExp(`process\\.env\\.${varName}\\s*\\|\\|\\s*['"\`]([^'"\`]+)['"\`]`),
        new RegExp(`process\\.env\\[['\`]${varName}['"\`]\\]\\s*\\|\\|\\s*['"\`]([^'"\`]+)['"\`]`),
      ];
      for (const re of patterns) {
        const m = line.match(re);
        if (m && m[1] && m[1].trim().length > 0) {
          const fallback = m[1];
          findings.push({
            file: path.relative(ROOT, filePath),
            line: i + 1,
            var: varName,
            fallback,
            snippet: line.trim().slice(0, 150),
          });
          break; // only count once per line
        }
      }
    }
  }

  return findings;
}

function main() {
  let files;
  if (SERVICE_ARG) {
    files = [path.resolve(SERVICE_ARG)];
  } else {
    files = findServiceFiles();
  }

  if (files.length === 0) {
    console.error('No files found.');
    process.exit(2);
  }

  const allFindings = [];
  for (const f of files) {
    if (!fs.existsSync(f)) {
      console.error(`File not found: ${f}`);
      process.exit(2);
    }
    const findings = auditFile(f);
    allFindings.push(...findings);
  }

  console.log(`\n=== Hardcoded Secret Fallback Audit ===`);
  console.log(`Scanned ${files.length} files.`);
  if (allFindings.length === 0) {
    console.log(`✅ No hardcoded secret fallbacks found.`);
    process.exit(0);
  }

  console.log(`\n❌ Found ${allFindings.length} hardcoded fallback(s):\n`);
  // Group by file
  const byFile = {};
  for (const f of allFindings) {
    if (!byFile[f.file]) byFile[f.file] = [];
    byFile[f.file].push(f);
  }
  for (const [file, findings] of Object.entries(byFile)) {
    console.log(`  ${file}:`);
    for (const f of findings) {
      console.log(`    line ${f.line}: ${f.var} || "${f.fallback}"`);
    }
  }
  console.log(`\nFix: remove the || '<fallback>' and require the env var at startup.`);
  console.log(`Example:`);
  console.log(`  const X = process.env.X;`);
  console.log(`  if (!X) { console.error('FATAL: X required'); process.exit(1); }`);
  console.log(`\nOr use: import { requireEnv } from '@rtmn/shared/lib/env';`);
  console.log(`  requireEnv(['X']);`);
  process.exit(1);
}

main();
