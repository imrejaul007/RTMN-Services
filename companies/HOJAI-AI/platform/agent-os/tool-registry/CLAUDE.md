# Tool Registry

## Overview
Registry for agent tools.

## Purpose
Manages tools available to agents.

## Key Features
- Tool registration
- Tool versioning
- Permission management
- Execution tracking

## API Endpoints
- `GET /api/tools` - List tools
- `POST /api/tools` - Register tool
- `GET /api/tools/:id` - Get tool
- `POST /api/tools/:id/execute` - Execute tool

## Startup
```bash
cd platform/agent-os/tool-registry && npm run dev
```
