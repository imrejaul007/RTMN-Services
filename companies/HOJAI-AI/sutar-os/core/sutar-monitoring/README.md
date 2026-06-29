# SUTAR Monitoring

## Purpose
Real-time monitoring and metrics for SUTAR agents and operations.

## Key Features
- Agent health monitoring
- Performance metrics
- Alert management
- Dashboard data

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /api/metrics | Get metrics |
| GET | /api/metrics/:agentId | Get agent metrics |
| GET | /api/alerts | Get alerts |
| POST | /api/alerts | Create alert |

## Port
4152