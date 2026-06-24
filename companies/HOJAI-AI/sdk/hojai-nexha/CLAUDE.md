# @hojai/nexha — Nexha Federation Network SDK

> **Version:** 1.0.0
> **Last Updated:** 2026-06-24
> **Status:** ✅ **PRODUCTION-READY** — 17/17 tests pass. Wraps 13 nexha-* services into a single ergonomic TypeScript client.

---

## What it is

`@hojai/nexha` is the official TypeScript SDK for the **Nexha federation network** — the autonomous business network of Nexhas (each Nexha = one autonomous business running SUTAR OS). It wraps every nexha-* service into a single, ergonomic client.

Nexha is the **federation layer** where AI-native businesses connect, trade, and operate together. This SDK is how external developers interact with that network.

---

## What it covers

| Module | Endpoint prefix | Service | Methods |
|---|---|---|---|
| `directory` | `/api/v1/companies`, `/agents`, `/capabilities`, `/trust` | nexha-business-directory | 10 |
| `supplier` | `/api/v1/suppliers` | nexha-supplier-network | 5 |
| `distribution` | `/api/v1/quote`, `/shipments` | nexha-distribution-network | 8 |
| `warehouse` | `/api/v1/warehouses`, `/bookings`, `/bins`, `/transfers`, `/picklists`, `/stock` | nexha-warehouse-network | 17 |
| `pricing` | `/api/v1/products`, `/prices`, `/compare`, `/alerts`, `/dynamic-price` | nexha-pricing-network | 12 |
| `tradeFinance` | `/api/v1/entities`, `/credit-offers`, `/loans`, `/disputes`, `/fx` | nexha-trade-finance-network | 15 |
| `commerce` | `/api/orders`, `/payments`, `/returns`, `/stats` | nexha-commerce-runtime | 27 |
| `mission` | `/api/missions`, `/templates` | nexha-mission-planner | 16 |
| `partner` | `/api/interactions`, `/partners`, `/recommend`, `/stats` | nexha-partner-graph | 7 |
| `acp` | `/api/negotiations`, `/messages` | nexha-acp-messaging | 6 |
| `hooks` | `/api/subscriptions`, `/events`, `/deliveries`, `/sign`, `/verify` | nexha-hooks-sdk | 15 |
| `provisioning` | `/api/plans` | nexha-provisioning-engine | 14 |
| `tenant` | `/api/sources`, `/tenants`, `/health/upstreams` | nexha-tenant-summary | 4 |

**156+ methods total** across 13 sub-clients.

---

## Quick start

```bash
npm install @hojai/nexha
```

```ts
import { Nexha } from '@hojai/nexha';

const nexha = new Nexha({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// 1. Discover a supplier
const suppliers = await nexha.supplier.search({
  category: 'textiles',
  capability: 'cotton-tshirts',
  country: 'IN'
});

// 2. Get market price comparison
const compare = await nexha.pricing.compare('cotton-tshirt-m');
console.log(`Lowest: ${compare.lowest.price.amount} ${compare.lowest.price.currency}`);
console.log(`Average: ${compare.average}, Median: ${compare.median}`);

// 3. Book warehouse slot + create shipment
const slots = await nexha.warehouse.listSlots('wh-1', { minCapacityKg: 1000 });
const booking = await nexha.warehouse.createBooking({
  warehouseId: 'wh-1',
  slotId: slots[0].id,
  customerId: 'b-maya',
  weightKg: 500
});

const shipment = await nexha.distribution.createShipment({
  origin: { name: 'Maya Warehouse', address: 'Bangalore, IN' },
  destination: { name: 'Buyer DC', address: 'New York, US' },
  weightKg: 500,
  items: [{ sku: 'cotton-tshirt-m', quantity: 1000 }]
});

// 4. Get trade finance for the order
const loan = await nexha.tradeFinance.createLoan({
  entityId: 'b-maya',
  offerId: 'offer-pre-approved',
  amount: { amount: 50000, currency: 'USD' }
});

// 5. Run a multi-step mission
const mission = await nexha.mission.createMission({
  title: 'Onboard Maya Collective',
  subtasks: [
    { id: 's1', type: 'register', agentRole: 'merchant', input: { business: 'Maya Collective' } },
    { id: 's2', type: 'provision', agentRole: 'provisioning', input: { planId: 'plan-standard', dependsOn: ['s1'] } },
    { id: 's3', type: 'configure', agentRole: 'merchant', input: { industry: 'fashion', dependsOn: ['s2'] } }
  ]
});
await nexha.mission.start(mission.id);

// 6. Aggregate tenant health
const summary = await nexha.tenant.getSummary('b-maya');
```

