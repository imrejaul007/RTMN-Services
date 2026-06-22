# Agent Teaming

**Version:** 1.1.0
**Port:** 4853
**Status:** ✅ RUNNING | June 22, 2026
**Package:** `@rtmn/agent-teaming`

---

## Overview

**Agent Teaming** is the SUTAR service that composes individual agents into **persistent, mission-owned teams**. It is the 10/10 differentiator of the SUTAR stack: where `agent-orchestration` coordinates one-shot workflows, **agent-teaming** owns long-running teams with a leader, a task DAG, failure recovery, built-in mission templates, and **full observability** (JSON /metrics + Prometheus text format).

The service sits orthogonally to SUTAR's 7 layers (it's a peer of `agent-orchestration@4851`, not part of any layer).

**Twin types:** `team`, `mission`, `task-dag`, `election-log`, `failure-log`.

---

## Endpoints

### Templates (public)
```
GET  /api/teaming/templates              # List 6+ mission templates
```

### Teams
```
POST /api/teaming/teams                 # Form team (discovers via ACN, elects leader) [auth+strictLimiter]
GET  /api/teaming/teams                 # List all teams
GET  /api/teaming/teams/:id             # Get team detail (members, leader, role distribution)
```

### Missions
```
POST /api/teaming/missions              # Create mission from template or custom DAG [auth+strictLimiter]
GET  /api/teaming/missions              # List missions
GET  /api/teaming/missions/:id          # Get mission + status
```

### Task DAGs
```
POST /api/teaming/dags                  # Create a DAG (validates: no cycles, deps resolve) [auth+strictLimiter]
GET  /api/teaming/dags/:id/ready        # Steps that are ready to execute
```

### Failure Logs
```
GET  /api/teaming/failures              # All failure events
GET  /api/teaming/failures/:id          # Single failure event
```

### Observability
```
GET  /metrics                           # JSON: counters + breakdowns + EMA latencies + derived rates
GET  /metrics/prom                      # Prometheus text format (scrapeable)
```

### Health
```
GET  /health                            # Service health
GET  /ready                             # Readiness probe
```

---

## Observability (v1.1.0)

The service exposes two metrics endpoints — JSON for human/SDK consumption and Prometheus text for scraping.

### Counters tracked

