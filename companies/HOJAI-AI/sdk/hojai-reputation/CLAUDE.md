# @hojai/reputation — Trust & Reputation SDK

> **Package:** `@hojai/reputation` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** ✅ **PRODUCTION-READY** — 30/30 tests pass. Wraps 6 trust surfaces into a single ergonomic client: agent reputation, dispute resolution, risk detection, SADA trust, trust network graph, leaderboards.

---

## What this SDK is

**The unified client for the HOJAI trust & reputation layer.** Every cross-network transaction, agent-to-agent negotiation, merchant interaction, and federation hand-off flows through reputation. This SDK is what you use to check trust scores, raise disputes, assess risk, manage verifications, query the trust graph, and pull leaderboards.

It handles:
- HTTP transport (retries, timeouts, exponential backoff)
- Authentication (Bearer token)
- Error handling (`HttpError` with status + body)
- TypeScript types for every entity
- Subpath exports for tree-shaking
- 58 public methods across 6 sub-clients

---

## Quick Start

```ts
import { Reputation } from '@hojai/reputation';

const rep = new Reputation({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// 1. Check an agent's trust before transacting
const trust = await rep.agent.getTrust('agent-maya-1');
if (trust.trustScore < 70) {
  throw new Error('Trust too low — find another supplier');
}

// 2. Record the transaction
await rep.agent.recordTransaction({
  agentId: 'agent-maya-1',
  counterpartyAgentId: 'agent-us-1',
  type: 'purchase',
  amount: 50000,
  currency: 'INR',
  outcome: 'success'
});

// 3. If something goes wrong, raise a dispute
const dispute = await rep.dispute.create({
  raisedBy: 'agent-us-1',
  raisedAgainst: 'agent-maya-1',
  reason: 'non_delivery',
  description: 'Order placed 2026-06-01 — not delivered as of 2026-06-15',
  amount: 50000,
  currency: 'INR'
});

// 4. Submit evidence
await rep.dispute.addEvidence({
  disputeId: dispute.id,
  type: 'communication',
  url: 'https://example.com/slack-thread-export',
  description: '3 emails + 1 chat thread showing non-response'
});

// 5. Get AI-assisted dispute analysis
const analysis = await rep.dispute.analyze(dispute.id);
console.log(`AI recommends: ${analysis.recommendation} (confidence: ${analysis.confidence})`);

// 6. Pre-flight risk assessment before high-value transactions
const risk = await rep.risk.assess({
  subjectType: 'agent',
  subjectId: 'agent-maya-1',
  context: { amount: 100000, currency: 'INR', type: 'transfer' }
});
if (risk.recommendation === 'block') { /* refuse */ }

// 7. Get SADA trust score (the canonical backbone)
const sada = await rep.sada.getTrust('agent-maya-1');
console.log(`SADA: ${sada.score} (${sada.band}, trend: ${sada.trend})`);

// 8. Endorse a trusted partner in the trust graph
await rep.network.endorse({
  fromEntityId: 'agent-us-1',
  toEntityId: 'agent-maya-1',
  weight: 0.9,
  context: '10 successful transactions over 6 months'
});

// 9. Show a leaderboard of top-trusted agents
const topAgents = await rep.leaderboard.agentTopTrusted(20);
```

---

## Sub-Clients (6 total, 58 methods)

| Sub-client | Endpoint prefix | Service(s) | Key methods |
|---|---|---|---|
| `rep.agent` | `/api/reputation/*` | agent-reputation | `create`, `get`, `getTrust`, `recordTransaction`, `listTransactions`, `raiseDispute`, `verify`, `block`, `unblock`, `getLeaderboard`, `getStats` (11) |
| `rep.dispute` | `/api/disputes/*`, `/api/mediations/*`, `/api/arbitrations/*` | dispute-resolution | `create`, `get`, `update`, `resolve`, `escalate`, `listByAgent`, `listByStatus`, `addEvidence`, `listEvidence`, `analyze`, `mediate`, `getMediation`, `proposeMediation`, `decideArbitration` (14) |
| `rep.risk` | `/api/risk/*` | risk-detection-service | `assess`, `getHistory`, `flag`, `dismissFlag`, `listFlags`, `assessBatch`, `getThresholds`, `setThresholds` (8) |
| `rep.sada` | `/api/trust/*`, `/api/governance/*`, `/api/verifications/*`, `/api/audit` | sada-os (Trust/Governance/Risk/Verification) | `getTrust`, `recordTrust`, `recordActivity`, `getHistory`, `getLeaderboard`, `listPolicies`, `createPolicy`, `validatePolicy`, `submitVerification`, `getVerification`, `listVerifications`, `approveVerification`, `getAudit` (13) |
| `rep.network` | `/api/entities/*`, `/api/endorsements/*`, `/api/verifications/*`, `/api/risk-flags/*`, `/api/audit` | trust-network | `listEntities`, `getEntity`, `createEntity`, `listByType`, `getTopTrusted`, `endorse`, `listEndorsements`, `submitVerification`, `listVerifications`, `raiseRiskFlag`, `listRiskFlags`, `getAudit` (12) |
| `rep.leaderboard` | `/api/leaderboard/*` | reputation-leaderboard | `get`, `agentTopTrusted`, `merchantTopTrusted`, `mostEndorsed`, `lowestRisk`, `highestVolume` (6) |

