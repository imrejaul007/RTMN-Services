# @rtmn/capgraph

> Reference client for the **Capability Graph** spec — agent registry, capability search, and trust signals.

Pure JavaScript. Zero dependencies. Runs in Node 18+ and modern browsers.

- **Spec:** [`../../specs/CAPABILITY-GRAPH.md`](../../specs/CAPABILITY-GRAPH.md)
- **License:** Apache-2.0

---

## Install

```bash
npm install @rtmn/capgraph
```

## Quick start

```js
import { createClient } from '@rtmn/capgraph';

const cg = createClient({
  baseUrl: 'https://graph.nexha.io',
  token: process.env.CAPGRAPH_TOKEN,
});

// Fetch an agent
const agent = await cg.fetchAgent('agent_42');

// Search for capabilities
const { results, nextCursor } = await cg.searchCapabilities({
  q: 'price optimization',
  tags: ['pricing', 'retail'],
  minTrust: 80,
  industry: 'retail',
  limit: 20,
});

// Register an agent
await cg.registerAgent({
  id: 'agent_99',
  name: 'PriceBot',
  capabilities: ['pricing', 'demand-forecasting'],
  industry: 'retail',
  endpoint: 'https://agents.example.com/pricebot',
});

// Report a trust signal
await cg.reportTrustSignal({
  agentId: 'agent_99',
  kind: 'quality',
  score: 92,
  evidenceRef: 'https://example.com/audit/2026-q1',
});
```

## API

### `createClient({ baseUrl, token?, fetchImpl?, timeoutMs? }) → CapgraphClient`

| Field | Type | Default | Notes |
|---|---|---|---|
| `baseUrl` | `string` | — | required; trailing slash stripped |
| `token` | `string` | — | bearer token for the closed impl |
| `fetchImpl` | `typeof fetch` | global `fetch` | injectable for tests / Node < 18 |
| `timeoutMs` | `number` | `5000` | per-request timeout |

### `client.fetchAgent(agentId) → Agent`

`GET /v1/agents/{agentId}`. Throws `CapgraphError` on 404.

### `client.searchCapabilities(query) → { results, nextCursor }`

`GET /v1/capabilities/search?...`. All query fields are optional:

| Field | Type | Notes |
|---|---|---|
| `q` | `string` | free-text query |
| `tags` | `string[]` | AND-filter by capability tags |
| `minTrust` | `number` | 0..100 |
| `industry` | `string` | industry code |
| `limit` | `number` | default server-side |
| `cursor` | `string` | pagination cursor from prior result |

### `client.registerAgent(agent) → Agent`

`POST /v1/agents`. Required: `id`, `name`, `capabilities`. Validates locally before sending.

### `client.reportTrustSignal(signal) → { ok, signalId }`

`POST /v1/trust-signals`. Required: `agentId`, `kind`, `score` (0..100). `kind` ∈ `['delivery', 'quality', 'dispute', 'compliance']`.

## Errors

All non-2xx responses throw `CapgraphError` with `.status` and `.body` attached:

```js
try {
  await cg.fetchAgent('missing');
} catch (err) {
  console.error(err.status, err.body);
}
```

Timeouts and unreachable hosts also throw `CapgraphError` (with a descriptive message).

## Tests

```bash
npm test
```

Runs the bundled `node:test` suite (22 assertions covering client construction, all 4 verbs, auth, validation, error wrapping, and timeouts).

## License

Apache-2.0. See [`../../LICENSE`](../../LICENSE).
