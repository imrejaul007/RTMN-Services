# Message Bus

## Overview
Inter-agent messaging.

## Purpose
Pub/sub for agent communication.

## Key Features
- Message routing
- Pub/sub topics
- Message persistence
- Event streaming

## API Endpoints
- `POST /api/messages` - Send message
- `GET /api/messages/:topic` - Subscribe
- `GET /api/topics` - List topics

## Startup
```bash
cd platform/agent-os/message-bus && npm run dev
```
