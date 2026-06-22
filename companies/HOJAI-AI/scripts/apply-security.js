#!/usr/bin/env node
/**
 * apply-security.js — Phase 1 of SUTAR 10/10 plan
 *
 * Walks all 25 SUTAR services and applies the canonical @rtmn/shared/security
 * setup (helmet, cors, rate limit, prototype-pollution guard, logger) by
 * editing src/index.js. Safe to re-run: idempotent.
 *
 * Pattern per file:
 *   1. If file already imports from @rtmn/shared/security → skip the import edit.
 *   2. Add `const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');`
 *      after the other @rtmn/shared imports.
 *   3. Replace `app.use(express.json({ limit: ... }));` (or `app.use(express.json());`)
 *      with `setupSecurity(app, { serviceName: '<svc>' });`.
 *
 * ESM services (type: "module") get `import { ... } from '@rtmn/shared/security';`
 * instead.
 */

const fs = require('fs');
const path = require('path');

const SUTAR_ROOT = '/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/sutar-os';
const LAYERS = ['agents', 'contracts', 'core', 'economy'];

// Services to skip — already fully secured (use @rtmn/twinos-shared, e.g. agent-twin)
const SKIP = new Set(['agents/agent-twin']);

function walkServices() {
  const services = [];
  for (const layer of LAYERS) {
    const dir = path.join(SUTAR_ROOT, layer);
    if (!fs.existsSync(dir)) continue;
    for (const svc of fs.readdirSync(dir)) {
      const key = `${layer}/${svc}`;
      if (SKIP.has(key)) continue;
      const src = path.join(dir, svc, 'src', 'index.js');
      if (fs.existsSync(src)) services.push({ layer, svc, src });
    }
  }
  return services;
}

function isESM(srcFile, svcDir) {
  const pkgPath = path.join(svcDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.type === 'module') return true;
    } catch (_) {}
  }
  // Heuristic: if file uses import statements
  const src = fs.readFileSync(srcFile, 'utf8');
  return /^import\s/m.test(src);
}

function applyToService({ layer, svc, src: srcFile }) {
  const svcDir = path.join(SUTAR_ROOT, layer, svc);
  let src = fs.readFileSync(srcFile, 'utf8');
  const esm = isESM(srcFile, svcDir);
  let changed = false;

  // 1. Add import if not present
  const hasSecurityImport = src.includes('@rtmn/shared/security');
  if (!hasSecurityImport) {
    if (esm) {
      // Find the last @rtmn/shared import line and append
      const m = src.match(/^import\s+.*?\s+from\s+['"]@rtmn\/shared\/[^'"]+['"];?\s*$/m);
      if (m) {
        const insert = `\nimport { setupSecurity, strictLimiter } from '@rtmn/shared/security';`;
        src = src.replace(m[0], m[0] + insert);
      } else {
        // No shared imports yet — add after the first import line
        const m2 = src.match(/^import\s+.*?;?\s*$/m);
        if (m2) {
          src = src.replace(m2[0], m2[0] + `\nimport { setupSecurity, strictLimiter } from '@rtmn/shared/security';`);
        }
      }
    } else {
      // CJS: find last @rtmn/shared require and append
      const m = src.match(/^const\s+\{[^}]*\}\s*=\s*require\(['"]@rtmn\/shared\/[^'"]+['"]\);?\s*$/m);
      if (m) {
        const insert = `\nconst { setupSecurity, strictLimiter } = require('@rtmn/shared/security');`;
        src = src.replace(m[0], m[0] + insert);
      } else {
        // No shared imports yet — add after the first require line
        const m2 = src.match(/^const\s+[^=]+=\s*require\([^)]+\);?\s*$/m);
        if (m2) {
          src = src.replace(m2[0], m2[0] + `\nconst { setupSecurity, strictLimiter } = require('@rtmn/shared/security');`);
        }
      }
    }
    changed = true;
  }

  // 2. Replace `app.use(express.json(...))` with `setupSecurity(app, {...})`
  const setupCall = `setupSecurity(app, { serviceName: '${svc}' });`;
  if (src.includes(setupCall)) {
    // Already done
  } else {
    // Match the FIRST express.json line and replace it
    const re = /app\.use\(express\.json\([^)]*\)\);?/;
    if (re.test(src)) {
      src = src.replace(re, setupCall);
      changed = true;
    } else if (/app\.use\(express\.json\(\)\)/.test(src)) {
      src = src.replace(/app\.use\(express\.json\(\)\);?/, setupCall);
      changed = true;
    } else {
      // No express.json line — insert setupSecurity call after `const app = express();`
      const m = src.match(/(const\s+app\s*=\s*express\(\);?)/);
      if (m) {
        src = src.replace(m[0], `${m[0]}\n${setupCall}`);
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(srcFile, src, 'utf8');
    return true;
  }
  return false;
}

const services = walkServices();
console.log(`Scanning ${services.length} services...`);
let applied = 0;
for (const s of services) {
  try {
    if (applyToService(s)) {
      console.log(`✓ ${s.layer}/${s.svc}`);
      applied++;
    } else {
      console.log(`- ${s.layer}/${s.svc} (no change)`);
    }
  } catch (e) {
    console.error(`✗ ${s.layer}/${s.svc}: ${e.message}`);
  }
}
console.log(`\nApplied security setup to ${applied} service(s).`);