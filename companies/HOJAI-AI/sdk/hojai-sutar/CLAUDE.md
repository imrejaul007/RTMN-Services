# @hojai/sutar — SUTAR Agent Runtime SDK

> **Version:** 1.0.0
> **Last Updated:** 2026-06-24
> **Status:** ✅ **PRODUCTION-READY** — 11/11 tests pass. Built on top of @hojai/foundation. Wraps 15+ SUTAR services into a single ergonomic TypeScript client.

---

## What it is

`@hojai/sutar` is the official TypeScript SDK for the **SUTAR agent runtime** — the autonomous economic infrastructure of RTMN. It wraps every SUTAR service into a single, ergonomic client.

SUTAR OS is the **Autonomous Business OS** embedded in every Nexha (the "Linux-in-Android" model). This SDK is how external developers and AI applications interact with that runtime.

---

## What it covers

| Module | Endpoint prefix | Service(s) | Methods |
|---|---|---|---|
| `agent` | `/api/v1/agents` | merchant-agents, agent-analytics, agent-contracts, agent-learning, agent-marketplace, agent-orchestration, agent-teaming, agent-twin | create, get, list, updateStatus, runTask, getTask, learn, getStats |
| `orchestration` | `/api/v1/orchestrations` | agent-orchestration | run, get, list, cancel |
| `marketplace` | `/api/v1/marketplace` | agent-marketplace | search, get, install, uninstall, listInstalled, review, publish |
| `contracts` | `/api/v1/contracts` | agent-contracts | create, get, list, execute, evaluate, terminate |
| `learning` | `/api/v1/learning` | agent-learning | record, getStats, listEvents, submitFeedback, getModelVersion, triggerTraining |
| `acp` | `/api/v1/acp` | acp-protocol | send, listMessages, negotiate, getNegotiation, acceptNegotiation, rejectNegotiation, ping |

---

## Quick start

```bash
npm install @hojai/sutar
```

```ts
import { Sutar } from '@hojai/sutar';

const sutar = new Sutar({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// 1. Create a merchant agent for a fashion business
const agent = await sutar.agent.create({
  type: 'merchant',
  businessId: 'b-maya-collective',
  businessName: 'Maya Collective',
  industry: 'fashion',
  capabilities: ['negotiate', 'rfq-response', 'pricing']
});

// 2. Run a task — agent responds to an inbound RFQ
const task = await sutar.agent.runTask(agent.id, {
  type: 'negotiate-rfq',
  input: { product: 'cotton-tshirts', quantity: 1000, targetPrice: 5.00 }
});

// 3. Orchestrate multiple agents in sequence
const orch = await sutar.orchestration.run({
  pattern: 'sequential',
  steps: [
    { id: 'find-supplier', agentRole: 'merchant', input: { action: 'search-suppliers' } },
    { id: 'negotiate', agentRole: 'merchant', input: { action: 'negotiate' } },
    { id: 'book-logistics', agentRole: 'logistics', input: { action: 'book' } }
  ],
  initialInput: { product: 'cotton-tshirts', quantity: 1000 }
});

// 4. Send an ACP message to another agent
await sutar.acp.send({
  type: 'OFFER',
  sender: agent.id,
  receiver: 'agent-supplier-42',
  payload: { product: 'cotton-tshirts', quantity: 1000, pricePerUnit: 5.25 },
  conversationId: orch.orchestrationId
});

// 5. Record learning event
await sutar.learning.record({
  agentId: agent.id,
  type: 'success',
  input: { product: 'cotton-tshirts', quantity: 1000 },
  output: { finalPrice: 5.25 },
  outcome: 'positive',
  context: { counterparty: 'supplier-42' },
  weight: 0.8
});
```

---

## Subpath imports

For tree-shaking and smaller bundles, import individual clients:

```ts
import { AgentClient } from '@hojai/sutar/agent';
import { ACPClient } from '@hojai/sutar/acp';
```

---

## Architecture

```
@hojai/sutar
├── Sutar                    # Main client (facade)
│   ├── agent                # AgentClient — 8 methods
│   ├── orchestration        # OrchestrationClient — 4 methods
│   ├── marketplace          # MarketplaceClient — 7 methods
│   ├── contracts            # ContractClient — 6 methods
│   ├── learning             # LearningClient — 6 methods
│   └── acp                  # ACPClient — 7 methods
├── HojaiConfig              # Shared config interface
└── resolveConfig()          # Apply defaults
```

Built on `@hojai/foundation`:
- Same `HojaiConfig` (apiKey, baseUrl, timeout, maxRetries, fetchImpl, logger)
- Same `request()` helper (retries, exponential backoff, JSON/text response handling)
- Same graceful error pattern

---

## Configuration

```ts
const sutar = new Sutar({
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
  await sutar.agent.runTask(agentId, task);
} catch (err) {
  // err.message = "HTTP 404: ..." or "HTTP 500: ..."
  // SDK retries 5xx automatically (up to maxRetries)
  // SDK throws on 4xx immediately
}
```

---

## Tests

11/11 tests passing:

```bash
cd companies/HOJAI-AI/sdk/hojai-sutar
npm install
npm run build
npm test
```

Tests cover:
- Sutar client instantiation (all 6 sub-clients)
- AgentClient create / runTask
- OrchestrationClient run
- MarketplaceClient search
- ContractClient create
- LearningClient record
- ACPClient send / negotiate
- Retry on 5xx (calls mock 3 times before success)
- Throw on 4xx

---

## See also

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — CorpID, Memory, Twin, Trust, Flow, Policy clients
- [SUTAR OS Architecture](../../../../../docs/sutar-os/ARCHITECTURE.md) — Full SUTAR docs
- [ACP Protocol Spec](../../../../../docs/sutar-os/ACP.md) — Agent-to-agent protocol
- [Nexha Federation Plan](../../../../../.claude/plans/global-nexha-development-plan.md) — Where SUTAR runs