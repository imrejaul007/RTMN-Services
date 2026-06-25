/**
 * @hojai/create — manifest generator.
 *
 * Writes the `.hojai/manifest.json` (project schema, machine-readable)
 * and `.hojai/capability.json` (CapabilityOS declaration) that the
 * HOJAI platform reads when the project joins a Nexha federation.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export async function writeManifest({ targetDir, name, template, agents, region, languages, files }) {
  const hojaiDir = path.join(targetDir, '.hojai');
  await fs.mkdir(hojaiDir, { recursive: true });

  const projectId = randomUUID();
  const hash = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 16);

  const manifest = {
    schemaVersion: '1.0.0',
    projectId,
    projectHash: hash,
    name,
    template,
    agents,
    region,
    languages,
    primaryLanguage: languages[0] || 'en',
    hojaiVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    sdkDependencies: [
      '@hojai/foundation',
      '@hojai/sutar',
      '@hojai/nexha',
      '@hojai/commerce',
      '@hojai/payment',
      '@hojai/logistics',
      '@hojai/reputation',
      '@hojai/discovery'
    ],
    entrypoints: {
      backend: 'apps/backend/src/index.ts',
      frontend: 'apps/frontend/app/page.tsx',
      mobile: 'apps/mobile/lib/main.dart'
    },
    scripts: {
      dev: 'npm run dev',
      build: 'npm run build',
      test: 'npm test',
      deploy: 'npx hojai deploy'
    },
    nexha: {
      enabled: true,
      federationEndpoint: 'https://nexha.hojai.ai/federation',
      capabilityDeclaration: '.hojai/capability.json'
    }
  };

  const capability = {
    schemaVersion: '1.0.0',
    projectId,
    layer: 2,
    name,
    description: `${name} — ${template} built with HOJAI Foundry.`,
    capabilities: agentsToCapabilities(agents),
    offers: [],
    seeks: [],
    regions: [region],
    languages,
    slaTargets: { uptimePercent: 99.5, responseMs: 500 }
  };

  await fs.writeFile(
    path.join(hojaiDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  );
  await fs.writeFile(
    path.join(hojaiDir, 'capability.json'),
    JSON.stringify(capability, null, 2) + '\n'
  );

  return { projectId, hash };
}

function agentsToCapabilities(agents) {
  const map = {
    CEO:          { id: 'hojai.orchestration',     name: 'Agent Orchestration', tier: 'core' },
    Sales:        { id: 'hojai.sales',             name: 'Sales & Quotation',  tier: 'business' },
    Marketing:    { id: 'hojai.marketing',         name: 'Marketing',          tier: 'business' },
    Procurement:  { id: 'hojai.procurement',       name: 'Procurement',        tier: 'business' },
    Finance:      { id: 'hojai.finance',           name: 'Finance & Payments', tier: 'core' },
    HR:           { id: 'hojai.hr',                name: 'Workforce & HR',     tier: 'business' },
    Operations:   { id: 'hojai.operations',        name: 'Operations',         tier: 'business' },
    Support:      { id: 'hojai.support',           name: 'Customer Support',   tier: 'business' },
    Logistics:    { id: 'hojai.logistics',         name: 'Logistics',          tier: 'business' },
    Dispatch:     { id: 'hojai.dispatch',          name: 'Dispatch',           tier: 'business' },
    Fleet:        { id: 'hojai.fleet',             name: 'Fleet Management',   tier: 'business' },
    Customer:     { id: 'hojai.customer',          name: 'Customer Relations', tier: 'business' },
    Reception:    { id: 'hojai.reception',         name: 'Reception',          tier: 'business' },
    Housekeeping: { id: 'hojai.housekeeping',      name: 'Housekeeping',       tier: 'business' },
    Revenue:      { id: 'hojai.revenue',           name: 'Revenue Management', tier: 'business' },
    'Front-of-house': { id: 'hojai.front-of-house', name: 'Front of House',    tier: 'business' },
    Kitchen:      { id: 'hojai.kitchen',           name: 'Kitchen',            tier: 'business' },
    Cashier:      { id: 'hojai.cashier',           name: 'Cashier',            tier: 'business' },
    Inventory:    { id: 'hojai.inventory',         name: 'Inventory',          tier: 'business' }
  };
  return agents.map(a => map[a] || { id: `hojai.${a.toLowerCase()}`, name: a, tier: 'business' });
}
