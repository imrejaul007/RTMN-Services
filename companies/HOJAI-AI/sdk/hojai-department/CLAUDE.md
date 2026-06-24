# CLAUDE.md - HOJAI Department SDK (@hojai/department)

> **Package:** `@hojai/department` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** Built and tested (12/12 tests passing, 0 failures)

## What this SDK is

**The official TypeScript client for the 9 horizontal Department OS services of RTMN.** Pairs with `@hojai/industry` to cover the **8 horizontal × 26 vertical matrix** that is the core RTMN value prop. Each Department OS runs as its own service on a dedicated port and exposes a domain-specific API (CRM, marketing, HR, finance, etc.). This SDK wraps all 9 into a single ergonomic client.

Every Department OS has a fundamentally different domain model (leads vs campaigns vs employees vs ledgers), so each sub-client is a **standalone class** with its own typed methods — no shared template surface like `IndustryBaseClient`.

| Sub-client | Purpose | Port |
|---|---|---|
| `sales` | CRM (leads, deals, accounts, contacts, activities) | 5055 |
| `marketing` | Brand, campaigns, audiences, content, journeys | 5500 |
| `customerSuccess` | Lifecycle, NPS, health, churn, check-ins, expansion | 4050 |
| `procurement` | Suppliers, requisitions, POs, RFQs, spend analytics | 5096 |
| `workforce` | Employees, departments, attendance, leave, payroll | 5077 |
| `finance` | Chart of accounts, ledger, trial balance, financial reports | 4801 |
| `operations` | Projects, processes, incidents, risks, SOPs | 5250 |
| `cxo` | Executive KPIs, strategic pillars, board reports, competitors | 5100 |
| `revenueIntelligence` | Revenue hub, demand, forecast, pricing, cohorts, scenarios | 5400 |

## Architecture

```
@hojai/department
├── Department                      # Main client (facade)
│   ├── sales                       # SalesClient          — 15 methods
│   ├── marketing                   # MarketingClient      — 16 methods
│   ├── customerSuccess             # CustomerSuccessClient — 12 methods
│   ├── procurement                 # ProcurementClient    — 14 methods
│   ├── workforce                   # WorkforceClient      — 16 methods
│   ├── finance                     # FinanceClient        — 11 methods
│   ├── operations                  # OperationsClient     — 14 methods
│   ├── cxo                         # CxoClient            — 10 methods
│   └── revenueIntelligence         # RevenueIntelligenceClient — 12 methods
├── DepartmentBaseClient            # Tiny base (config + port override)
├── DEPARTMENT_PORTS                # Map of department key → port
├── HojaiConfig                     # Shared config (apiKey, baseUrl, timeout, maxRetries, fetchImpl, logger)
└── resolveConfig()                 # Apply defaults
```

Self-contained — does NOT import from other `@hojai/*` packages. Each SDK carries its own copy of `HojaiConfig` and the `request()` + `buildQueryString` helpers (~80 LOC), so it can be installed and used independently.

## Quick Start

```ts
import { Department } from '@hojai/department';

const dept = new Department({ apiKey, baseUrl: 'https://api.hojai.ai' });

// Sales
const lead = await dept.sales.createLead({ name: 'Maya', source: 'web' });
const deal = await dept.sales.createDeal({ name: 'Maya × 1000', leadId: lead.id, value: { amount: 50000, currency: 'USD' } });

// Workforce
const emp = await dept.workforce.createEmployee({ name: 'Alice', email: '...', role: 'Engineer', hireDate: '2026-07-01' });

// CXO
const kpis = await dept.cxo.getKpis();

// Revenue Intelligence
const hub = await dept.revenueIntelligence.getRevenueHub();
const forecast = await dept.revenueIntelligence.forecast({ months: 12 });

// Cross-OS
const summary = {
  employees: (await dept.workforce.listEmployees()).length,
  openDeals: (await dept.sales.listDeals({ stage: 'negotiation' })).length,
  mrr: hub.totalMrr,
};
```

## Build & test

```bash
cd companies/HOJAI-AI/sdk/hojai-department
npm install
npm run build
npm test
```

## Files

```
hojai-department/
├── CLAUDE.md                       # This file
├── README.md                       # Quick start
├── package.json                    # npm config with subpath exports for 9 sub-clients
├── tsconfig.json
├── src/
│   ├── foundation-config.ts        # HojaiConfig + resolveConfig (copied)
│   ├── utils.ts                    # request() + buildQueryString (copied)
│   ├── types.ts                    # Common types (Money, DateRange, Contact)
│   ├── base.ts                     # DepartmentBaseClient + DEPARTMENT_PORTS map
│   ├── sales.ts                    # SalesClient (15 methods)
│   ├── marketing.ts                # MarketingClient (16 methods)
│   ├── customer-success.ts         # CustomerSuccessClient (12 methods)
│   ├── procurement.ts              # ProcurementClient (14 methods)
│   ├── workforce.ts                # WorkforceClient (16 methods)
│   ├── finance.ts                  # FinanceClient (11 methods)
│   ├── operations.ts               # OperationsClient (14 methods)
│   ├── cxo.ts                      # CxoClient (10 methods)
│   ├── revenue-intelligence.ts     # RevenueIntelligenceClient (12 methods)
│   ├── index.ts                    # Main Department class + re-exports
│   └── __tests__/index.test.ts     # 12 tests
└── dist/                           # Compiled output
```

## Tests (12/12 passing)

- Department client instantiates with all 9 sub-clients
- SalesClient.createLead (port 5055)
- MarketingClient.createCampaign (port 5500)
- CustomerSuccessClient.getAtRisk (port 4050)
- ProcurementClient.createSupplier (port 5096)
- WorkforceClient.createEmployee (port 5077)
- FinanceClient.getTrialBalance (port 4801)
- OperationsClient.reportIncident (port 5250)
- CxoClient.getKpis (port 5100)
- RevenueIntelligenceClient.getRevenueHub (port 5400)
- Retries on 5xx (calls mock 3 times before success)
- Throws on 4xx

## Related

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — Core platform client
- [@hojai/sutar](../hojai-sutar/CLAUDE.md) — SUTAR agent runtime SDK
- [@hojai/nexha](../hojai-nexha/CLAUDE.md) — Nexha federation network SDK
- [@hojai/marketplace](../hojai-marketplace/CLAUDE.md) — BAM marketplace SDK
- [@hojai/genie](../hojai-genie/CLAUDE.md) — Personal AI assistant SDK
- [@hojai/commerce](../hojai-commerce/CLAUDE.md) — RABTUL commerce SDK
- [@hojai/industry](../hojai-industry/CLAUDE.md) — 26 vertical Industry OSes (pairs with this)
- [@hojai/payment](../hojai-payment/CLAUDE.md) — Payments SDK
- [@hojai/logistics](../hojai-logistics/CLAUDE.md) — KHAIRMOVE logistics SDK
- [Department OS services](../../../../industry-os/services/) — the 9 underlying services wrapped here
