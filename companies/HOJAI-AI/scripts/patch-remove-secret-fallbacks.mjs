#!/usr/bin/env node
/**
 * patch-remove-secret-fallbacks.js — Remove `process.env.SECRET || 'fallback'` patterns
 *
 * For every finding from audit-secrets.js, replace:
 *   process.env.JWT_SECRET || "some-fallback"
 * with:
 *   process.env.JWT_SECRET
 *
 * Also strips the OR-fallback from intermediate variables:
 *   const jwtSecret = process.env.JWT_SECRET || 'fallback';
 *   → const jwtSecret = process.env.JWT_SECRET;
 *
 * Idempotent.
 *
 * Usage:
 *   node scripts/patch-remove-secret-fallbacks.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');

// Same list as audit-secrets.js
const SECRET_VARS = [
  'JWT_SECRET', 'JWT_SIGNING_KEY', 'SESSION_SECRET',
  'INTERNAL_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'SERVICE_TOKEN',
  'CORPID_INTERNAL_TOKEN', 'CORPID_SERVICE_TOKEN',
  'STRIPE_SECRET_KEY', 'STRIPE_API_KEY',
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY',
  'AWS_SECRET_ACCESS_KEY', 'AZURE_CLIENT_SECRET',
  'DATABASE_PASSWORD', 'DB_PASSWORD', 'REDIS_PASSWORD',
  'SMTP_PASSWORD', 'SENDGRID_API_KEY',
];

// Find every `process.env.X || 'fallback'` and strip the fallback.
// Match the full assignment, including the optional `const X = ...` wrapper.
const buildPattern = () => {
  const vars = SECRET_VARS.join('|');
  // Capture: optional `const X = ` prefix, then `process.env.VAR || "..."` or `'...'`
  // We only need to remove the `|| "..."` portion (or `|| '...'`).
  return new RegExp(
    `(process\\.env\\.(?:${vars}))\\s*\\|\\|\\s*(?:"[^"]*"|'[^']*'|\\\`[^\\\`]*\\\`)`,
    'g'
  );
};

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    if (['tests','test','__tests__','docs','scripts','data','dist'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && (p.endsWith('.js') || p.endsWith('.ts'))) {
      out.push(p);
    }
  }
}

function patchFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const pattern = buildPattern();
  const matches = [...src.matchAll(pattern)];
  if (matches.length === 0) return { changed: false, count: 0 };

  let patched = src;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    // Replace `process.env.X || "fallback"` with just `process.env.X`
    patched = patched.slice(0, m.index) + m[1] + patched.slice(m.index + m[0].length);
  }

  if (!DRY_RUN) fs.writeFileSync(file, patched, 'utf8');
  return { changed: true, count: matches.length };
}

function main() {
  const files = [];
  for (const dir of ['products', 'platform', 'sutar-os', 'blr-ai-marketplace/services', 'shared']) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    walk(full, files);
  }

  let totalFiles = 0, totalChanges = 0;
  for (const f of files) {
    const r = patchFile(f);
    if (r.changed) {
      totalFiles++;
      totalChanges += r.count;
      console.log(`  ✅ ${path.relative(ROOT, f)} — removed ${r.count} fallback(s)${DRY_RUN ? ' (dry-run)' : ''}`);
    }
  }
  console.log(`\n=== Patch Summary ===`);
  console.log(`Files patched: ${totalFiles}`);
  console.log(`Fallbacks removed: ${totalChanges}`);
  if (DRY_RUN) console.log('(dry-run — no files were modified)');
}

main();
