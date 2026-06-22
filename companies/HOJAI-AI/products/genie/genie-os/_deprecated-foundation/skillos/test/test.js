import { app } from '../src/index.js';
import mongoose from 'mongoose';
import { authHeaders } from '../../../infrastructure/test-helpers.js';
const PORT = 7094; let server;
async function setup() { await new Promise(r => { server = app.listen(PORT, r); }); }
async function teardown() { await mongoose.disconnect(); if (server) server.close(); }
async function req(m, p, b, h = {}) { const r = await fetch(`http://localhost:${PORT}${p}`, { method: m, headers: { 'content-type': 'application/json', ...h }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, data: await r.json() }; }
let p = 0, f = 0; const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };
async function run() {
  await setup(); const H = authHeaders();
  console.log('\nSkillOS tests:');
  a('health', (await req('GET', '/health')).status === 200);
  const c = await req('POST', '/api/skills', { name: 'Product Search', category: 'search', description: 'Search product catalog' }, H); a('create', c.status === 201); const sid = c.data.data.skillId;
  const list = await req('GET', '/api/skills?category=search', null, H); a('list', list.data.data.count >= 1);
  const exec = await req('POST', `/api/skills/${sid}/execute`, { input: { query: 'laptop' } }, H); a('execute', exec.data.data.success === true);
  const analysis = await req('POST', '/api/skills', { name: 'Sentiment', category: 'analysis' }, H); const exec2 = await req('POST', `/api/skills/${analysis.data.data.skillId}/execute`, { input: { text: 'I love this!' } }, H); a('analysis output', exec2.data.data.output.sentiment === 'neutral');
  await teardown();
  console.log(`\nSkillOS: ${p} passed, ${f} failed`); process.exit(f > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
