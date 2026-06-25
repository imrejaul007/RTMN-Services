/**
 * @hojai/create — `add` commands.
 *
 * `npx hojai add agent <name>`        — add a SUTAR agent stub
 * `npx hojai add integration <name>`  — add a placeholder REST route
 *
 * Both commands work on a scaffolded HOJAI project (must have
 * .hojai/manifest.json). They mutate the project in place.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import kleur from 'kleur';

async function loadManifest(projectDir) {
  const p = path.join(projectDir, '.hojai', 'manifest.json');
  try { return JSON.parse(await fs.readFile(p, 'utf8')); }
  catch { return null; }
}

// ── add agent ──────────────────────────────────────────────────────────
//
// Inserts a new agent function into apps/backend/src/agents/index.js
// and registers it in the exported AGENTS array.
//
// Generated stub follows the same shape as the existing 4-5 stubs:
//   - Pure function returning a deterministic object
//   - Title-cased display name
//   - Description line (used in the API response)
//
// We append to the AGENTS registry AND add the function before it.
// The file is rewritten with the new entries appended (idempotent:
// re-running with the same name is a no-op).

function titleCase(s) {
  return String(s).split(/[-_\s]+/).filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function pascalCase(s) {
  return String(s).split(/[-_\s]+/).filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1)).join('');
}

function camelCase(s) {
  const p = pascalCase(s);
  return p[0].toLowerCase() + p.slice(1);
}

function agentTemplate(name, description) {
  const title = titleCase(name);
  const camel = camelCase(name);
  return {
    // The function registered in AGENTS — must match the runAgent() key
    key: title,
    // Stub body. Mirrors the marketplace starter's CEO/Sales/Procurement pattern.
    function: `function ${camel}Run(args = {}) {
  return {
    agent: ${JSON.stringify(title)},
    receivedAt: new Date().toISOString(),
    args,
    message: ${JSON.stringify(`${title} agent stub — replace with real SUTAR BaseAgent call.`)},
  };
}`,
    registryEntry: `  { name: ${JSON.stringify(title)}, key: ${JSON.stringify(camel)}, description: ${JSON.stringify(description || `${title} agent (stub).`)} }`,
  };
}

// Newer starters use BaseAgent + createAgentRegistry instead of the
// const AGENTS = [ ... ] array. Build a parallel template for those.
function baseAgentTemplate(name, description) {
  const title = titleCase(name);
  const camel = camelCase(name);
  return {
    key: title,
    function: `function ${camel}Strategy(body = {}) {
  return { agent: ${JSON.stringify(title)}, received: body, message: ${JSON.stringify(`${title} agent stub — replace the strategy with a real @hojai/sutar BaseAgent or LLM call.`)} };
}`,
    registryEntry: `registry.register(new BaseAgent({
  name: ${JSON.stringify(title)},
  type: 'merchant',
  industry: 'unknown',
  description: ${JSON.stringify(description || `${title} agent (stub).`)},
  capabilities: [],
  strategy: ${camel}Strategy
}));`
  };
}

async function addAgent({ projectDir, name, description, flags = {} }) {
  if (!name) {
    const msg = 'usage: npx hojai add agent <name> [--desc="..."]';
    console.log(kleur.red('✖ ') + msg);
    throw new Error(msg);
  }
  const manifest = await loadManifest(projectDir);
  if (!manifest) {
    const msg = 'no .hojai/manifest.json — run from inside a scaffolded project';
    console.log(kleur.red('✖ ') + msg);
    throw new Error(msg);
  }

  const title = titleCase(name);
  const camel = camelCase(name);
  const agentsFile = path.join(projectDir, 'apps', 'backend', 'src', 'agents', 'index.js');
  let src = '';
  try { src = await fs.readFile(agentsFile, 'utf8'); }
  catch { const msg = 'cannot read ' + agentsFile; console.log(kleur.red('✖ ') + msg); throw new Error(msg); }

  // Idempotency: skip if already registered.
  if (src.includes(`name: ${JSON.stringify(title)},`) || src.includes(`name:"${title}",`)) {
    console.log(kleur.yellow(`  ⚠ agent "${title}" already registered in agents/index.js — skipping`));
    return { added: false, reason: 'already-exists' };
  }

  // Also skip if the function name is already defined.
  if (src.includes(`function ${camel}Run(`)) {
    console.log(kleur.yellow(`  ⚠ function ${camel}Run already defined — skipping`));
    return { added: false, reason: 'already-exists' };
  }

  const tpl = agentTemplate(name, description);
  let newSrc = src;

  // Two shapes are supported in the wild:
  //   1. Legacy: `const AGENTS = [...]` array — append to it.
  //   2. New (BaseAgent): `const registry = createAgentRegistry()` —
  //      append a `registry.register(new BaseAgent({...}))` call.
  const legacyMatch = newSrc.match(/(?:^|\n)(?:export\s+)?const\s+AGENTS\s*=\s*\[/);
  const registryMatch = newSrc.match(/(?:^|\n)const\s+registry\s*=\s*createAgentRegistry\s*\(\s*\)\s*;/);

  if (legacyMatch) {
    // Legacy array path
    const exportIdx = legacyMatch.index + legacyMatch[0].indexOf('AGENTS');
    newSrc = newSrc.slice(0, exportIdx) + tpl.function + '\n\n' + newSrc.slice(exportIdx);

    const closingIdx = newSrc.lastIndexOf('];');
    if (closingIdx === -1 || closingIdx < exportIdx) {
      const msg = 'could not find end of AGENTS array';
      console.log(kleur.red('✖ ') + msg);
      throw new Error(msg);
    }
    const before = newSrc.slice(0, closingIdx).replace(/,\s*$/, '');
    const after = newSrc.slice(closingIdx);
    newSrc = before + ',\n' + tpl.registryEntry + '\n' + after;
  } else if (registryMatch) {
    // BaseAgent registry path
    const btpl = baseAgentTemplate(name, description);
    // Idempotency for strategy function name
    if (!newSrc.includes(`function ${camel}Strategy(`)) {
      const insertAt = registryMatch.index;
      newSrc = newSrc.slice(0, insertAt) + btpl.function + '\n\n' + newSrc.slice(insertAt);
    }
    // Append registry.register(...) call at the end of the registry block.
    // We insert just before the first non-registry declaration after the
    // registry — e.g. before `export function listAgents()`.
    const afterMatch = newSrc.match(/\n\n\/\/ ─── Public API|\nexport function listAgents/);
    const insertAt = afterMatch ? afterMatch.index : newSrc.length;
    newSrc = newSrc.slice(0, insertAt) + '\n' + btpl.registryEntry + '\n' + newSrc.slice(insertAt);
  } else {
    const msg = 'could not find `const AGENTS = [` or `const registry = createAgentRegistry()` in agents/index.js — file shape unexpected; add the agent manually';
    console.log(kleur.red('✖ ') + msg);
    throw new Error(msg);
  }

  // 3. Register in runAgent() dispatch (legacy only — the BaseAgent
  //    registry uses `registry.run()` which dispatches by name automatically,
  //    so no switch update is needed).
  if (legacyMatch) {
    const dispatchIdx = newSrc.indexOf('export async function runAgent');
    if (dispatchIdx !== -1) {
      const switchIdx = newSrc.indexOf('switch (name)', dispatchIdx);
      if (switchIdx !== -1) {
        const caseInsert = '    case ' + JSON.stringify(camel) + ': return ' + camel + 'Run(args);\n';
        const lastCaseMatch = newSrc.match(/\n    case [^\n]+\n/g);
        if (lastCaseMatch) {
          const last = lastCaseMatch[lastCaseMatch.length - 1];
          const insertAt = newSrc.lastIndexOf(last) + last.length;
          newSrc = newSrc.slice(0, insertAt) + caseInsert + newSrc.slice(insertAt);
        }
      }
    }
  }

  await fs.writeFile(agentsFile, newSrc);

  // 4. Update manifest.agents array
  manifest.agents = Array.from(new Set([...(manifest.agents || []), title]));
  await fs.writeFile(
    path.join(projectDir, '.hojai', 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  );

  // 5. Update capability.json
  try {
    const capPath = path.join(projectDir, '.hojai', 'capability.json');
    const cap = JSON.parse(await fs.readFile(capPath, 'utf8'));
    if (!cap.capabilities) cap.capabilities = [];
    const capEntry = {
      id: 'hojai.' + camel,
      name: title,
      tier: 'business'
    };
    if (!cap.capabilities.some(c => c.id === capEntry.id)) {
      cap.capabilities.push(capEntry);
    }
    await fs.writeFile(capPath, JSON.stringify(cap, null, 2) + '\n');
  } catch {}

  console.log(kleur.green('✔ added agent ') + kleur.bold(title));
  const fnName = registryMatch ? (camel + 'Strategy') : (camel + 'Run');
  console.log(kleur.gray('  function: ') + kleur.cyan('apps/backend/src/agents/index.js → ' + fnName));
  console.log(kleur.gray('  api:      ') + kleur.cyan('POST /api/agents/' + camel));
  console.log(kleur.gray('  list:     ') + kleur.cyan('GET /api/agents (now includes ' + title + ')'));
  return { added: true, agent: title, key: camel };
}

// ── add integration ───────────────────────────────────────────────────
//
// Adds a placeholder REST route file at apps/backend/src/routes/<name>.js
// and mounts it in apps/backend/src/index.js.
//
// The placeholder has:
//   - GET /   — list (empty array)
//   - GET /:id — 404 (not found)
//   - POST /  — 501 (not implemented)

function integrationTemplate(name) {
  const camel = camelCase(name);
  return `/**
 * ${name} integration — placeholder route.
 *
 * Replace the stub handlers below with real integration logic
 * (e.g. wire to @hojai/payment for payments, @hojai/logistics for
 * shipping, @hojai/reputation for trust scores, etc.).
 *
 * The route is mounted at /api/${camel} in apps/backend/src/index.js.
 */

