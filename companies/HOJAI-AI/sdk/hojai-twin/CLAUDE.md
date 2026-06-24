# @hojai/twin — TwinOS SDK

> **Package:** `@hojai/twin` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** ✅ **PRODUCTION-READY** — Wraps TwinOS Hub (port 4705) + 4 specialized twin services (customer, order, employee, voice).

---

## What this SDK is

**The official client for HOJAI TwinOS.** TwinOS provides domain-centric digital twins — domain-aware representations of customers, orders, employees, products, voice profiles, and more. TwinOS is the digital-twin fabric that powers commerce, customer experience, supply chain, and HR across the HOJAI ecosystem.

Any developer building digital-twin-aware applications on HOJAI should use this SDK.

It handles:
- HTTP transport (retries, timeouts, exponential backoff)
- Authentication
- Error handling
- TypeScript types for every entity (CustomerTwin, OrderTwin, EmployeeTwin, VoiceProfile)
- Subpath exports for tree-shaking

---

## Quick Start

```ts
import { Twin } from '@hojai/twin';

const t = new Twin({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// 1. Generic twin CRUD via the Hub
const twins = await t.hub.list({ type: 'customer' });
const newTwin = await t.hub.create({ type: 'product', name: 'Cotton t-shirt' });
await t.hub.setState(newTwin.id, { inStock: true });

// 2. Specialized: customer twin (LTV, churn, events)
const cust = await t.customer.createCustomer({ corpId: 'c-1', name: 'Alice' });
await t.customer.recordEvent(cust.id, {
  type: 'purchase',
  properties: { sku: 'tee-1', amount: 2000 },
  occurredAt: new Date().toISOString()
});
const ltv = await t.customer.getLtv(cust.id);

// 3. Specialized: order twin (lifecycle, status transitions)
const order = await t.order.createOrder({
  customerId: 'c-1',
  lines: [{ productId: 'p-1', name: 'Tee', quantity: 2, unitPrice: { amount: 2000, currency: 'USD' } }]
});
await t.order.transitionStatus(order.id, 'shipped');

// 4. Voice twin (TTS, STT)
const recording = await t.voice.synthesize({ voiceProfileId: 'v-1', text: 'Welcome to HOJAI' });
const transcript = await t.voice.transcribe({ audioUrl: recording.audioUrl, language: 'en' });
```

---

## Sub-Clients (5 total)

| Sub-client | Service | Port | Purpose |
|---|---|---|---|
| `t.hub` | TwinOS Hub | 4705 | Generic twin CRUD, state, identity, lifecycle, relationships, sync, stats, categories |
| `t.customer` | Customer Twin | 4895 | Customer profile + LTV + churn prediction + segments + event recording |
| `t.order` | Order Twin | 5310 | Order lifecycle + cart + shipment + return + status transitions |
| `t.employee` | Employee Twin | 4730 | Employee profile + performance reviews + skill tracking + manager + time-off |
| `t.voice` | Voice Twin | 4876 | TTS + STT + voice profiles + recording history |

---

## Subpath Imports

```ts
import { TwinHubClient } from '@hojai/twin/hub';
import { CustomerTwinClient } from '@hojai/twin/customer';
import { OrderTwinClient } from '@hojai/twin/order';
import { EmployeeTwinClient } from '@hojai/twin/employee';
import { VoiceTwinClient } from '@hojai/twin/voice';
import type { CustomerTwin, OrderTwin, EmployeeTwin, VoiceProfile } from '@hojai/twin/types';
```

---

## Architecture

```
@hojai/twin
├── Twin                            # Main client (facade)
│   ├── hub                         # TwinHubClient       — generic CRUD
│   ├── customer                    # CustomerTwinClient   — customer-specific
│   ├── order                       # OrderTwinClient      — order-specific
│   ├── employee                    # EmployeeTwinClient   — employee-specific
│   └── voice                       # VoiceTwinClient      — voice-specific
├── HojaiConfig                      # Shared config interface
├── resolveConfig()                  # Apply defaults
└── request()                        # HTTP with retries + backoff
```

Built on `@hojai/foundation`'s `HojaiConfig` pattern (same as all other `@hojai/*` SDKs).

---

## Configuration

