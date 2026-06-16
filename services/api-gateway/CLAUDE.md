# RTMN API Gateway

Single entry point for the RTMN Customer Operations Platform.

## Features
- JWT authentication with CorpID integration
- Tenant isolation
- Rate limiting (per tenant, per user)
- Request/response logging with trace IDs
- Service routing to all platform services
- Circuit breaker pattern
- CORS handling

## Endpoints

### Health
- `GET /health` - Basic health
- `GET /health/live` - Liveness check
- `GET /health/ready` - Readiness check (tests all services)

### Service Routes
- `/services/support-inbox/*` → Unified Inbox
- `/services/knowledge-base/*` → Knowledge Base
- `/services/ticket-service/*` → Ticket Service
- `/services/sla-service/*` → SLA Service
- `/services/analytics/*` → Analytics
- `/services/supporter-ai/*` → Supporter AI
- `/services/customer-context/*` → Customer Context
- `/services/customer-intelligence/*` → Customer Intelligence (CDP)
- `/services/workflow-engine/*` → Workflow Engine
- `/services/action-registry/*` → Action Registry
- `/services/hojai-intelligence/*` → Hojai AI
- `/services/notification-service/*` → Notifications
- `/services/integration-hub/*` → Integration Hub
- `/services/agent-copilot/*` → Agent Copilot

### Legacy Routes (Backward Compatible)
- `/api/support` → Support Inbox
- `/api/kb` → Knowledge Base
- `/api/tickets` → Ticket Service
- `/api/sla` → SLA Service
- `/api/analytics` → Analytics
- `/api/ai` → Supporter AI
- `/api/customer-context` → Customer Context
- `/api/customer-intelligence` → Customer Intelligence
- `/api/workflows` → Workflow Engine
- `/api/actions` → Action Registry
- `/api/hojai` → Hojai Intelligence
- `/api/notifications` → Notifications
- `/api/integrations` → Integration Hub
- `/api/copilot` → Agent Copilot

## Headers

### Required
- `Authorization: Bearer <jwt_token>` - JWT token from CorpID

### Optional
- `X-Tenant-Id` - Override tenant (for internal services)
- `X-Project-Id` - Specify project
- `X-Trace-Id` - Request tracing ID

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| /auth/* | 10/min |
| /api/* | 60/min |
| Default | 100/15min |

## Environment Variables

See .env.example for all service URLs.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
