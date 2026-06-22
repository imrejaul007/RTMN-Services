import { app } from '../src/index.js';
import mongoose from 'mongoose';
import { authHeaders } from '../../../infrastructure/test-helpers.js';
const PORT = 7095; let server;
async function setup() { await new Promise(r => { server = app.listen(PORT, r); }); }
async function teardown() { await mongoose.disconnect(); if (server) server.close(); }
async function req(m, p, b, h = {}) { const r = await fetch(`http://localhost:${PORT}${p}`, { method: m, headers: { 'content-type': 'application/json', ...h }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, data: await r.json() }; }
let p = 0, f = 0; const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };
async function run() {
  await setup(); const H = authHeaders();
  console.log('\nPolicyOS tests:');
  a('health', (await req('GET', '/health')).status === 200);
  await req('POST', '/api/policies', { name: 'Block large tx', action: 'wallet.transfer', effect: 'deny', conditions: { amount_greater_than: 10000 }, priority: 10 }, H);
  await req('POST', '/api/policies', { name: 'Allow small tx', action: 'wallet.transfer', effect: 'allow', conditions: { amount_greater_than: 0 }, priority: 5 }, H);
  const allow = await req('POST', '/api/policies/evaluate', { action: 'wallet.transfer', context: { amount_greater_than: 100 } }, H); a('small tx allowed', allow.data.data.allowed === true);
  const deny = await req('POST', '/api/policies/evaluate', { action: 'wallet.transfer', context: { amount_greater_than: 50000 } }, H); a('large tx denied', deny.data.data.allowed === false);
  const noPolicy = await req('POST', '/api/policies/evaluate', { action: 'unknown.action' }, H); a('unknown default allow', noPolicy.data.data.allowed === true);
  await teardown();
  console.log(`\nPolicyOS: ${p} passed, ${f} failed`); process.exit(f > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
