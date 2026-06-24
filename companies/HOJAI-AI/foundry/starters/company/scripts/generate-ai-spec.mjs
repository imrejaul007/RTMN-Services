#!/usr/bin/env node
/**
 * Generate the 3 AI-native spec files for this project using @hojai/ai-spec.
 *
 *   hojai.ai.md             — AI tools read this first
 *   .hojai/manifest.json    — machine-readable project schema
 *   .hojai/capability.json  — Nexha federation profile
 *
 * Run from the project root: `node scripts/generate-ai-spec.mjs`
 *
 * When published, swap the import for `@hojai/ai-spec`.
 */

import { generateAndWrite } from '../../../../sdk/hojai-ai-spec/dist/index.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(here, '..');

const { manifest, capability } = await generateAndWrite(projectDir, {
  type: 'company',
  region: 'global',
  languages: ['en'],
  industry: 'autonomous-company',
  layer: 8, // Company Builder
  agents: [
    { role: 'CEO', purpose: 'Orchestrator. Routes work across departments and tracks KPIs.' },
    { role: 'Sales', purpose: 'CRM. Lead capture, qualification, pipeline, forecasting.' },
    { role: 'Marketing', purpose: 'Brand, campaigns, audiences, content, SEO.' },
    { role: 'HR', purpose: 'Recruiting, onboarding, performance, payroll.' },
    { role: 'Finance', purpose: 'Chart of accounts, ledger, invoicing, AP/AR.' },
    { role: 'Operations', purpose: 'Projects, processes, incidents, risks, SOPs.' },
    { role: 'CXO', purpose: 'Executive KPIs, strategic pillars, board reports.' }
  ]
});

console.log(`✓ Generated AI-native spec for "${manifest.name}"`);
console.log(`  Layer ${capability.layer} (${capability.name})`);
console.log(`  ${capability.capabilities.length} capabilities declared`);
console.log(`  3 files written: hojai.ai.md + .hojai/manifest.json + .hojai/capability.json`);
