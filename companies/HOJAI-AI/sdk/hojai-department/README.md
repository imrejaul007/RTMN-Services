# @hojai/department

> The official TypeScript SDK for the 9 horizontal **Department OS** services of the RTMN ecosystem.

[![npm version](https://img.shields.io/npm/v/@hojai/department.svg)](https://www.npmjs.com/package/@hojai/department)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

RTMN has **8 horizontal Department OSes + 1 Revenue Intelligence OS** that run across **all 26 Industry OSes**, providing unified business functions (Sales, Marketing, HR, Finance, etc.). This SDK wraps all 9 of them into a single ergonomic client. **Pairs with [`@hojai/industry`](../hojai-industry/) to cover the 8 × 26 matrix that is the core RTMN value prop.**

## Install

```bash
npm install @hojai/department
```

## Quick start

```ts
import { Department } from '@hojai/department';

const dept = new Department({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// 1. Sales: create a lead, qualify, convert to deal
const lead = await dept.sales.createLead({ name: 'Maya Collective', source: 'web' });
await dept.sales.qualifyLead(lead.id, { score: 87 });
const deal = await dept.sales.createDeal({
  name: 'Maya × 1000 units',
  leadId: lead.id,
  value: { amount: 50000, currency: 'USD' }
});

// 2. Workforce: onboard a new employee
const employee = await dept.workforce.createEmployee({
  name: 'Alice',
  email: 'alice@example.com',
  role: 'Engineer',
  hireDate: '2026-07-01'
});

// 3. Customer Success: get at-risk customers
const atRisk = await dept.customerSuccess.getAtRisk(60);

// 4. Operations: report an incident
const incident = await dept.operations.reportIncident({
  title: 'API down',
  description: 'Payments API returning 500',
  severity: 'high'
});

// 5. CXO: executive KPI dashboard
const kpis = await dept.cxo.getKpis();

// 6. Revenue Intelligence: forecast + ROI
const hub = await dept.revenueIntelligence.getRevenueHub();
const forecast = await dept.revenueIntelligence.forecast({ months: 12 });

// 7. Cross-OS company view
const summary = {
  employees: (await dept.workforce.listEmployees()).length,
  openDeals: (await dept.sales.listDeals({ stage: 'negotiation' })).length,
  mrr: hub.totalMrr,
  monthlyRevenue: hub.streams.reduce((s, x) => s + x.mrr.amount, 0),
};
```

## What's inside

9 sub-clients, ~120 methods total:

| Sub-client | Service | Port | Domain | Methods |
|---|---|---|---|---|
| `sales` | Sales OS | 5055 | CRM, leads, deals, accounts, contacts, activities | 15 |
| `marketing` | Marketing OS | 5500 | Brand, campaigns, audiences, content, journeys | 16 |
| `customerSuccess` | Customer Success OS | 4050 | Lifecycle, NPS, health, churn, check-ins | 12 |
| `procurement` | Procurement OS | 5096 | Suppliers, requisitions, POs, RFQs, spend | 14 |
| `workforce` | Workforce OS | 5077 | Employees, departments, attendance, leave, payroll | 16 |
| `finance` | Finance OS | 4801 | Chart of accounts, ledger, trial balance, reports | 11 |
| `operations` | Operations OS | 5250 | Projects, processes, incidents, risks, SOPs | 14 |
| `cxo` | CXO OS | 5100 | KPIs, strategic pillars, board reports, competitors | 10 |
| `revenueIntelligence` | Revenue Intelligence OS | 5400 | Revenue hub, demand, forecast, pricing, cohorts, scenarios | 12 |

## Subpath imports

For tree-shaking:

```ts
import { SalesClient } from '@hojai/department/sales';
import { WorkforceClient } from '@hojai/department/workforce';
import { DepartmentBaseClient, DEPARTMENT_PORTS } from '@hojai/department/base';
```

## Configuration

```ts
const dept = new Department({
  apiKey: 'hojai_live_...',         // required
  baseUrl: 'https://api.hojai.ai',  // required
  timeout: 10_000,                  // optional, default 10s
  maxRetries: 3,                    // optional, default 3
  fetchImpl: customFetch,           // optional, for testing/proxies
  logger: (level, msg, meta) => {}  // optional
});
```

Each sub-client auto-routes to its dedicated port. To override (e.g. for staging), construct a sub-client with a custom `HojaiConfig.baseUrl`.

## Error handling

```ts
try {
  await dept.sales.getLead('missing');
} catch (err) {
  // err.message = "HTTP 404: ..."
  // SDK retries 5xx automatically (up to maxRetries)
  // SDK throws on 4xx immediately
}
```

## Tests

```bash
cd companies/HOJAI-AI/sdk/hojai-department
npm install
npm run build
npm test
```

## See also

- [@hojai/foundation](../hojai-foundation/) — CorpID, Memory, Twin, Trust, Flow, Policy
- [@hojai/sutar](../hojai-sutar/) — SUTAR agent runtime
- [@hojai/nexha](../hojai-nexha/) — Nexha federation network
- [@hojai/marketplace](../hojai-marketplace/) — BAM marketplace
- [@hojai/genie](../hojai-genie/) — Personal AI assistant
- [@hojai/commerce](../hojai-commerce/) — RABTUL commerce
- [@hojai/industry](../hojai-industry/) — 26 vertical Industry OSes (pairs with this SDK)
- [Department OS services](../../../../industry-os/services/) — the 9 underlying services wrapped here
