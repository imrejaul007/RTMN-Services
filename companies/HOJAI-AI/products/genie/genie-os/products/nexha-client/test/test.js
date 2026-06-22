// Set env BEFORE importing app so the URL and PORT are captured correctly
process.env.NEXHA_URL = 'http://localhost:19997';
process.env.NEXHA_CLIENT_PORT = '18992'; // free test port (not 8190)
process.env.NODE_ENV = 'test';
const { app } = await import('../src/index.js');
const PORT = 18992;
let server;
async function setup() { await new Promise(r => { server = app.listen(PORT, r); }); }
async function teardown() { if (server) server.close(); }
async function req(m, p, b, h = {}) { const r = await fetch(`http://localhost:${PORT}${p}`, { method: m, headers: { 'content-type': 'application/json', ...h }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, data: await r.json().catch(() => ({})) }; }
let p = 0, f = 0; const a = (n, c) => { if (c) { p++; console.log(`  ✓ ${n}`); } else { f++; console.log(`  ✗ ${n}`); } };
async function run() {
  await setup();
  console.log('\nnexha-client tests:');
  a('client health', (await req('GET', '/health')).status === 200);
  a('client proxy target exposed', (await req('GET', '/health')).data.data.proxyTarget);
  const upstream = await req('GET', '/api/suppliers');
  a('proxy returns 502 when upstream unreachable', upstream.status === 502);
  await teardown();
  console.log(`\nnexha-client: ${p} passed, ${f} failed`); process.exit(f > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
