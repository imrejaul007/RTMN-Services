import { app } from '../src/index.js';
import mongoose from 'mongoose';

const PORT = 7099;

let server;
let testCorpId;

async function setup() {
  await new Promise(resolve => {
    server = app.listen(PORT, resolve);
  });
  console.log('[test] Server started on :' + PORT);
}

async function teardown() {
  await mongoose.disconnect();
  if (server) server.close();
  console.log('[test] Server stopped');
}

async function request(method, path, body, headers = {}) {
  const url = `http://localhost:${PORT}${path}`;
  const opts = { method, headers: { 'content-type': 'application/json', ...headers } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  return { status: res.status, data };
}

let passed = 0, failed = 0;

function assert(name, cond, msg = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name} ${msg}`); }
}

async function run() {
  await setup();
  const INTERNAL = { 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || 'hojai-internal-service-token-change-me' };

  console.log('\nCorpID tests:');

  const health = await request('GET', '/health');
  assert('health check works', health.status === 200 && health.data.success);
  assert('service is corpid', health.data.data.service === 'corpid');

  const issue = await request('POST', '/api/identity/issue', { type: 'user', name: 'Test User' }, INTERNAL);
  assert('issue CorpId', issue.status === 201);
  assert('corpId is USR-', issue.data.data.corpId.startsWith('USR-'));
  testCorpId = issue.data.data.corpId;

  const dupIssue = await request('POST', '/api/identity/issue', { type: 'user', name: 'No Auth' });
  assert('issue without internal token is 401', dupIssue.status === 401);

  const get = await request('GET', `/api/identity/${testCorpId}`, null, INTERNAL);
  assert('get by corpId', get.status === 200 && get.data.data.corpId === testCorpId);

  const notFound = await request('GET', '/api/identity/USR-FAKE123', null, INTERNAL);
  assert('get unknown is 404', notFound.status === 404);

  const update = await request('PATCH', `/api/identity/${testCorpId}`, { verified: true }, INTERNAL);
  assert('update verified', update.status === 200 && update.data.data.verified === true);

  const list = await request('GET', '/api/identity?type=user', null, INTERNAL);
  assert('list by type', list.status === 200 && list.data.data.items.length > 0);

  await teardown();
  console.log(`\nCorpID: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
