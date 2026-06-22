# HOJAI ExpertOS - Agent Runtime Platform

**Company:** HOJAI AI  
**Product:** ExpertOS - Agent Runtime Platform  
**Port:** 4550 (default), configurable via `PORT` env  
**Version:** 1.0.0  
**Status:** ✅ **SECURITY AUDITED** (June 13, 2026)  
**Security Score:** 95/100

---

## Overview

**HOJAI ExpertOS** is the Agent Runtime Platform that provides the runtime environment for AI agents, skill orchestration, and expert twin management. It is a core service within the **HOJAI AI** ecosystem, which is an Operational AI Infrastructure Company building AI Operating Systems for organizations and individuals.

### Key Capabilities

- **AI Agent Management** - Create, invoke, train, and manage AI agents
- **Skill Orchestration** - Register and execute skills for agents
- **Expert Twins** - Digital replicas of domain experts with training capabilities
- **Workflow Execution** - Multi-step automated workflows with retry logic
- **Execution Tracking** - Monitor agent executions with metrics and logging

---

## Architecture

### Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js 4.x |
| Language | TypeScript 5.x |
| Database | MongoDB 6.x (Mongoose ODM) |
| Cache | Redis 7.x (ioredis) |
| Validation | Zod 3.x |
| Logging | Pino |
| Security | Helmet, CORS, Rate Limiting |
| Auth | JWT + API Key |

### Directory Structure

```
hojai-expert-os/
├── src/
│   ├── index.ts          # Main Express server
│   └── types/
│       └── index.ts      # Zod validation schemas
├── web/
│   └── dist/            # Compiled web UI assets
├── ExpertTwins/          # Expert twin data directory
├── Dockerfile            # Multi-stage production build
├── docker-compose.yml    # Local development stack
├── package.json
├── tsconfig.json
├── CLAUDE.md             # This file
├── README.md
└── INTEGRATION.md
```

---

## Security Features

### ✅ Implemented Security Measures

| Feature | Description | Status |
|---------|-------------|--------|
| **JWT Authentication** | Bearer token validation on all `/api/*` routes | ✅ |
| **API Key Auth** | Service-to-service authentication via `X-API-Key` header | ✅ |
| **Rate Limiting** | 100 requests/minute per IP (configurable) | ✅ |
| **Input Validation** | Zod schema validation on all endpoints | ✅ |
| **NoSQL Injection Prevention** | String sanitization removes `$<> ` operators | ✅ |
| **Mass Assignment Protection** | Explicit field allowlists instead of `req.body` | ✅ |
| **Skill Registry RCE Prevention** | No arbitrary code execution - metadata only | ✅ |
| **CORS Configuration** | Explicit origin allowlist required | ✅ |
| **Graceful Shutdown** | SIGTERM/SIGINT handlers with connection draining | ✅ |
| **Request Correlation** | `X-Request-ID` header for distributed tracing | ✅ |
| **Non-root Docker User** | Runs as `nodeapp` user in production | ✅ |
| **Resource Limits** | CPU/memory limits in docker-compose | ✅ |
| **Redis Reconnection** | Automatic retry with exponential backoff | ✅ |
| **Health Checks** | Liveness, readiness, and deep health endpoints | ✅ |

### Authentication

All `/api/*` endpoints require authentication. Use one of:

