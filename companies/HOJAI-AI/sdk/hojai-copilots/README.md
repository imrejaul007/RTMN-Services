# @hojai/copilots

> The official TypeScript SDK for the **7 HOJAI department copilots**. One sub-client per copilot: agent, business, executive, finance, marketing, sales, support. ~50 methods total across all 7.

[![npm version](https://img.shields.io/npm/v/@hojai/copilots.svg)](https://www.npmjs.com/package/@hojai/copilots)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What it is

The 7 copilots are the **per-department AI assistants** in HOJAI. Each one runs on its own port and has its own domain-specific surface. This SDK wraps all 7 into a single ergonomic client.

| Sub-client | Port | What it does |
|---|---|---|
| `agent` | 4920 | Agent registry + workflow execution + lifecycle |
| `sales` | 4928 | Lead prioritization, talking points, email drafts, meeting prep, forecasting |
| `marketing` | 4929 | Campaign drafts, audience segments, competitor analysis, SEO |
| `finance` | 4930 | Invoicing, cashflow forecasting, expense categorization, tax estimates |
| `support` | 4925 | Ticket lifecycle, AI reply suggestions, knowledge base search, escalation |
| `executive` | 4933 | KPI dashboards, board reports, strategic planning, competitor monitoring |
| `business` | 4600 | Strategic insights, growth opportunities, risk assessment, ops reviews |

## Install

```bash
npm install @hojai/copilots
```

## Quick start

```ts
import { Copilots } from '@hojai/copilots';

const c = new Copilots({ apiKey, baseUrl: 'https://api.hojai.ai' });

// 1. Sales: prioritize a lead
const score = await c.sales.prioritize({ leadId: 'l-1' });
console.log(`${score.score}/100 → ${score.recommendedAction}`);

// 2. Marketing: draft a campaign
const campaign = await c.marketing.draftCampaign({
  name: 'Q3 Launch', channel: 'email', audience: 'enterprise'
});

// 3. Finance: forecast cashflow
const cf = await c.finance.forecastCashflow({ months: 6 });
console.log(`Net: $${cf.net}, Runway: ${cf.runway}mo`);

// 4. Support: suggest a reply
const reply = await c.support.suggestReply({ ticketId: 't-1' });
console.log(reply.reply);

// 5. Executive: get board report
const report = await c.executive.getBoardReport('Q2-2026');

// 6. Agent: execute a workflow
const result = await c.agent.execute({
  agentId: 'a-1',
  input: { customerId: 'c-1', action: 'process-refund' }
});
```

## Subpath imports

```ts
import { Copilots } from '@hojai/copilots';
import { SalesCopilotClient, FinanceCopilotClient } from '@hojai/copilots/copilots';
import type { LeadScore, Invoice, ForecastResult } from '@hojai/copilots/types';
```

## Configuration

```ts
const c = new Copilots({
  apiKey: 'hojai_live_...',
  baseUrl: 'https://api.hojai.ai',
  timeout: 10_000,        // default 10s
  maxRetries: 3            // default 3
});
```

When `baseUrl` includes `localhost`, each sub-client automatically targets its dedicated port.

## Tests

```bash
cd companies/HOJAI-AI/sdk/hojai-copilots
npm install
npm run build
npm test
```

## See also

- [`@hojai/industry`](../hojai-industry/) — 26 vertical Industry OSes
- [`@hojai/department`](../hojai-department/) — 9 horizontal Department OSes
- [`@hojai/sutar`](../hojai-sutar/) — Agent runtime (the agent copilot wraps this)

The SDK family is now **27 deep**.
