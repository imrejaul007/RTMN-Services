# Context Store

## Overview
Agent conversation context persistence.

## Purpose
Stores agent conversation history.

## Key Features
- Context storage
- Session management
- History retrieval
- Memory management

## API Endpoints
- `GET /api/context/:agentId` - Get context
- `POST /api/context` - Save context
- `DELETE /api/context/:id` - Delete context

## Startup
```bash
cd platform/agent-os/context-store && npm run dev
```
