#!/usr/bin/env node
/**
 * audit-ready-endpoints.mjs — Audit which services have /ready endpoints
 *
 * Services that listen on a port should expose a /ready endpoint so
 * Kubernetes/orchestrators can know when the service is ready to accept traffic.
 *
 * Usage:
 *   node scripts/audit-ready-endpoints.mjs              # all services
 *   node scripts/audit-ready-endpoints.mjs --strict     # exit 1 if any missing
 *   node scripts/audit-ready-endpoints.mjs --json       # JSON output
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

const SCAN_DIRS = ['products', 'platform', 'sutar-os', 'blr-ai-marketplace/services'];
const SKIP_DIRS = new Set(['node_modules', 'tests', 'docs', 'scripts', 'data', 'dist', 'infrastructure', '_deprecated-foundation', '_deprecated']);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && (e.name === 'index.js' || e.name === 'index.ts')) {
      out.push({ path: p, rel: path.relative(ROOT, p) });
    }
  }
}

function auditService(svc) {
  const src = fs.readFileSync(svc.path, 'utf8');
  const hasListen = /\.listen\s*\(/.test(src);
  const hasReady = /app\.(get|post)\s*\(\s*['"`]\/ready['"`]/.test(src) ||
                   /router\.(get|post)\s*\(\s*['"`]\/ready['"`]/.test(src);
  return {
    path: svc.rel,
    hasListen,
    hasReady,
    missing: hasListen && !hasReady,
  };
}

function main() {
  const services = [];
  for (const dir of SCAN_DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    walk(full, services);
  }

  const listening = services.filter((s) => s.hasListen !== undefined ? true : false);
  const audited = services.map(auditService);
  const listeningServices = audited.filter((s) => s.hasListen);
  const missing = listeningServices.filter((s) => s.missing);

  const summary = {
    totalServices: audited.length,
    listeningServices: listeningServices.length,
    withReady: listeningServices.length - missing.length,
    missingReady: missing.length,
    missingList: missing.map((m) => m.path),
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`\n=== /ready Endpoint Audit ===`);
  console.log(`Scanned ${audited.length} services.\n`);
  console.log(`Listening services: ${listeningServices.length}`);
  console.log(`With /ready: ${summary.withReady}`);
  console.log(`Missing /ready: ${summary.missingReady}`);

  if (missing.length > 0) {
    console.log(`\n⚠️  Services listening on a port but missing /ready:\n`);
    for (const m of missing.slice(0, 20)) {
      console.log(`  - ${m.path}`);
    }
    if (missing.length > 20) {
      console.log(`  ... and ${missing.length - 20} more`);
    }
    if (STRICT) process.exit(1);
  } else {
    console.log(`\n✅ All listening services have /ready.`);
  }
}

main();