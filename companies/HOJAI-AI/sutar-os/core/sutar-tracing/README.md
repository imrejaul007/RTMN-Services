# SUTAR Tracing

## Purpose
Distributed tracing for agent operations and workflow execution.

## Key Features
- Request tracing
- Trace aggregation
- Latency analysis
- Error tracking

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /api/traces | Create trace |
| GET | /api/traces/:id | Get trace |
| GET | /api/traces | List traces |
| GET | /api/traces/:id/spans | Get trace spans |

## Port
4153