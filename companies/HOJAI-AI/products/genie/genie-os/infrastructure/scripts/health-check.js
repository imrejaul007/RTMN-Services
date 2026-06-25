#!/usr/bin/env node
const SERVICES = [
  // genie-os owned
  { name: 'corpid',         port: 7001, layer: 'Foundation (genie-os)' },
  { name: 'twinos',         port: 7002, layer: 'Foundation (genie-os)' },
  { name: 'memoryos',       port: 7003, layer: 'Foundation (genie-os)' },
  { name: 'goalos',         port: 7004, layer: 'Foundation (genie-os)' },
  { name: 'policyos',       port: 7005, layer: 'Foundation (genie-os)' },
  { name: 'skillos',        port: 7006, layer: 'Foundation (genie-os)' },
  { name: 'flowos',         port: 7007, layer: 'Foundation (genie-os)' },
  { name: 'genie',          port: 7100, layer: 'AI Runtime (genie-os)' },
  { name: 'sutar',          port: 7200, layer: 'AI Runtime (genie-os)' },
  { name: 'agentos',         port: 7300, layer: 'AI Runtime (genie-os)' },
  { name: 'planning-engine', port: 7301, layer: 'AI Runtime (genie-os)' },
  { name: 'do-client',      port: 8090, layer: 'Thin Client (genie-os → RTMN/do-app)' },
  { name: 'nexha-client',   port: 8190, layer: 'Thin Client (genie-os → RTMN/Nexha)' },
  { name: 'salar-client',   port: 8290, layer: 'Thin Client (genie-os → HOJAI-AI/salar)' },
  { name: 'web',            port: 3000, layer: 'Frontend (genie-os)', path: '/api/health' },
  // External (genie-os doesn't own, but useful to check)
  { name: 'DO backend',         port: 3001, layer: 'External (RTMN/do-app)' },
  { name: 'Nexha commerce-id',  port: 8000, layer: 'External (RTMN/Nexha)' },
  { name: 'HOJAI genie-gateway', port: 4701, layer: 'External (HOJAI-AI/products/genie)' },
];

async function check(port, path = '/health') {
  try {
    const r = await fetch(`http://localhost:${port}${path}`, { signal: AbortSignal.timeout(2000) });
    if (r.ok) { const d = await r.json().catch(() => ({})); return { ok: true, data: d }; }
    return { ok: false };
  } catch { return { ok: false }; }
}

const layers = {};
let up = 0, down = 0;
for (const svc of SERVICES) {
  if (!layers[svc.layer]) layers[svc.layer] = [];
  const r = await check(svc.port, svc.path || '/health');
  if (r.ok) up++; else down++;
  layers[svc.layer].push({ ...svc, ok: r.ok });
}

console.log('\n🏥 HOJAI Ecosystem Health\n');
for (const [layer, svcs] of Object.entries(layers)) {
  console.log(`\n${layer}:`);
  for (const s of svcs) {
    console.log(`  ${s.ok ? '✅' : '❌'} ${s.name.padEnd(25)} :${s.port}`);
  }
}
console.log(`\n📊 ${up}/${SERVICES.length} services healthy${down > 0 ? `, ${down} down` : ''}\n`);
