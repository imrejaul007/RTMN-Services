# RuntimeOS - Port 4860

## Overview
Kubernetes for AI employees - Agent lifecycle, scheduling, resource limits.

## Purpose
Manages the complete lifecycle of AI agents: create, start, pause, restart, terminate.

## Key Features
- Agent lifecycle management
- Resource quotas (CPU, memory, tokens)
- Scheduled agents (cron-like)
- Health monitoring
- Hot swaps

## API Endpoints

### Agents
- `GET /api/agents` - List agents
- `POST /api/agents` - Create agent
- `PATCH /api/agents/:id/status` - Update status
- `POST /api/agents/:id/restart` - Restart agent

### Schedule
- `GET /api/schedule` - List schedules
- `POST /api/schedule` - Create schedule

## Agent Status
- `starting` - Initializing
- `running` - Active
- `paused` - Suspended
- `stopped` - Terminated
- `error` - Failed state

## Tests
Vitest tests: `__tests__/runtime-os.test.ts`

## Environment
- Port: 4860

## Startup
```bash
cd platform/sutar-os/core/runtime-os && npm run dev
```
