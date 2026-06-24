# Agent Lifecycle Platform — HOJAI AI

> **Phase 40 of the HOJAI AI 40-Phase Roadmap**
> **Status:** ✅ **PRODUCTION-READY** (2026-06-24) — 7 services, 124 tests passing, 0 failures
> **Path:** `companies/HOJAI-AI/platform/agent-lifecycle/`
> **Startup:** Start each service individually (`npm start`) — see service map below.

---

## What this is

The **Agent Lifecycle Management** platform provides the full lifecycle infrastructure for shipping, monitoring, and retiring AI agents:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                  AGENT LIFECYCLE (Phase 40)                                │
│                                                                            │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│   │ Versioning │→ │  Testing   │→ │ Deployment │→ │ Monitoring │          │
│   │   (4911)   │  │   (4912)   │  │   (4913)   │  │   (4914)   │          │
│   └────────────┘  └────────────┘  └────────────┘  └────────────┘          │
│           │              │              │              │                   │
│           └──────────────┴──────────────┴──────────────┘                   │
│                                  │                                          │
│                                  ▼                                          │
│                       ┌────────────────────┐                               │
│                       │ agent-lifecycle-api│  ← single entry (4910)        │
│                       └────────────────────┘                               │
│                                  │                                          │
│                                  ▼                                          │
│                       ┌────────────┐  ┌────────────┐                      │
│                       │  Rollback  │  │ Deprecation│                      │
│                       │   (4915)   │  │   (4916)   │                      │
│                       └────────────┘  └────────────┘                      │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## The 7 Services

| Service | Port | Purpose | Tests |
|---------|------|---------|-------|
| **[agent-lifecycle-api](agent-lifecycle-api/)** | **4910** | Unified gateway; proxies all 6 sub-services; orchestrates `POST /agents/:id/release` (versioning → testing → deployment pipeline) | 12 |
| **[agent-versioning](agent-versioning/)** | **4911** | Semver + immutable snapshots; content hashing; tags; diff; bump (major/minor/patch) | 17 |
| **[agent-testing](agent-testing/)** | **4912** | Unit/integration/smoke test suites; case-level results; per-agent pass-rate summaries | 16 |
| **[agent-deployment](agent-deployment/)** | **4913** | Canary [1%, 10%, 50%, 100%], blue-green, immediate; per-agent policies; pause/resume/advance/fail | 20 |
| **[agent-monitoring](agent-monitoring/)** | **4914** | Quality/performance/cost metrics; p50/p95/p99 aggregates; threshold alerts | 18 |
| **[agent-rollback](agent-rollback/)** | **4915** | Instant + scheduled rollbacks; deployment-service notification; cancel/execute/due endpoints | 19 |
| **[agent-deprecation](agent-deprecation/)** | **4916** | Sunset policies (default 90-day notice); subscriber tracking; notice issuance; migrate + retire flow | 22 |
| **Total** | | **7 services** | **124** |

---

## Architecture Patterns

All 7 services follow these conventions (consistent with Phase 32 Agent OS):

| Pattern | Detail |
|---------|--------|
| **Storage** | File-backed JSON at `$DATA_DIR/*.json` (atomic temp+rename writes) |
| **Auth** | `X-Internal-Token: <shared-token>` header on all routes except `/health` and `/ready` |
| **IDs** | `crypto.randomBytes(6).toString('hex')` with service-specific prefixes (`ver_`, `run_`, `dep_`, `m_`, `alert_`, `rb_`, etc.) |
| **Tests** | `node --test tests/*.test.js` (built-in runner, no jest/vitest) |
| **Ephemeral test data** | `fs.mkdtempSync()` + `process.env.DATA_DIR` + `delete require.cache` |
| **Validation** | Inline helper functions returning error message strings |
| **Health** | `GET /health` (liveness), `GET /ready` (readiness) |
| **Express version** | 4.22.x with path-to-regexp 0.1.x (uses `(.*)` or `app.use(prefix)` for nested-path matching) |

---

## Default Policies

### Deployment (agent-deployment)
```json
{
  "strategy": "canary",
  "canary_stages": [1, 10, 50, 100],
  "stage_interval_seconds": 60,
  "auto_rollback": true,
  "rollback_threshold": 0.05
}
```

### Deprecation (agent-deprecation)
```json
{
  "notice_days": 90,
  "auto_migrate": true,
  "grace_period_days": 30,
  "backup_before_retire": true
}
```

---

## End-to-End Release Pipeline (via Gateway)

```bash
# Single call orchestrates the full release:
curl -X POST http://localhost:4910/agents/my-agent/release \
  -H 'X-Internal-Token: lifecycle-internal-token' \
  -H 'Content-Type: application/json' \
  -d '{
    "version": "1.2.0",
    "config": {"temperature": 0.7},
    "code": "function run(input) { return process(input); }",
    "metadata": {"author": "alice"},
    "suite": {
      "name": "smoke",
      "tests": [{"name": "basic", "kind": "unit", "check": "true"}]
    },
    "strategy": "canary"
  }'

# Response:
{
  "agent_id": "my-agent",
  "version": "1.2.0",
  "testing_ok": true,
  "steps": [
    {"step": "versioning", "status": 201, "ok": true, "body": {...}},
    {"step": "testing",    "status": 201, "ok": true, "body": {...}},
    {"step": "deployment", "status": 201, "ok": true, "body": {...}}
  ]
}
```

The gateway does NOT run monitoring + rollback automatically — those are exposed via `/monitoring/*` and `/rollback/*` proxy routes for the monitoring service or external scheduler to invoke.

---

## Out of Scope (intentionally not built)

| Item | Why out of scope |
|------|------------------|
| Real Kubernetes integration | Mock-stage tracking only; no actual pod scheduling |
| Real notification channels (email/Slack/PagerDuty) | Alerts are JSON records; external system would poll `/alerts` |
| Visual dashboard | Metrics are JSON; a Grafana/React UI is a separate project |
| Real LLM-backed test execution | Test "checks" are inline JS expressions (`"true"`, `"value === 1"`) |
| Cross-region replication | Single-node JSON store; HA is a deployment-level concern |
| Auth beyond X-Internal-Token | This is intra-cluster infra; CorpID JWT integration is the gateway's job |

---

## Test Pattern

Each service has a single test file in `tests/*.test.js`. Total 124 tests.

```bash
cd agent-versioning
DATA_DIR=$(mktemp -d) npm test
```

Or all services together:
```bash
for svc in agent-versioning agent-testing agent-deployment agent-monitoring \
           agent-rollback agent-deprecation agent-lifecycle-api; do
  (cd $svc && DATA_DIR=$(mktemp -d) npm test)
done
```

---

## Inter-Service Communication

The 6 sub-services DO NOT call each other directly. The gateway (`agent-lifecycle-api`) is the orchestrator:

- **Gateway → sub-service**: HTTP POST/GET with `X-Internal-Token`
- **Rollback → Deployment**: `agent-rollback` notifies `agent-deployment` after a successful rollback (best-effort, 2s timeout, swallowed on failure)
- **All others**: no inter-service calls; each is self-contained

---

## What's Next

Phases remaining (NOT_STARTED):
- **Phase 14**: Planning Engine (flow planning)
- **Phase 25**: Multi-Modal (vision/audio)
- **Phase 27**: AIOps (auto-remediation)
- **Phase 30**: Foundation Models (own model training)
- **Phase 38**: AI Studio (visual builder)

See `companies/HOJAI-AI/AUDIT-2026-06-24.md` for the full audit and `CANONICAL-PORT-REGISTRY.md` (Phase 40 section) for port assignments.