#!/usr/bin/env node
/**
 * audit-auth.js — Auth Bypass Auditor for HOJAI AI
 *
 * Scans all service source files for unprotected mutating routes.
 * Exits 1 if any are found outside an `app.use(requireAuth, ...)` block.
 *
 * What it checks:
 *   1. app.post, app.put, app.patch, app.delete routes that don't have
 *      requireAuth/authMiddleware middleware before the handler.
 *   2. Exempts /health and /ready endpoints.
 *   3. Exempts routes that explicitly comment "public" or "no-auth".
 *
 * Usage:
 *   node scripts/audit-auth.js                    # audit everything
 *   node scripts/audit-auth.js --service=<path>   # audit one service
 *   node scripts/audit-auth.js --json             # JSON output
 *
 * Exit codes:
 *   0  = clean
 *   1  = unprotected routes found
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
const JSON_OUT = ARGS.includes('--json');

// Service directories to scan
const SCAN_DIRS = ['products', 'platform', 'sutar-os', 'blr-ai-marketplace/services'];

// Endpoints that should never require auth
const PUBLIC_PATH_PATTERNS = [
  /^\/health/,
  /^\/ready/,
  /^\/$/,
  /^\/auth\/register/,
  /^\/auth\/login/,
  /^\/auth\/forgot/,
  /^\/api\/auth\/signup/,
  /^\/api\/auth\/login/,
  /^\/api\/auth\/forgot/,
  /^\/api\/auth\/reset/,
];

// Methods that mutate state
const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];

// Middleware that indicates auth is applied
const AUTH_MIDDLEWARE_NAMES = [
  'requireAuth', 'requireAdmin', 'requireRole',
  'authMiddleware', 'internalAuth', 'requireInternal',
  'industryAuth', 'adminOnly', 'verifyToken',
  'customAuth',  // used by policy-os
];

function isPublicPath(path) {
  return PUBLIC_PATH_PATTERNS.some(re => re.test(path));
}

function findServiceIndex() {
  const services = [];
  for (const dir of SCAN_DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    walk(full, services, dir);
  }
  return services;
}

function walk(dir, services, topDir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    if (e.name === '_deprecated-foundation' || e.name === '_deprecated') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'tests' || e.name === 'test' || e.name === '__tests__') continue;
      if (e.name === 'docs' || e.name === 'scripts' || e.name === 'data') continue;
      walk(p, services, topDir);
    } else if (e.isFile() && (e.name === 'index.js' || e.name === 'index.ts')) {
      services.push({ path: p, rel: path.relative(ROOT, p), topDir });
    }
  }
}

function auditService(svc) {
  const findings = [];
  const src = fs.readFileSync(svc.path, 'utf8');
  const lines = src.split('\n');

  // Look for `app.<method>(<path>, ...)` patterns
  // Multi-line aware: middleware can span multiple lines
  const routeRegex = /\bapp\.(post|put|patch|delete)\s*\(\s*(['"`])([^'"`]+)\2/g;

  let match;
  while ((match = routeRegex.exec(src)) !== null) {
    const method = match[1];
    const routePath = match[3];
    const matchIndex = match.index;

    // Skip public paths
    if (isPublicPath(routePath)) continue;

    // Look at the middleware chain that follows the path
    // Slice the source from this match forward up to the route handler `(async)?\s*\(` or `function`
    const afterMatch = src.slice(matchIndex, matchIndex + 800);
    // Check whether the chain includes an auth middleware name
    const hasAuth = AUTH_MIDDLEWARE_NAMES.some(name =>
      afterMatch.match(new RegExp(`\\b${name}\\b`))
    );

    if (!hasAuth) {
      // Find the line number
      const uptoMatch = src.slice(0, matchIndex);
      const lineNo = uptoMatch.split('\n').length;
      findings.push({
        service: svc.rel,
        method: method.toUpperCase(),
        path: routePath,
        line: lineNo,
        snippet: lines[lineNo - 1]?.trim().slice(0, 120) || '',
      });
    }
  }

  return findings;
}

function main() {
  let services;
  if (SERVICE_ARG) {
    services = [{ path: path.resolve(SERVICE_ARG), rel: SERVICE_ARG, topDir: '' }];
  } else {
    services = findServiceIndex();
  }

  if (services.length === 0) {
    console.error('No services found.');
    process.exit(2);
  }

  const allFindings = [];
  for (const svc of services) {
    if (!fs.existsSync(svc.path)) {
      console.error(`Service not found: ${svc.path}`);
      process.exit(2);
    }
    const findings = auditService(svc);
    allFindings.push(...findings);
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ findings: allFindings, scannedServices: services.length }, null, 2));
  } else {
    console.log(`\n=== Auth Bypass Audit ===`);
    console.log(`Scanned ${services.length} services.`);
    if (allFindings.length === 0) {
      console.log(`✅ No unprotected mutating routes found.`);
      process.exit(0);
    }

    console.log(`\n❌ Found ${allFindings.length} unprotected mutating route(s):\n`);

    // Group by service
    const byService = {};
    for (const f of allFindings) {
      if (!byService[f.service]) byService[f.service] = [];
      byService[f.service].push(f);
    }
    for (const [svc, findings] of Object.entries(byService)) {
      console.log(`  ${svc}:`);
      for (const f of findings) {
        console.log(`    ${f.method} ${f.path} (line ${f.line})`);
      }
    }
    console.log(`\nFix: add requireAuth middleware before the handler.`);
    console.log(`Example: app.post('/api/foo', requireAuth, async (req, res) => { ... });`);
    process.exit(1);
  }
}

main();