import { Router } from 'express';

const r = Router();

// GET /api/${camel} — list
r.get('/', (_req, res) => {
  res.json({ items: [], note: '${name} integration stub — replace with real implementation.' });
});

// GET /api/${camel}/:id — fetch one
r.get('/:id', (req, res) => {
  res.status(404).json({ error: 'not_found', id: req.params.id, note: '${name} integration stub' });
});

// POST /api/${camel} — create
r.post('/', (req, res) => {
  res.status(501).json({ error: 'not_implemented', endpoint: '${camel}', received: req.body });
});

export default r;
`;
}

async function addIntegration({ projectDir, name, flags = {} }) {
  if (!name) {
    const msg = 'usage: npx hojai add integration <name>';
    console.log(kleur.red('✖ ') + msg);
    throw new Error(msg);
  }
  const manifest = await loadManifest(projectDir);
  if (!manifest) {
    const msg = 'no .hojai/manifest.json — run from inside a scaffolded project';
    console.log(kleur.red('✖ ') + msg);
    throw new Error(msg);
  }

  const camel = camelCase(name);
  const routeFile = path.join(projectDir, 'apps', 'backend', 'src', 'routes', camel + '.js');
  const indexFile = path.join(projectDir, 'apps', 'backend', 'src', 'index.js');

  // Idempotency: skip if route file already exists
  try {
    await fs.access(routeFile);
    console.log(kleur.yellow('  ⚠ route file already exists: ' + routeFile + ' — skipping'));
    return { added: false, reason: 'already-exists' };
  } catch { /* doesn't exist, good */ }

  // 1. Write the route file
  await fs.writeFile(routeFile, integrationTemplate(name));

  // 2. Mount it in index.js
  let indexSrc = '';
  try { indexSrc = await fs.readFile(indexFile, 'utf8'); }
  catch { const msg = 'cannot read ' + indexFile; console.log(kleur.red('✖ ') + msg); throw new Error(msg); }

  if (!indexSrc.includes('/api/' + camel)) {
    // Add import + use() line
    const importLine = "import " + camel + "Routes from './routes/" + camel + ".js';\n";
    const useLine = "app.use('/api/" + camel + "', " + camel + "Routes);\n";

    // Insert import after the last existing import from './routes/...'
    const importRegex = /import \w+Routes from ['"]\.\/routes\/[^'"]+['"];?\n/g;
    const matches = [...indexSrc.matchAll(importRegex)];
    if (matches.length > 0) {
      const last = matches[matches.length - 1];
      const insertAt = last.index + last[0].length;
      indexSrc = indexSrc.slice(0, insertAt) + importLine + indexSrc.slice(insertAt);
    } else {
      // No existing route imports — add after the last existing import
      const lastImportMatch = [...indexSrc.matchAll(/^import .+ from .+;\n/gm)].pop();
      if (lastImportMatch) {
        const insertAt = lastImportMatch.index + lastImportMatch[0].length;
        indexSrc = indexSrc.slice(0, insertAt) + '\n' + importLine + indexSrc.slice(insertAt);
      }
    }

    // Insert app.use() after the last existing app.use() with /api/
    const useRegex = /app\.use\(['"]\/api\/[^'"]+['"], \w+Routes\);?\n/g;
    const uses = [...indexSrc.matchAll(useRegex)];
    if (uses.length > 0) {
      const last = uses[uses.length - 1];
      const insertAt = last.index + last[0].length;
      indexSrc = indexSrc.slice(0, insertAt) + useLine + indexSrc.slice(insertAt);
    } else {
      console.log(kleur.yellow('  ⚠ could not find an existing app.use() pattern — appended before app.listen'));
      const listenIdx = indexSrc.indexOf('app.listen');
      if (listenIdx !== -1) indexSrc = indexSrc.slice(0, listenIdx) + useLine + '\n' + indexSrc.slice(listenIdx);
    }

    await fs.writeFile(indexFile, indexSrc);
  }

  console.log(kleur.green('✔ added integration ') + kleur.bold(name));
  console.log(kleur.gray('  route:  ') + kleur.cyan(routeFile));
  console.log(kleur.gray('  mount:  ') + kleur.cyan('/api/' + camel));
  console.log(kleur.gray('  try:    ') + kleur.cyan('curl http://localhost:4001/api/' + camel));
  return { added: true, integration: name, route: '/api/' + camel };
}

// ── dispatcher ────────────────────────────────────────────────────────

export async function runAdd({ projectDir = process.cwd(), args = [] } = {}) {
  if (args.length === 0 || args[0] === 'help') {
    console.log(kleur.bold('Usage:'));
    console.log('  ' + kleur.cyan('npx hojai add agent <name>') + '        [--desc="..."]');
    console.log('  ' + kleur.cyan('npx hojai add integration <name>'));
    console.log('');
    console.log(kleur.bold('Examples:'));
    console.log(kleur.gray('  npx hojai add agent "Quality Assurance" --desc="Reviews all deliveries."'));
    console.log(kleur.gray('  npx hojai add integration payments'));
    return;
  }

  const subcommand = args[0];
  const rest = args.slice(1);
  const name = rest[0];
  const descIdx = rest.indexOf('--desc');
  const description = descIdx !== -1 ? rest[descIdx + 1] : undefined;

  if (subcommand === 'agent') {
    return addAgent({ projectDir, name, description });
  }
  if (subcommand === 'integration') {
    return addIntegration({ projectDir, name });
  }
  const msg = 'unknown subcommand: ' + subcommand + ' (available: agent, integration)';
  console.log(kleur.red('✖ ') + msg);
  throw new Error(msg);
}
