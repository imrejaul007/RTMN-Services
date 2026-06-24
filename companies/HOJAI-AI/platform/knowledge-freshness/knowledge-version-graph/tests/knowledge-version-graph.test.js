'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'kvg-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 21000;
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
  assert.strictEqual(r.body.service, 'knowledge-version-graph');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/artifacts');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Create artifact creates root version', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const r = await request(port, 'POST', '/artifacts', { name: 'Doc A', kind: 'document' }, tok);
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.artifact.name, 'Doc A');
  assert.strictEqual(r.body.root_version.version_number, 1);
  assert.strictEqual(r.body.root_version.supersedes.length, 0);
  assert.strictEqual(r.body.artifact.latest_version_id, r.body.root_version.id);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Artifact validation', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r1 = await request(port, 'POST', '/artifacts', { kind: 'document' }, 'tok');
  assert.strictEqual(r1.status, 400);
  const r2 = await request(port, 'POST', '/artifacts', { name: 'A' }, 'tok');
  assert.strictEqual(r2.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Add version supersedes predecessor (linear)', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/artifacts', { name: 'A', kind: 'document' }, tok);
  const aid = a.body.artifact.id;
  const rootId = a.body.root_version.id;
  const v2 = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'sha256:abc', supersedes: [rootId], summary: 'v2' }, tok);
  assert.strictEqual(v2.status, 201);
  assert.strictEqual(v2.body.version_number, 2);
  assert.deepStrictEqual(v2.body.supersedes, [rootId]);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Version validation: content_hash required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/artifacts', { name: 'A', kind: 'document' }, tok);
  const r = await request(port, 'POST', `/artifacts/${a.body.artifact.id}/versions`, { summary: 'oops' }, tok);
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Version validation: cross-artifact predecessor rejected', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/artifacts', { name: 'A', kind: 'document' }, tok);
  const b = await request(port, 'POST', '/artifacts', { name: 'B', kind: 'document' }, tok);
  const r = await request(port, 'POST', `/artifacts/${a.body.artifact.id}/versions`, { content_hash: 'h', supersedes: [b.body.root_version.id] }, tok);
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Add version: 404 unknown artifact', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/artifacts/art_unknown/versions', { content_hash: 'h' }, 'tok');
  assert.strictEqual(r.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('List versions by artifact', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/artifacts', { name: 'A', kind: 'document' }, tok);
  const aid = a.body.artifact.id;
  const rootId = a.body.root_version.id;
  await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h2', supersedes: [rootId] }, tok);
  const r = await request(port, 'GET', `/artifacts/${aid}/versions`, null, tok);
  assert.strictEqual(r.body.count, 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Ancestors transitive', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/artifacts', { name: 'A', kind: 'document' }, tok);
  const aid = a.body.artifact.id;
  const rootId = a.body.root_version.id;
  const v2 = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h2', supersedes: [rootId] }, tok);
  const v3 = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h3', supersedes: [v2.body.id] }, tok);
  const r = await request(port, 'GET', `/versions/${v3.body.id}/ancestors`, null, tok);
  assert.strictEqual(r.body.count, 2);
  assert.ok(r.body.ancestors.includes(rootId));
  assert.ok(r.body.ancestors.includes(v2.body.id));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Descendants transitive', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/artifacts', { name: 'A', kind: 'document' }, tok);
  const aid = a.body.artifact.id;
  const rootId = a.body.root_version.id;
  const v2 = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h2', supersedes: [rootId] }, tok);
  const v3 = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h3', supersedes: [v2.body.id] }, tok);
  const r = await request(port, 'GET', `/versions/${rootId}/descendants`, null, tok);
  assert.strictEqual(r.body.count, 2);
  assert.ok(r.body.descendants.includes(v2.body.id));
  assert.ok(r.body.descendants.includes(v3.body.id));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Fork-merge: v3 supersedes v1 + v2 (multi-parent)', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/artifacts', { name: 'A', kind: 'document' }, tok);
  const aid = a.body.artifact.id;
  const rootId = a.body.root_version.id;
  const v2a = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h2a', supersedes: [rootId] }, tok);
  const v2b = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h2b', supersedes: [rootId] }, tok);
  const v3 = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h3', supersedes: [v2a.body.id, v2b.body.id] }, tok);
  const r = await request(port, 'GET', `/versions/${v3.body.id}/ancestors`, null, tok);
  assert.strictEqual(r.body.count, 3);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Lineage: depth + roots + leaves', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/artifacts', { name: 'A', kind: 'document' }, tok);
  const aid = a.body.artifact.id;
  const rootId = a.body.root_version.id;
  const v2 = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h2', supersedes: [rootId] }, tok);
  const v3 = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h3', supersedes: [v2.body.id] }, tok);
  const r = await request(port, 'GET', `/versions/${v3.body.id}/lineage`, null, tok);
  assert.strictEqual(r.body.depth, 2);
  assert.deepStrictEqual(r.body.roots, [rootId]);
  assert.deepStrictEqual(r.body.leaves, [v3.body.id]);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Cycle detection: no cycle in normal DAG', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/artifacts', { name: 'A', kind: 'document' }, tok);
  const aid = a.body.artifact.id;
  const rootId = a.body.root_version.id;
  const v2 = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h2', supersedes: [rootId] }, tok);
  const r = await request(port, 'GET', `/versions/${v2.body.id}/cycle`, null, tok);
  assert.strictEqual(r.body.hasCycle, false);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Supersedes: link and unlink', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/artifacts', { name: 'A', kind: 'document' }, tok);
  const aid = a.body.artifact.id;
  const rootId = a.body.root_version.id;
  const v2 = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h2' }, tok);
  const link = await request(port, 'POST', `/versions/${v2.body.id}/supersedes`, { predecessor_id: rootId }, tok);
  assert.strictEqual(link.status, 201);
  assert.deepStrictEqual(link.body.supersedes, [rootId]);
  const unlink = await request(port, 'DELETE', `/versions/${v2.body.id}/supersedes/${rootId}`, null, tok);
  assert.strictEqual(unlink.body.removed, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Supersedes: idempotent link', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/artifacts', { name: 'A', kind: 'document' }, tok);
  const aid = a.body.artifact.id;
  const rootId = a.body.root_version.id;
  const v2 = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h2', supersedes: [rootId] }, tok);
  const link = await request(port, 'POST', `/versions/${v2.body.id}/supersedes`, { predecessor_id: rootId }, tok);
  assert.strictEqual(link.body.already_linked, true);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Supersedes: self-link rejected', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/artifacts', { name: 'A', kind: 'document' }, tok);
  const v2 = await request(port, 'POST', `/artifacts/${a.body.artifact.id}/versions`, { content_hash: 'h2' }, tok);
  const r = await request(port, 'POST', `/versions/${v2.body.id}/supersedes`, { predecessor_id: v2.body.id }, tok);
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Topological order: predecessors before successors', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/artifacts', { name: 'A', kind: 'document' }, tok);
  const aid = a.body.artifact.id;
  const rootId = a.body.root_version.id;
  const v2 = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h2', supersedes: [rootId] }, tok);
  const v3 = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h3', supersedes: [v2.body.id] }, tok);
  const r = await request(port, 'GET', '/graph/topo', null, tok);
  assert.strictEqual(r.body.count, 3);
  assert.ok(r.body.order.indexOf(rootId) < r.body.order.indexOf(v2.body.id));
  assert.ok(r.body.order.indexOf(v2.body.id) < r.body.order.indexOf(v3.body.id));
  assert.strictEqual(r.body.has_cycle, false);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Graph stats: roots + leaves', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/artifacts', { name: 'A', kind: 'document' }, tok);
  const aid = a.body.artifact.id;
  const rootId = a.body.root_version.id;
  const v2 = await request(port, 'POST', `/artifacts/${aid}/versions`, { content_hash: 'h2', supersedes: [rootId] }, tok);
  const r = await request(port, 'GET', '/graph/stats', null, tok);
  assert.strictEqual(r.body.artifact_count, 1);
  assert.strictEqual(r.body.version_count, 2);
  assert.strictEqual(r.body.edge_count, 1);
  assert.strictEqual(r.body.roots, 1);
  assert.strictEqual(r.body.leaves, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Artifact 404', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/artifacts/art_nope', null, 'tok');
  assert.strictEqual(r.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence across restart', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const a = await request(port1, 'POST', '/artifacts', { name: 'P', kind: 'document' }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/artifacts/${a.body.artifact.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});