# SUTAR OS — Monitoring (Port 3100)

> **Status:** ✅ NEW — Built June 20, 2026
> **SUTAR Layer:** 1 — Base Observability
> **Purpose:** Foundation observability for SUTAR — service health probes, metrics, alert rules, log aggregation

---

## Mission

Every other SUTAR service needs to be **observable** — you can't run an autonomous economic system without knowing what's healthy, what's slow, and what's failing. The Monitoring service is the foundation: it probes SUTAR services on `/health`, accepts metric samples, evaluates alert rules, and aggregates logs from across the ecosystem.

## Architecture

```
[Every 30s] → probeService(svc) → fetch /health
                                       ↓
                               record probe + evaluate rules
                                       ↓
                              fire/auto-resolve alerts
                                       ↓
                          GET /api/services/{status} → caller
```

```
[Caller] → POST /api/metrics {serviceId, name, value}
                                       ↓
                          samples[serviceId].push(sample)
                                       ↓
                          GET /api/metrics/:serviceId → caller
```

## Features

| Capability | Endpoint(s) |
|------------|-------------|
| Probes a service health endpoint, records latency | `POST /api/probe`, `POST /api/probe/all` |
| Lists services + last-known status | `GET /api/services` |
| Per-service probe history | `GET /api/services/:id/history` |
| Push metric samples (with auto-cap at 1000/service) | `POST /api/metrics`, `GET /api/metrics/:serviceId` |
| Alert rule CRUD with auto-eval | `POST /api/alerts/rules`, `GET /api/alerts/rules`, `DELETE /api/alerts/rules/:id` |
| Active alerts (auto-fired or manual) | `GET /api/alerts/active`, `POST /api/alerts/active/:id/resolve` |
| Log aggregation with level/service filter | `POST /api/logs`, `GET /api/logs` |
| Aggregate stats | `GET /api/stats` |

## Seeded Targets (probed automatically every 30s)

| Service | Port |
|---------|------|
| SUTAR Intent Bus | 4154 |
| SUTAR Usage Tracker | 4252 |
| SUTAR Simulation OS | 4241 |
| SUTAR Discovery Engine | 4256 |
| SUTAR ROI Calculator | 4259 |
| SUTAR Decision Engine | 4240 |
| SUTAR Goal OS | 4242 |
| SUTAR Trust Engine | 4180 |
| SUTAR Negotiation AI | 4850 |
| HOJAI Intelligence | 4881 |

Plus 1 seed alert rule: "High latency on SUTAR services" — fires if any service responds in >1000ms.

## Alert Rule Evaluation

Rules are evaluated on every probe. Supported comparators:
- `gt`, `gte` (greater than / equal)
- `lt`, `lte` (less than / equal)
- `eq`, `ne` (equal / not equal)

Supported metrics: `http_latency_ms`, `http_status`. If a probe no longer satisfies a rule's condition, the alert **auto-resolves**.

## Known Limitations

- Single-process — no distributed probe fleet
- No persistent storage — restart loses probe history, metrics, logs (cap at 5000 logs, 1000 metrics/service)
- `fetch` is built into Node 20 — no external HTTP client
- Alert rules have no notification channel (just internal state) — wire to Slack/PagerDuty separately

## Integration with HOJAI Intelligence (4881)

Wired into `/api/route` and `/api/agents` as `sutarMonitoring`. Also accessible via Hub (4399) at `/api/monitoring/...`.

## Related Services

- `/services/decision-engine` (4240) — uses monitoring data to trigger recovery workflows
- `/services/intent-bus` (4154) — agent intents can be evaluated against monitoring state
- `/services/agent-reputation` (4820) — uptime feeds reputation score

---

*See also: [companies/HOJAI-AI/divisions/12-sutar-os/CLAUDE.md](../../divisions/12-sutar-os/CLAUDE.md)*