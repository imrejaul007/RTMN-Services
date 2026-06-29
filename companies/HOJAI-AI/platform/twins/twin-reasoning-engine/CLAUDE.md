# Twin Reasoning Engine - CLAUDE.md

## Service Overview

**Name:** Twin Reasoning Engine
**Port:** 4716
**Type:** Intelligence Layer
**Category:** TwinOS Reasoning

## Purpose

Active cross-twin reasoning and explanation service.

## Key Features

1. **Why Reasoning** - Explain why events happened
2. **What-If Reasoning** - Analyze scenarios
3. **Trace Reasoning** - Map relationship paths
4. **Recommendations** - Generate actionable suggestions
5. **Reasoning Chains** - Multi-step reasoning

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /api/reasoning/why | Explain event |
| POST | /api/reasoning/whatif | Scenario analysis |
| POST | /api/reasoning/trace | Relationship path |
| POST | /api/reasoning/recommend | Get recommendations |
| POST | /api/reasoning/chain | Create reasoning chain |
| GET | /api/reasoning/chain/:id | Get chain |
| GET | /api/reasoning/history/:twinId | Reasoning history |

## Testing

```bash
npm test  # 12 tests
```

## Status

✅ Production Ready