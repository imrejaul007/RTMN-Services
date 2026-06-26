# Agent Orchestrator

## Overview
Multi-agent workflow orchestration.

## Purpose
Coordinates multi-agent tasks.

## Key Features
- Workflow design
- Agent coordination
- Task sequencing
- Error handling

## API Endpoints
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `POST /api/workflows/:id/run` - Run workflow
- `GET /api/workflows/:id/status` - Get status

## Startup
```bash
cd platform/agent-os/agent-orchestrator && npm run dev
```
