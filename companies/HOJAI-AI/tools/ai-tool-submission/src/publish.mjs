#!/usr/bin/env node
/**
 * @hojai/ai-tool-submission — package the AI-native spec for
 * AI coding tool marketplaces.
 *
 * Two outputs, one command:
 *   1. Cursor SKILL.md — a self-contained agent skill that any
 *      Cursor project can install via "@skill hojai"
 *   2. VSCode .vsix-style folder — package.json + SKILL.md that
 *      an extension author can bundle with `vsce package`
 *
 * Usage:
 *   node tools/ai-tool-submission/src/publish.mjs           # default
 *   node tools/ai-tool-submission/src/publish.mjs --out ./dist
 *   node tools/ai-tool-submission/src/publish.mjs --dry-run
 *
 * The script reads the @hojai/ai-spec schemas + the `hojai.ai.md`
 * example output and produces:
 *   dist/cursor/SKILL.md
 *   dist/vscode/package.json
 *   dist/vscode/SKILL.md
 *   dist/vscode/README.md
 *   dist/vscode/icon.svg
 *   dist/manifest.json    (machine-readable inventory)
 */

import { promises as fs, statSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOJAI_AI_ROOT = path.resolve(__dirname, '..', '..', '..');
const AI_SPEC_DIR = path.join(HOJAI_AI_ROOT, 'sdk', 'hojai-ai-spec');

// ─── Helpers ──────────────────────────────────────────────

function readArg(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function parseArgs() {
  return {
    out: readArg('--out') || path.join(__dirname, '..', 'dist'),
    dryRun: process.argv.includes('--dry-run'),
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
  };
}

function ts() { return new Date().toISOString(); }
function log(msg, opts = {}) {
  if (opts.verbose) console.log(`[${ts()}] ${msg}`);
}

// ─── Spec loading ────────────────────────────────────────

async function loadSpecSummary() {
  // Read the schemas (typed via Zod) and an example manifest
  const indexPath = path.join(AI_SPEC_DIR, 'dist', 'index.js');
  if (!exists(indexPath)) {
    throw new Error(
      `Could not find @hojai/ai-spec at ${indexPath}.\n` +
      `Run \`cd ${AI_SPEC_DIR} && npm install && npm run build\` first.`
    );
  }
  const aiSpec = await import(indexPath);
  return aiSpec;
}

function exists(p) {
  try { statSync(p); return true; } catch { return false; }
}

// ─── Output generators ───────────────────────────────────

/**
 * Cursor skill — a self-contained markdown file that an AI agent
 * reads to understand HOJAI conventions.
 */
function buildCursorSkill({ spec, exampleHoMd }) {
  return {
    'SKILL.md': `# HOJAI Project Skill

> When working in a HOJAI project, this skill tells you how to read
> the project's structure, follow its conventions, and extend it
> with the right SDKs.

## When to use

Activate this skill when you detect any of these signals in the
project root:

- \`hojai.ai.md\` file
- \`.hojai/\` directory containing \`manifest.json\` + \`capability.json\`
- \`@hojai/*\` packages in \`package.json\` dependencies
- A file matching \`apps/backend/src/agents/index.ts\`

## What the project is

HOJAI is a platform for building AI-native companies. The project
you're working in is one such company. The \`.hojai/manifest.json\`
file is the canonical source of truth — read it first.

## Project structure

\`\`\`
project-root/
├── hojai.ai.md              # The project context file
├── .hojai/
│   ├── manifest.json         # Canonical project schema (Manifest)
│   └── capability.json       # Nexha federation profile (Capability)
├── apps/
│   ├── backend/              # Express server
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── agents/       # SUTAR agent registry
│   │   │   ├── routes/       # Domain routes
│   │   │   └── services/
│   │   └── __tests__/
│   └── frontend/             # UI (varies)
└── package.json
\`\`\`

## The 3 files that describe the project

Read these before doing anything:

1. \`hojai.ai.md\` — Markdown, you read this directly
2. \`.hojai/manifest.json\` — Machine-readable project schema
3. \`.hojai/capability.json\` — Nexha federation profile

## HOJAI SDKs

These are the most-used SDKs:

- \`@hojai/foundation\` — CorpID, Memory, Twin, Trust, Flow, Policy
- \`@hojai/sutar\` — SUTAR agent runtime
- \`@hojai/nexha\` — Federation network
- \`@hojai/marketplace\` — BAM marketplace
- \`@hojai/industry\` — 26 vertical Industry OSes
- \`@hojai/department\` — 9 horizontal Department OSes
- \`@hojai/memory\`, \`@hojai/twin\`, \`@hojai/skills\`, \`@hojai/media\`
- \`@hojai/cli\` — \`npx hojai\` command-line tool
- \`@hojai/ai-spec\` — generates \`hojai.ai.md\` from package.json
- \`@hojai/razor\` — RAZO Keyboard Communication OS
- \`@hojai/whatsapp\` — WhatsApp Business OS
- \`@hojai/bizora\` — Reports Dashboard
- \`@hojai/cloud\` — deploy target (port 4380)
- \`@hojai/razor\` — RAZO Keyboard (port 4299)
- \`@hojai/logistics\` — KHAIRMOVE
- \`@hojai/reputation\` — ACI scoring
- \`@hojai/discovery\` — BAM discovery
- \`@hojai/skillos\` — SkillOS
- \`@hojai/gateway\` — RTMN hub
- \`@hojai/widget-core\` — 5KB browser widget
- \`@hojai/widget-react\` — React widget

Total: 25 SDKs in the family, with \`@hojai/ai-spec\` defining how they describe themselves.

## Conventions

When extending a HOJAI project:

1. **Use the SDKs, don't reimplement.** Every service has a typed \`@hojai/*\` client.
2. **SUTAR agents** extend \`BaseAgent\` and live in \`apps/backend/src/agents/\`. Each agent is a pure function returning a deterministic stub.
3. **All routes** return JSON. Use Zod for input validation.
4. **Auth** uses \`requireAuth\` middleware from \`@hojai/foundation\`.
5. **All cross-cutting concerns** (errors, validation, auth) live in \`apps/backend/src/middleware/\`.
6. **Run \`hojai ai-spec generate\`** to keep \`hojai.ai.md\` in sync with code.
7. **Run \`hojai doctor\`** to verify the env before doing anything.

## Adding things

- **New SUTAR agent**: \`hojai add agent "<Name>"\` — scaffolds a stub
- **New SDK dep**: \`hojai add integration <hojai-name>\` — updates package.json + manifest
- **New vertical**: \`hojai add industry <type>\` — scaffolds routes + wires the SDK

## Example hojai.ai.md output

Below is an example of what the \`hojai.ai.md\` file looks like for a marketplace project:

\`\`\`markdown
${exampleHoMd.slice(0, 1400).replace(/`/g, '\\`')}
...
\`\`\`

See \`.hojai/manifest.json\` for the full structured schema.

## When in doubt

Run \`hojai doctor\` in the project root — it'll catch:
- Missing API key
- Gateway down
- Missing \`.hojai/manifest.json\`
- Missing \`hojai.ai.md\`
- Missing SDK deps in \`node_modules\`

This skill is the canonical reference. Update it when @hojai/ai-spec
schemaVersion bumps.`
  };
}