| Counter | Meaning |
|---|---|
| `team_formations_total` | Any `formTeam` call (success or fail) |
| `team_formations_success_total` | Successfully formed a team |
| `team_formations_failed_total` | Not enough candidates for `minSize` |
| `leader_elections_total` | Any `electLeader` call |
| `missions_created_total` | Any `createMissionFromTemplate` call |
| `missions_failed_total` | Mission ended in `failed` state (team formation failed) |
| `dags_created_total` | Any `createTaskDAG` call |
| `dag_steps_total` | Sum of steps across all DAGs (use with `dags_created_total` for avg) |
| `failures_total` | Any `handleStepFailure` call |
| `failures_recovered_total` | Recovery = retry |
| `failures_escalated_total` | Recovery = escalate-to-leader |
| `failures_terminal_total` | Recovery = none (mission lost) |
| `http_requests_total` | Any /api/* call |
| `http_errors_total` | 4xx/5xx responses |
| `acn_calls_total` | Calls to ACN network for agent discovery |
| `acn_failures_total` | ACN network unreachable |
| `reputation_calls_total` | Calls to agent-reputation service |
| `reputation_failures_total` | agent-reputation unreachable |

### Breakdowns

- `byTemplate` — count of missions by template name
- `byAlgo` — count of team formations + leader elections by algo
- `byStatus` — count of mission status transitions (forming/ready/failed)
- `byRecovery` — count of failure recovery actions (retry/escalate-to-leader/none)

### Latencies (EMA)

Per-operation EMA latency tracked with alpha=0.2:
- `formTeam` by algo (BULLY/RAFT/ROUND_ROBIN)
- `createTaskDAG` by step count
- `createMission` by template

Each bucket exposes: `count`, `ema_ms`, `max_ms`, `avg_ms`.

### Derived metrics

- `team_formation_success_rate` = success / total
- `failure_recovery_rate` = recovered / total
- `avg_dag_steps` = `dag_steps_total / dags_created_total`
- `uptime_seconds`

### Examples

```bash
# JSON view
curl http://localhost:4853/metrics | jq .

# Prometheus scrape
curl http://localhost:4853/metrics/prom

# Via the RTMN Hub
curl http://localhost:4399/api/sutar/sutar-agent-teaming/metrics/prom
```

---

## Leader Election Algorithms

| Algo | Strategy | Use when |
|---|---|---|
| `BULLY` | Highest-reputation candidate wins | Default — quality matters most |
| `RAFT` | Highest-id among responding candidates | Stable, deterministic |
| `ROUND_ROBIN` | Rotate leader per mission | Fairness over quality |

## Mission Templates (6)

1. **price-compare** — compare offers across N merchants
2. **dispute-mediation** — gather evidence, propose settlement, escalate
3. **contract-bundle** — draft multi-party contracts in parallel
4. **market-research** — pull trends, sentiment, and competitor intel
5. **multi-vendor-fulfilment** — split an order across suppliers
6. **reputation-rollup** — compute aggregate reputation across sources

## Failure Recovery

```
Step fails
  ↓
retry (with backoff: 100, 200, 400, 800, 1600 ms)
  ↓ (after MAX_RETRIES)
escalate to team leader
  ↓
leader re-elects a fresh candidate
  ↓
re-queue the failed step
```

`MAX_RETRIES = 3` (configurable), `RETRY_BACKOFF_MS = [100, 200, 400]`.

---

## Security

- `@rtmn/shared/security` (helmet, cors, rate-limit, error handler)
- `@rtmn/shared/auth` — `requireAuth` on all mutating routes
- `strictLimiter` on team/mission/dag creation
- `INTERNAL_SERVICE_TOKEN` required (via `requireEnv(['PORT'])` allows PORT only; full env list enforced by caller)

---

## Tests

```bash
cd sutar-os/agents/agent-teaming
node tests/teaming.test.cjs   # 19 tests
bash tests/smoke.sh           # 13 HTTP smoke tests
```

`teaming.test.cjs` covers: leader election (Bully + Raft), DAG construction, cycle detection, ready-step computation, failure-recovery transitions, mission template registry, and offline `formTeam` fallback. **19/19 passing.**

## Cross-service smoke test

A 6-test end-to-end smoke test that boots 11 SUTAR services, drives a price-compare mission through both direct and Hub-proxied paths, and verifies the observability surface:

```bash
cd sutar-os
node tests/smoke-cross-service.js   # 6 passed, 0 failed in ~5s
```

Tests:
- **A** — All 11 services healthy
- **B** — RTMN Hub `/api/sutar/capabilities` live
- **C** — Price-compare mission via direct path to agent-teaming:4853
- **D** — Price-compare mission via Hub `/api/sutar/sutar-agent-teaming/...`
- **E** — `/metrics` (18 counters) + `/metrics/prom` (22 lines) exposed
- **F** — Full SDK pipeline: template + DAG + failure recovery + counters

Use `KEEP_RUNNING=1` to leave services running after the test exits.

---

## Upstream dependencies

- `ACN_NETWORK_URL` (default `http://localhost:4801`) — agent discovery
- `ACP_PROTOCOL_URL` (default `http://localhost:4800`) — agent-to-agent messaging
- `AGENT_REPUTATION_URL` (default `http://localhost:4820`) — trust scores for Bully algo
- `AGENT_WALLETS_URL` (default `http://localhost:4840`) — team budget tracking
- `AGENT_CONTRACTS_URL` (default `http://localhost:4830`) — multi-party mission contracts
- `AGENT_ORCHESTRATION_URL` (default `http://localhost:4851`) — orchestration peer

---

*Last updated: June 22, 2026*
