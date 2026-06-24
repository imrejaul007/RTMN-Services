# CLAUDE.md - HOJAI Copilots SDK (@hojai/copilots)

> **Package:** `@hojai/copilots` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** Built and tested (10/10 tests passing, 0 failures)

## What this SDK is

**The official TypeScript client for the 7 HOJAI department copilots.** Each copilot is a self-contained AI service on its own port, with its own domain-specific surface. This SDK wraps all 7 into a single ergonomic client.

| Sub-client | Port | Methods | Domain |
|---|---|---|---|
| `agent` | 4920 | 11 | Agent runtime, executions, workflows |
| `sales` | 4928 | 8 | Lead priority, talking points, email/meeting prep, forecast |
| `marketing` | 4929 | 7 | Campaign drafts, audiences, competitor analysis, SEO |
| `finance` | 4930 | 8 | Invoicing, cashflow forecast, expense categorize, tax |
| `support` | 4925 | 9 | Tickets, AI reply suggestions, KB search, escalation |
| `executive` | 4933 | 7 | KPIs, board reports, strategic plans, competitor monitor |
| `business` | 4600 | 6 | Strategic insights, growth ops, risk assessment |

**Total: 56 methods across 7 sub-clients.**

## Architecture

```
@hojai/copilots
├── Copilots                  # Main client (facade)
│   ├── agent                # AgentCopilotClient      — 11 methods
│   ├── sales                # SalesCopilotClient      — 8
│   ├── marketing            # MarketingCopilotClient  — 7
│   ├── finance              # FinanceCopilotClient    — 8
│   ├── support              # SupportCopilotClient    — 9
│   ├── executive            # ExecutiveCopilotClient  — 7
│   └── business             # BusinessCopilotClient   — 6
├── HojaiConfig                # Shared config
└── resolveConfig()            # Apply defaults
```

Self-contained — does NOT import from other `@hojai/*` packages. Carries its own copy of `HojaiConfig` + `request()` + `buildQueryString` (~80 LOC).

## Quick Start

```ts
import { Copilots } from '@hojai/copilots';

const c = new Copilots({ apiKey, baseUrl: 'https://api.hojai.ai' });

// 1. Sales: prioritize a lead
const score = await c.sales.prioritize({ leadId: 'l-1' });

// 2. Marketing: draft a campaign
const campaign = await c.marketing.draftCampaign({ name: 'Q3 Launch', channel: 'email', audience: 'enterprise' });

// 3. Finance: forecast cashflow
const cf = await c.finance.forecastCashflow({ months: 6 });

// 4. Support: suggest a reply
const reply = await c.support.suggestReply({ ticketId: 't-1' });

// 5. Executive: get board report
const report = await c.executive.getBoardReport('Q2-2026');

// 6. Business: strategic analysis
const insight = await c.business.strategicAnalysis({ topic: 'market expansion' });

// 7. Agent: execute a workflow
const result = await c.agent.execute({ agentId: 'a-1', input: { x: 1 } });
```

## Build & test

```bash
cd companies/HOJAI-AI/sdk/hojai-copilots
npm install
npm run build
npm test
```

## Tests (10/10 passing)

- Copilots client instantiates with 7 sub-clients
- AgentCopilot.createAgent (port 4920)
- SalesCopilot.prioritize (port 4928)
- MarketingCopilot.draftCampaign (port 4929)
- FinanceCopilot.forecastCashflow (port 4930)
- SupportCopilot.suggestReply (port 4925)
- ExecutiveCopilot.getBoardReport (port 4933)
- BusinessCopilot.strategicAnalysis (port 4600)
- Retries on 5xx
- Throws on 4xx

## Related

- [`@hojai/industry`](../hojai-industry/CLAUDE.md) — 26 vertical Industry OSes
- [`@hojai/department`](../hojai-department/CLAUDE.md) — 9 horizontal Department OSes
- [`@hojai/sutar`](../hojai-sutar/CLAUDE.md) — Agent runtime (the agent copilot wraps this)
- [Copilot services](https://github.com/hojai/copilots) — the underlying Express services

## Why this matters

Each copilot was a standalone service. The 7 were built by different teams at different times with different API shapes. This SDK unifies them — one consistent client surface, one consistent error model, one consistent retry policy.

The SDK family is now **27 deep** with this addition.
