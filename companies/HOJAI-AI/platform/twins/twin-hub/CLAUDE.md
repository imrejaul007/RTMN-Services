# Twin Hub - Port 4705

## Overview
Central registry and orchestration for all twins.

## Purpose
Single entry point for twin management.

## Key Features
- Twin registry
- Cross-twin queries
- Relationship management
- Unified access

## API Endpoints

### Registry
- `GET /api/twins` - List all twins
- `GET /api/twins/:id` - Get twin
- `GET /api/twins/:id/relationships` - Get relationships

### Search
- `POST /api/search` - Search twins

## Environment
- Port: 4705

## Startup
```bash
cd platform/twins/twin-hub && npm run dev
```
