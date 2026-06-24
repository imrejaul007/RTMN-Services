# CLAUDE.md - HOJAI Foundation SDK (@hojai/foundation)

> **Package:** `@hojai/foundation` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** Built and tested (8/9 tests passing, 1 test isolation issue only)

## What this SDK is

**The official client for building HOJAI-native applications.** Wraps the six HOJAI Foundation services (CorpID, MemoryOS, TwinOS, SADA/TrustOS, FlowOS, PolicyOS) into a single ergonomic client.

Any developer building on HOJAI should use this SDK. It handles:
- HTTP transport (with retries, timeouts)
- Authentication
- Error handling
- TypeScript types
- REST endpoint routing

## Quick Start

```ts
import { Hojai } from '@hojai/foundation';

const hojai = new Hojai({
  apiKey: process.env.HOJAI_KEY,
  baseUrl: 'https://api.hojai.ai'
});

// CorpID: create a company identity
const company = await hojai.corpId.create({
  type: 'company',
  metadata: { name: 'Maya Collective', country: 'IN', taxId: '...' }
});

// MemoryOS: write persistent context
await hojai.memory.write({
  type: 'preferences',
  scope: { ownerId: company.id, ownerType: 'company' },
  content: { categories: ['restaurant', 'fashion'] },
  ttlSeconds: 86400
});

// TwinOS: create a digital twin
const customer = await hojai.twin.create({
  type: 'customer',
  ownerCorpId: company.id,
  attributes: { name: 'Alice' }
});

// SADA/TrustOS: verify trust
const trust = await hojai.trust.getScore(company.id);
if (trust.overall > 0.8) { /* proceed */ }

// FlowOS: run a workflow
const run = await hojai.flow.run('onboard-customer', { inputs: { customerId: customer.id } });

// PolicyOS: check compliance
const decision = await hojai.policy.evaluate({
  action: 'send_data_to_third_party',
  context: { recipient: 'analytics-co' },
  corpId: company.id
});
if (decision.decision === 'allow') { /* proceed */ }
```

## Sub-Clients

| Sub-client | Purpose | Key Methods |
|---|---|---|
| `corpId` | Universal identity | create, get, verify, link, search |
| `memory` | Persistent agent memory | write, read, readMany, search, update, delete |
| `twin` | Digital twins | create, get, update, link, history |
| `trust` | Trust verification | getScore, verify, compute |
| `flow` | Workflow orchestration | create, get, list, run, getRun |
| `policy` | Compliance + governance | create, get, list, evaluate |

## Configuration

```ts
interface HojaiConfig {
  apiKey?: string;              // Bearer token
  baseUrl: string;              // Default: https://api.hojai.ai
  timeout?: number;              // Default: 10000ms
  maxRetries?: number;           // Default: 3
  fetchImpl?: typeof fetch;      // For testing
  logger?: (level, message, meta) => void;
}
```

## Build

```bash
npm install
npx tsc
node --test dist/__tests__/__tests__/index.test.js
```

## Files

```
hojai-foundation/
├── CLAUDE.md                    # This file
├── README.md                    # Quick start
├── package.json                 # npm config with subpath exports
├── tsconfig.json
├── src/
│   ├── config.ts                # HojaiConfig + resolveConfig
│   ├── utils.ts                 # request() with retries, timeout, backoff
│   ├── corp-id.ts               # CorpIDClient
│   ├── memory.ts                # MemoryClient
│   ├── twin.ts                  # TwinClient
│   ├── trust.ts                 # TrustClient (SADA)
│   ├── flow.ts                  # FlowClient
│   ├── policy.ts                # PolicyClient
│   ├── index.ts                 # Main Hojai class + re-exports
│   └── __tests__/
│       └── index.test.ts        # 9 tests (8 passing, 1 test isolation)
└── dist/                        # Compiled output
    ├── index.js, index.mjs, index.d.ts
    ├── corp-id.js, corp-id.mjs, corp-id.d.ts
    ├── memory.js, memory.mjs, memory.d.ts
    ├── ... (all modules)
    └── __tests__/index.test.js
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `HOJAI_KEY` | (none) | API key for HOJAI Cloud (required for production) |
| `HOJAI_BASE_URL` | `https://api.hojai.ai` | Override base URL |

## Related

- [Phase D of 7-Phase Master Plan](../../../.claude/plans/40-phase-vs-6-phase-reconciliation.md)
- [HOJAI Foundation Platform Services](../../../companies/HOJAI-AI/platform/)
- [HOJAI Foundation Integration Service](../../../companies/RABTUL-Technologies/rez-intelligence-integration/)
