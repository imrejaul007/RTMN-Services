# SUTAR OS — Hub Capability Map

**Version:** 1.0
**Last Updated:** June 22, 2026
**Status:** ✅ Authoritative — values match the Hub's `SUTAR_SERVICES` and `NEXHA_SERVICES` maps in `REZ-ecosystem-connector/src/index.ts`

---

## Overview

The RTMN Unified Hub (`REZ-ecosystem-connector @ localhost:4399`) exposes two capability-map endpoints that translate high-level intent (e.g. "negotiate", "trust check", "warehouse search") into specific SUTAR/Nexha service keys. Consumers (Genie, do-app, AgentOS) use these maps for **capability-based routing** instead of hardcoding URLs.

**Hub source:** [REZ-ecosystem-connector/src/index.ts:140-213](companies/RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts#L140)

---

## How to consume the capability map

```bash
# SUTAR capability map
curl http://localhost:4399/api/sutar/capabilities

# Nexha capability map
curl http://localhost:4399/api/nexha/capabilities
```

Each response has the same shape:

```json
{
  "capabilities": { "<capability-name>": ["<service-key>", "..."] },
  "services": { "<service-key>": "http://localhost:<port>" }
}
```

To call a service via the Hub:

```bash
curl -X POST http://localhost:4399/api/sutar/<service-key>/<path>
curl -X POST http://localhost:4399/api/nexha/<service-key>/<path>
```

The Hub's `proxyToUpstream()` handles path-stripping, body re-serialization (for `express.json()`-parsed bodies), and header forwarding.

---

## SUTAR Capability Map (13 capabilities)

Source: [REZ-ecosystem-connector/src/index.ts:145-159](companies/RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts#L145)

| Capability | Service key | Port | Purpose |
|---|---|---:|---|
| `team-formation` | `sutar-agent-teaming` | 4853 | Form a team of agents for a mission |
| `leader-election` | `sutar-agent-teaming` | 4853 | Pick a leader within a team |
| `task-dag` | `sutar-agent-teaming` | 4853 | Decompose mission into a DAG of tasks |
| `multi-agent-workflow` | `sutar-agent-teaming`, `sutar-agent-orchestration` | 4853, 4851 | Coordinate work across multiple agents |
| `payment` | `sutar-agent-contracts` | 4830 | Smart contract for agent-to-agent payment |
| `reputation` | `sutar-trust-engine` | 4291 | Get/update trust score (SADA-federated) |
| `negotiation` | `sutar-negotiation` | 4293 | Multi-party negotiation between agents |
| `merchant-discovery` | `sutar-agent-marketplace` | 4845 | Find merchant agents/services |
| `agent-registry` | `sutar-agent-network` | 4155 | Look up registered agents |
| `analytics` | `sutar-agent-analytics` | 4848 | Agent metrics + dashboards |
| `contract` | `sutar-contract-os` | 4292 | Create/execute/terminate smart contracts |
| `identity` | `sutar-agent-id` | 4145 | Agent identity (→ CorpID) |
| `memory` | `sutar-memory-bridge` | 4143 | Persistent memory for agents (→ MemoryOS) |

### Removed stale entries (2026-06-22)

The Hub previously had these capabilities pointing at non-existent services. They were removed on 2026-06-22 per [SUTAR-HUB-WIRING-AUDIT-2026-06-22.md](companies/RABTUL-Technologies/REZ-ecosystem-connector/docs/SUTAR-HUB-WIRING-AUDIT-2026-06-22.md):

| Removed capability | Was pointing at | Reason |
|---|---|---|
| `wallet` | `sutar-wallet-service :4840` | Service never built — economy-os has its own wallet |
| `arbitration` | `sutar-dispute :4847` | Service never built — contract-os handles disputes |
| `discovery` | `sutar-discovery :4252` | Wrong port — actual port is 4256 |
| `multi-agent-eval` | `sutar-multi-agent-evaluator :4257` | No real service at that port |
| `reputation-aggregator` | `sutar-reputation-aggregator :4258` | No real service at that port |
| `goal-tracking` | `sutar-goal-os :4242` | Out of SUTAR scope (now in genie-os) |

---

## Nexha Capability Map (8 capabilities)

Source: [REZ-ecosystem-connector/src/index.ts:186-197](companies/RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts#L186)

| Capability | Service key | Port | Phase | Status |
|---|---|---:|---|---|
| `supplier-registry` | `nexha-supplier-network` | 4280 | **C.1** | ✅ Real (20 tests) |
| `warehouse-network` | `nexha-warehouse-network` | 4288 | **C.5** | ✅ Real (49 tests) |
| `logistics` | `nexha-distribution-network` | 4285 | **C.2** | ✅ Real (22 tests) |
| `banking` | `nexha-trade-finance-network`, `trade-finance` | 4287, 4340 | **C.4** | ✅ Real (nexha-trade-finance-network); stub (trade-finance) |
| `pricing-intelligence` | `nexha-pricing-network` | 4286 | **C.6** | ✅ Real (31 tests) |
| `orchestrator` | `ecosystem-connector` | 4399 | n/a | The Hub itself |
| `franchise` | `franchise-os` | 4310 | n/a | 🟡 Stub |
| `manufacturing` | `manufacturing-os` | 4330 | n/a | 🟡 Stub |
| `demand-forecast` | `intelligence-layer` | 4350 | n/a | 🟡 Stub |

**Pattern:** the **real implementations** of the Nexha commerce network live in SUTAR (`nexha-supplier-network`, `nexha-distribution-network`, `nexha-warehouse-network`, `nexha-trade-finance-network`, `nexha-pricing-network`) and are dual-registered so they can be reached via both `/api/sutar/*` and `/api/nexha/*`. Nexha's own L1 services (`procurement-os`, `distribution-os`, `franchise-os`, `manufacturing-os`, `intelligence-layer`) are still stubs.

---

## Full SUTAR_SERVICES Map (Hub)

Source: [REZ-ecosystem-connector/src/index.ts:14-38](companies/RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts#L14)

| Service key | Upstream URL | Notes |
|---|---|---|
| `sutar-gateway` | http://localhost:4140 | API gateway + service registry |
| `sutar-agent-id` | http://localhost:4145 | Agent identity |
| `sutar-agent-network` | http://localhost:4155 | Agent registry |
| `sutar-agent-teaming` | http://localhost:4853 | Team formation |
| `sutar-agent-orchestration` | http://localhost:4851 | Multi-agent workflows |
| `sutar-agent-contracts` | http://localhost:4830 | Agent-level contracts |
| `sutar-agent-marketplace` | http://localhost:4845 | Agent listings |
| `sutar-agent-analytics` | http://localhost:4848 | Agent metrics |
| `sutar-decision-engine` | http://localhost:4290 | Renumbered 2026-06-22 (was 4240) |
| `sutar-contract-os` | http://localhost:4292 | Renumbered 2026-06-22 (was 4185) |
| `sutar-negotiation` | http://localhost:4293 | Renumbered 2026-06-22 (was 4191) |
| `sutar-economy-os` | http://localhost:4294 | Renumbered 2026-06-22 (was 4251) |
| `sutar-trust-engine` | http://localhost:4291 | Renumbered 2026-06-22 (was 4180) |
| `sutar-twin-os` | http://localhost:4142 | SUTAR-scoped twins |
| `sutar-memory-bridge` | http://localhost:4143 | SUTAR agent memory |
| `sutar-monitoring` | http://localhost:3100 | Health probes |

---

## Full NEXHA_SERVICES Map (Hub)

Source: [REZ-ecosystem-connector/src/index.ts:45-66](companies/RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts#L45)

| Service key | Upstream URL | Status |
|---|---|---|
| `nexha-gateway` | http://localhost:5002 | ✅ Real (Nexha portal) |
| `distribution-os` | http://localhost:4300 | 🟡 Stub |
| `franchise-os` | http://localhost:4310 | 🟡 Stub |
| `procurement-os` | http://localhost:4320 | 🟡 Stub |
| `manufacturing-os` | http://localhost:4330 | 🟡 Stub |
| `trade-finance` | http://localhost:4340 | 🟡 Stub (prefer `nexha-trade-finance-network` 4287) |
| `intelligence-layer` | http://localhost:4350 | 🟡 Stub |
| `ecosystem-connector` | http://localhost:4399 | The Hub itself (recursive) |
| `nexha-supplier-network` | http://localhost:4280 | ✅ Real (C.1) |
| `nexha-distribution-network` | http://localhost:4285 | ✅ Real (C.2) |
| `nexha-warehouse-network` | http://localhost:4288 | ✅ Real (C.5) |
| `nexha-trade-finance-network` | http://localhost:4287 | ✅ Real (C.4) |
| `nexha-pricing-network` | http://localhost:4286 | ✅ Real (C.6) |

---

## Capability resolution algorithm

When a consumer (e.g. Genie, do-app) needs to perform an action, the canonical pattern is:

```typescript
async function resolveCapability(intent: string): Promise<string[]> {
  const response = await fetch(`${HUB_URL}/api/sutar/capabilities`);
  const { capabilities, services } = await response.json();
  return capabilities[intent] || [];  // returns service keys
}

async function callViaHub(serviceKey: string, path: string, body?: any) {
  return await fetch(`${HUB_URL}/api/sutar/${serviceKey}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  }).then(r => r.json());
}

// Example: do-app wants to "form a team"
const services = await resolveCapability('team-formation');
// services === ['sutar-agent-teaming']
const team = await callViaHub('sutar-agent-teaming', '/api/teaming/teams', {
  name: 'price-compare',
  mission: 'compare-prices',
  size: 3
});
```

---

## Caching recommendations

The capability map and service registry change **rarely** (only on Hub restarts or when adding new services). Recommended cache TTL: **5 minutes**.

```typescript
const capabilityCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function getCapabilities() {
  const cached = capabilityCache.get('capabilities');
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const response = await fetch(`${HUB_URL}/api/sutar/capabilities`);
  const data = await response.json();
  capabilityCache.set('capabilities', { data, timestamp: Date.now() });
  return data;
}
```

---

## Related

- [ARCHITECTURE.md](ARCHITECTURE.md) — SUTAR's 7 layers + Hub-as-bridge
- [API.md](API.md) — all SUTAR endpoints
- [INTEGRATION.md](INTEGRATION.md) — for app developers
- [SUTAR-HUB-WIRING-AUDIT-2026-06-22.md](companies/RABTUL-Technologies/REZ-ecosystem-connector/docs/SUTAR-HUB-WIRING-AUDIT-2026-06-22.md) — the audit that produced this clean state
- [Hub source: REZ-ecosystem-connector/src/index.ts](companies/RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts)

---

*Last Updated: June 22, 2026*
*SUTAR OS — Hub Capability Map v1.0*
