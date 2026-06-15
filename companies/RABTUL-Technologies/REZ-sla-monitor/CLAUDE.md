# RABTUL SLA Monitor (Port 4195)

**Status:** ✅ Production Ready
**Company:** RABTUL Technologies
**Purpose:** Tracks Service Level Agreements
**Last Updated:** June 15, 2026

## Overview

The SLA Monitor tracks Service Level Agreements between service providers and consumers. Monitors uptime, latency, throughput, error rates, and triggers alerts when SLAs are breached.

## Features

### 1. SLA Management
- Define SLAs with multiple targets
- Provider/consumer tracking
- Status: active, paused, breached, met, expired
- Penalty configuration
- Tags and metadata
- Time-bounded contracts

### 2. Metric Collection
- 6 metric types: uptime, latency, throughput, error_rate, response_time, availability
- Multiple comparators: gte, lte, eq, between
- Unit-based measurements
- Source tracking
- Time-series storage

### 3. Uptime Calculation
- Uptime percentage over period
- Downtime in milliseconds
- SLA compliance check
- Custom period support

### 4. Latency Analysis
- Min/max/avg
- p50, p95, p99 percentiles
- SLA target comparison
- Last-hour default window

### 5. Threshold Checking
- Real-time compliance check
- Per-target evaluation
- Multi-target SLAs
- Hourly rolling window

### 6. Alerting
- 4 severity levels: low, medium, high, critical
- Auto-severity calculation by deviation %
- Handler registration
- Resolution tracking
- Active/resolved filtering

### 7. Reports
- Generate per-SLA reports
- Compliance percentage
- Per-metric breakdown
- Breach counts

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| GET | `/api/v1/info` | Service info |
| POST | `/api/v1/sla` | Create SLA |
| GET | `/api/v1/sla` | List SLAs |
| GET | `/api/v1/sla/:id` | Get SLA |
| PATCH | `/api/v1/sla/:id` | Update SLA |
| PATCH | `/api/v1/sla/:id/status` | Update status |
| DELETE | `/api/v1/sla/:id` | Delete SLA |
| GET | `/api/v1/sla/stats/summary` | Stats |
| POST | `/api/v1/monitoring/measurement` | Record measurement |
| POST | `/api/v1/monitoring/check/:slaId` | Check SLA |
| POST | `/api/v1/monitoring/check-all` | Check all SLAs |
| GET | `/api/v1/monitoring/measurements/:slaId` | Get measurements |
| GET | `/api/v1/monitoring/alerts` | Active alerts |
| POST | `/api/v1/monitoring/alerts/:id/resolve` | Resolve alert |
| POST | `/api/v1/monitoring/alerts/handler` | Register handler |
| GET | `/api/v1/monitoring/alerts/stats` | Alert stats |
| POST | `/api/v1/reports/generate` | Generate report |
| GET | `/api/v1/reports/:slaId` | Get last 30-day report |
| GET | `/api/v1/metrics/uptime/:slaId` | Uptime |
| GET | `/api/v1/metrics/latency/:slaId` | Latency stats |

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `PORT` | 4195 | Service port |
| `BREACH_DETECTOR_URL` | http://localhost:4196 | Breach detector |
| `EVENT_BUS_URL` | http://localhost:4510 | Event bus |
| `MONITORING_INTERVAL_MS` | 60000 | Check interval |

## Events Published

- `sla-monitor.ready`
- `sla.created`
- `sla.deleted`
- `sla.status-changed`
- `sla.violation`
- `sla.breach.detected`
- `sla.breach.resolved`
