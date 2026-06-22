#!/usr/bin/env node
/**
 * health-check.js — Boot + health probe for all SUTAR services
 *
 * For each of the 26 SUTAR services:
 *   1. Spawn it as a child process on its default port (or PORT env)
 *   2. Wait for /health to respond
 *   3. Record latency + response shape
 *   4. Kill the process
 *   5. Report pass/fail per service and overall
 *
 * Useful for: catching regressions where a service can't even boot
 * (e.g. missing dep, ESM/CJS bug, broken import).
 *
 * Run from HOJAI-AI repo root:
 *   node scripts/health-check.js [--timeout=10000]
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const REPO_ROOT = path.resolve(__dirname, '..');
const SUTAR_ROOT = path.join(REPO_ROOT, 'sutar-os');
const LAYERS = ['agents', 'contracts', 'core', 'economy'];
const TIMEOUT_MS = parseInt((process.argv.find((a) => a.startsWith('--timeout=')) || '--timeout=10000').split('=')[1]);

function walkServices() {
  const out = [];
  for (const layer of LAYERS) {
    const dir = path.join(SUTAR_ROOT, layer);
    if (!fs.existsSync(dir)) continue;
    for (const svc of fs.readdirSync(dir)) {
      const pkgPath = path.join(dir, svc, 'package.json');
      const srcPath = path.join(dir, svc, 'src', 'index.js');
      if (!fs.existsSync(srcPath) || !fs.existsSync(pkgPath)) continue;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      out.push({
        layer, svc,
        cwd: path.dirname(srcPath),
        entry: srcPath,
        type: pkg.type === 'module' ? 'esm' : 'cjs',
      });
    }
  }
  return out;
}

function readDefaultPort(srcPath) {
  const src = fs.readFileSync(srcPath, 'utf8');
  const m = src.match(/process\.env\.PORT\s*\|\|\s*(\d+)/);
  return m ? parseInt(m[1]) : 3000;
}

function get(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function checkOne(svc) {
  const port = readDefaultPort(svc.entry) + Math.floor(Math.random() * 100);
  const env = { ...process.env, PORT: String(port), JWT_SECRET: 'healthcheck', NODE_ENV: 'test' };
  const child = spawn('node', [svc.entry], {
    cwd: svc.cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const start = Date.now();
  let stderr = '';
  child.stderr.on('data', (d) => stderr += d.toString());

  try {
    // Poll for /health
    let lastErr;
    for (let i = 0; i < 40; i++) { // 40 * 250ms = 10s max
      await sleep(250);
      try {
        const res = await get(`http://127.0.0.1:${port}/health`, 1000);
        if (res.status === 200) {
          const latency = Date.now() - start;
          child.kill('SIGTERM');
          await sleep(100);
          return { ok: true, port, latency, body: res.body.slice(0, 200) };
        }
        lastErr = `status=${res.status}`;
      } catch (e) {
        lastErr = e.message;
      }
    }
    child.kill('SIGKILL');
    return { ok: false, error: lastErr || 'timeout', stderr: stderr.slice(-500) };
  } catch (e) {
    child.kill('SIGKILL');
    return { ok: false, error: e.message };
  }
}

(async () => {
  const services = walkServices();
  console.log(`Health-checking ${services.length} SUTAR services (timeout ${TIMEOUT_MS}ms each)...\n`);

  const results = [];
  for (const svc of services) {
    process.stdout.write(`  ${svc.layer}/${svc.svc} ... `);
    const r = await checkOne(svc);
    if (r.ok) {
      console.log(`✅ ok (port ${r.port}, ${r.latency}ms)`);
      results.push({ ...svc, ...r });
    } else {
      console.log(`❌ FAIL (${r.error})`);
      results.push({ ...svc, ...r });
    }
  }

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`\n${pass}/${results.length} services healthy.`);

  if (fail > 0) {
    console.log('\nFailures:');
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  - ${r.layer}/${r.svc}: ${r.error}`);
      if (r.stderr) console.log(`    stderr: ${r.stderr.split('\n').slice(-5).join('\n           ')}`);
    }
  }

  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('health-check error:', e);
  process.exit(2);
});