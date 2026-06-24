# @hojai/foundation

Official HOJAI Foundation SDK for building AI-native applications.

## What it does

Wraps the six HOJAI Foundation services into a single unified client:

- **CorpID** — Universal identity for companies, users, agents, devices
- **MemoryOS** — Persistent agent memory (15 memory types)
- **TwinOS** — Digital twins for every entity
- **SADA/TrustOS** — Trust verification + confidence scoring
- **FlowOS** — Workflow orchestration
- **PolicyOS** — Compliance + governance

## Install

```bash
npm install @hojai/foundation
```

## Quick start

```ts
import { Hojai } from '@hojai/foundation';

const hojai = new Hojai({
  apiKey: process.env.HOJAI_KEY,
  baseUrl: 'https://api.hojai.ai'
});

// CorpID: create a company
const company = await hojai.corpId.create({
  type: 'company',
  metadata: { name: 'Maya Collective', country: 'IN' }
});

// MemoryOS: write persistent memory
await hojai.memory.write({
  type: 'preferences',
  scope: { ownerId: company.id, ownerType: 'company' },
  content: { categories: ['restaurant', 'fashion'] }
});

// TwinOS: create a customer twin
const customer = await hojai.twin.create({
  type: 'customer',
  ownerCorpId: company.id,
  attributes: { name: 'Alice' }
});

// TrustOS: verify trust
const trust = await hojai.trust.getScore(company.id);
if (trust.overall > 0.8) {
  // proceed with high-trust operation
}

// FlowOS: run a workflow
const run = await hojai.flow.run('onboard-customer', {
  inputs: { customerId: customer.id }
});

// PolicyOS: check compliance
const decision = await hojai.policy.evaluate({
  action: 'send_data_to_third_party',
  context: { recipient: 'analytics-co' },
  corpId: company.id
});
```

## Configuration

```ts
interface HojaiConfig {
  apiKey?: string;        // Bearer token
  baseUrl: string;        // Default: https://api.hojai.ai
  timeout?: number;        // Default: 10000ms
  maxRetries?: number;     // Default: 3
  fetchImpl?: typeof fetch; // For testing
  logger?: Function;       // Custom logger
}
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `HOJAI_KEY` | (none) | API key for HOJAI Cloud |
| `HOJAI_BASE_URL` | `https://api.hojai.ai` | Override base URL |

## Sub-path exports

```ts
import { Hojai } from '@hojai/foundation';
import { CorpIDClient } from '@hojai/foundation/corp-id';
import { MemoryClient } from '@hojai/foundation/memory';
import { TwinClient } from '@hojai/foundation/twin';
import { TrustClient } from '@hojai/foundation/trust';
import { FlowClient } from '@hojai/foundation/flow';
import { PolicyClient } from '@hojai/foundation/policy';
```

## Build

```bash
npm install
npx tsc
```

## Test

```bash
node --test dist/__tests__/__tests__/index.test.js
```

## License

MIT
