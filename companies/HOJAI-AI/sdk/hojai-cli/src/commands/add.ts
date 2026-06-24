/**
 * `hojai add` — extend a HOJAI project with a new SUTAR agent or SDK integration.
 *
 * Subcommands:
 *   hojai add agent <Name>              # adds a stub SUTAR agent to agents/index.js
 *   hojai add integration <hojai-name>  # adds @hojai/<name> to package.json + manifest
 *
 * Both require the project to be a HOJAI project (have .hojai/manifest.json).
 * Both mutate files in place and report what changed.
 */

import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { printError, printInfo, printSuccess, printWarn } from '../output.js';

/** Known @hojai/* packages for the `add integration` subcommand. */
const KNOWN_PACKAGES = [
  'foundation', 'sutar', 'nexha', 'marketplace', 'commerce', 'payment',
  'logistics', 'reputation', 'discovery', 'genie', 'industry',
  'department', 'memory', 'twin', 'skills', 'media', 'ai-spec', 'razor'
];

async function loadManifest(cwd: string): Promise<any> {
  const p = path.join(cwd, '.hojai', 'manifest.json');
  if (!existsSync(p)) {
    printError('Not a HOJAI project. Run: hojai ai-spec generate');
    process.exit(1);
  }
  return JSON.parse(await fs.readFile(p, 'utf-8'));
}

function readFlag(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i === -1) return undefined;
  return args[i + 1];
}

function toIdentifier(s: string): string {
  // e.g. "Sales Manager" → "SalesManager"
  return s.replace(/[^A-Za-z0-9]/g, '').replace(/^./, c => c.toUpperCase());
}

function toCamel(s: string): string {
  return s.replace(/[^A-Za-z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^./, c => c.toLowerCase());
}

async function addAgent(cwd: string, name: string, purpose?: string): Promise<void> {
  const agentsFile = path.join(cwd, 'apps', 'backend', 'src', 'agents', 'index.js');
  if (!existsSync(agentsFile)) {
    printError(`No agents file at ${agentsFile}. Run from a HOJAI starter project root.`);
    process.exit(1);
  }
  const existing = await fs.readFile(agentsFile, 'utf-8');
  if (existing.includes(`name: "${name}"`)) {
    printWarn(`Agent "${name}" already exists in ${agentsFile}`);
    return;
  }

  const identifier = toIdentifier(name);
  const fnName = `${toCamel(name)}Run`;
  const stubPurpose = purpose || `${name} agent. Replace this description with the real purpose.`;

  // Find the AGENTS array + insert a new entry, then add a stub function
  const agentEntry = `  { name: "${name}", description: "${stubPurpose}", run: ${fnName} },\n`;

  // Insert into the AGENTS array (right before the closing '];')
  const arrayCloseIdx = existing.lastIndexOf('];');
  if (arrayCloseIdx === -1) {
    printError('Could not find AGENTS array in agents/index.js — not a standard starter.');
    process.exit(1);
  }
  let updated = existing.slice(0, arrayCloseIdx) + agentEntry + existing.slice(arrayCloseIdx);

  // Append a stub function at the end of the file
  const stubFn = `\n\nfunction ${fnName}(body = {}) {\n  return { agent: "${name}", received: body, message: 'Stub response. Wire to a real @hojai/sutar BaseAgent.' };\n}\n`;
  updated += stubFn;

  await fs.writeFile(agentsFile, updated);
  printSuccess(`Added agent "${name}" to ${agentsFile}`);
  printInfo(`Stub function: ${fnName}()`);
  printInfo(`Restart the dev server to see it at /api/agents`);

  // Also add to manifest.json agents list
  const manifestPath = path.join(cwd, '.hojai', 'manifest.json');
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    if (!manifest.agents) manifest.agents = [];
    if (!manifest.agents.some((a: any) => a.role === name)) {
      manifest.agents.push({ role: name, purpose: stubPurpose });
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      printInfo(`Updated ${manifestPath} with new agent`);
    }
  }
}

async function addIntegration(cwd: string, name: string): Promise<void> {
  // 1. Add to package.json
  const pkgPath = path.join(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    printError('No package.json found.');
    process.exit(1);
  }
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
  const depName = `@hojai/${name}`;
  const depVersion = '^1.0.0';
  pkg.optionalDependencies = pkg.optionalDependencies || {};
  if (pkg.optionalDependencies[depName]) {
    printWarn(`${depName} already in optionalDependencies`);
  } else {
    pkg.optionalDependencies[depName] = depVersion;
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    printSuccess(`Added ${depName}@${depVersion} to optionalDependencies`);
  }
  printInfo(`Run: npm install to install the new SDK`);

  // 2. Update manifest.json integrations list
  const manifestPath = path.join(cwd, '.hojai', 'manifest.json');
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    if (!manifest.integrations) manifest.integrations = [];
    if (!manifest.integrations.includes(name)) {
      manifest.integrations.push(name);
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      printSuccess(`Updated ${manifestPath} with integration: ${name}`);
    }
  }

  // 3. If we know the package, print a usage hint
  if (KNOWN_PACKAGES.includes(name)) {
    printInfo(`Usage: import { ${capitalize(toCamel(name.replace(/-/g, ' ')))} } from '@hojai/${name}';`);
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function runAdd(args: string[]): Promise<void> {
  const cwd = process.cwd();
  const sub = args[0];

  if (!sub || sub === 'help' || args.includes('--help') || args.includes('-h')) {
    printInfo('hojai add — extend a HOJAI project with a new SUTAR agent or SDK');
    console.log(`
Subcommands:
  hojai add agent <Name> [--purpose "..."]     Add a stub SUTAR agent
  hojai add integration <hojai-name>            Add an @hojai/* SDK to package.json

Examples:
  hojai add agent "Sales Coach"
  hojai add agent "Procurement" --purpose "Source suppliers, negotiate POs"
  hojai add integration payment
  hojai add integration nexha
`);
    return;
  }

  if (sub === 'agent') {
    const name = args[1];
    if (!name) {
      printError('Usage: hojai add agent <Name>');
      process.exit(1);
    }
    const purpose = readFlag(args, '--purpose');
    await addAgent(cwd, name, purpose);
    return;
  }

  if (sub === 'integration') {
    const name = args[1];
    if (!name) {
      printError('Usage: hojai add integration <hojai-name>  (e.g. "payment", "nexha")');
      process.exit(1);
    }
    await addIntegration(cwd, name);
    return;
  }

  printError(`Unknown subcommand: ${sub}. Try: hojai add help`);
  process.exit(1);
}
