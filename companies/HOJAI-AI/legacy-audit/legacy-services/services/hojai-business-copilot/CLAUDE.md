# HOJAI Business Copilot - Claude Code Context

## Service Overview

**Service Name:** @hojai/business-copilot  
**Port:** 4600  
**Type:** Unified orchestration service (gateway/proxy)

The Business Copilot is a unified entry point that orchestrates all HOJAI AI services through a single API. It provides intelligent routing, result synthesis, and a unified interface for interacting with multiple backing services.

## Database

- **MongoDB:** `mongodb://localhost:27017/hojai-business-copilot`
- **Collections:** Used for caching query results and session state
- **Connection:** Mongoose ODM

## Backing Services

The service integrates with 9 backing services:

| Service | Port | URL Env Variable | Purpose |
|---------|------|------------------|---------|
| **Core Business Copilot** | 4002 | `CORE_COPILOT_URL` | 24 industry skill packs, 120+ skills, chat interface |
| Memory Service | 4520 | `MEMORY_SERVICE_URL` | Persistent memory and context |
| Twin Service | 4860 | `TWIN_SERVICE_URL` | Digital twins and predictions |
| Graph Service | 4810 | `GRAPH_SERVICE_URL` | Knowledge graph storage |
| Intelligence Service | 4530 | `INTELLIGENCE_SERVICE_URL` | AI insights and analysis |
| Expert OS | 4550 | `EXPERT_OS_URL` | Agent execution |
| Flow OS | 4244 | `FLOW_OS_URL` | Workflow orchestration |
| Project Service | 4708 | `PROJECT_SERVICE_URL` | Task/project management |
| Simulation OS | 4241 | `SIMULATION_OS_URL` | What-if scenarios |

## Route Structure

```
/                           - Service info
/health                     - Full health check
/health/live                - Liveness probe
/health/ready               - Readiness probe
/health/interfaces          - Backing service health (9 services)

/api/query                  - Unified query endpoint
/api/query/analyze          - Intent analysis
/api/query/interfaces       - Interface status

/api/chat                   - Chat interface (integrates with core/business-copilot)
/api/chat/skills            - Get skills for industry
/api/chat/industries        - Get all 24 supported industries
/api/chat/industry/:industry/query - Query industry-specific intelligence
/api/chat/health            - Chat service health

/api/memory/*               - Memory interface
/api/twin/*                 - Twin interface
/api/intelligence/*         - Intelligence interface
/api/agent/*                - Agent interface
/api/workflow/*             - Workflow interface
/api/execute/*              - Execution interface
/api/simulate/*             - Simulation interface
```

## Key Patterns

### Request Headers
All routes support:
- `X-Tenant-Id` - Multi-tenant identification
- `X-User-Id` - User identification
- `Authorization` - JWT token (future)

### Response Format
All API responses follow the `APIResponse<T>` pattern:
```typescript
{
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta: { timestamp: string; requestId: string };
}
```

### Error Codes
- `VALIDATION_ERROR` - Invalid request parameters
- `MEMORY_SERVICE_ERROR` - Memory service unavailable
- `TWIN_SERVICE_ERROR` - Twin service unavailable
- `GRAPH_SERVICE_ERROR` - Graph service unavailable
- `INTELLIGENCE_SERVICE_ERROR` - Intelligence service unavailable
- `AGENT_SERVICE_ERROR` - Agent service unavailable
- `WORKFLOW_SERVICE_ERROR` - Workflow service unavailable
- `EXECUTION_SERVICE_ERROR` - Execution service unavailable
- `SIMULATION_SERVICE_ERROR` - Simulation service unavailable
- `COPILOT_ERROR` - General copilot orchestration error
- `INTERNAL_ERROR` - Unexpected server error
- `NOT_FOUND` - Route not found

## Intent Classification

The query endpoint automatically classifies queries into interface categories:

```typescript
const INTENT_PATTERNS = {
  memory: ['remember', 'recall', 'context', 'history', ...],
  twin: ['predict', 'forecast', 'twin', 'behavior', ...],
  intelligence: ['analyze', 'insight', 'pattern', 'graph', ...],
  agent: ['execute', 'run', 'perform', 'task', ...],
  workflow: ['workflow', 'sequence', 'automation', ...],
  execution: ['task', 'project', 'status', 'deadline', ...],
  simulation: ['simulate', 'what if', 'scenario', 'model', ...],
};
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Integration Notes

- Service uses axios for HTTP calls to backing services
- All calls are proxied with tenant/user context headers
- Timeouts: 10s default, 60-120s for long-running operations
- Graceful degradation: If a backing service fails, the query continues with available results
- Request IDs are generated and propagated for tracing
