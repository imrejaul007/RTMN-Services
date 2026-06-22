# HOJAI Business Copilot

**Package:** `@hojai/business-copilot`
**Port:** `4600`
**Version:** `1.0.0`

A unified Business Copilot service that orchestrates all HOJAI AI services through a single entry point, providing **8 integrated interfaces** for comprehensive business intelligence, chat, and automation.

**Integrates with:** `core/business-copilot` (Port 4002) — 24 industry skill packs, 120+ skills

## Features

The Business Copilot provides 8 unified interfaces:

| Interface | Backing Service | Port | Description |
|-----------|-----------------|------|-------------|
| **Chat** | Core Business Copilot | 4002 | Chat interface with 24 industry skill packs |
| **Memory** | Memory Service | 4520 | Persistent memory and context management |
| **Twin** | Twin Service | 4860 | Digital twins and predictions |
| **Intelligence** | Graph + Intelligence | 4810/4530 | Knowledge graph and AI insights |
| **Agent** | Expert OS | 4550 | Task execution agents |
| **Workflow** | Flow OS | 4244 | Workflow orchestration |
| **Execution** | Project Service | 4708 | Task and project management |
| **Simulation** | Simulation OS | 4241 | What-if scenarios and simulations |

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB 7+
- All backing services running

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Docker

```bash
# Build
docker build -t hojai-business-copilot .

# Run
docker run -p 4600:4600 hojai-business-copilot
```

### Docker Compose

```bash
docker-compose up -d
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4600` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `MONGODB_URI` | `mongodb://localhost:27017/hojai-business-copilot` | MongoDB connection string |
| `JWT_SECRET` | - | JWT secret for authentication |
| `CORS_ORIGIN` | `http://localhost:3000` | CORS allowed origins |
| `MEMORY_SERVICE_URL` | `http://localhost:4520` | Memory service URL |
| `TWIN_SERVICE_URL` | `http://localhost:4860` | Twin service URL |
| `GRAPH_SERVICE_URL` | `http://localhost:4810` | Graph service URL |
| `INTELLIGENCE_SERVICE_URL` | `http://localhost:4530` | Intelligence service URL |
| `EXPERT_OS_URL` | `http://localhost:4550` | Expert OS URL |
| `FLOW_OS_URL` | `http://localhost:4244` | Flow OS URL |
| `PROJECT_SERVICE_URL` | `http://localhost:4708` | Project service URL |
| `SIMULATION_OS_URL` | `http://localhost:4241` | Simulation OS URL |

## API Endpoints

### Health

- `GET /health` - Service health with interface list
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe (checks MongoDB)
- `GET /health/interfaces` - Backing service health status

### Unified Query

- `POST /api/query` - Unified query across all interfaces
- `POST /api/query/analyze` - Analyze query intent
- `GET /api/query/interfaces` - Get interface health

### Memory Interface

- `GET /api/memory/context` - Get memory context
- `POST /api/memory/context` - Store memory context
- `GET /api/memory/search` - Search memory
- `GET /api/memory/tiers/:tier` - Get memory by tier
- `DELETE /api/memory/:id` - Delete memory entry

### Twin Interface

- `GET /api/twin/summary/:type/:id` - Get twin summary
- `GET /api/twin/profile/:type/:id` - Get twin profile
- `GET /api/twin/predictions/:type/:id` - Get predictions
- `GET /api/twin/insights/:type/:id` - Get insights
- `POST /api/twin/:type` - Create/update twin
- `GET /api/twin/list/:type` - List twins

### Intelligence Interface

- `GET /api/intelligence/entity/:type/:id` - Get entity
- `POST /api/intelligence/query` - Query knowledge graph
- `GET /api/intelligence/insights` - Get insights
- `GET /api/intelligence/paths/:src/:srcId/:tgt/:tgtId` - Get paths
- `POST /api/intelligence/entity` - Create entity
- `POST /api/intelligence/relationship` - Create relationship
- `POST /api/intelligence/analyze` - Analyze patterns

### Agent Interface

- `POST /api/agent/execute` - Execute agent task
- `GET /api/agent/status/:executionId` - Get execution status
- `GET /api/agent/list` - List available agents
- `GET /api/agent/capabilities/:agentId` - Get agent capabilities
- `POST /api/agent/cancel/:executionId` - Cancel execution
- `GET /api/agent/history` - Get execution history

### Workflow Interface

- `GET /api/workflow/list` - List workflows
- `GET /api/workflow/:id` - Get workflow
- `POST /api/workflow` - Create workflow
- `POST /api/workflow/:id/run` - Run workflow
- `GET /api/workflow/:id/run/:runId` - Get run status
- `GET /api/workflow/:id/runs` - Get run history
- `PUT /api/workflow/:id` - Update workflow
- `DELETE /api/workflow/:id` - Delete workflow

### Execution Interface

- `GET /api/execute/tasks` - List tasks
- `GET /api/execute/tasks/:id` - Get task
- `POST /api/execute/tasks` - Create task
- `PUT /api/execute/tasks/:id` - Update task
- `DELETE /api/execute/tasks/:id` - Delete task
- `GET /api/execute/projects` - List projects
- `GET /api/execute/projects/:id` - Get project
- `POST /api/execute/projects` - Create project
- `POST /api/execute/bulk` - Bulk operations

### Simulation Interface

- `GET /api/simulate/list` - List simulations
- `GET /api/simulate/:id` - Get simulation
- `POST /api/simulate/what-if` - Run what-if scenario
- `POST /api/simulate/run` - Run scenario
- `GET /api/simulate/:id/results` - Get simulation results
- `POST /api/simulate/scenarios` - Create scenario template
- `GET /api/simulate/scenarios/list` - List scenarios
- `POST /api/simulate/compare` - Compare simulations

## Unified Query Example

```bash
curl -X POST http://localhost:4600/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the status of my current projects and any relevant insights?",
    "interfaces": ["execution", "intelligence"],
    "context": {
      "userId": "user123",
      "tenantId": "tenant456"
    }
  }'
```

Response:

```json
{
  "success": true,
  "data": {
    "intent": "execution, intelligence",
    "usedInterfaces": ["execution", "intelligence"],
    "results": {
      "execution": { "tasks": [...] },
      "intelligence": { "insights": [...] }
    },
    "synthesizedResponse": "Based on your query...",
    "confidence": 0.75,
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req_123456789"
  }
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Business Copilot (4600)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Memory  │  │   Twin   │  │ Intel-   │  │  Agent   │        │
│  │  Route   │  │  Route   │  │ ligence  │  │  Route   │        │
│  └────┬─────┘  └────┬─────┘  │  Route   │  └────┬─────┘        │
│       │            │        └────┬─────┘       │               │
│       └────────────┼─────────────┼──────────────┘               │
│                    │             │                             │
│              ┌─────┴─────────────┴─────┐                       │
│              │    Query Orchestrator    │                      │
│              │   (Intent Classification)│                      │
│              │   (Result Synthesis)     │                      │
│              └───────────────────────────┘                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│Memory Service │  │ Twin Service  │  │ Graph Service │
│   (4520)      │  │   (4860)      │  │   (4810)      │
└───────────────┘  └───────────────┘  └───────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│Intelligence   │  │  Expert OS    │  │   Flow OS    │
│  (4530)       │  │   (4550)      │  │   (4244)      │
└───────────────┘  └───────────────┘  └───────────────┘
```

## License

Proprietary - HOJAI AI
