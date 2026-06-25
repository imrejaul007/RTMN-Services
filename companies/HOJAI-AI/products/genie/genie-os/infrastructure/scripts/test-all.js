#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

// NOTE 2026-06-21: Foundation test entries removed. The canonical foundation services
// live in companies/HOJAI-AI/platform/* and have their own test suites.
// To run foundation tests, see docs/FOUNDATION-AUDIT-2026-06-21.md for the canonical
// locations. This test runner now only covers genie-os's own AI Runtime + clients.
const TESTS = [
  // AI Runtime
  { name: 'Genie',           path: 'runtime/genie' },
  { name: 'Sutar',           path: 'runtime/sutar' },
  { name: 'AgentOS',         path: 'runtime/agentos' },
  { name: 'Planning Engine', path: 'runtime/planning-engine' },
  // Thin clients
  { name: 'do-client',     path: 'products/do-client' },
  { name: 'nexha-client',  path: 'products/nexha-client' },
  { name: 'salar-client',  path: 'products/salar-client' },
];

function run(cmd, args, opts) {
  return new Promise((resolve) => {
    // Always run tests in test mode so services don't try to listen on real ports.
    // Provide required env defaults so requireEnv() and token checks pass under test.
    const env = {
      ...process.env,
      NODE_ENV: 'test',
      SUPPRESS_LISTEN: '1',
      INTERNAL_SERVICE_TOKEN: process.env.INTERNAL_SERVICE_TOKEN || 'hojai-internal-service-token-change-me',
      JWT_SECRET: process.env.JWT_SECRET || 'hojai-development-secret-min-32-chars-please-change-in-production-xyz',
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai',
      ...(opts?.env || {}),
    };
    const child = spawn(cmd, args, { ...opts, stdio: 'inherit', env });
    child.on('exit', (code) => resolve(code || 0));
  });
}

async function main() {
  console.log('\n🧪 Running all genie-os tests (7 suites)...\n');
  console.log('ℹ️  Note: Tests run with NODE_ENV=test. Stop running services first for clean output.');
  console.log('ℹ️  Foundation tests moved — see docs/FOUNDATION-AUDIT-2026-06-21.md.\n');
  let passed = 0, failed = 0;
  for (const t of TESTS) {
    process.stdout.write(`  ${t.name.padEnd(18)} `);
    const code = await run('node', ['test/test.js'], { cwd: path.join(ROOT, t.path) });
    if (code === 0) passed++; else failed++;
  }
  console.log(`\n📊 ${passed}/${TESTS.length} test suites passed${failed > 0 ? `, ${failed} failed` : ''}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
