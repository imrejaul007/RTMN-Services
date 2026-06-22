// Set test env BEFORE importing app so the listen is suppressed
process.env.NODE_ENV = 'test';
process.env.SUPPRESS_LISTEN = '1';
import { app } from '../src/index.js';
import mongoose from 'mongoose';
import { authHeaders } from '../../../infrastructure/test-helpers.js';
const PORT = 7199; let server;
async function setup() { await new Promise(r => { server = app.listen(PORT, r); }); }
async function teardown() { await mongoose.disconnect(); if (server) server.close(); }
async function req(m, p, b, h = {}) { const r = await fetch(`http://localhost:${PORT}${p}`, { method: m, headers: { 'content-type': 'application/json', ...h }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, data: await r.json() }; }
let p = 0, f = 0; const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };
async function run() {
  await setup();
  // Signup/login routes require a Bearer token (treat callers as authenticated
  // internal services). The token from authHeaders satisfies requireAuth(); the
  // endpoint then issues its own user JWT in the response.
  const H = authHeaders();
  console.log('\nGenie tests:');
  a('health', (await req('GET', '/health')).status === 200);
  const email = `test${Date.now()}@genie.com`;
  const su = await req('POST', '/api/auth/signup', { email, password: 'password1', name: 'Test User' }, H); a('signup', su.status === 201); const token = su.data.data.token;
  const dup = await req('POST', '/api/auth/signup', { email, password: 'password1', name: 'Dup' }, H); a('dup email 409', dup.status === 409);
  const li = await req('POST', '/api/auth/login', { email, password: 'password1' }, H); a('login', li.status === 200);
  const bad = await req('POST', '/api/auth/login', { email, password: 'wrong' }, H); a('bad password 401', bad.status === 401);
  const me = await req('GET', '/api/auth/me', null, { authorization: `Bearer ${token}` }); a('me', me.data.data.email === email);
  const noauth = await req('GET', '/api/auth/me'); a('me no auth 401', noauth.status === 401);
  const ask = await req('POST', '/api/ask', { question: 'help me buy a laptop' }, { authorization: `Bearer ${token}` }); a('ask', ask.data.data.answer.length > 0);
  const brief = await req('GET', '/api/briefing', null, { authorization: `Bearer ${token}` }); a('briefing', brief.data.data.greeting.includes('Test'));
  const mem = await req('POST', '/api/memory', { type: 'preference', content: 'I prefer dark mode', importance: 0.8 }, { authorization: `Bearer ${token}` }); a('memory', mem.status === 200);
  await teardown();
  console.log(`\nGenie: ${p} passed, ${f} failed`); process.exit(f > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
