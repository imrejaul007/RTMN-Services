// Set env BEFORE importing app so the URL and PORT are captured correctly
process.env.SALAR_URL = 'http://localhost:19999';
process.env.SALAR_CLIENT_PORT = '18993'; // free test port (not 8200)
process.env.NODE_ENV = 'test';
const { app } = await import('../src/index.js');
const PORT = 18993;
let server;
async function setup() { await new Promise(r => { server = app.listen(PORT, r); }); }
async function teardown() { if (server) server.close(); }
async function req(m, p, b, h = {}) { const r = await fetch(`http://localhost:${PORT}${p}`, { method: m, headers: { 'content-type': 'application/json', ...h }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, data: await r.json().catch(() => ({})) }; }
let p = 0, f = 0; const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };
async function run() {
  await setup();
  console.log('\nsalar-client tests:');
  a('client health', (await req('GET', '/health')).status === 200);
  a('client proxy target exposed', (await req('GET', '/health')).data.data.proxyTarget);
  const upstream = await req('GET', '/api/listings');
  a('proxy returns 502 when upstream unreachable', upstream.status === 502);
  await teardown();
  console.log(`\nsalar-client: ${p} passed, ${f} failed`); process.exit(f > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
