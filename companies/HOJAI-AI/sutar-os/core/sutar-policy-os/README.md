# SUTAR Policy OS

## Purpose
Policy management and enforcement for autonomous agents.

## Key Features
- Policy creation and versioning
- Policy evaluation
- Policy compliance checking
- Audit logging

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /api/policies | Create policy |
| GET | /api/policies/:id | Get policy |
| POST | /api/evaluate | Evaluate policy |

## Port
4808