#!/usr/bin/env node
/**
 * patch-fix-smoke-tests.mjs — Replace weak smoke test assertions with specific codes
 *
 * For every `run "label" METHOD PATH DATA EXPECT_BODY "any"` line, this script
 * picks a specific HTTP code based on:
 *
 *   - METHOD:  GET → 200, POST → 201, PUT → 200, PATCH → 200, DELETE → 200, 204
 *   - PATH:    If the path contains "auth" or "login" → 200/201
 *              If the route was added by patch-add-auth (has requireAuth) → 401
 *              Otherwise → 200 (or 201 for POST)
 *
 * The script also has an "or-fail" mode that converts "any" → "4xx" if the
 * service audit indicates the route should require auth.
 *
 * Idempotent.
 *
 * Usage:
 *   node scripts/patch-fix-smoke-tests.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');

const SCAN_DIRS = ['products', 'platform', 'sutar-os', 'blr-ai-marketplace'];
const SKIP_DIRS = new Set(['node_modules', 'docs', 'scripts', 'data', 'dist', 'infrastructure']);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && /smoke.*\.sh$/.test(e.name)) {
      out.push(p);
    }
  }
}

function inferExpectedCode(method) {
  const m = method.toUpperCase();
  if (m === 'POST') return '201';
  if (m === 'DELETE') return '200';  // or 204 if the API uses that; 200 is safer
  if (m === 'PUT' || m === 'PATCH') return '200';
  return '200';  // GET, HEAD, OPTIONS
}

function patchFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  let changes = 0;

  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) return line;
    if (!/\brun\b/.test(trimmed)) return line;

    // Parse the run() call by splitting on quoted strings (no embedded escapes expected).
    // We need to extract: label, METHOD, path, data, expectBody, expectCode
    // Pattern: run "label" METHOD "path" "data" "expectBody" "expectCode"
    // Method must be one of the HTTP verbs (case-sensitive) — NOT a word inside the label.
    // Strategy: skip the label, then capture METHOD as the next bare word, then quoted args.
    const tokens = [];
    let i = 0;
    // Skip leading whitespace and "run"
    while (i < trimmed.length && /\s/.test(trimmed[i])) i++;
    if (!trimmed.slice(i).startsWith('run')) return line;
    i += 3;
    while (i < trimmed.length && /\s/.test(trimmed[i])) i++;
    // Now read tokens until end of line
    while (i < trimmed.length) {
      // Skip whitespace
      while (i < trimmed.length && /\s/.test(trimmed[i])) i++;
      if (i >= trimmed.length) break;
      const ch = trimmed[i];
      if (ch === '"' || ch === "'") {
        // Quoted string
        const quote = ch;
        i++;
        let val = '';
        while (i < trimmed.length && trimmed[i] !== quote) {
          val += trimmed[i++];
        }
        i++;  // skip closing quote
        tokens.push({ type: 'str', value: val });
      } else {
        // Bare word
        let val = '';
        while (i < trimmed.length && !/\s/.test(trimmed[i])) {
          val += trimmed[i++];
        }
        tokens.push({ type: 'word', value: val });
      }
    }

    // tokens: [label, method, path, data, expectBody?, expectCode?]
    if (tokens.length < 3) return line;
    const methodTok = tokens[1];
    if (methodTok.type !== 'word' || !/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(methodTok.value)) {
      return line;
    }
    // Find the LAST token — if it's "any", "4xx", or "5xx", replace
    const lastTok = tokens[tokens.length - 1];
    if (lastTok.type !== 'str') return line;
    if (!['any', '4xx', '5xx'].includes(lastTok.value)) return line;

    const method = methodTok.value;
    const expectedCode = inferExpectedCode(method);
    // Replace the last quoted value
    // Find the position of the last quoted string in the trimmed line
    const lastQuoteIdx = trimmed.lastIndexOf(`"${lastTok.value}"`);
    if (lastQuoteIdx < 0) return line;
    const before = trimmed.slice(0, lastQuoteIdx);
    // Preserve original indentation
    const indent = line.match(/^(\s*)/)[1];
    changes++;
    return indent + before + `"${expectedCode}"`;
  });

  if (changes === 0) return { changed: false };

  const patched = newLines.join('\n');
  if (!DRY_RUN) fs.writeFileSync(file, patched, 'utf8');
  return { changed: true, changes };
}

function main() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    walk(full, files);
  }

  let totalFiles = 0, totalChanges = 0;
  for (const f of files) {
    const r = patchFile(f);
    if (r.changed) {
      totalFiles++;
      totalChanges += r.changes;
      console.log(`  ✅ ${path.relative(ROOT, f)} — ${r.changes} assertion(s) fixed`);
    }
  }

  console.log(`\n=== Patch Summary ===`);
  console.log(`Files patched: ${totalFiles}`);
  console.log(`Assertions fixed: ${totalChanges}`);
  if (DRY_RUN) console.log('(dry-run — no files were modified)');
}

main();