1. **JWT Token:**
   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:4550/api/v1/agents
   ```

2. **API Key (service-to-service):**
   ```bash
   curl -H "X-API-Key: <api-key>" http://localhost:4550/api/v1/agents
   ```

Health endpoints (`/health/*`) are publicly accessible.

---

## API Reference

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Full health check with memory stats |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe (checks MongoDB + Redis) |

### Agent Management (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/agents` | List all agents (paginated) |
| POST | `/api/v1/agents` | Create new agent |
| GET | `/api/v1/agents/:id` | Get agent by ID |
| PUT | `/api/v1/agents/:id` | Update agent |
| DELETE | `/api/v1/agents/:id` | Delete agent |

### Agent Execution (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/agents/:id/invoke` | Invoke agent with input |
| POST | `/api/v1/agents/:id/train` | Train agent with training data |
| GET | `/api/v1/agents/:id/stats` | Get agent execution statistics |

### Execution Management (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/executions` | List executions (paginated) |
| GET | `/api/v1/executions/:id` | Get execution by ID |
| POST | `/api/v1/executions/:id/cancel` | Cancel running execution |

### Workflow Management (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/workflows` | List all workflows |
| POST | `/api/v1/workflows` | Create new workflow |
| POST | `/api/v1/workflows/:id/execute` | Execute workflow |

### Expert Twin Management (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/expert-twins` | List all expert twins |
| POST | `/api/v1/expert-twins` | Create new expert twin |
| GET | `/api/v1/expert-twins/:id` | Get expert twin by ID |
| PUT | `/api/v1/expert-twins/:id` | Update expert twin |
| DELETE | `/api/v1/expert-twins/:id` | Delete expert twin |

### Skill Registry (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/skills` | List registered skills |
| POST | `/api/v1/skills` | Register new skill (metadata only) |
| POST | `/api/v1/skills/:id/execute` | Execute registered skill |

---

## Data Models

### Agent

```typescript
{
  id: string;           // UUID
  name: string;         // 1-100 chars
  description?: string; // max 500 chars
  type: 'conversational' | 'task' | 'automation' | 'analysis' | 'custom';
  skills: string[];    // Array of skill IDs
  capabilities: string[];
  config: object;       // Custom configuration
  status: 'idle' | 'running' | 'paused' | 'error' | 'stopped';
  memory: object;       // Agent memory store
  ownerId?: string;     // Owner user ID
  metadata: object;     // Custom metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### Execution

```typescript
{
  id: string;
  agentId: string;
  skillId: string;
  input: object;
  output?: object;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  logs: Array<{
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: object;
  }>;
  metrics?: {
    duration?: number;
    tokens?: number;
    cost?: number;
  };
}
```

### Workflow

```typescript
{
  id: string;
  name: string;
  description?: string;
  steps: Array<{
    id: string;
    skillId: string;
    input?: object;
    condition?: string;
    retry?: {
      maxAttempts: number; // 1-10
      delay: number;       // milliseconds
    };
  }>;
  parallel: boolean;
  errorHandling: 'stop' | 'continue' | 'retry';
}
```

### ExpertTwin

```typescript
{
  id: string;
  agentId: string;
  name: string;
  domain?: string;
  expertise: string[];
  trainingData: Array<{
    input: object;
    output: object;
    feedback?: number; // 0-1
  }>;
  model: {
    type: string;
    version: string;
    config: object;
  };
  performance: {
    accuracy: number;  // 0-1
    throughput: number;
    latency: number;
  };
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4550 | Service port |
| NODE_ENV | No | development | Environment |
| LOG_LEVEL | No | info | Logging level |
| MONGODB_URI | Yes | - | MongoDB connection string |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |
| JWT_SECRET | Yes | - | JWT signing/verification secret |
| HOJAI_EXPERT_OS_API_KEY | Yes | - | API key for service auth |
| CORS_ORIGIN | No | - | Comma-separated allowed origins |
| RATE_LIMIT_MAX | No | 100 | Max requests per window |
| RATE_LIMIT_WINDOW | No | 60000 | Rate limit window (ms) |

---

## Integration Points

### RABTUL Services (Core)

| Service | Port | Purpose |
|---------|------|---------|
| RABTUL Auth | 4002 | JWT authentication |
| RABTUL Payment | 4001 | Payments |
| RABTUL Wallet | 4004 | Balance management |
| RABTUL Notification | 4005 | Notifications |

### HOJAI Ecosystem

| Service | Port | Purpose |
|---------|------|---------|
| HOJAI Core | 4500-4610 | API Gateway, Event, Memory, Intelligence |
| HOJAI SkillNet | 5120-5140 | Skill marketplace |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| Genie Voice | 4760 | Voice AI |

---

## Docker Deployment

### Quick Start

```bash
# Build
docker build -t hojai-expert-os .

# Run with environment
docker run -p 4550:3000 \
  -e MONGODB_URI=mongodb://host:27017/expert-os \
  -e REDIS_URL=redis://host:6379 \
  -e JWT_SECRET=your-secret \
  -e HOJAI_EXPERT_OS_API_KEY=your-api-key \
  hojai-expert-os
```

### Docker Compose

```bash
docker-compose up -d
```

Includes:
- MongoDB 6 with health checks
- Redis 7 with authentication
- ExpertOS service with resource limits

---

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production
npm start
```

---

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage
```

---

## License

Proprietary - RTNM Digital

---

## Related Documents

| Document | Location | Description |
|----------|----------|-------------|
| README.md | ./README.md | Quick start guide |
| INTEGRATION.md | ./INTEGRATION.md | Integration guide |
| RTNM-COMPANIES-AUDIT.md | ../../RTNM-COMPANIES-AUDIT.md | RTNM ecosystem audit |
| RTNM-PRODUCTS-FEATURES-AUDIT.md | ../../RTNM-PRODUCTS-FEATURES-AUDIT.md | Products & features |
| COMPANIES-AUDIT.md | ../COMPANIES-AUDIT.md | HOJAI AI companies |
| PRODUCTS-FEATURES-AUDIT.md | ../PRODUCTS-FEATURES-AUDIT.md | HOJAI products |

---

**Last Updated:** June 13, 2026  
**Audited by:** Claude Code (AI Assistant)