```ts
const t = new Twin({
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
| `TWIN_PORTS.hub` | 4705 | TwinOS Hub port |
| `TWIN_PORTS.customer` | 4895 | Customer Twin port |
| `TWIN_PORTS.order` | 5310 | Order Twin port |
| `TWIN_PORTS.employee` | 4730 | Employee Twin port |
| `TWIN_PORTS.voice` | 4876 | Voice Twin port |
| `TWIN_PORTS.capabilityProfile` | 4150 | Capability Profile port |

---

## Twin Categories

TwinOS organizes twins into categories:

| Category | Examples |
|---|---|
| `foundation` | `corpid.identity`, `memory.knowledge`, `goal.objective`, `decision.policy`, `agent.ai` |
| `commerce` | `commerce.customer`, `commerce.order`, `commerce.wallet`, `commerce.product`, `commerce.cart`, `commerce.coupon` |
| `people` | `people.employee`, `people.user`, `people.founder`, `people.candidate` |
| `ai` | `ai.memory`, `ai.conversation`, `ai.intent`, `ai.goal`, `ai.agent`, `ai.knowledge` |
| `hospitality` | `hospitality.hotel`, `hospitality.room`, `hospitality.guest`, `hospitality.restaurant` |
| `healthcare` | `healthcare.patient`, `healthcare.doctor`, `healthcare.hospital`, `healthcare.prescription` |
| `finance` | `finance.asset`, `finance.budget`, `finance.expense`, `finance.invoice`, `finance.ledger` |
| `marketing` | `marketing.campaign`, `marketing.audience`, `marketing.ad`, `marketing.creative` |
| `operations` | `ops.project`, `ops.task`, `ops.process`, `ops.incident`, `ops.resource` |

---

## Use Cases

**Build a 360° customer view:**
```ts
const customer = await t.customer.createCustomer({ corpId: 'c-1', name: 'Alice' });
await t.customer.recordEvent(customer.id, { type: 'page_view', properties: { url: '/products' } });
const ltv = await t.customer.getLtv(customer.id);
const orders = await t.order.list({ customerId: customer.id });
```

**Build an order-tracking dashboard:**
```ts
const order = await t.order.createOrder({ customerId: 'c-1', lines: [...] });
await t.order.transitionStatus(order.id, 'paid');
await t.order.transitionStatus(order.id, 'shipped');
await t.order.transitionStatus(order.id, 'delivered');
```

**Build a voice-enabled AI assistant:**
```ts
const transcript = await t.voice.transcribe({ audioUrl: '...', language: 'en' });
const response = await ai.complete({ prompt: transcript.text });
const audio = await t.voice.synthesize({ voiceProfileId: 'v-1', text: response });
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
hojai-twin/
├── CLAUDE.md                    # This file
├── README.md                    # Quick start
├── package.json                 # npm config with subpath exports
├── tsconfig.json
├── src/
│   ├── foundation-config.ts     # HojaiConfig + resolveConfig
│   ├── utils.ts                 # request, buildQueryString
│   ├── types.ts                 # TWIN_PORTS, TwinRecord, Money, …
│   ├── hub.ts                   # TwinHubClient (port 4705)
│   ├── customer.ts              # CustomerTwinClient (port 4895)
│   ├── order.ts                 # OrderTwinClient (port 5310)
│   ├── employee.ts              # EmployeeTwinClient (port 4730)
│   ├── voice.ts                 # VoiceTwinClient (port 4876)
│   ├── index.ts                 # Main Twin facade
│   └── __tests__/
│       └── index.test.ts        # Tests
└── dist/                        # Compiled output
    ├── index.{js,mjs,d.ts}
    ├── hub.{js,mjs,d.ts}
    ├── customer.{js,mjs,d.ts}
    ├── order.{js,mjs,d.ts}
    ├── employee.{js,mjs,d.ts}
    ├── voice.{js,mjs,d.ts}
    ├── types.{js,mjs,d.ts}
    └── __tests__/index.test.js
```

---

## See also

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — Base SDK with simplified `twin` sub-client for basic usage
- [@hojai/memory](../hojai-memory/CLAUDE.md) — Memory SDK (twins own memory partitions via the Twin Memory Bridge)
- [@hojai/payment](../hojai-payment/CLAUDE.md) — Payment SDK (orders, wallets, refunds)
- [TwinOS Documentation](../../../companies/HOJAI-AI/platform/twinos/CLAUDE.md) — Full TwinOS architecture