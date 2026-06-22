#!/usr/bin/env node
/**
 * audit-security.js — Check auth/security state across all SUTAR services
 *
 * Walks every SUTAR service's src/index.js, checks for the presence of
 * auth middleware, helmet, cors, rate limiting, and validation guards,
 * and reports a coverage matrix. Accounts for the canonical
 * @rtmn/shared/security setupSecurity() helper, which applies helmet,
 * cors, rate limit, prototype-pollution guard, and morgan logging
 * in a single call.
 *
 * Run from the HOJAI-AI repo root:
 *   node scripts/audit-security.js
 */

const fs = require('fs');
const path = require('path');

const SUTAR_ROOT = path.resolve(__dirname, '..', 'sutar-os');
const LAYERS = ['agents', 'contracts', 'core', 'economy'];

const services = [];
for (const layer of LAYERS) {
  const dir = path.join(SUTAR_ROOT, layer);
  if (!fs.existsSync(dir)) continue;
  for (const svc of fs.readdirSync(dir)) {
    const src = path.join(dir, svc, 'src', 'index.js');
    if (fs.existsSync(src)) services.push({ layer, svc, src });
  }
}

const checks = {
  AUTH:        /requireAuth|optionalAuth|createAuthMiddleware/,
  HELMET:      /helmet\(|setupSecurity/,
  CORS:        /cors\(|setupSecurity/,
  RATE_LIMIT:  /rateLimit|defaultLimiter|strictLimiter|setupSecurity/,
  VALIDATION:  /sanitize|preventPrototypePollution|validateInput|joi|yup|Joi\.|setupSecurity/,
  PERSISTENCE: /PersistentMap|mongoose/,
};

const widths = { SVC: 38 };
for (const k of Object.keys(checks)) widths[k] = 6;

const header = ['SERVICE'.padEnd(widths.SVC), ...Object.keys(checks).map((k) => k.padEnd(widths[k]))].join(' ');
console.log(header);
console.log('-'.repeat(header.length));

let totals = Object.fromEntries(Object.keys(checks).map((k) => [k, 0]));
for (const s of services) {
  const src = fs.readFileSync(s.src, 'utf8');
  const cells = [`${s.layer}/${s.svc}`.padEnd(widths.SVC)];
  for (const [name, re] of Object.entries(checks)) {
    const ok = re.test(src);
    if (ok) totals[name]++;
    cells.push((ok ? 'Y' : '-').padEnd(widths[name]));
  }
  console.log(cells.join(' '));
}

console.log('-'.repeat(header.length));
const totalRow = ['TOTAL'.padEnd(widths.SVC), ...Object.keys(checks).map((k) => `${totals[k]}/${services.length}`.padEnd(widths[k]))];
console.log(totalRow.join(' '));