# AIOps OS

> **Service:** AIOps OS  
> **Port:** 4898  
> **Phase:** 26  
> **Status:** Production-ready

## Overview

Production observability platform providing metrics, alerts, incidents, dashboards, and health monitoring across all HOJAI services.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/metrics` | Query metrics (filter by service, from, to, limit) |
| POST | `/api/metrics` | Ingest metric (service, name, value, unit, labels) |
| GET | `/api/metrics/summary` | Aggregated stats by metric name |
| GET | `/api/alerts` | List alerts (filter by state, severity, service) |
| POST | `/api/alerts` | Create alert (name, severity, service, condition) |
| POST | `/api/alerts/:id/acknowledge` | Acknowledge alert |
| POST | `/api/alerts/:id/resolve` | Resolve alert |
| POST | `/api/alerts/:id/snooze` | Snooze alert (duration in seconds) |
| GET | `/api/incidents` | List incidents (filter by state, severity) |
| POST | `/api/incidents` | Create incident (title, severity, service) |
| POST | `/api/incidents/:id/timeline` | Add timeline event |
| POST | `/api/incidents/:id/transition` | Transition incident state |
| GET | `/api/dashboards` | List dashboards |
| POST | `/api/dashboards` | Create dashboard |
| GET | `/api/status` | Overall system status |
| GET | `/api/health/:service` | Service-specific health score |

## Alert States

`firing` → `acknowledged` → `resolved` | `snoozed`

## Incident States

`open` → `investigating` → `mitigating` → `resolved` → `closed`

## Health Score

Calculated from firing alerts and open incidents:
- 0 firing alerts + 0 open incidents = 100 (healthy)
- Each firing alert = -20
- Each open incident = -30

## Storage

File-based JSON in `data/`:
- `metrics.json` — all ingested metrics
- `alerts.json` — alert definitions and state
- `incidents.json` — incident records with timeline
- `dashboards.json` — dashboard configs