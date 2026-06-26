# Capability Store

## Overview
Registry for agent capabilities.

## Purpose
Maps capabilities to agents.

## Key Features
- Capability registry
- Search by capability
- Capability versioning
- Skill mapping

## API Endpoints
- `GET /api/capabilities` - List capabilities
- `POST /api/capabilities` - Register capability
- `GET /api/search` - Search by capability

## Startup
```bash
cd platform/agent-os/capability-store && npm run dev
```
