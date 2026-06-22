import { app } from '../src/index.js';
import mongoose from 'mongoose';
import { authHeaders } from '../../../infrastructure/test-helpers.js';
const PORT = 7096; let server;
async function setup() { await new Promise(r => { server = app.listen(PORT, r); }); }
async function teardown() { await mongoose.disconnect(); if (server) server.close(); }
async function req(m, p, b, h = {}) { const r = await fetch(`http://localhost:${PORT}${p}`, { method: m, headers: { 'content-type': 'application/json', ...h }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, data: await r.json() }; }
let p = 0, f = 0; const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };
async function run() {
  await setup(); const H = authHeaders();
  console.log('\nGoalOS tests:');
  a('health', (await req('GET', '/health')).status === 200);
  const c = await req('POST', '/api/goals', { corpId: 'USR-T', title: 'Save $5000', category: 'finance', priority: 'high', targetValue: 5000, unit: 'USD' }, H); a('create', c.status === 201); const gid = c.data.data.goalId;
  const list = await req('GET', '/api/goals/USR-T', null, H); a('list', list.data.data.count >= 1);
  const prog = await req('PATCH', `/api/goals/${gid}/progress`, { progress: 50, currentValue: 2500 }, H); a('progress 50%', prog.data.data.status === 'in_progress');
  const done = await req('PATCH', `/api/goals/${gid}/progress`, { progress: 100, currentValue: 5000 }, H); a('achieved', done.data.data.status === 'achieved');
  await teardown();
  console.log(`\nGoalOS: ${p} passed, ${f} failed`); process.exit(f > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
