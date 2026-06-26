# ObservationOS - Port 4861

## Overview
Datadog for AI agents - Live monitoring, metrics, traces, cost tracking.

## Purpose
Provides visibility into all AI agents: metrics, traces, costs, and alerts.

## Key Features
- Agent metrics collection
- Request tracing
- Cost tracking (tokens, API calls)
- SLA monitoring
- Alert routing

## API Endpoints

### Metrics
- `POST /api/metrics` - Record metric
- `GET /api/agents/:agentId/metrics` - Agent metrics

### Traces
- `POST /api/traces` - Record trace

### Alerts
- `POST /api/alerts` - Create alert
- `GET /api/dashboard` - Overview

## Tests
Vitest tests: `__tests__/observation-os.test.ts`

## Environment
- Port: 4861

## Startup
```bash
cd platform/sutar-os/core/observation-os && npm run dev
```
