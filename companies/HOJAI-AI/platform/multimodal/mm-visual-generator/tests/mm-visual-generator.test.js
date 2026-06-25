'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mm-visgen-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 33500;
function uniquePort() { portCounter += 1 + Math.floor(Math.random() * 200); if (portCounter > 60000) portCounter = 10000 + Math.floor(Math.random() * 100); return portCounter; }
function startService(env) {
  return new Promise((resolve, reject) => {
    const prev = setEnv(env);
    delete require.cache[require.resolve('../src/index.js')];
    const mod = require('../src/index.js');
    const app = mod.createApp();
    const server = app.listen(parseInt(env.PORT, 10), () => resolve({ mod, server, port: parseInt(env.PORT, 10), prev }));
    server.once('error', (e) => { restoreEnv(prev); reject(e); });
  });
}
function stopService(handle) { return new Promise((resolve) => { handle.server.close(() => { delete require.cache[require.resolve('../src/index.js')]; restoreEnv(handle.prev); resolve(); }); }); }
function request(port, method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1', port, method, path: p,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}), ...(token ? { 'X-Internal-Token': token } : {}) },
    }, (res) => { let chunks = ''; res.on('data', (c) => chunks += c); res.on('end', () => { try { resolve({ status: res.statusCode, body: chunks ? JSON.parse(chunks) : null }); } catch (e) { resolve({ status: res.statusCode, body: chunks }); } }); });
    req.on('error', reject); if (data) req.write(data); req.end();
  });
}

test('Health & ready', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/health');
  assert.strictEqual(r.body.service, 'mm-visual-generator');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/jobs');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Build prompt: defaults applied', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/prompt', { text: 'a red apple' }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.result.prompt.includes('a red apple'));
  assert.ok(r.body.result.prompt.includes('realistic'));
  assert.strictEqual(r.body.result.style, 'photorealistic');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Build prompt: custom style + template + quality', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/prompt', {
    text: 'mountain landscape',
    opts: { style: 'cinematic', template: 'landscape', quality: 'high' },
  }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.result.prompt.includes('cinematic'));
  assert.ok(r.body.result.prompt.includes('8k'));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Build prompt: invalid style rejected', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/prompt', { text: 'foo', opts: { style: 'unknown-style' } }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Layout: long text → magazine/hero suggested', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const text = 'a'.repeat(800);
  const r = await request(port, 'POST', '/layout', { text, intent: 'article' }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.result.layouts.length > 0);
  assert.strictEqual(r.body.result.intent, 'article');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Layout: short text → card/grid suggested', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/layout', { text: 'hello world' }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.result.layouts.length > 0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Palette: deterministic 5-color extraction', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const data = Buffer.alloc(50, 0).toString('base64');
  const r = await request(port, 'POST', '/palette', { data }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.result.color_count, 5);
  for (const c of r.body.result.colors) {
    assert.ok(/^#[0-9a-f]{6}$/i.test(c.hex));
  }
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Palette: same input → same colors', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const data = Buffer.from([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]).toString('base64');
  const r1 = await request(port, 'POST', '/palette', { data }, 'tok');
  const r2 = await request(port, 'POST', '/palette', { data }, 'tok');
  assert.deepStrictEqual(r1.body.result.colors, r2.body.result.colors);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Render SVG: produces SVG string', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/render', {
    prompt: { prompt: 'a beautiful sunset' },
    palette: { colors: [{ hex: '#ff7700' }, { hex: '#003366' }] },
    width: 256, height: 256,
  }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.result.svg.startsWith('<svg'));
  assert.ok(r.body.result.svg.includes('#ff7700'));
  assert.ok(r.body.result.svg.includes('256'));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Catalog endpoints: styles, templates, layouts', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const s = await request(port, 'GET', '/styles', null, 'tok');
  const t = await request(port, 'GET', '/templates', null, 'tok');
  const l = await request(port, 'GET', '/layouts', null, 'tok');
  assert.ok(Array.isArray(s.body.styles) && s.body.styles.length >= 5);
  assert.ok(Array.isArray(t.body.templates) && t.body.templates.length >= 5);
  assert.ok(Array.isArray(l.body.layouts) && l.body.layouts.length >= 5);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Jobs filter by type + persistence', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  await request(port, 'POST', '/prompt', { text: 'a' }, 'tok');
  await request(port, 'POST', '/layout', { text: 'b' }, 'tok');
  const filtered = await request(port, 'GET', '/jobs?type=prompt', null, 'tok');
  assert.ok(filtered.body.count >= 1);
  assert.ok(filtered.body.jobs.every((j) => j.type === 'prompt'));
  // Restart service on a NEW port (same data dir) to verify persistence
  await stopService(h);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const all = await request(port2, 'GET', '/jobs', null, 'tok');
  assert.ok(all.body.count >= 2);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validation: missing data rejected', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r1 = await request(port, 'POST', '/palette', {}, 'tok');
  assert.strictEqual(r1.status, 400);
  const r2 = await request(port, 'POST', '/prompt', { text: '' }, 'tok');
  assert.strictEqual(r2.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});