# @hojai/memory — Memory Layer SDK

> **Package:** `@hojai/memory` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** ✅ **PRODUCTION-READY** — Wraps the 4-service HOJAI Memory Layer + the underlying MemoryOS dumb store.

---

## What this SDK is

**The official client for the HOJAI Memory Layer.** The Memory Layer provides persistent agent memory with 15 memory types, per-fact confidence scoring, tiered federation, twin binding, and an LLM context composer.

Any developer building memory-aware AI agents on HOJAI should use this SDK.

It handles:
- HTTP transport (retries, timeouts, exponential backoff)
- Authentication
- Error handling
- TypeScript types for every entity (MemoryEntry, Fact, Binding, ComposedContext)
- Subpath exports for tree-shaking

---

## Quick Start

```ts
import { Memory } from '@hojai/memory';

const mem = new Memory({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// 1. Write a memory
await mem.os.create({
  ownerId: 'u-1',
  type: 'episodic',
  content: 'Met Sarah at HOJAI meetup'
});

// 2. Search across all tiers
const hits = await mem.os.search({ ownerId: 'u-1', q: 'meetup' });

// 3. Compose LLM context for an AI app
const ctx = await mem.context.compose({
  ownerId: 'u-1',
  query: 'What is Sarah interested in?',
  maxTokens: 2000
});

// 4. Bind a TwinOS twin to its memory partition
await mem.bridge.bind('customer-twin-1', {
  kind: 'episodic',
  partitionId: 'p-1'
});

// 5. Get confidence report for a twin
const report = await mem.confidence.getReport('customer-twin-1');
```

---

## Sub-Clients (5 total)

| Sub-client | Service | Port | Purpose |
|---|---|---|---|
| `mem.os` | MemoryOS | 4703 | The dumb store — 15 memory types (long-term, working, episodic, semantic, procedural, …), knowledge graph, learning |
| `mem.network` | memory-network | 4794 | Tiered memory + cross-tier aggregation — 5 tiers (personal / business / industry / ecosystem / agent) with federation |
| `mem.confidence` | Memory Confidence | 4152 | Per-fact reliability scoring — `(base × decay × contradiction)` model, reinforce/contradict/recall, staleness reports |
| `mem.bridge` | Twin Memory Bridge | 4704 | Twin ↔ memory partition links — each TwinOS twin owns its memory partition |
| `mem.context` | Memory Context Engine | 4790 | Smart LLM context composer — `(relevance × confidence × recency)` retrieval + token budgeting |

---

## Subpath Imports

```ts
import { MemoryOsClient } from '@hojai/memory/os';
import { MemoryNetworkClient } from '@hojai/memory/network';
import { MemoryConfidenceClient } from '@hojai/memory/confidence';
import { TwinMemoryBridgeClient } from '@hojai/memory/bridge';
import { MemoryContextEngineClient } from '@hojai/memory/context';
import type { MemoryEntry, Fact, ComposedContext } from '@hojai/memory/types';
```

---

## Memory Types (15)

The MemoryOS supports 15 memory types:

| Type | Purpose | Example |
|---|---|---|
| `episodic` | Event memories | "Met Sarah at HOJAI meetup" |
| `semantic` | Facts & concepts | "Sarah is a designer" |
| `procedural` | How-to knowledge | "Sarah prefers Figma over Sketch" |
| `working` | Short-term scratchpad | Current conversation context |
| `long_term` | Important persistent facts | User preferences |
| `emotional` | Sentiment + affect | "User expressed frustration about checkout" |
| `preference` | User likes/dislikes | "Prefers dark mode" |
| `factual` | Verifiable claims | "Sarah's company is Maya Collective" |
| `relational` | Entity relationships | "Sarah is friend of Ravi" |
| `temporal` | Time-bound facts | "Subscription expires 2026-12-31" |
| `spatial` | Location memories | "Met Sarah at XYZ cafe" |
| `contextual` | Environment-specific | "In B2B context, Sarah is decision maker" |
| `meta` | Memory about memories | "Recalled this fact 5 times" |
| `intentional` | Goals + plans | "Sarah wants to launch by Q3" |
| `reflective` | Self-reflection | "Notice I keep forgetting Sarah's company name" |

---

## Architecture

