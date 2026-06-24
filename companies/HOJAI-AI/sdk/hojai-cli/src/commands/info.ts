/**
 * `hojai info` — show a HOJAI project's full AI context.
 *
 * Reads the .hojai/manifest.json + capability.json + ai-spec manifest
 * and prints a single human-readable summary. Perfect for:
 *   - Quick context for an AI coding assistant
 *   - Debugging "what does this project actually have?"
 *   - Showing a new team member what the project is
 *
 * Exit code 0 on success, 1 if not a HOJAI project.
 */

import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { printError, printInfo, printSuccess, printTable, printWarn, header } from '../output.js';

interface ManifestSummary {
  name: string;
  type: string;
  industry?: string;
  region: string;
  languages: string;
  hojaiVersion: string;
  agents: string;
  integrations: string;
  stack: string;
  endpoints: string;
  createdAt: string;
}

interface CapabilitySummary {
  layer: string;
  capabilities: string;
  regions: string;
  languages: string;
  sla: string;
  nexusReady: string;
}

async function tryRead<T = any>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function runInfo(args: string[]): Promise<void> {
  const cwd = process.cwd();
  const json = args.includes('--json');
  const manifestPath = path.join(cwd, '.hojai', 'manifest.json');
  const capabilityPath = path.join(cwd, '.hojai', 'capability.json');
  const aiMdPath = path.join(cwd, 'hojai.ai.md');

  if (!existsSync(manifestPath)) {
    printError('Not a HOJAI project (no .hojai/manifest.json found).');
    printInfo('Run: hojai ai-spec generate');
    process.exit(1);
  }

  const manifest = await tryRead<any>(manifestPath);
  const capability = await tryRead<any>(capabilityPath);

  if (json) {
    console.log(JSON.stringify({ manifest, capability, aiMdPresent: existsSync(aiMdPath) }, null, 2));
    return;
  }

  // Human mode
  header(manifest.name || 'HOJAI project');
  const ms: ManifestSummary = {
    name: manifest.name,
    type: manifest.type,
    industry: manifest.industry || '—',
    region: manifest.region || '—',
    languages: (manifest.languages || []).join(', '),
    hojaiVersion: manifest.hojaiVersion,
    agents: `${(manifest.agents || []).length} (${(manifest.agents || []).map((a: any) => a.role).join(', ')})`,
    integrations: (manifest.integrations || []).join(', ') || '(none)',
    stack: manifest.stack ? Object.entries(manifest.stack).filter(([_, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ') : '—',
    endpoints: manifest.entrypoints ? Object.entries(manifest.entrypoints).filter(([_, v]) => v).map(([k, v]) => `${k}=${v}`).join(', ') : '—',
    createdAt: manifest.createdAt
  };
  printTable(Object.entries(ms).map(([key, value]) => ({ key, value })), ['key', 'value']);

  if (capability) {
    const cs: CapabilitySummary = {
      layer: capability.layer ? `${capability.layer}` : '—',
      capabilities: `${(capability.capabilities || []).length} (${(capability.capabilities || []).slice(0, 3).map((c: any) => c.id).join(', ')}${(capability.capabilities || []).length > 3 ? ', …' : ''})`,
      regions: (capability.regions || []).join(', ') || '—',
      languages: (capability.languages || []).join(', ') || '—',
      sla: capability.slaTargets ? `${capability.slaTargets.uptimePercent || '?'}% / ${capability.slaTargets.responseMs || '?'}ms` : '—',
      nexusReady: existsSync(aiMdPath) ? '✓' : '✗ (no hojai.ai.md)'
    };
    console.log('');
    printInfo('Nexha Federation:');
    printTable(Object.entries(cs).map(([key, value]) => ({ key, value })), ['key', 'value']);
  }

  console.log('');
  if (existsSync(aiMdPath)) {
    printSuccess('hojai.ai.md present — AI coding assistants can read this project');
  } else {
    printWarn('hojai.ai.md missing — AI tools won\'t be able to understand this project');
    printInfo('Run: hojai ai-spec generate');
  }

  // Quick actions
  console.log('');
  printInfo('Quick actions:');
  console.log('  hojai deploy                 # ship the project');
  console.log('  hojai add agent <Name>       # add a new SUTAR agent');
  console.log('  hojai add integration <n>   # add an @hojai/* SDK');
  console.log('  hojai ai-spec validate      # validate the spec');
}
