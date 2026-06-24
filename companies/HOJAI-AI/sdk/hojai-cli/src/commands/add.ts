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

/** Valid industry keys for the `add industry <type>` subcommand. */
const VALID_INDUSTRIES = [
  'restaurant', 'hotel', 'healthcare', 'retail', 'legal', 'education',
  'agriculture', 'automotive', 'beauty', 'fashion', 'fitness', 'gaming',
  'government', 'home-services', 'manufacturing', 'non-profit', 'professional',
  'sports', 'travel', 'entertainment', 'construction', 'financial', 'real-estate', 'transport'
];

/**
 * Add an industry to the current HOJAI project.
 *
 * Wires up:
 *   - @hojai/industry SDK in package.json
 *   - apps/backend/src/routes/industry/<type>.js (Express router with stub endpoints)
 *   - app.use('/api/<type>', ...) wire in apps/backend/src/index.js
 *   - .hojai/manifest.json updates (adds the industry name to integrations)
 */
async function addIndustry(cwd: string, type: string): Promise<void> {
  // 1. Validate the industry type
  if (!VALID_INDUSTRIES.includes(type)) {
    printError(`Unknown industry: ${type}`);
    printInfo(`Valid types: ${VALID_INDUSTRIES.join(', ')}`);
    process.exit(1);
  }

  // 2. Add @hojai/industry to package.json (if not present)
  const pkgPath = path.join(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
    pkg.optionalDependencies = pkg.optionalDependencies || {};
    if (!pkg.optionalDependencies['@hojai/industry']) {
      pkg.optionalDependencies['@hojai/industry'] = '^1.0.0';
      await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      printSuccess(`Added @hojai/industry to optionalDependencies`);
    } else {
      printInfo(`@hojai/industry already in package.json`);
    }
  }

  // 3. Create apps/backend/src/routes/industry/<type>.js
  const routesDir = path.join(cwd, 'apps', 'backend', 'src', 'routes', 'industry');
  await fs.mkdir(routesDir, { recursive: true });
  const routeFile = path.join(routesDir, `${type}.js`);
  if (existsSync(routeFile)) {
    printWarn(`${routeFile} already exists, skipping`);
  } else {
    const routeContent = `/**
 * ${type} industry routes.
 *
 * Auto-generated by \`hojai add industry ${type}\`.
 * Wires up @hojai/industry for the ${type} sub-client.
 */

import { Router } from 'express';
import { Industry } from '@hojai/industry';

const router = Router();
const ind = new Industry({ baseUrl: process.env.HOJAI_BASE_URL || 'http://localhost:4399' });

/**
 * GET /api/${type}/health
 * Quick health check for this industry.
 */
router.get('/health', (_req, res) => res.json({ status: 'ok', industry: '${type}' }));

/**
 * GET /api/${type}/list
 * Generic list endpoint — forwards to @hojai/industry.${type}.list*()
 */
router.get('/list', async (req, res, next) => {
  try {
    // Adjust this to call the specific @hojai/industry.${type} method
    // (e.g. ind.restaurant.listMenu(), ind.hotel.listRooms(), etc.)
    res.json({ items: [], industry: '${type}' });
  } catch (e) { next(e); }
});

/**
 * GET /api/${type}/:id
 * Get one item by id.
 */
router.get('/:id', async (req, res, next) => {
  try {
    res.json({ id: req.params.id, industry: '${type}' });
  } catch (e) { next(e); }
});

export default router;
`;
    await fs.writeFile(routeFile, routeContent);
    printSuccess(`Created ${routeFile}`);
  }

  // 4. Wire it into apps/backend/src/index.js
  const indexFile = path.join(cwd, 'apps', 'backend', 'src', 'index.js');
  if (existsSync(indexFile)) {
    const idx = await fs.readFile(indexFile, 'utf-8');
    // 1. Add the import
    const importLine = `import ${type}Routes from './routes/industry/${type}.js';`;
    if (!idx.includes(importLine)) {
      // Insert after the first import block
      const lastImportIdx = idx.lastIndexOf('import ');
      const importEnd = idx.indexOf('\n', lastImportIdx) + 1;
      let updated = idx.slice(0, importEnd) + importLine + '\n' + idx.slice(importEnd);
      // 2. Add the app.use() line after the last app.use() line
      const lastAppUse = updated.lastIndexOf('app.use(');
      if (lastAppUse !== -1) {
        const useLineEnd = updated.indexOf('\n', lastAppUse) + 1;
        updated = updated.slice(0, useLineEnd) + `app.use('/api/${type}', ${type}Routes);\n` + updated.slice(useLineEnd);
      }
      await fs.writeFile(indexFile, updated);
      printSuccess(`Wired ${type} into ${indexFile}`);
    } else {
      printInfo(`${type} already wired in ${indexFile}`);
    }
  } else {
    printWarn(`No ${indexFile} found — wire the route manually: app.use('/api/${type}', ${type}Routes);`);
  }

  // 5. Update .hojai/manifest.json
  const manifestPath = path.join(cwd, '.hojai', 'manifest.json');
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    if (!manifest.integrations) manifest.integrations = [];
    if (!manifest.integrations.includes('industry')) {
      manifest.integrations.push('industry');
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      printSuccess(`Updated manifest with industry integration`);
    }
  }

  // 6. Print usage hint
  console.log('');
  printInfo('Next steps:');
  console.log(`  1. Run: npm install  (to install @hojai/industry)`);
  console.log(`  2. Edit apps/backend/src/routes/industry/${type}.js to call real @hojai/industry.${type} methods`);
  console.log(`  3. Restart: npm run dev`);
  console.log(`  4. Test: curl http://localhost:3001/api/${type}/health`);
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
  hojai add industry <type>                     Wire a vertical industry (e.g. restaurant, hotel)

Examples:
  hojai add agent "Sales Coach"
  hojai add agent "Procurement" --purpose "Source suppliers, negotiate POs"
  hojai add integration payment
  hojai add integration nexha
  hojai add industry restaurant
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

  if (sub === 'industry') {
    const type = args[1];
    if (!type) {
      printError('Usage: hojai add industry <type>  (e.g. "restaurant", "hotel", "fitness")');
      process.exit(1);
    }
    await addIndustry(cwd, type);
    return;
  }

  printError(`Unknown subcommand: ${sub}. Try: hojai add help`);
  process.exit(1);
}
