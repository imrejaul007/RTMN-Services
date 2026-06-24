# @hojai/nexha

> TypeScript SDK for the Nexha federation network. One client for every Nexha service.

[![Status](https://img.shields.io/badge/status-production--ready-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-17%2F17%20passing-brightgreen)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()

## What is Nexha?

**Nexha** is the **federation network** where AI-native businesses connect, trade, and operate together. Each Nexha is an autonomous business running **SUTAR OS** (the Autonomous Business OS).

This SDK wraps 13 Nexha services into a single ergonomic client.

## What's inside

- 📂 **Directory** — register companies, search by capability, trust linkages
- 🏭 **Supplier** — discover B2B suppliers, register your own
- 🚚 **Distribution** — quote shipments, track delivery, lifecycle management
- 🏢 **Warehouse** — book slots, manage bins, transfers, pick lists
- 💰 **Pricing** — product catalog, market comparison, price alerts, dynamic pricing
- 💳 **Trade Finance** — credit offers, loans, repayments, disputes, FX
- 🛒 **Commerce** — full order lifecycle, payments, returns
- 🎯 **Mission** — multi-step mission orchestration, templates
- 🤝 **Partner** — relationships, interactions, partner recommendations
- 📡 **ACP** — cross-Nexha negotiation, multi-party messaging
- 🪝 **Hooks** — webhook subscriptions, event delivery, signing
- ⚙️ **Provisioning** — declarative plans, state transitions, apply/destroy
- 📊 **Tenant** — aggregated tenant views + upstream health

## Install

```bash
npm install @hojai/nexha
```

## Quick start

```ts
import { Nexha } from '@hojai/nexha';

const nexha = new Nexha({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// Discover suppliers
const suppliers = await nexha.supplier.search({
  category: 'textiles',
  country: 'IN'
});

// Compare market prices
const compare = await nexha.pricing.compare('cotton-tshirt-m');

// Book warehouse + ship
const slots = await nexha.warehouse.listSlots('wh-1');
const booking = await nexha.warehouse.createBooking({
  warehouseId: 'wh-1', slotId: slots[0].id, customerId: 'b-maya', weightKg: 500
});

// Get trade finance
const loan = await nexha.tradeFinance.createLoan({
  entityId: 'b-maya',
  offerId: 'offer-1',
  amount: { amount: 50000, currency: 'USD' }
});

// Run a multi-step mission
const mission = await nexha.mission.createMission({
  title: 'Onboard new customer',
  subtasks: [{ id: 's1', type: 'register', agentRole: 'merchant', input: {} }]
});
```

## Subpath imports

For tree-shaking:

```ts
import { SupplierClient } from '@hojai/nexha/supplier';
import { WarehouseClient } from '@hojai/nexha/warehouse';
```

## Modules

| Module | Purpose |
|---|---|
| `nexha.directory` | Register companies, search by capability |
| `nexha.supplier` | B2B supplier discovery |
| `nexha.distribution` | Shipment quotes + tracking |
| `nexha.warehouse` | Slot booking, WMS, bins, transfers |
| `nexha.pricing` | Market price comparison, dynamic pricing |
| `nexha.tradeFinance` | Loans, credit offers, FX, disputes |
| `nexha.commerce` | Orders, payments, returns |
| `nexha.mission` | Multi-step mission orchestration |
| `nexha.partner` | Partner relationships, recommendations |
| `nexha.acp` | Cross-Nexha negotiation |
| `nexha.hooks` | Webhooks + signature verification |
| `nexha.provisioning` | Declarative resource plans |
| `nexha.tenant` | Aggregated tenant summary |

## Configuration

```ts
const nexha = new Nexha({
  apiKey: '...',         // required
  baseUrl: '...',        // required
  timeout: 10_000,       // default 10s
  maxRetries: 3,         // default 3 (only on 5xx)
  fetchImpl: customFetch,// optional, for testing
  logger: console.log    // optional
});
```

## Development

```bash
npm install
npm run build
npm test
```

17/17 tests pass.

## License

MIT © HOJAI AI