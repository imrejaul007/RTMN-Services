# CLAUDE.md - SUTAR Flow OS

## Project Overview

**Name:** sutar-flow-os
**Type:** SUTAR OS Service
**Port:** 4244
**Description:** Flow OS - Workflow orchestration, execution, and AI-powered optimization
**Company:** HOJAI AI
**Product:** SUTAR OS
**Layer:** FlowOS

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript (ESM)
- MongoDB (Mongoose ODM)
- Zod (validation)
- JSON Web Tokens

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server (watch mode) |
| `npm run build` | Build for production |
| `npm start` | Production server |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4244 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | No | mongodb://localhost:27017/sutar-flow-os | MongoDB connection URI |
| CORS_ORIGIN | No | * | CORS origin |
| JWT_SECRET | No | - | JWT secret for auth |
| LOG_LEVEL | No | info | Logging level (info/debug) |

## MongoDB Collections

| Collection | Description |
|------------|-------------|
| FlowDefinition | Workflow definitions with steps, triggers, variables |
| FlowRun | Flow execution instances |
| FlowStep | Individual step executions |
| FlowTrigger | Trigger configurations |
| FlowAnalytics | Aggregated analytics data |
| FlowBottleneck | Detected bottlenecks and suggestions |

## API Routes Summary

### Health (No auth required)
- `GET /health` - Health check
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

### Flows (X-Tenant-Id required)
- `GET /api/flows` - List flows (paginated, searchable)
- `POST /api/flows` - Create flow
- `GET /api/flows/:id` - Get flow
- `PATCH /api/flows/:id` - Update flow
- `DELETE /api/flows/:id` - Delete flow
- `POST /api/flows/:id/run` - Execute flow
- `GET /api/flows/:id/runs` - Run history
- `GET /api/flows/:id/runs/:runId` - Run detail
- `POST /api/flows/:id/runs/:runId/cancel` - Cancel run
- `GET /api/flows/:id/analytics` - Flow analytics
- `GET /api/flows/:id/bottlenecks` - Bottleneck analysis

### Runs (X-Tenant-Id required)
- `GET /api/runs` - List all runs
- `GET /api/runs/:id` - Run detail

### Triggers (X-Tenant-Id required)
- `GET /api/triggers` - List triggers
- `POST /api/triggers` - Create trigger
- `PATCH /api/triggers/:id` - Update trigger
- `DELETE /api/triggers/:id` - Delete trigger
- `POST /api/triggers/:id/test` - Test trigger

### Analytics (X-Tenant-Id required)
- `GET /api/analytics/dashboard` - Dashboard stats
- `GET /api/analytics` - Workflow analytics

### Optimization (X-Tenant-Id required)
- `POST /api/optimization/suggest` - AI suggestions
- `POST /api/optimization/optimize/:flowId` - Optimize flow

## AI Features

### Flow Execution Engine
- Step-by-step execution with state management
- Conditional branching (if/else logic)
- Parallel execution for independent steps
- Timeout handling and retry logic
- Error recovery with exponential backoff

### Bottleneck Detection
- Analyze step execution times
- Identify steps with high failure rates
- Detect wait time patterns
- Generate optimization suggestions

### Automation Suggestions
- Analyze manual processes
- Suggest automation opportunities
- Estimate time/cost savings
- Recommend best practices

### Flow Optimization
- Reduce step count
- Parallelize independent steps
- Add error handling
- Optimize execution order
- Suggest caching opportunities

### Trigger Management
- Cron-based scheduling
- Event-driven triggers
- Webhook integration
- Manual triggers with approval

### Workflow Analytics
- Success/failure rates
- Average execution time
- Step-level analytics
- Trend analysis
- Cost estimation

## Integration Points

### Upstream Services
- SUTAR Gateway (4140) - API Gateway
- SUTAR Intent Bus (4154) - Intent routing

### Downstream Services
- HOJAI Flow Service (4580) - Base flow service for reference
- SUTAR Integration Hub - Payment and auth integration
- HOJAI Memory (4520) - Long-term memory

### Database
- MongoDB - Primary data store
- Collections: FlowDefinition, FlowRun, FlowStep, FlowTrigger, FlowAnalytics, FlowBottleneck

## Code Patterns

### Logger
```typescript
import { createLogger } from './utils/logger.js';
const logger = createLogger('service-name');
logger.info('event_name', { key: 'value' });
```

### Response Format
```typescript
import { createResponse, createErrorResponse } from './types/index.js';
res.json(createResponse({ data }, { tenantId }));
res.status(400).json(createErrorResponse('CODE', 'Message'));
```

### Tenant Isolation
```typescript
import { tenantMiddleware } from './middleware/tenant.js';
router.use(tenantMiddleware());
const { tenantId } = req.tenantContext!;
```

### Zod Validation
```typescript
import { z } from 'zod';
const Schema = z.object({ field: z.string() });
const result = Schema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: result.error.issues }));
}
```

## File Structure

```
sutar-flow-os/
├── src/
│   ├── index.ts              # Main entry (Express server, port 4244)
│   ├── routes/
│   │   ├── flows.ts          # Flow CRUD and execution routes
│   │   ├── runs.ts           # Run listing routes
│   │   ├── triggers.ts       # Trigger management routes
│   │   ├── analytics.ts      # Dashboard and analytics routes
│   │   └── optimization.ts   # AI optimization routes
│   ├── services/
│   │   ├── flowService.ts        # Flow definition CRUD
│   │   ├── executionService.ts   # Flow execution engine
│   │   ├── triggerService.ts     # Trigger management
│   │   ├── analyticsService.ts   # Analytics and bottlenecks
│   │   └── optimizationService.ts # AI optimization
│   ├── models/
│   │   └── index.ts          # Mongoose models
│   ├── types/
│   │   └── index.ts          # TypeScript types and Zod schemas
│   ├── middleware/
│   │   ├── tenant.ts         # Tenant isolation middleware
│   │   └── auth.ts           # JWT auth middleware
│   └── utils/
│       └── logger.ts          # JSON logging utility
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── README.md
└── CLAUDE.md
```

---

**Last Updated:** 2026-06-12
