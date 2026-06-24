/**
 * Introspection — auto-fill a Manifest from a project's package.json.
 *
 * Detects:
 *   - name, description, version
 *   - HOJAI SDK deps (any @hojai/*)
 *   - language (primary)
 *   - starter type (best-guess from name or description)
 *
 * Heuristic, not magic — the user should review + extend the result.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { agentsToCapabilities } from './capability.js';
import type { Manifest, Capability, StarterType, Language } from './types.js';

export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  type?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  keywords?: string[];
}

export interface IntrospectOptions {
  /** Override detected project type */
  type?: StarterType;
  /** Override detected region */
  region?: Manifest['region'];
  /** Override detected languages */
  languages?: Language[];
  /** Manually provide agents if the introspector can't detect them */
  agents?: Array<{ role: string; purpose: string; file?: string }>;
  /** Manually provide industry */
  industry?: string;
  /** HOJAI platform-as-an-economy layer (1-9) */
  layer?: number;
}

const HOJAI_PACKAGES = new Set([
  'foundation', 'sutar', 'nexha', 'marketplace', 'commerce', 'payment',
  'logistics', 'reputation', 'discovery', 'genie', 'industry',
  'department', 'memory', 'twin', 'skills', 'media', 'cli', 'ai-spec'
]);

const TYPE_HINTS: Array<{ pattern: RegExp; type: StarterType }> = [
  { pattern: /marketplace|store|shop|buyer|seller|catalog/i, type: 'marketplace' },
  { pattern: /b2b|wholesale|rfq|quote|supplier|trader/i,          type: 'b2b' },
  { pattern: /hotel|booking|guest|room/i,                          type: 'hotel' },
  { pattern: /restaurant|menu|kitchen|table|dish/i,               type: 'restaurant' },
  { pattern: /logistics|delivery|dispatch|fleet|driver|shipment/i, type: 'logistics' },
  { pattern: /crm|lead|pipeline|customer.*360/i,                   type: 'crm' },
  { pattern: /erp|inventory|procurement|accounting|gl|ap.*ar/i,    type: 'erp' },
  { pattern: /pos|point.of.sale|register|barcode|checkout/i,        type: 'pos' },
  { pattern: /sdk|client|library|@hojai/i,                          type: 'sdk' }
];

const DEFAULT_AGENT_PRESETS: Partial<Record<StarterType, Array<{ role: string; purpose: string }>>> = {
  marketplace: [
    { role: 'CEO', purpose: 'Orchestrator. Routes work to other agents.' },
    { role: 'Sales', purpose: 'Quotation. RFQ processing, quote generation.' },
    { role: 'Procurement', purpose: 'Sourcing. Supplier discovery.' },
    { role: 'Finance', purpose: 'Money. Invoicing, escrow, payments.' },
    { role: 'Support', purpose: 'Customer service. Tickets, disputes.' }
  ],
  b2b: [
    { role: 'CEO', purpose: 'Orchestrator.' },
    { role: 'Sales', purpose: 'Quotation.' },
    { role: 'Procurement', purpose: 'Sourcing.' },
    { role: 'Finance', purpose: 'Trade finance, escrow.' },
    { role: 'Logistics', purpose: 'Shipping, tracking.' },
    { role: 'Support', purpose: 'Customer service.' }
  ],
  company: [
    { role: 'CEO', purpose: 'Orchestrator.' },
    { role: 'Sales', purpose: 'CRM, pipeline, forecasting.' },
    { role: 'Marketing', purpose: 'Campaigns, content.' },
    { role: 'HR', purpose: 'Recruiting, payroll, performance.' },
    { role: 'Finance', purpose: 'Accounting, FP&A.' },
    { role: 'Operations', purpose: 'Processes, projects, incidents.' }
  ],
  hotel: [
    { role: 'CEO', purpose: 'Orchestrator.' },
    { role: 'Reception', purpose: 'Bookings, check-in/out.' },
    { role: 'Housekeeping', purpose: 'Room status, cleaning.' },
    { role: 'Revenue', purpose: 'Pricing, occupancy.' }
  ],
  restaurant: [
    { role: 'CEO', purpose: 'Orchestrator.' },
    { role: 'Front-of-house', purpose: 'Reservations, orders, service.' },
    { role: 'Kitchen', purpose: 'KOT, prep, plating.' },
    { role: 'Procurement', purpose: 'Ingredients, suppliers.' },
    { role: 'Finance', purpose: 'POS, daily P&L.' }
  ],
  logistics: [
    { role: 'CEO', purpose: 'Orchestrator.' },
    { role: 'Dispatch', purpose: 'Order assignment.' },
    { role: 'Fleet', purpose: 'Vehicle management.' },
    { role: 'Customer', purpose: 'Tracking, notifications.' },
    { role: 'Finance', purpose: 'Settlement, invoicing.' }
  ],
  crm: [
    { role: 'CEO', purpose: 'Orchestrator.' },
    { role: 'Sales', purpose: 'Pipeline, forecasting.' },
    { role: 'Support', purpose: 'Tickets, CSAT.' },
    { role: 'Marketing', purpose: 'Campaigns, attribution.' }
  ],
  erp: [
    { role: 'CEO', purpose: 'Orchestrator.' },
    { role: 'Procurement', purpose: 'Sourcing, POs.' },
    { role: 'Finance', purpose: 'AP/AR, GL.' },
    { role: 'Operations', purpose: 'Inventory, fulfillment.' },
    { role: 'HR', purpose: 'Workforce.' }
  ],
  pos: [
    { role: 'CEO', purpose: 'Orchestrator.' },
    { role: 'Cashier', purpose: 'Transactions.' },
    { role: 'Inventory', purpose: 'Stock sync.' },
    { role: 'Finance', purpose: 'Reconciliation.' }
  ]
};

