# HOJAI AI Resolution Service

AI Resolution Plans Service for HOJAI AI - Generates structured AI resolution plans from issues for customer support.

## Overview

This service generates structured AI-powered resolution plans from customer issues, similar to MeetKin's action extraction but designed for comprehensive customer support scenarios. It analyzes issues, generates step-by-step resolution plans, suggests escalations, and tracks resolution progress.

## Features

- **AI-Powered Plan Generation**: Uses OpenAI (with fallback to rule-based generation) to create structured resolution plans
- **Template Matching**: Finds and applies similar past resolutions
- **Escalation Management**: Automatically evaluates when issues need escalation and routes to appropriate agents
- **Progress Tracking**: Real-time tracking of resolution progress
- **Time Estimation**: Provides realistic resolution time estimates
- **Success Criteria**: Defines measurable success criteria for each resolution
- **Action Items**: Extracts actionable tasks for agents and customers
- **Analytics**: Resolution statistics and metrics

## Architecture

```
hojai-ai-resolution-service/
├── src/
│   ├── models/
│   │   └── resolution.ts          # Mongoose models and types
│   ├── services/
│   │   ├── aiProviderService.ts   # AI provider integration
│   │   ├── planGeneratorService.ts # Core plan generation logic
│   │   ├── resolutionEngine.ts    # Main resolution pipeline
│   │   ├── templateService.ts      # Template management
│   │   └── escalationService.ts   # Escalation logic
│   ├── routes/
│   │   └── resolutionRoutes.ts    # API endpoints
│   ├── middleware/
│   │   └── validation.ts          # Zod validation schemas
│   ├── utils/
│   │   └── logger.ts              # Winston logger configuration
│   └── index.ts                   # Application entry point
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Issue Analysis & Resolution

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/resolution/analyze` | Analyze an issue and return insights |
| POST | `/resolution/generate` | Generate a complete resolution plan |
| GET | `/resolution/plan/:planId` | Get plan by ID with progress |
| PUT | `/resolution/plan/:planId/progress` | Update step or action item status |
| POST | `/resolution/plan/:planId/complete` | Mark resolution as complete |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/resolution/templates` | List all templates (paginated) |
| GET | `/resolution/templates/popular` | Get most used templates |
| POST | `/resolution/templates` | Create a new template |
| GET | `/resolution/templates/:templateId` | Get template details |
| POST | `/resolution/templates/:templateId/clone` | Clone a template |

### History & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/resolution/history/:customerId` | Get customer resolution history |
| GET | `/resolution/stats` | Get resolution statistics |
| GET | `/resolution/plan/:planId/success-criteria` | Get success criteria status |

### Escalation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/resolution/escalate` | Escalate an issue |
| GET | `/resolution/suggestions/:issueId` | Get suggestions for an issue |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/ready` | Readiness check |

## Data Models

### Issue

```typescript
{
  issueId: string;
  title: string;
  description: string;
  category: 'technical' | 'billing' | 'account' | 'product' | 'shipping' | 'refund' | 'complaint' | 'general' | 'compliance' | 'security';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'escalated' | 'closed';
  customerId: string;
  agentId?: string;
  context: IIssueContext;
}
```

### ResolutionPlan

```typescript
{
  planId: string;
  issueId: string;
  customerId: string;
  steps: IResolutionStep[];
  actionItems: IActionItem[];
  successCriteria: ISuccessCriteria[];
  estimatedTotalTime: number;
  actualTime?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  escalationLevel?: EscalationLevel;
  confidence: number;
}
```

### ResolutionStep

```typescript
{
  stepNumber: number;
  type: 'agent_action' | 'customer_action' | 'system_action' | 'wait' | 'condition' | 'escalation';
  title: string;
  description: string;
  agentAction?: IAgentAction;
  customerAction?: ICustomerAction;
  estimatedTime: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
}
```

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start in production
npm start

# Start in development
npm run dev
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 4596 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/hojai_resolution |
| `AI_API_KEY` | OpenAI API key | - |
| `AI_PROVIDER` | AI provider (openai/anthropic) | openai |
| `AI_MODEL` | AI model to use | gpt-4-turbo-preview |
| `AI_TEMPERATURE` | AI response creativity | 0.7 |
| `REDIS_URL` | Redis connection string | - |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 60000 |
| `RATE_LIMIT_MAX` | Max requests per window | 100 |
| `AI_RATE_LIMIT_MAX` | Max AI requests per minute | 20 |
| `CORS_ORIGIN` | Allowed CORS origins | http://localhost:3000 |

## Usage Examples

### Generate a Resolution Plan

```bash
curl -X POST http://localhost:4596/resolution/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Unable to process payment",
    "description": "Customer reports payment failing with error code 5002. Transaction attempted multiple times.",
    "category": "billing",
    "priority": "high",
    "customerId": "cust_12345",
    "context": {
      "customerTier": "premium",
      "product": "Enterprise Plan"
    }
  }'
```

### Analyze an Issue

```bash
curl -X POST http://localhost:4596/resolution/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API returning 500 errors",
    "description": "Production API returning intermittent 500 errors on POST /api/orders endpoint",
    "category": "technical",
    "priority": "critical",
    "customerId": "cust_12345"
  }'
```

### Update Plan Progress

```bash
curl -X PUT http://localhost:4596/resolution/plan/plan_abc123/progress \
  -H "Content-Type: application/json" \
  -d '{
    "stepOrder": 1,
    "status": "completed",
    "notes": "Verified system logs and identified root cause"
  }'
```

### Complete Resolution

```bash
curl -X POST http://localhost:4596/resolution/plan/plan_abc123/complete \
  -H "Content-Type: application/json" \
  -d '{
    "outcome": "resolved",
    "feedback": {
      "rating": 5,
      "comment": "Issue resolved quickly and professionally"
    }
  }'
```

### Escalate Issue

```bash
curl -X POST http://localhost:4596/resolution/escalate \
  -H "Content-Type: application/json" \
  -d '{
    "issueId": "issue_123",
    "reason": "Technical complexity requires L2 specialist involvement",
    "targetLevel": "l2_specialist"
  }'
```

## Escalation Levels

| Level | Description | Typical Wait Time |
|-------|-------------|-------------------|
| `none` | No escalation needed | - |
| `l1_agent` | Standard L1 agent handling | 5 min |
| `l2_specialist` | Technical specialist | 15 min |
| `l3_expert` | Senior expert | 30 min |
| `management` | Management involvement | 60 min |
| `legal` | Legal team review | 120 min |

## Error Handling

The service returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": [
    { "field": "fieldName", "message": "Validation error" }
  ]
}
```

## Monitoring

### Health Check

```bash
curl http://localhost:4596/health
```

Response:
```json
{
  "status": "healthy",
  "service": "hojai-ai-resolution-service",
  "version": "1.0.0",
  "timestamp": "2026-06-01T12:00:00.000Z",
  "dependencies": {
    "mongodb": "connected",
    "redis": "connected"
  },
  "uptime": 3600
}
```

### Metrics

Resolution metrics available via `/resolution/stats`:
- Total resolutions (30-day rolling)
- Average resolution time
- Success rate
- By category breakdown
- By priority breakdown
- Escalation metrics

## Development

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## Port

This service runs on **port 4596** as defined in the HOJAI AI port registry.

## Company

Part of the **RTNM Group** ecosystem, developed by **HOJAI AI** - the AI Infrastructure company.

## License

MIT
