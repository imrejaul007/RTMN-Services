import { app } from '../src/index.js';
import mongoose from 'mongoose';

const PORT = 7098;
let server, twinId;

async function setup() { await new Promise(r => { server = app.listen(PORT, r); }); }
async function teardown() { await mongoose.disconnect(); if (server) server.close(); }
async function request(method, path, body, headers = {}) {
  const res = await fetch(`http://localhost:${PORT}${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json() };
}
let passed = 0, failed = 0;
const assert = (name, cond) => { if (cond) { passed++; console.log(`  ✓ ${name}`); } else { failed++; console.log(`  ✗ ${name}`); } };

async function run() {
  await setup();
  const H = { 'x-internal-token': 'hojai-internal-service-token-change-me' };
  console.log('\nTwinOS tests:');
  const h = await request('GET', '/health'); assert('health', h.status === 200);
  const c = await request('POST', '/api/twins', { corpId: 'USR-TEST', type: 'user', name: 'Test' }, H); assert('create twin', c.status === 201); twinId = c.data.data.twinId;
  const g = await request('GET', `/api/twins/${twinId}`, null, H); assert('get twin', g.status === 200);
  const u = await request('PATCH', `/api/twins/${twinId}`, { state: { mood: 'happy' } }, H); assert('update twin', u.status === 200 && u.data.data.version === 2);
  const byCorp = await request('GET', '/api/twins/by-corp/USR-TEST', null, H); assert('by corpId', byCorp.data.data.count >= 1);
  await teardown();
  console.log(`\nTwinOS: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
