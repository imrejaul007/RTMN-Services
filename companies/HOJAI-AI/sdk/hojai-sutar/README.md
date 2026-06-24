# @hojai/sutar

> TypeScript SDK for the SUTAR agent runtime. One client for every SUTAR service.

[![Status](https://img.shields.io/badge/status-production--ready-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-11%2F11%20passing-brightgreen)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()

## What is SUTAR?

**SUTAR** is the **Autonomous Business OS** that powers every Nexha (the network of AI-native businesses). It handles:

- 🤖 **Agents** — merchant, analytics, contracts, learning, marketplace, orchestration, teaming, twin
- 🎼 **Orchestration** — multi-agent workflow patterns (sequential, parallel, race, fallback, map-reduce)
- 🛒 **Marketplace** — discover, install, rate, publish agents
- 📜 **Contracts** — autonomous agreements that execute when conditions are met
- 🧠 **Learning** — agents improve from feedback and outcomes
- 📡 **ACP** — Agent Communication Protocol (the universal AI-to-AI language)

This SDK wraps all of it into a single ergonomic client.

## Install

```bash
npm install @hojai/sutar
```

## Quick start

```ts
import { Sutar } from '@hojai/sutar';

const sutar = new Sutar({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// Create an agent
const agent = await sutar.agent.create({
  type: 'merchant',
  businessId: 'b-1',
  businessName: 'Maya Collective',
  industry: 'fashion'
});

// Run a task
const task = await sutar.agent.runTask(agent.id, {
  type: 'negotiate-rfq',
  input: { product: 'shoes', quantity: 100 }
});

// Orchestrate multiple agents
const result = await sutar.orchestration.run({
  pattern: 'sequential',
  steps: [
    { id: 's1', agentRole: 'merchant', input: {} },
    { id: 's2', agentRole: 'logistics', input: {} }
  ],
  initialInput: {}
});

// Send an ACP message to another agent
await sutar.acp.send({
  type: 'OFFER',
  sender: agent.id,
  receiver: 'agent-supplier-42',
  payload: { product: 'shoes', price: 50 }
});
```

## Subpath imports

For tree-shaking:

```ts
import { AgentClient } from '@hojai/sutar/agent';
import { ACPClient } from '@hojai/sutar/acp';
```

## Modules

| Module | Purpose |
|---|---|
| `sutar.agent` | CRUD on SUTAR agents, run tasks, get stats, trigger learning |
| `sutar.orchestration` | Multi-agent workflow patterns |
| `sutar.marketplace` | Discover, install, rate, publish agent listings |
| `sutar.contracts` | Smart contracts for AI agreements |
| `sutar.learning` | Record events, submit feedback, trigger training |
| `sutar.acp` | Send messages, negotiate, ping |

## Configuration

```ts
const sutar = new Sutar({
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

11/11 tests pass.

## License

MIT © HOJAI AI