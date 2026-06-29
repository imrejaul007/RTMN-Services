# SUTAR Agent ID

## Purpose
Unique identity management for AI agents with verification and trust scoring.

## Key Features
- Agent identity registration
- Trust score calculation
- Identity verification
- Agent metadata management

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /api/agents | Register agent |
| GET | /api/agents/:id | Get agent |
| PUT | /api/agents/:id | Update agent |
| GET | /api/agents/:id/trust | Get trust score |

## Port
4145