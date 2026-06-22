import { app } from '../src/index.js';
import mongoose from 'mongoose';
const PORT = 7097; let server;
async function setup() { await new Promise(r => { server = app.listen(PORT, r); }); }
async function teardown() { await mongoose.disconnect(); if (server) server.close(); }
async function req(method, path, body, h = {}) { const r = await fetch(`http://localhost:${PORT}${path}`, { method, headers: { 'content-type': 'application/json', ...h }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json() }; }
let p = 0, f = 0; const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };
async function run() {
  await setup(); const H = { 'x-internal-token': 'hojai-internal-service-token-change-me' };
  console.log('\nMemoryOS tests:');
  a('health', (await req('GET', '/health')).status === 200);
  const c = await req('POST', '/api/memory', { corpId: 'USR-T', type: 'preference', content: 'likes coffee', importance: 0.8 }, H); a('create', c.status === 201); const memId = c.data.data.memoryId;
  const list = await req('GET', '/api/memory/USR-T', null, H); a('list', list.data.data.count >= 1);
  const search = await req('GET', '/api/memory/USR-T/search?q=coffee', null, H); a('search', search.data.data.count >= 1);
  const del = await req('DELETE', `/api/memory/${memId}`, null, H); a('delete', del.data.data.deleted === 1);
  await teardown();
  console.log(`\nMemoryOS: ${p} passed, ${f} failed`); process.exit(f > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
