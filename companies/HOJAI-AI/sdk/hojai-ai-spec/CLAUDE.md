# CLAUDE.md - HOJAI AI-native Spec (@hojai/ai-spec)

> **Package:** `@hojai/ai-spec` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** Built and tested (14/14 tests passing, 0 failures)

## What this package is

**The AI-native spec for HOJAI projects.** Defines the canonical schema for the 3 files every HOJAI project carries, and provides the tooling to generate, read, validate, and render them.

From the spec:
> *"This is the most important part. The spec that tells AI coding tools how to build on HOJAI."*

## The 3 files in every HOJAI project

```
my-project/
├── hojai.ai.md             # AI tools (Claude Code, Cursor, Codex) read FIRST
└── .hojai/
    ├── manifest.json       # Machine-readable project schema (Manifest)
    └── capability.json     # Nexha federation profile (Capability)
```

## Architecture

```
@hojai/ai-spec
├── types.ts          # Manifest, Capability, AgentSpec, etc. + Zod schemas
├── manifest.ts       # readManifest, writeManifest, parseManifest, validateManifest
├── capability.ts     # readCapability, writeCapability, parseCapability, validateCapability
├── templates.ts      # render(), renderFor() — hojai.ai.md generators
├── writer.ts         # writeProjectContext, readProjectContext, isHojaiProject
├── introspect.ts     # generateManifestFromPackageJson, generateAndWrite
├── validators.ts     # Friendly error formatters
└── index.ts          # Public API
```

## Public API

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
| `parseManifest(jsonString)` | Parse + validate raw JSON |
| `parseCapability(jsonString)` | Parse + validate raw JSON |
| `validateManifestData(data)` | Returns `{ valid, errors[] }` |
| `validateCapabilityData(data)` | Returns `{ valid, errors[] }` |

### Introspection

| Function | Purpose |
|---|---|
| `generateManifestFromPackageJson(dir, options?)` | Auto-fill manifest from package.json |
| `generateCapabilityFromManifest(manifest, options?)` | Derive capability from manifest |
| `generateAndWrite(dir, options?)` | One-call: introspect + write all 3 files |

### Templates

| Export | Purpose |
|---|---|
| `render({ manifest, capability })` | Render hojai.ai.md from inputs |
| `renderFor({ manifest, capability })` | Same, picks the right template by manifest.type |
| `TEMPLATES` | Map of starter type → render function |

## Quick Start

```ts
import { generateAndWrite, readProjectContext } from '@hojai/ai-spec';

// Auto-generate from package.json
await generateAndWrite('/path/to/project');

// Or write explicitly
await writeProjectContext('/path/to/project', manifest, capability);

// Read back
const ctx = await readProjectContext('/path/to/project');
console.log(ctx.aiMdPath, ctx.manifest.name);
```

## CLI integration

`@hojai/cli` has an `ai-spec` subcommand:

```bash
hojai ai-spec generate     # auto-detect from package.json
hojai ai-spec read         # show current spec
hojai ai-spec validate     # validate existing files
```

## Build & test

```bash
cd companies/HOJAI-AI/sdk/hojai-ai-spec
npm install
npm run build
npm test
```

## Files

```
hojai-ai-spec/
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── types.ts
│   ├── manifest.ts
│   ├── capability.ts
│   ├── templates.ts
│   ├── writer.ts
│   ├── introspect.ts
│   ├── validators.ts
│   ├── index.ts
│   └── __tests__/index.test.ts
└── dist/
```

## Tests (14/14 passing)

- ManifestSchema accepts valid / rejects invalid
- ManifestSchema rejects empty languages
- CapabilitySchema accepts valid
- validateManifestData returns friendly errors
- renderFor produces valid hojai.ai.md for marketplace
- renderFor handles SDK type with no preamble
- writeProjectContext writes 3 files, readProjectContext roundtrips
- isHojaiProject detects existing project
- generateManifestFromPackageJson detects @hojai/* integrations
- generateCapabilityFromManifest maps agents to capabilities
- generateAndWrite end-to-end: package.json → 3 files
- parseManifest parses + validates a raw JSON string
- validateCapabilityData returns ok for valid input

## Related

- [HOJAI Developer Platform Spec](../../../../.claude/plans/hojai-developer-platform-spec.md) — section 3 is the canonical reference
- [HOJAI Foundry `create-hojai`](../../foundry/packages/create-hojai/) — uses the same schema when scaffolding
- [@hojai/cli](../hojai-cli/) — `hojai ai-spec generate` wraps this package
- All `@hojai/*` SDKs — these are the SDKs the AI tools will use to extend your project

## Why this matters

The `hojai.ai.md` is the single file that makes the difference between:
- A HOJAI project that's a static codebase
- A HOJAI project that AI tools can understand and extend

It's the bridge between "code that exists" and "code that AI can build on." That's why the spec calls it *"the most important part"*.
