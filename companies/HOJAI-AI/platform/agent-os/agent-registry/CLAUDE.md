# Agent Registry

## Overview
Central registry for all AI agents.

## Purpose
Tracks agent identities, versions, and capabilities.

## Key Features
- Agent registration
- Version tracking
- Capability registry
- Heartbeat monitoring

## API Endpoints
- `GET /api/agents` - List agents
- `POST /api/agents` - Register agent
- `GET /api/agents/:id` - Get agent
- `POST /api/agents/:id/heartbeat` - Heartbeat

## Startup
```bash
cd platform/agent-os/agent-registry && npm run dev
```
