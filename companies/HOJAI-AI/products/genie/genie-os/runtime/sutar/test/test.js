import { app } from '../src/index.js';
import mongoose from 'mongoose';
import { authHeaders } from '../../../infrastructure/test-helpers.js';
const PORT = 7299; let server, businessId, agentId;
async function setup() { await new Promise(r => { server = app.listen(PORT, r); }); }
async function teardown() { await mongoose.disconnect(); if (server) server.close(); }
async function req(m, p, b, h = {}) { const r = await fetch(`http://localhost:${PORT}${p}`, { method: m, headers: { 'content-type': 'application/json', ...h }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, data: await r.json() }; }
let p = 0, f = 0; const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };
async function run() {
  await setup(); const H = authHeaders();
  console.log('\nSutar tests:');
  a('health', (await req('GET', '/health')).status === 200);
  const b = await req('POST', '/api/businesses', { name: 'Test Restaurant', type: 'restaurant', ownerName: 'Chef', email: 'chef@test.com' }, H); a('register', b.status === 201); businessId = b.data.data.businessId;
  const g = await req('GET', `/api/businesses/${businessId}`, null, H); a('get', g.status === 200);
  const lst = await req('GET', '/api/businesses?type=restaurant', null, H); a('list', lst.data.data.count >= 1);
  const ag = await req('POST', '/api/agents', { businessId, type: 'merchant' }, H); a('create agent', ag.status === 201); agentId = ag.data.data.agentId;
  const ags = await req('GET', `/api/agents/${businessId}`, null, H); a('list agents', ags.data.data.count >= 1);
  const dec = await req('POST', `/api/agents/${agentId}/decide`, { businessId, type: 'order', action: 'accept_order', context: { inStock: true, item: 'pizza' } }, H); a('decide accept', dec.data.data.decision === 'accept');
  const dec2 = await req('POST', `/api/agents/${agentId}/decide`, { businessId, type: 'order', action: 'accept_order', context: { inStock: false } }, H); a('decide reject', dec2.data.data.decision === 'reject_out_of_stock');
  const decs = await req('GET', `/api/decisions/${businessId}`, null, H); a('list decisions', decs.data.data.count >= 2);
  await teardown();
  console.log(`\nSutar: ${p} passed, ${f} failed`); process.exit(f > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
