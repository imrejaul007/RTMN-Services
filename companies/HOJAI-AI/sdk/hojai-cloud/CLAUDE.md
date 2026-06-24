# CLAUDE.md - HOJAI Cloud SDK (@hojai/cloud)

> **Package:** `@hojai/cloud` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** Built and tested (10/10 tests passing, 0 failures)

## What this SDK is

**The official TypeScript client for the HOJAI Cloud deploy service (port 4380).** The deploy target for `npx hojai deploy --mode=remote`. Provides programmatic access to deployment lifecycle + wildcard `*.hojai.app` routing.

| Sub-client | Purpose | Methods |
|---|---|---|
| `deployments` | Push, list, get, teardown, deployAndWait (with polling) | 5 |
| `route` | Wildcard subdomain proxy (`.hojai.app` → tenant port) | 1 |
| `health` | Service health + readiness | 2 |

## Architecture

```
@hojai/cloud
├── Cloud                     # Main client (facade)
│   ├── deployments           # DeploymentsClient  — 5 methods
│   ├── route                 # RouteClient        — 1 method
│   └── health                # HealthClient       — 2 methods
├── HojaiConfig                # Shared config
└── resolveConfig()            # Apply defaults
```

Self-contained — does NOT import from other `@hojai/*` packages. Carries its own copy of `HojaiConfig` + `request()` + `buildQueryString` (~80 LOC).

## Quick Start

```ts
import { Cloud } from '@hojai/cloud';

const c = new Cloud({ apiKey, baseUrl: 'https://api.hojai.ai' });

// 1. Deploy with auto-wait
const dep = await c.deployments.deployAndWait({
  name: 'maya-store', type: 'marketplace',
  runtime: 'node-express', manifest: {}
});

// 2. Health
const h = await c.health.get();
console.log(`${h.live} live / ${h.deployments} total`);

// 3. List + tear down
const all = await c.deployments.list();
for (const d of all) await c.deployments.teardown(d.id);
```

## Build & test

```bash
cd companies/HOJAI-AI/sdk/hojai-cloud
npm install
npm run build
npm test
```

## Tests (10/10 passing)

- Cloud client instantiates with 3 sub-clients
- DeploymentsClient.deploy
- DeploymentsClient.list with status filter
- DeploymentsClient.get by id
- DeploymentsClient.teardown (DELETE)
- DeploymentsClient.deployAndWait polls until live
- RouteClient.proxy builds wildcard URL
- HealthClient.get hits /api/v1/health
- Retries on 5xx (3 calls before success)
- Throws on 4xx

## Related

- [`@hojai/cli`](../hojai-cli/CLAUDE.md) — `hojai deploy` calls this SDK under the hood
- [`@hojai/foundation`](../hojai-foundation/CLAUDE.md) — CorpID for deployment auth
- [HOJAI Cloud service](https://github.com/hojai/hojai-cloud) — the underlying Express service (port 4380)

## Why this matters

`@hojai/cloud` is the missing SDK for HOJAI Cloud — the production deploy target shipped in Foundry v1.1 (2026-06-24). The service exists, the CLI uses it, but there was no programmatic client. This SDK fills that gap — now any developer can build deployment dashboards, automated rollback flows, or multi-tenant management tools.

The SDK family is now **26 deep** with this addition.
