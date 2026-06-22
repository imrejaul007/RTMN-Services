import { app } from '../src/index.js';
import mongoose from 'mongoose';
import { authHeaders } from '../../../infrastructure/test-helpers.js';
const PORT = 7093; let server;
async function setup() { await new Promise(r => { server = app.listen(PORT, r); }); }
async function teardown() { await mongoose.disconnect(); if (server) server.close(); }
async function req(m, p, b, h = {}) { const r = await fetch(`http://localhost:${PORT}${p}`, { method: m, headers: { 'content-type': 'application/json', ...h }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, data: await r.json() }; }
let p = 0, f = 0; const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };
async function run() {
  const IDEM = 'test-key-' + Date.now();  // unique per run — avoids stale-key collisions on repeat runs
  await setup(); const H = authHeaders();
  console.log('\nFlowOS tests:');
  // 1. Health
  a('health', (await req('GET', '/health')).status === 200);
  // 2. Auth gate: no internal token → 401
  a('no internal token is 401', (await req('GET', '/api/flows')).status === 401);
  // 3. Auth gate: no JWT on POST → 401
  const noAuth = await fetch(`http://localhost:${PORT}/api/flows`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN }, body: JSON.stringify({ name: 'x', steps: [{ id: 's1', skill: 'X' }] }) });
  a('no JWT on POST is 401', noAuth.status === 401);
  // 4. Create flow
  const c = await req('POST', '/api/flows', { name: 'Welcome', steps: [{ id: 's1', skill: 'SKL-SEA-TEST', input: { query: 'hi' } }] }, H);
  a('create flow', c.status === 201);
  const flowId = c.data.data.flowId;
  // 5. List
  const list = await req('GET', '/api/flows', null, H); a('list', list.data.data.count >= 1);
  // 6. 404 on missing flow
  const noFlow = await req('POST', '/api/flows/FAKE/execute', {}, H); a('missing flow is 404', noFlow.status === 404);
  // 7. Tenant isolation: a different corpId's token should not see the first flow
  const otherH = authHeaders({ businessId: 'TEST-BIZ-OTHER-' + Date.now() });
  const otherCreate = await req('POST', '/api/flows', { name: 'OtherCorp', steps: [{ id: 's1', skill: 'X' }] }, otherH);
  a('other corp can create a flow', otherCreate.status === 201);
  const otherList = await req('GET', '/api/flows', null, otherH);
  const otherSeesOriginal = otherList.data.data.items.some(f => f.flowId === flowId);
  a('other corp does not see original flow', !otherSeesOriginal);
  // 8. Idempotency: same key returns same runId
  const exec1 = await req('POST', `/api/flows/${flowId}/execute`, { input: { i: 1 } }, { ...H, 'idempotency-key': IDEM });
  a('first execute is 202', exec1.status === 202);
  const runId1 = exec1.data.data.runId;
  const exec2 = await req('POST', `/api/flows/${flowId}/execute`, { input: { i: 2 } }, { ...H, 'idempotency-key': IDEM });
  a('idempotent execute returns same runId', exec2.status === 200 && exec2.data.data.runId === runId1);
  a('idempotent response flagged idempotent', exec2.data.data.idempotent === true);
  // 9. Cross-tenant isolation: even with a guessed runId, other corp cannot read it
  const otherRead = await req('GET', `/api/runs/${exec1.data.data.runId}`, null, otherH);
  a('cross-tenant read is 404', otherRead.status === 404);
  // 10. Dep timeout: create a flow with an impossible dep, verify it would time out (we don't run it because SkillOS isn't up, just verify create+validate)
  const bad = await req('POST', '/api/flows', { name: 'Bad', steps: [{ id: 's1', skill: 'X', dependsOn: ['NEVER_EXISTS'] }] }, H);
  a('flow with impossible dep is created (timeout enforced at exec, not create)', bad.status === 201);
  await teardown();
  console.log(`\nFlowOS: ${p} passed, ${f} failed`); process.exit(f > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
