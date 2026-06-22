#!/usr/bin/env node
/**
 * patch-add-graceful-shutdown.mjs
 *
 * Adds installGracefulShutdown() to services that don't have it yet.
 *
 * For each service that has `app.listen(...)` but not installGracefulShutdown:
 *   1. Add an import (require or import, depending on file style)
 *   2. Convert `app.listen(PORT, ...)` to `const server = app.listen(PORT, ...)`
 *   3. Insert `installGracefulShutdown(server);` after the listen callback
 *
 * Usage:
 *   node scripts/patch-add-graceful-shutdown.mjs           # apply
 *   node scripts/patch-add-graceful-shutdown.mjs --dry-run # preview
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['platform', 'products', 'sutar-os', 'blr-ai-marketplace'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.cache', 'data', 'docs', 'scripts', 'tests', 'test', '__tests__']);

const SHUTDOWN_CJS_IMPORT = "const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');";
const SHUTDOWN_ESM_IMPORT = "import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';";
const SHUTDOWN_CALL = "installGracefulShutdown(server);";

const dryRun = process.argv.includes('--dry-run');

let scanned = 0;
let modified = 0;
let skipped = 0;
let errors = 0;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      if (/\.(js|ts)$/.test(entry.name)) yield path.join(dir, entry.name);
    }
  }
}

function detectStyle(src) {
  // First non-comment, non-blank line
  for (const line of src.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
    if (trimmed.startsWith('import ')) return 'esm';
    if (trimmed.startsWith('const ') && trimmed.includes('require(')) return 'cjs';
    // Heuristic: check for any `import ` near top
    if (/^import\s/m.test(src.slice(0, 2000))) return 'esm';
    return 'cjs';
  }
  return 'cjs';
}

function findListenCall(src) {
  // Find first `app.listen(PORT, ...)` or `app.listen(port, ...)` call
  // that is NOT already preceded by `const server =` or `let server =` or `var server =` or `server =`
  const re = /^[ \t]*(?:(?:(const|let|var)\s+)?server\s*=\s*)?app\.listen\s*\(/gm;
  let match;
  while ((match = re.exec(src)) !== null) {
    const isAssigned = /server\s*=/.test(match[0].split('app.listen')[0]);
    return { index: match.index, endIndex: re.lastIndex, isAssigned, fullMatch: match[0] };
  }
  return null;
}

function findListenEnd(src, startIdx) {
  // Walk forward to find the matching close-paren of app.listen(...)
  // Skips over:
  //   - string literals (' " `)
  //   - line comments (// to end of line)
  //   - block comments (/* to */)
  //   - arrow function bodies (track brace depth)
  let parenDepth = 0;
  let braceDepth = 0;
  let i = startIdx;
  let inString = null; // '"', "'", '`'
  let inLineComment = false;
  let inBlockComment = false;
  let startedAt = startIdx;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') { inBlockComment = false; i += 2; continue; }
      i++;
      continue;
    }
    if (inString) {
      if (c === '\\') { i += 2; continue; }
      if (c === inString) inString = null;
      i++;
      continue;
    }

    if (c === '/' && next === '/') { inLineComment = true; i += 2; continue; }
    if (c === '/' && next === '*') { inBlockComment = true; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') { inString = c; i++; continue; }

    if (c === '(') parenDepth++;
    else if (c === ')') {
      parenDepth--;
      if (parenDepth === 0 && braceDepth === 0 && i > startedAt) return i;
    }
    else if (c === '{') braceDepth++;
    else if (c === '}') braceDepth--;
    i++;
  }
  return -1;
}

