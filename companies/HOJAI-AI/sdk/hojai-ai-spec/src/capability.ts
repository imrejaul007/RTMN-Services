/**
 * Capability operations — read, write, validate.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { CapabilitySchema, type Capability } from './types.js';

const CAPABILITY_RELATIVE_PATH = '.hojai/capability.json';

export async function readCapability(projectDir: string): Promise<Capability> {
  const file = path.join(projectDir, CAPABILITY_RELATIVE_PATH);
  const raw = await fs.readFile(file, 'utf-8');
  return parseCapability(raw);
}

export async function writeCapability(projectDir: string, capability: Capability): Promise<string> {
  const file = path.join(projectDir, CAPABILITY_RELATIVE_PATH);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(capability, null, 2) + '\n');
  return file;
}

export function parseCapability(raw: string): Capability {
  const json = JSON.parse(raw);
  return validateCapability(json);
}

export function validateCapability(data: unknown): Capability {
  return CapabilitySchema.parse(data);
}

export function tryParseCapability(raw: string): { ok: true; capability: Capability } | { ok: false; error: string } {
  try {
    const json = JSON.parse(raw);
    return { ok: true, capability: validateCapability(json) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Map agent role names to Nexha capability ids.
 * Mirrors the mapping in create-hojai/manifest.js.
 */
const AGENT_TO_CAPABILITY: Record<string, { id: string; name: string; tier: 'core' | 'business' | 'support' }> = {
  CEO:              { id: 'hojai.orchestration', name: 'Agent Orchestration', tier: 'core' },
  Sales:            { id: 'hojai.sales',         name: 'Sales & Quotation',   tier: 'business' },
  Marketing:        { id: 'hojai.marketing',     name: 'Marketing',           tier: 'business' },
  Procurement:      { id: 'hojai.procurement',   name: 'Procurement',         tier: 'business' },
  Finance:          { id: 'hojai.finance',       name: 'Finance & Payments',  tier: 'core' },
  HR:               { id: 'hojai.hr',            name: 'Workforce & HR',      tier: 'business' },
  Operations:       { id: 'hojai.operations',    name: 'Operations',          tier: 'business' },
  Support:          { id: 'hojai.support',       name: 'Customer Support',    tier: 'business' },
  Logistics:        { id: 'hojai.logistics',     name: 'Logistics',           tier: 'business' },
  Dispatch:         { id: 'hojai.dispatch',      name: 'Dispatch',            tier: 'business' },
  Fleet:            { id: 'hojai.fleet',         name: 'Fleet Management',    tier: 'business' },
  Customer:         { id: 'hojai.customer',      name: 'Customer Relations',  tier: 'business' },
  Reception:        { id: 'hojai.reception',     name: 'Reception',           tier: 'business' },
  Housekeeping:     { id: 'hojai.housekeeping',  name: 'Housekeeping',        tier: 'business' },
  Revenue:          { id: 'hojai.revenue',       name: 'Revenue Management',  tier: 'business' },
  'Front-of-house': { id: 'hojai.front-of-house', name: 'Front of House',    tier: 'business' },
  Kitchen:          { id: 'hojai.kitchen',       name: 'Kitchen',             tier: 'business' },
  Cashier:          { id: 'hojai.cashier',       name: 'Cashier',             tier: 'business' },
  Inventory:        { id: 'hojai.inventory',     name: 'Inventory',           tier: 'business' }
};

export function agentsToCapabilities(agents: Array<{ role: string }>): Array<{ id: string; name: string; tier: 'core' | 'business' | 'support' }> {
  return agents.map(a => {
    const known = AGENT_TO_CAPABILITY[a.role];
    if (known) return known;
    return { id: `hojai.${a.role.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name: a.role, tier: 'business' as const };
  });
}
