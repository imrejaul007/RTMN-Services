# Twin Intelligence Orchestrator - CLAUDE.md

## Service Overview

**Name:** Twin Intelligence Orchestrator
**Port:** 4715
**Type:** Intelligence Layer
**Category:** TwinOS Core

## Purpose

Unified orchestration layer connecting all intelligence services for digital twins.

## Architecture

```
TwinOS Hub (4705)
    ↓
Twin Intelligence Orchestrator (4715)
    ├── Twin Behavior Model (4718)
    ├── Twin Reasoning Engine (4716)
    ├── Twin Learning OS (4735)
    └── Twin Execution OS (4737)
```

## Key Features

1. **Twin Analysis** - Full analysis of twin data across all intelligence services
2. **Cross-Twin Reasoning** - Reasoning across multiple related twins
3. **Prediction Generation** - AI-powered predictions
4. **Learning Loop** - Continuous learning from outcomes
5. **Service Health** - Monitor all connected services

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /api/orchestrator/analyze | Full twin analysis |
| POST | /api/orchestrator/reason | Cross-twin reasoning |
| POST | /api/orchestrator/learn | Record learning |
| POST | /api/orchestrator/predict | Generate predictions |
| GET | /api/orchestrator/services | List services |

## Configuration

```bash
PORT=4715
TWIN_HUB_URL=http://localhost:4705
MEMORY_OS_URL=http://localhost:4703
BEHAVIOR_MODEL_URL=http://localhost:4718
REASONING_ENGINE_URL=http://localhost:4716
```

## Testing

```bash
npm test  # 39 tests
```

## Dependencies

- TwinOS Hub (4705)
- MemoryOS (4703)
- Twin Behavior Model (4718)
- Twin Reasoning Engine (4716)
- Twin Learning OS (4735)
- Twin Execution OS (4737)

## Status

✅ Production Ready