function patchFile(filepath) {
  scanned++;
  let src = fs.readFileSync(filepath, 'utf8');

  // Skip if already has installGracefulShutdown
  if (src.includes('installGracefulShutdown')) {
    skipped++;
    return;
  }

  // Find the listen call
  const listen = findListenCall(src);
  if (!listen) {
    skipped++;
    return;
  }

  // Skip if server is already captured (then we just need to add shutdown call)
  // Find the full listen() expression end
  const listenStart = listen.index;
  // rewind to start of statement (skip const server = part if any)
  const statementStart = listenStart + (listen.fullMatch.match(/^\s*/)[0].length);
  // For the closing paren, use the source location of the '(' — re.findListenCall returned endIndex AFTER '('
  const openParenIdx = src.indexOf('(', listenStart);
  if (openParenIdx === -1) { errors++; return; }
  const closeParenIdx = findListenEnd(src, openParenIdx);
  if (closeParenIdx === -1) {
    if (dryRun) console.error(`! no close paren: ${filepath}`);
    errors++;
    return;
  }

  // Check for a callback arrow `=> {` or `, () => {` etc. after the paren
  let callbackEnd = closeParenIdx;
  // Look for `() => {` or `function() {` etc. right after close paren
  const after = src.slice(closeParenIdx + 1, closeParenIdx + 200);
  const arrowMatch = after.match(/^\s*[,]?\s*(?:\(\s*\)\s*=>\s*\{|function\s*\([^)]*\)\s*\{)/);
  if (arrowMatch) {
    // find matching closing brace of the callback
    const openBraceIdx = closeParenIdx + 1 + src.slice(closeParenIdx + 1).indexOf('{');
    let braceDepth = 0;
    let j = openBraceIdx;
    while (j < src.length) {
      if (src[j] === '{') braceDepth++;
      else if (src[j] === '}') {
        braceDepth--;
        if (braceDepth === 0) { callbackEnd = j; break; }
      }
      j++;
    }
  }

  // Style detection
  const style = detectStyle(src);
  const importLine = style === 'esm' ? SHUTDOWN_ESM_IMPORT : SHUTDOWN_CJS_IMPORT;

  // 1) Insert import — after the last existing @rtmn/shared/... import or require
  let patched = src;
  const importRe = style === 'esm'
    ? /^import\s+.*from\s+['"]@rtmn\/shared\/[^'"]+['"];?\s*$/gm
    : /^const\s+.*require\(['"]@rtmn\/shared\/[^'"]+['"]\);?\s*$/gm;

  let lastImportEnd = 0;
  let m;
  while ((m = importRe.exec(patched)) !== null) {
    lastImportEnd = m.index + m[0].length;
  }
  if (lastImportEnd > 0) {
    patched = patched.slice(0, lastImportEnd) + '\n' + importLine + patched.slice(lastImportEnd);
  } else {
    // Fall back: insert after first import/require line
    const firstImport = patched.match(/^(import\s.*$|const\s.*require\(.*\);?)$/m);
    if (firstImport) {
      const idx = firstImport.index + firstImport[0].length;
      patched = patched.slice(0, idx) + '\n' + importLine + patched.slice(idx);
    } else {
      // Insert at very top (after any comment block)
      patched = importLine + '\n' + patched;
    }
  }

  // 2) Convert `app.listen(...)` to `const server = app.listen(...)` if not already
  // Re-find the listen call in the new patched source
  const listen2 = findListenCall(patched);
  if (!listen2) {
    if (dryRun) console.error(`! no listen call (after import): ${filepath}`);
    errors++;
    return;
  }
  const openParenIdx2 = patched.indexOf('(', listen2.index);
  const closeParenIdx2 = findListenEnd(patched, openParenIdx2);
  if (closeParenIdx2 === -1) {
    if (dryRun) console.error(`! no close paren (after assign): ${filepath}`);
    errors++;
    return;
  }

  // The leading whitespace of the statement
  const leadingWs = patched.slice(listen2.index, listen2.index + 200).match(/^\s*/)[0];

  if (!listen2.isAssigned) {
    // Replace `app.listen(` with `const server = app.listen(`
    patched = patched.slice(0, listen2.index)
      + leadingWs + 'const server = app.listen('
      + patched.slice(openParenIdx2 + 1);
    // closeParenIdx2 is now off by 1 because we added `const server = `
    // Recompute: the close paren in the new string is at the same offset because we shifted by 0 chars before the open paren
    // Actually: listen2.index points at `app.listen`. We replaced `app.listen(` with `const server = app.listen(`, which adds "const server = " (15 chars) BEFORE the open paren. The close paren moved right by 15.
    // We need to add the installGracefulShutdown call after the listen callback end.
  }

  // 3) Find the listen callback's end and add installGracefulShutdown(server) after it
  // Re-find in the latest patched source
  const listen3 = findListenCall(patched);
  if (!listen3) {
    if (dryRun) console.error(`! no listen call (final): ${filepath}`);
    errors++;
    return;
  }
  const op3 = patched.indexOf('(', listen3.index);
  const cp3 = findListenEnd(patched, op3);
  if (cp3 === -1) {
    if (dryRun) console.error(`! no close paren (final): ${filepath}`);
    errors++;
    return;
  }

  // Find the end of the statement (the next `;` or end of line, after the callback's closing brace)
  let after2 = patched.slice(cp3 + 1, cp3 + 200);
  let statementEnd = cp3 + 1;
  const arrowM = after2.match(/^\s*[,]?\s*(?:\(\s*\)\s*=>\s*\{|function\s*\([^)]*\)\s*\{)/);
  if (arrowM) {
    const openBraceIdx2 = cp3 + 1 + patched.slice(cp3 + 1).indexOf('{');
    let bd = 0;
    let j2 = openBraceIdx2;
    while (j2 < patched.length) {
      if (patched[j2] === '{') bd++;
      else if (patched[j2] === '}') {
        bd--;
        if (bd === 0) { statementEnd = j2 + 1; break; }
      }
      j2++;
    }
  } else {
    // Single-line expression statement: find the `;` or end of line
    const semi = patched.indexOf(';', cp3);
    const eol = patched.indexOf('\n', cp3);
    if (semi !== -1 && (eol === -1 || semi < eol)) statementEnd = semi + 1;
    else if (eol !== -1) statementEnd = eol;
  }

  // The line break after the statement
  let insertAt = statementEnd;
  // Skip any trailing newline so we can insert before it
  if (patched[insertAt] === '\n') insertAt++;

  // Indent: detect indent of the listen line
  const listenLineStart = patched.lastIndexOf('\n', listen3.index) + 1;
  const listenIndent = patched.slice(listenLineStart, listen3.index + listen3.fullMatch.match(/^\s*/)[0].length).match(/^\s*/)[0];
  const shutdownLine = listenIndent + SHUTDOWN_CALL + '\n';

  patched = patched.slice(0, insertAt) + shutdownLine + patched.slice(insertAt);

  if (patched === src) {
    skipped++;
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] would patch: ${filepath}`);
  } else {
    fs.writeFileSync(filepath, patched, 'utf8');
  }
  modified++;
}

for (const root of ROOTS) {
  const absRoot = path.resolve(root);
  if (!fs.existsSync(absRoot)) continue;
  for (const filepath of walk(absRoot)) {
    try {
      patchFile(filepath);
    } catch (e) {
      console.error(`error: ${filepath}: ${e.message}`);
      console.error(e.stack);
      errors++;
    }
  }
}

console.log(`\n=== Graceful Shutdown Patch Summary ===`);
console.log(`Scanned:  ${scanned}`);
console.log(`Modified: ${modified}`);
console.log(`Skipped:  ${skipped} (already have shutdown or no app.listen)`);
console.log(`Errors:   ${errors}`);
console.log(dryRun ? '(dry run — no files written)' : '(files written)');