/**
 * VSCode extension package — folder with package.json + SKILL.md +
 * icon.svg. The package author can run \`vsce package\` on it to
 * produce a .vsix.
 */
function buildVscodeExtension({ version, name, description }) {
  return {
    'package.json': JSON.stringify({
      name,
      displayName: 'HOJAI',
      description,
      version,
      publisher: 'hojai',
      engines: { vscode: '^1.85.0' },
      categories: ['Programming Languages', 'Other'],
      keywords: ['hojai', 'ai', 'agents', 'sutar', 'bam'],
      activationEvents: ['workspaceContains:hojai.ai.md'],
      main: './SKILL.md',
      contributes: {
        // VSCode doesn't have a first-class "skill" concept yet,
        // but we contribute commands that surface the spec.
        commands: [
          {
            command: 'hojai.showContext',
            title: 'HOJAI: Show project context',
            category: 'HOJAI',
            shortTitle: 'Show Context'
          },
          {
            command: 'hojai.regenerateSpec',
            title: 'HOJAI: Regenerate AI-native spec',
            category: 'HOJAI',
            shortTitle: 'Regenerate Spec'
          }
        ]
      },
      repository: {
        type: 'git',
        url: 'https://github.com/hojai-ai/hojai.git'
      },
      icon: 'icon.svg'
    }, null, 2),
    'SKILL.md': buildCursorSkill({ spec: null, exampleHoMd: '' })['SKILL.md'],
    'README.md': `# HOJAI for VSCode

This VSCode extension activates when a workspace contains a \`hojai.ai.md\`
file (a HOJAI AI-native project). It gives the editor's AI assistant
the full HOJAI project context so it can write code that fits the
platform.

## Install (development)

1. Open VSCode
2. \`Extensions\` → \`...\` → \`Install from VSIX\`
3. Run \`vsce package\` in this directory
4. Choose the generated \`.vsix\` file

## What it does

When active, this extension provides two commands:

- **HOJAI: Show project context** — opens \`.hojai/manifest.json\` in a custom editor
- **HOJAI: Regenerate AI-native spec** — runs \`hojai ai-spec generate\`

## What the AI sees

When the workspace contains \`hojai.ai.md\`, VSCode's Copilot / Continue /
other AI assistants will read it (via the workspaceContains activation)
and gain full context about your HOJAI project structure, SDKs,
agents, and conventions.

## Learn more

- HOJAI Developer Platform: https://docs.hojai.ai (or your self-hosted instance)
- \`@hojai/ai-spec\` schema reference: https://github.com/hojai-ai/hojai
- \`@hojai/cli\` for the hojai command: https://www.npmjs.com/package/@hojai/cli
`,
    'icon.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#0a0a0a"/>
  <text x="64" y="78" font-family="-apple-system,system-ui,sans-serif"
        font-size="48" font-weight="700" fill="#5eead4" text-anchor="middle">H</text>
  <circle cx="100" cy="32" r="6" fill="#5eead4"/>
</svg>
`
  };
}

/**
 * Top-level manifest — machine-readable inventory of what we generated
 * so submission tools can verify.
 */
function buildManifest({ version, cursorPath, vscodePath, sdkCount, hoMdBytes }) {
  return {
    generatedAt: new Date().toISOString(),
    version,
    packages: {
      cursor: { path: cursorPath, format: 'skill-md' },
      vscode: { path: vscodePath, format: 'vsix-folder' }
    },
    context: {
      sdkCount,
      hoMdBytes,
      sourceSpec: '@hojai/ai-spec',
      specVersion: '1.0.0'
    }
  };
}

// ─── Build pipeline ─────────────────────────────────────

async function loadExampleHoMd(spec) {
  // Render an example hojai.ai.md using the spec's renderFor
  return spec.renderFor({
    manifest: {
      schemaVersion: '1.0.0', projectId: 'example-1', name: 'example',
      description: 'Example marketplace project — auto-generated by @hojai/ai-spec',
      type: 'marketplace', region: 'us-east', languages: ['en'],
      hojaiVersion: '1.0.0', createdAt: new Date().toISOString(),
      agents: [
        { role: 'CEO', purpose: 'Orchestrator' },
        { role: 'Sales', purpose: 'CRM' },
        { role: 'Procurement', purpose: 'Sourcing' }
      ],
      integrations: ['foundation', 'sutar', 'nexha', 'marketplace']
    },
    capability: {
      schemaVersion: '1.0.0', projectId: 'example-1', name: 'example',
      capabilities: [
        { id: 'hojai.orchestration', name: 'Orchestration', tier: 'core', type: 'offer' },
        { id: 'hojai.sales', name: 'Sales', tier: 'business', type: 'offer' }
      ],
      slaTargets: { uptimePercent: 99.5, responseMs: 500 }
    }
  });
}

async function main() {
  const args = parseArgs();
  const spec = await loadSpecSummary();

  // Render an example hojai.ai.md for the SKILL.md docs
  const exampleHoMd = await loadExampleHoMd(spec);

  // Discover SDK count by reading the @hojai/* dirs
  const SDK_DIR = path.join(HOJAI_AI_ROOT, 'sdk');
  const sdkCount = (await fs.readdir(SDK_DIR, { withFileTypes: true }))
    .filter(d => d.isDirectory() && d.name.startsWith('hojai-'))
    .length;

  // Build outputs
  const cursorFiles = buildCursorSkill({ spec, exampleHoMd });
  const vscodeFiles = buildVscodeExtension({
    version: '1.0.0',
    name: 'hojai',
    description: 'HOJAI AI-native project context. Activates when workspace contains hojai.ai.md.'
  });

  // Paths
  const cursorDir = path.join(args.out, 'cursor');
  const vscodeDir = path.join(args.out, 'vscode');
  const manifestPath = path.join(args.out, 'manifest.json');

  if (args.dryRun) {
    console.log('[ai-publish] DRY RUN — would write:');
    for (const f of Object.keys(cursorFiles)) console.log(`  ${cursorDir}/${f}`);
    for (const f of Object.keys(vscodeFiles)) console.log(`  ${vscodeDir}/${f}`);
    console.log(`  ${manifestPath}`);
    return;
  }

  // Write
  await fs.mkdir(cursorDir, { recursive: true });
  await fs.mkdir(vscodeDir, { recursive: true });

  for (const [name, content] of Object.entries(cursorFiles)) {
    await fs.writeFile(path.join(cursorDir, name), content);
  }
  for (const [name, content] of Object.entries(vscodeFiles)) {
    await fs.writeFile(path.join(vscodeDir, name), content);
  }

  const hoMdBytes = exampleHoMd.length;
  const manifest = buildManifest({
    version: '1.0.0',
    cursorPath: 'cursor/SKILL.md',
    vscodePath: 'vscode/',
    sdkCount,
    hoMdBytes
  });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`[ai-publish] wrote ${Object.keys(cursorFiles).length} cursor files`);
  console.log(`[ai-publish] wrote ${Object.keys(vscodeFiles).length} vscode files`);
  console.log(`[ai-publish] wrote manifest.json`);
  console.log(`[ai-publish] output dir: ${args.out}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Cursor: copy dist/cursor/SKILL.md to ~/.cursor/skills/hojai/SKILL.md');
  console.log('  2. VSCode: cd dist/vscode && vsce package  (then install the .vsix)');
  console.log('  3. Submit to marketplaces: open the appropriate PR');
}

main().catch(e => {
  console.error(`[ai-publish] ${e.message}`);
  process.exit(1);
});