---

## Subpath Imports

```ts
import { AgentReputationClient } from '@hojai/reputation/agent';
import { DisputeClient } from '@hojai/reputation/dispute';
import { RiskClient } from '@hojai/reputation/risk';
import { SadaClient } from '@hojai/reputation/sada';
import { TrustNetworkClient } from '@hojai/reputation/network';
import { LeaderboardClient } from '@hojai/reputation/leaderboard';
import { request, sleep, backoff, HttpError, buildUrl } from '@hojai/reputation/utils';
```

---

## Architecture

```
@hojai/reputation
├── Reputation                # Main client (facade)
│   ├── agent                 # AgentReputationClient    — 11 methods
│   ├── dispute               # DisputeClient            — 14 methods
│   ├── risk                  # RiskClient               — 8 methods
│   ├── sada                  # SadaClient               — 13 methods
│   ├── network               # TrustNetworkClient       — 12 methods
│   └── leaderboard           # LeaderboardClient        — 6 methods
├── HojaiConfig               # Shared config interface
├── resolveConfig()           # Apply defaults
└── request()                 # HTTP with retries + backoff
```

Built on `@hojai/foundation`'s `HojaiConfig` pattern (same as all other `@hojai/*` SDKs).

---

## Configuration

```ts
const rep = new Reputation({
  apiKey: 'hojai_live_...',     // required — Bearer token
  baseUrl: 'https://api.hojai.ai', // optional, default https://api.hojai.ai
  timeout: 15_000,              // optional, default 10s
  maxRetries: 3,                // optional, default 3
  fetchImpl: customFetch,       // optional, for testing/proxies
  logger: (level, msg, meta) => {} // optional
});
```

---

## Trust Bands

All trust scores map to bands:

| Band | Score range | Badge |
|---|---|---|
| `platinum` | 90-100 | 🏆 |
| `gold` | 80-89 | ⭐ |
| `silver` | 70-79 | 🥈 |
| `bronze` | 50-69 | 🥉 |
| `iron` | 30-49 | ⚙️ |
| `restricted` | 0-29 | ⚠️ |

---

## Use Cases

**Pre-flight agent trust check (before commerce):**
```ts
const trust = await rep.agent.getTrust(merchantAgentId);
if (trust.trustScore < 70) throw new Error('Trust too low');
```

**Build a marketplace with trust signals:**
```ts
const listings = await marketplace.search({ category: 'product' });
const enriched = await Promise.all(listings.map(async (l) => {
  const trust = await rep.sada.getTrust(l.sellerId);
  return { ...l, trustScore: trust.score, trustBand: trust.band };
}));
```

**Automated dispute resolution:**
```ts
const disputes = await rep.dispute.listByAgent('agent-x');
for (const d of disputes) {
  const analysis = await rep.dispute.analyze(d.id);
  if (analysis.confidence > 0.9) await rep.dispute.resolve(d.id, { outcome: analysis.recommendation });
}
```

**Risk-based pre-flight for high-value transactions:**
```ts
const risk = await rep.risk.assess({ subjectType: 'agent', subjectId, context: { amount } });
if (risk.recommendation === 'block') throw new Error('Risk blocked');
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
hojai-reputation/
├── CLAUDE.md                    # This file
├── README.md                    # Quick start
├── package.json                 # npm config with subpath exports
├── tsconfig.json
├── src/
│   ├── foundation-config.ts     # HojaiConfig + resolveConfig
│   ├── utils.ts                 # request, sleep, backoff, HttpError, buildUrl
│   ├── agent.ts                 # AgentReputationClient (11 methods)
│   ├── dispute.ts               # DisputeClient (14 methods)
│   ├── risk.ts                  # RiskClient (8 methods)
│   ├── sada.ts                  # SadaClient (13 methods)
│   ├── network.ts               # TrustNetworkClient (12 methods)
│   ├── leaderboard.ts           # LeaderboardClient (6 methods)
│   ├── index.ts                 # Main Reputation facade
│   └── __tests__/
│       └── index.test.ts        # 30 tests
└── dist/                        # Compiled output
    ├── index.{js,d.ts,js.map,d.ts.map}
    ├── agent.{js,d.ts,...}
    ├── dispute.{js,d.ts,...}
    ├── risk.{js,d.ts,...}
    ├── sada.{js,d.ts,...}
    ├── network.{js,d.ts,...}
    ├── leaderboard.{js,d.ts,...}
    ├── foundation-config.{js,d.ts,...}
    ├── utils.{js,d.ts,...}
    └── __tests__/index.test.{js,d.ts,...}
```

---

## See also

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — Base SDK with simplified `trust` sub-client
- [@hojai/sutar](../hojai-sutar/CLAUDE.md) — SUTAR agents (consume reputation for trust decisions)
- [@hojai/payment](../hojai-payment/CLAUDE.md) — Payment SDK (pre-flight checks before payments)
- [SADA OS docs](../../../companies/HOJAI-AI/platform/trust/sada-os/CLAUDE.md) — Full SADA backbone architecture
- [Agent Reputation docs](../../../companies/HOJAI-AI/platform/trust/agent-reputation/CLAUDE.md) — Agent reputation service