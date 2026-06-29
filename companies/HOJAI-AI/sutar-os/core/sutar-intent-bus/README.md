# SUTAR Intent Bus

## Purpose
Message bus for agent intent routing and processing.

## Key Features
- Intent message routing
- Event-driven architecture
- Message filtering
- Priority queuing

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /api/intents | Publish intent |
| GET | /api/intents | Get intents |
| GET | /api/intents/:id | Get intent by ID |

## Port
4806