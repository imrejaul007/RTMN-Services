# @hojai/cloud

> The official TypeScript SDK for the **HOJAI Cloud** deploy service (port 4380). The deploy target for `npx hojai deploy --mode=remote`. Push projects, list deployments, tear down — the wildcard `*.hojai.app` routing layer.

[![npm version](https://img.shields.io/npm/v/@hojai/cloud.svg)](https://www.npmjs.com/package/@hojai/cloud)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What it does

HOJAI Cloud is the **production deploy target** for HOJAI Foundry. When you run `npx hojai deploy --mode=remote` with `HOJAI_CLOUD_URL` set, your project gets:

- Pushed to HOJAI Cloud
- Provisioned on a per-tenant port (8800-8899)
- Exposed at `<name>.hojai.app` via a wildcard reverse-proxy route
- Persisted to disk so restarts don't lose projects

The `@hojai/cloud` SDK is the **programmatic client** for that service — build your own deployment dashboard, automated rollback, multi-tenant management, etc.

## Install

```bash
npm install @hojai/cloud
```

## Quick start

```ts
import { Cloud } from '@hojai/cloud';

const c = new Cloud({ apiKey, baseUrl: 'https://api.hojai.ai' });

// 1. Deploy a project (with auto-wait until 'live')
const dep = await c.deployments.deployAndWait({
  name: 'maya-store',
  type: 'marketplace',
  runtime: 'node-express',
  manifest: { /* full .hojai/manifest.json */ }
});
console.log(dep.url); // https://maya-store.hojai.app

// 2. List active deployments
const all = await c.deployments.list({ status: 'live' });

// 3. Health check
const h = await c.health.get();
console.log(`${h.live}/${h.deployments} live`);

// 4. Tear down
await c.deployments.teardown(dep.id);
```

## What's inside

3 sub-clients, ~9 methods:

| Sub-client | Purpose | Methods |
|---|---|---|
| `deployments` | Push, list, get, teardown, deployAndWait (with polling) | 5 |
| `route` | Wildcard subdomain proxy (`<sub>.hojai.app` → tenant port) | 1 |
| `health` | Service health + readiness | 2 |

## Subpath imports

```ts
import { Cloud } from '@hojai/cloud';
import { DeploymentsClient } from '@hojai/cloud/cloud';
import type { Deployment, DeployRequest } from '@hojai/cloud/types';
```

## Configuration

```ts
const c = new Cloud({
  apiKey: 'hojai_live_...',
  baseUrl: 'https://api.hojai.ai',
  timeout: 30_000,    // default 10s; remote deploys need more
  maxRetries: 5        // default 3
});
```

When `baseUrl` includes `localhost`, sub-clients automatically target port **4380** (the HOJAI Cloud port).

## The deployAndWait helper

Real deploys take seconds. The `deployAndWait()` helper polls every `pollMs` (default 2s) until status is `live`, `failed`, or `torn-down`, or until `timeoutMs` (default 2 min) elapses:

```ts
const dep = await c.deployments.deployAndWait(input, { pollMs: 3000, timeoutMs: 300_000 });
if (dep.status === 'failed') {
  console.error('Deploy failed:', dep.error);
}
```

## Tests

```bash
cd companies/HOJAI-AI/sdk/hojai-cloud
npm install
npm run build
npm test
```

## See also

- [`@hojai/cli`](../hojai-cli/) — the `npx hojai deploy` command that calls this SDK
- [`@hojai/foundation`](../hojai-foundation/) — CorpID for deployment auth
- [`@hojai/ai-spec`](../hojai-ai-spec/) — generates the `manifest` you POST to deploy

The SDK family is now **26 deep**.