/** Detect HOJAI packages in deps */
function detectHojaiIntegrations(pkg: PackageJson): string[] {
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  return Object.keys(allDeps)
    .filter(name => name.startsWith('@hojai/'))
    .map(name => name.replace('@hojai/', ''))
    .filter(short => HOJAI_PACKAGES.has(short));
}

function detectType(pkg: PackageJson, hint?: StarterType): StarterType {
  if (hint) return hint;
  if (pkg.keywords) {
    for (const kw of pkg.keywords) {
      for (const { pattern, type } of TYPE_HINTS) {
        if (pattern.test(kw)) return type;
      }
    }
  }
  const text = `${pkg.name ?? ''} ${pkg.description ?? ''}`;
  for (const { pattern, type } of TYPE_HINTS) {
    if (pattern.test(text)) return type;
  }
  // Default by structure
  if (Object.keys(pkg.dependencies ?? {}).some(d => d.startsWith('@hojai/'))) return 'sdk';
  return 'other';
}

function detectStack(pkg: PackageJson): Manifest['stack'] {
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  const has = (k: string) => !!all[k];
  const stack: Manifest['stack'] = {};
  if (has('express')) stack.backend = 'node-express-typescript';
  else if (has('fastify')) stack.backend = 'node-fastify-typescript';
  else if (has('@nestjs/core')) stack.backend = 'nestjs-typescript';
  if (has('next')) stack.frontend = 'nextjs-app-router';
  else if (has('react')) stack.frontend = 'react-vite';
  if (has('mongodb') || has('mongoose')) stack.database = 'mongodb';
  else if (has('pg') || has('postgres')) stack.database = 'postgresql';
  if (Object.keys(all).some(d => d.startsWith('@hojai/sutar'))) stack.ai = 'sutar';
  else if (Object.keys(all).some(d => d.startsWith('@hojai/'))) stack.ai = 'hojai-sdk';
  return Object.keys(stack).length > 0 ? stack : undefined;
}

/**
 * Read package.json and return a fully-formed Manifest.
 * Caller is expected to add the capability separately.
 */
export async function generateManifestFromPackageJson(
  projectDir: string,
  options: IntrospectOptions = {}
): Promise<Manifest> {
  const pkgPath = path.join(projectDir, 'package.json');
  const raw = await fs.readFile(pkgPath, 'utf-8');
  const pkg = JSON.parse(raw) as PackageJson;

  const type = detectType(pkg, options.type);
  const integrations = detectHojaiIntegrations(pkg);
  const agents = options.agents ?? DEFAULT_AGENT_PRESETS[type] ?? [];
  const languages: Language[] = options.languages ?? ['en'];

  return {
    schemaVersion: '1.0.0',
    projectId: randomUUID(),
    name: pkg.name ?? path.basename(projectDir),
    description: pkg.description,
    type,
    industry: options.industry,
    region: options.region ?? 'global',
    languages,
    primaryLanguage: languages[0],
    hojaiVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    stack: detectStack(pkg),
    agents: agents.map(a => ({ role: a.role, purpose: a.purpose })),
    integrations,
    scripts: pkg.scripts ? {
      dev: pkg.scripts.dev,
      build: pkg.scripts.build,
      test: pkg.scripts.test,
      lint: pkg.scripts.lint
    } : undefined
  };
}

/** Generate a Capability document from a manifest. */
export function generateCapabilityFromManifest(manifest: Manifest, options: IntrospectOptions = {}): Capability {
  return {
    schemaVersion: '1.0.0',
    projectId: manifest.projectId,
    layer: options.layer,
    name: manifest.name,
    description: manifest.description,
    capabilities: agentsToCapabilities(manifest.agents as Array<{ role: string }>).map(c => ({ ...c, type: 'offer' as const })),
    regions: manifest.region ? [manifest.region] : undefined,
    languages: manifest.languages,
    slaTargets: { uptimePercent: 99.5, responseMs: 500 }
  };
}

/**
 * One-call helper: read package.json, generate both files, write them.
 */
export async function generateAndWrite(projectDir: string, options: IntrospectOptions = {}): Promise<{
  manifest: Manifest;
  capability: Capability;
}> {
  const manifest = await generateManifestFromPackageJson(projectDir, options);
  const capability = generateCapabilityFromManifest(manifest, options);
  const { writeProjectContext } = await import('./writer.js');
  await writeProjectContext(projectDir, manifest, capability);
  return { manifest, capability };
}
