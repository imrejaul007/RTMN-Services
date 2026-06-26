# Agent Memory Bridge

## Overview
Bridge to MemoryOS for agents.

## Purpose
Connects agents to persistent memory.

## Key Features
- Memory sync
- Memory retrieval
- Context injection
- Memory partitioning

## API Endpoints
- `POST /api/sync` - Sync memory
- `GET /api/memory/:agentId` - Get memory
- `POST /api/memory` - Store memory

## Startup
```bash
cd platform/agent-os/agent-memory-bridge && npm run dev
```
