import { app } from '../src/index.js';
import mongoose from 'mongoose';
import { authHeaders } from '../../../infrastructure/test-helpers.js';
const PORT = 7399; let server, agentId;
async function setup() { await new Promise(r => { server = app.listen(PORT, r); }); }
async function teardown() { await mongoose.disconnect(); if (server) server.close(); }
async function req(m, p, b, h = {}) { const r = await fetch(`http://localhost:${PORT}${p}`, { method: m, headers: { 'content-type': 'application/json', ...h }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, data: await r.json() }; }
let p = 0, f = 0; const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };
async function run() {
  await setup(); const H = authHeaders();
  console.log('\nAgentOS tests:');
  a('health', (await req('GET', '/health')).status === 200);
  const c = await req('POST', '/api/agents', { name: 'Shopping Agent', type: 'personal', runtime: 'genie' }, H); a('create', c.status === 201); agentId = c.data.data.agentId;
  const lst = await req('GET', '/api/agents?type=personal', null, H); a('list', lst.data.data.count >= 1);
  const g = await req('GET', `/api/agents/${agentId}`, null, H); a('get', g.status === 200);
  const d = await req('POST', `/api/agents/${agentId}/deploy`, {}, H); a('deploy', d.data.data.status === 'deployed');
  const t = await req('POST', `/api/agents/${agentId}/tasks`, { type: 'shop', input: { item: 'laptop' } }, H); a('task', t.data.data.status === 'completed');
  const ts = await req('GET', `/api/agents/${agentId}/tasks`, null, H); a('list tasks', ts.data.data.count >= 1);
  await teardown();
  console.log(`\nAgentOS: ${p} passed, ${f} failed`); process.exit(f > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
