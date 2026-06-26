# Agent Observability

## Overview
Metrics, logs, and traces.

## Purpose
Monitoring for agents.

## Key Features
- Metrics collection
- Log aggregation
- Distributed tracing
- Alert management

## API Endpoints
- `GET /api/metrics/:agentId` - Get metrics
- `POST /api/logs` - Record log
- `GET /api/traces/:traceId` - Get trace

## Startup
```bash
cd platform/agent-os/agent-observability && npm run dev
```
