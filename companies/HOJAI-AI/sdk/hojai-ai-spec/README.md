# @hojai/ai-spec

> The **AI-native spec** for HOJAI projects. Defines the schema and tooling for the three files that AI coding tools (Claude Code, Cursor, Codex, GitHub Copilot) read to understand a HOJAI project.

[![npm version](https://img.shields.io/npm/v/@hojai/ai-spec.svg)](https://www.npmjs.com/package/@hojai/ai-spec)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What it does

Every HOJAI project carries three files at the project root:

```
my-project/
├── hojai.ai.md             # Markdown AI tools read FIRST
└── .hojai/
    ├── manifest.json       # Machine-readable project schema
    └── capability.json     # Nexha federation profile
```

`@hojai/ai-spec` is the package that **generates, reads, and validates** these three files.

## Why this matters

From the HOJAI developer platform spec:

> *"This is the most important part. The spec that tells AI coding tools how to build on HOJAI."*
>
> — `hojai-developer-platform-spec.md`, section 3

Without `hojai.ai.md`, AI tools are blind to the HOJAI architecture of your project. **With it, they understand the project structure, SDKs, agents, conventions, and how to extend it** — and can scaffold new code that fits the patterns.

This is the file that turns HOJAI from "code you can read" into "a project AI tools can extend."

## Install

```bash
npm install @hojai/ai-spec
```

## Quick start

### Auto-generate from your project's `package.json`

```ts
import { generateAndWrite } from '@hojai/ai-spec';

// Reads package.json, infers the project type + integrations + agents,
// then writes hojai.ai.md + .hojai/manifest.json + .hojai/capability.json
const { manifest, capability } = await generateAndWrite('/path/to/project');
console.log(`AI-spec written for ${manifest.name}`);
```

### Or write explicitly

```ts
import { writeProjectContext, readProjectContext } from '@hojai/ai-spec';

await writeProjectContext('/path/to/project', {
  schemaVersion: '1.0.0',
  projectId: 'p-1',
  name: 'TradeFlow',
  type: 'b2b',
  region: 'me',
  languages: ['en', 'ar'],
  hojaiVersion: '1.0.0',
  createdAt: new Date().toISOString(),
  agents: [
    { role: 'CEO', purpose: 'Orchestrator' },
    { role: 'Sales', purpose: 'Quotation' },
    { role: 'Procurement', purpose: 'Sourcing' },
    { role: 'Finance', purpose: 'Money' },
    { role: 'Logistics', purpose: 'Shipping' }
  ],
  integrations: ['foundation', 'sutar', 'nexha', 'commerce', 'payment', 'logistics']
}, {
  schemaVersion: '1.0.0',
  projectId: 'p-1',
  name: 'TradeFlow',
  capabilities: [
    { id: 'hojai.orchestration', name: 'Agent Orchestration', tier: 'core', type: 'offer' },
    { id: 'hojai.sales', name: 'Sales & Quotation', tier: 'business', type: 'offer' }
  ],
  languages: ['en', 'ar']
});

// Read it back
const ctx = await readProjectContext('/path/to/project');
console.log(ctx.aiMdPath, ctx.manifest.name);
```

### From the CLI

```bash
# In your HOJAI project directory:
hojai ai-spec generate     # auto-detect from package.json
hojai ai-spec read         # show current spec
hojai ai-spec validate     # validate existing files
```

## API

### Core

| Function | Purpose |
|---|---|
| `writeProjectContext(dir, manifest, capability)` | Writes all 3 files |
| `readProjectContext(dir)` | Reads all 3 files into a `ProjectContext` |
| `isHojaiProject(dir)` | True if `.hojai/manifest.json` exists |

### Schemas + types

| Export | Purpose |
|---|---|
| `Manifest` | TypeScript type for `.hojai/manifest.json` |
| `Capability` | TypeScript type for `.hojai/capability.json` |
| `ManifestSchema` / `CapabilitySchema` | Zod validators |
| `parseManifest(jsonString)` | Parse + validate a raw JSON string |
| `parseCapability(jsonString)` | Parse + validate a raw JSON string |
| `validateManifestData(data)` | Returns `{ valid, errors[] }` |
| `validateCapabilityData(data)` | Returns `{ valid, errors[] }` |

### Introspection

| Function | Purpose |
|---|---|
| `generateManifestFromPackageJson(dir, options?)` | Auto-fill a manifest from `package.json` |
| `generateCapabilityFromManifest(manifest, options?)` | Derive a capability from a manifest |
| `generateAndWrite(dir, options?)` | One-call: introspect + write all 3 files |

### Templates

| Export | Purpose |
|---|---|
| `render({ manifest, capability })` | Render `hojai.ai.md` from inputs |
| `renderFor({ manifest, capability })` | Same, picks the right template by `manifest.type` |
| `TEMPLATES` | Map of starter type → render function |

## The 3 files

### `hojai.ai.md`

Markdown that AI tools read first. Renders structured sections for:
- Project name + description + region + languages + template
- Architecture (backend / frontend / mobile / database / AI stack)
- SUTAR agents (table of role + purpose + file path)
- HOJAI SDKs used (with one-line descriptions)
- Nexha federation capabilities
- Entry points, scripts, conventions
- "How to extend" (add agent, add endpoint, connect to Nexha)

### `.hojai/manifest.json`

Machine-readable project schema. Versioned (1.0.0). Zod-validated. Includes:
- `projectId`, `name`, `description`, `type`, `industry`, `region`, `languages`
- `stack` (backend, frontend, mobile, database, ai)
- `agents` (role, purpose, file, capabilities)
- `integrations` (list of `@hojai/*` packages used)
- `conventions` (validation, auth, events, tests, linter, formatter)
- `entrypoints`, `scripts`, `files`

### `.hojai/capability.json`

Nexha federation profile. Includes:
- `projectId`, `layer` (1-9), `name`, `description`
- `capabilities` (id, name, tier, type)
- `regions`, `languages`, `slaTargets`

This is what your project declares to the **Global Nexha network** when it joins.

## Schema versioning

All three files carry a `schemaVersion` field. The current version is `1.0.0`. Future versions will be backward-compatible. If you upgrade `@hojai/ai-spec` and your existing files use an older version, the validators will tell you.

## Tests

```bash
cd companies/HOJAI-AI/sdk/hojai-ai-spec
npm install
npm run build
npm test
```

## See also

- [HOJAI Developer Platform Spec](../../../../.claude/plans/hojai-developer-platform-spec.md) — section 3 is the canonical reference for this format
- [HOJAI Foundry `create-hojai`](../../foundry/packages/create-hojai/) — uses the same schema when scaffolding new projects
- [@hojai/cli](../hojai-cli/) — `hojai ai-spec generate` wraps this package
- All `@hojai/*` SDKs — these are the SDKs the AI tools will use to extend your project