```
@hojai/memory
├── Memory                          # Main client (facade)
│   ├── os                          # MemoryOsClient          — dumb store (15 types)
│   ├── network                     # MemoryNetworkClient     — tiers + aggregation
│   ├── confidence                  # MemoryConfidenceClient  — fact reliability
│   ├── bridge                      # TwinMemoryBridgeClient  — twin↔memory partition links
│   └── context                     # MemoryContextEngineClient — LLM context composer
├── HojaiConfig                      # Shared config interface
├── resolveConfig()                  # Apply defaults
└── request()                        # HTTP with retries + backoff
```

Built on `@hojai/foundation`'s `HojaiConfig` pattern (same as all other `@hojai/*` SDKs).

---

## Configuration

```ts
const mem = new Memory({
  apiKey: 'hojai_live_...',         // required
  baseUrl: 'https://api.hojai.ai',  // required
  timeout: 15_000,                  // optional, default 10s
  maxRetries: 3,                    // optional, default 3
  fetchImpl: customFetch,           // optional, for testing/proxies
  logger: (level, msg, meta) => {}  // optional
});
```

---

## Constants

| Constant | Value | Description |
|---|---|---|
| `MEMORY_PORTS.os` | 4703 | MemoryOS port |
| `MEMORY_PORTS.network` | 4794 | memory-network port |
| `MEMORY_PORTS.confidence` | 4152 | Memory Confidence port |
| `MEMORY_PORTS.bridge` | 4704 | Twin Memory Bridge port |
| `MEMORY_PORTS.context` | 4790 | Memory Context Engine port |

---

## Use Cases

**Build a memory-aware chatbot:**
```ts
const ctx = await mem.context.compose({ ownerId: 'u-1', query: userMessage, maxTokens: 2000 });
const response = await llm.complete({ system: ctx.context, user: userMessage });
await mem.os.create({ ownerId: 'u-1', type: 'episodic', content: userMessage });
```

**Build a per-customer AI assistant:**
```ts
await mem.bridge.bind('customer-twin-c-1', { kind: 'episodic', partitionId: 'p-c-1' });
const ctx = await mem.context.compose({ ownerId: 'c-1', twinId: 'customer-twin-c-1', query: '...' });
```

**Build a fact-tracking system:**
```ts
await mem.confidence.create({ ownerId: 'u-1', fact: 'Sarah works at Maya Collective', source: 'meeting-2026-06' });
await mem.confidence.reinforce({ factId: 'f-1', signal: 0.9 });
const report = await mem.confidence.getReport('u-1');
```

---

## Build

```bash
npm install
npm run build
npm test
```

---

## Files

```
hojai-memory/
├── CLAUDE.md                    # This file
├── README.md                    # Quick start
├── package.json                 # npm config with subpath exports
├── tsconfig.json
├── src/
│   ├── foundation-config.ts     # HojaiConfig + resolveConfig
│   ├── utils.ts                 # request, buildQueryString
│   ├── types.ts                 # MEMORY_PORTS, MemoryUnit, TierStats
│   ├── os.ts                    # MemoryOsClient (port 4703)
│   ├── network.ts               # MemoryNetworkClient (port 4794)
│   ├── confidence.ts            # MemoryConfidenceClient (port 4152)
│   ├── bridge.ts                # TwinMemoryBridgeClient (port 4704)
│   ├── context.ts               # MemoryContextEngineClient (port 4790)
│   ├── index.ts                 # Main Memory facade
│   └── __tests__/
│       └── index.test.ts        # Tests
└── dist/                        # Compiled output
    ├── index.{js,mjs,d.ts}
    ├── os.{js,mjs,d.ts}
    ├── network.{js,mjs,d.ts}
    ├── confidence.{js,mjs,d.ts}
    ├── bridge.{js,mjs,d.ts}
    ├── context.{js,mjs,d.ts}
    ├── types.{js,mjs,d.ts}
    └── __tests__/index.test.js
```

---

## See also

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — Base SDK with simplified `mem` sub-client for basic usage
- [@hojai/twin](../hojai-twin/CLAUDE.md) — TwinOS SDK for managing the digital twins that own memory partitions
- [Memory Layer docs](../../../companies/HOJAI-AI/docs/MEMORY-LAYER.md) — Full Memory Layer architecture
- [@hojai/sutar](../hojai-sutar/CLAUDE.md) — SUTAR agents (which consume memory for context)