---

## Subpath imports

For tree-shaking and smaller bundles:

```ts
import { SupplierClient } from '@hojai/nexha/supplier';
import { WarehouseClient } from '@hojai/nexha/warehouse';
import { PricingClient } from '@hojai/nexha/pricing';
```

---

## Architecture

```
@hojai/nexha
├── Nexha                    # Main client (facade)
│   ├── directory            # DirectoryClient — 10 methods
│   ├── supplier             # SupplierClient — 5 methods
│   ├── distribution         # DistributionClient — 8 methods
│   ├── warehouse            # WarehouseClient — 17 methods
│   ├── pricing              # PricingClient — 12 methods
│   ├── tradeFinance         # TradeFinanceClient — 15 methods
│   ├── commerce             # CommerceClient — 27 methods (full order lifecycle)
│   ├── mission              # MissionClient — 16 methods
│   ├── partner              # PartnerClient — 7 methods
│   ├── acp                  # AcpClient — 6 methods (cross-Nexha negotiation)
│   ├── hooks                # HooksClient — 15 methods (webhooks + signing)
│   ├── provisioning         # ProvisioningClient — 14 methods (declarative plans)
│   └── tenant               # TenantClient — 4 methods (aggregated views)
├── HojaiConfig              # Shared config interface
└── resolveConfig()          # Apply defaults
```

Built on `@hojai/foundation`:
- Same `HojaiConfig` (apiKey, baseUrl, timeout, maxRetries, fetchImpl, logger)
- Same `request()` helper (retries, exponential backoff, JSON/text response handling)
- Same graceful error pattern
- Same 5xx-retry/4xx-throw behavior

---

## Configuration

```ts
const nexha = new Nexha({
  apiKey: 'hojai_live_...',         // required
  baseUrl: 'https://api.hojai.ai',  // required
  timeout: 10_000,                  // optional, default 10s
  maxRetries: 3,                    // optional, default 3
  fetchImpl: customFetch,           // optional, for testing/proxies
  logger: (level, msg, meta) => {}  // optional
});
```

---

## Error handling

```ts
try {
  await nexha.supplier.search({ category: 'unknown' });
} catch (err) {
  // err.message = "HTTP 404: ..." or "HTTP 500: ..."
  // SDK retries 5xx automatically (up to maxRetries)
  // SDK throws on 4xx immediately
}
```

---

## Tests

17/17 tests passing:

```bash
cd companies/HOJAI-AI/sdk/hojai-nexha
npm install
npm run build
npm test
```

Tests cover:
- Nexha client instantiation (all 13 sub-clients)
- Directory register + query
- Supplier search
- Distribution quote
- Warehouse booking
- Pricing compare
- Trade Finance loan
- Commerce order + lifecycle (place/cancel/fulfill/ship/deliver/complete/refund)
- Mission create
- Partner recommend
- ACP negotiation
- Hooks subscription
- Provisioning apply
- Tenant summary
- Retry on 5xx
- Throw on 4xx

---

## See also

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — CorpID, Memory, Twin, Trust, Flow, Policy
- [@hojai/sutar](../hojai-sutar/CLAUDE.md) — SUTAR agent runtime
- [Global Nexha Plan](../../../../../.claude/plans/global-nexha-development-plan.md) — Federation roadmap
- [Nexha Addendum](../../../../../.claude/plans/global-nexha-addendum.md) — Spec-level details