#!/usr/bin/env node
/**
 * Generate All Industry Extensions
 */

const fs = require('fs');
const path = require('path');

const BASE = '/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/company-os/industry-extensions';

const EXTENSIONS = [
  { name: 'realestate', port: 5230, modules: ['properties', 'listings', 'leads', 'viewings'] },
  { name: 'manufacturing', port: 5150, modules: ['production', 'inventory', 'quality', 'compliance'] },
  { name: 'fitness', port: 5110, modules: ['members', 'classes', 'trainers', 'subscriptions'] },
  { name: 'legal', port: 5035, modules: ['cases', 'clients', 'documents', 'billing'] },
  { name: 'construction', port: 5210, modules: ['projects', 'contractors', 'materials', 'payments'] },
  { name: 'automotive', port: 5080, modules: ['vehicles', 'service', 'inventory', 'customers'] },
  { name: 'logistics', port: 5240, modules: ['shipments', 'routes', 'drivers', 'warehouses'] },
  { name: 'fashion', port: 5095, modules: ['catalog', 'orders', 'inventory', 'collections'] },
  { name: 'sports', port: 5180, modules: ['teams', 'matches', 'players', 'tickets'] },
  { name: 'entertainment', port: 5200, modules: ['events', 'tickets', 'venues', 'bookings'] },
  { name: 'travel', port: 5190, modules: ['bookings', 'destinations', 'packages', 'customers'] },
  { name: 'government', port: 5130, modules: ['citizens', 'services', 'permits', 'complaints'] },
  { name: 'agriculture', port: 5070, modules: ['farms', 'crops', 'inventory', 'sales'] },
  { name: 'nonprofit', port: 5160, modules: ['donors', 'campaigns', 'beneficiaries', 'volunteers'] },
  { name: 'professional', port: 5170, modules: ['clients', 'projects', 'invoices', 'tasks'] },
  { name: 'home_services', port: 5140, modules: ['bookings', 'technicians', 'services', 'customers'] },
  { name: 'gaming', port: 5120, modules: ['players', 'matches', 'tournaments', 'leaderboards'] },
  { name: 'media', port: 5600, modules: ['content', 'creators', 'campaigns', 'analytics'] },
  { name: 'events', port: 4751, modules: ['events', 'venues', 'tickets', 'attendees'] },
  { name: 'exhibitions', port: 5040, modules: ['exhibitions', 'stalls', 'exhibitors', 'visitors'] },
];

function generateId(prefix) {
  return prefix + '_' + Math.random().toString(36).substring(2, 10);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateExtension(ext) {
  const dir = path.join(BASE, ext.name);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });

  // manifest.yaml
  const modulesYaml = ext.modules.map(m => `  - id: ${m}\n    name: ${capitalize(m)}\n    routes: [GET/POST /api/${m}, GET /api/${m}/:id]`).join('\n');
  fs.writeFileSync(path.join(dir, 'manifest.yaml'), `# ${capitalize(ext.name)} Extension
id: ${ext.name}
name: ${capitalize(ext.name)} Extension
version: 1.0.0
port: ${ext.port}
industry: ${ext.name}
verticalityScore: 0.80
verticalModules:
${modulesYaml}
`);

  // src/index.ts
  const modulesInterfaces = ext.modules.map(m => `${m}: Map<string,any>`).join('; ');
  const modulesInit = ext.modules.map(m => `${m}: new Map()`).join(', ');

  const routes = ext.modules.map(m => {
    const prefix = m.substring(0, 4);
    return `
app.get('/api/${m}', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ ${m}: Array.from(getStore(tid).${m}.values()) });
});
app.post('/api/${m}', (req, res) => {
  const tid = req.headers['x-tenant-id'];
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const item = { id: generateId('${prefix}'), tenantId: tid, ...req.body };
  getStore(tid).${m}.set(item.id, item);
  res.status(201).json(item);
});`;
  }).join('\n');

  fs.writeFileSync(path.join(dir, 'src/index.ts'), `/**
 * ${capitalize(ext.name)} Extension
 */
import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || ${ext.port};
interface Store { ${modulesInterfaces} }
const stores = new Map();
const getStore = (tid) => {
  if (!stores.has(tid)) stores.set(tid, { ${modulesInit} });
  return stores.get(tid);
};
${routes}
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: '${ext.name}-extension', port: PORT }));
app.listen(PORT, () => console.log('${capitalize(ext.name)} Extension running on port', PORT));
export default app;
`);

  // package.json
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    name: `@hojai/${ext.name}-extension`,
    version: '1.0.0',
    main: 'src/index.ts',
    scripts: { start: 'ts-node src/index.ts' },
    dependencies: { express: '^4.18.2' },
    devDependencies: { typescript: '^5.1.6', 'ts-node': '^10.9.1' }
  }, null, 2));

  console.log(`Created ${ext.name} (port ${ext.port})`);
}

EXTENSIONS.forEach(generateExtension);
console.log(`\nDone! Created ${EXTENSIONS.length} extensions.`);
