# FlowOS Economic Runtime

## Purpose
Dynamic cost optimization for workflow execution. Track costs, set budgets, and get AI-powered optimization recommendations.

## Key Features
- **Cost Tracking** — Track workflow and agent execution costs
- **Budget Management** — Set budgets per workflow with alerts
- **Optimization Engine** — AI-powered suggestions to reduce costs
- **Real-time Analytics** — View spending trends and projections

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /api/costs | Track cost |
| GET | /api/costs/:workflowId | Get workflow costs |
| POST | /api/budgets | Create budget |
| GET | /api/budgets/:workflowId | Get workflow budget |
| GET | /api/optimizations | Get optimization suggestions |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5365 | Service port |

## Commands
- `npm start` — Start service
- `npm test` — Run tests