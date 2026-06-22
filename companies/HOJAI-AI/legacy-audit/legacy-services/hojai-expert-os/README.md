# HOJAI ExpertOS - Agent Runtime Platform

> **HOJAI AI** | Company: hojai-ai  
> **Port:** 4550 | **Status:** ✅ **SECURITY AUDITED** (June 13, 2026)

## Overview

**HOJAI ExpertOS** is the Agent Runtime Platform that provides the runtime environment for AI agents, skill orchestration, and expert twin management. It is a core service within the **HOJAI AI** ecosystem.

### Key Features

- 🤖 **AI Agent Management** - Create, invoke, train, and manage AI agents
- 🎯 **Skill Orchestration** - Register and execute skills for agents
- 👤 **Expert Twins** - Digital replicas of domain experts with training capabilities
- ⚡ **Workflow Execution** - Multi-step automated workflows with retry logic
- 📊 **Execution Tracking** - Monitor agent executions with metrics and logging

---

## Quick Start

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Start production
npm start
```

**Default Port:** `4550`

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4550 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection |
| REDIS_URL | No | redis://localhost:6379 | Redis |
| JWT_SECRET | Yes | - | JWT signing secret |
| HOJAI_EXPERT_OS_API_KEY | Yes | - | API key for service auth |
| CORS_ORIGIN | No | - | Comma-separated allowed origins |

---

## Authentication

All `/api/*` endpoints require authentication:

```bash
# JWT Token
curl -H "Authorization: Bearer <token>" http://localhost:4550/api/v1/agents

# API Key
curl -H "X-API-Key: <api-key>" http://localhost:4550/api/v1/agents
```

Health endpoints (`/health/*`) are publicly accessible.

---

## API Endpoints

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Full health check with memory stats |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe |

### Agents (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/agents` | List all agents |
| POST | `/api/v1/agents` | Create new agent |
| GET | `/api/v1/agents/:id` | Get agent by ID |
| PUT | `/api/v1/agents/:id` | Update agent |
| DELETE | `/api/v1/agents/:id` | Delete agent |
| POST | `/api/v1/agents/:id/invoke` | Invoke agent |
| POST | `/api/v1/agents/:id/train` | Train agent |
| GET | `/api/v1/agents/:id/stats` | Get agent stats |

### Executions (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/executions` | List executions |
| GET | `/api/v1/executions/:id` | Get execution |
| POST | `/api/v1/executions/:id/cancel` | Cancel execution |

### Workflows (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/workflows` | List workflows |
| POST | `/api/v1/workflows` | Create workflow |
| POST | `/api/v1/workflows/:id/execute` | Execute workflow |

### Expert Twins (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/expert-twins` | List expert twins |
| POST | `/api/v1/expert-twins` | Create expert twin |
| GET | `/api/v1/expert-twins/:id` | Get expert twin |
| PUT | `/api/v1/expert-twins/:id` | Update expert twin |
| DELETE | `/api/v1/expert-twins/:id` | Delete expert twin |

### Skills (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/skills` | List skills |
| POST | `/api/v1/skills` | Register skill |
| POST | `/api/v1/skills/:id/execute` | Execute skill |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x
- **Database:** MongoDB 6.x (Mongoose ODM)
- **Cache:** Redis 7.x (ioredis)
- **Validation:** Zod 3.x
- **Logging:** Pino
- **Security:** Helmet, CORS, Rate Limiting

---

## Integration Points

### RABTUL Services (Core)

| Service | Port | Purpose |
|---------|------|---------|
| RABTUL Auth | 4002 | Authentication |
| RABTUL Payment | 4001 | Payments |
| RABTUL Wallet | 4004 | Balance |
| RABTUL Notification | 4005 | Notifications |

### HOJAI Ecosystem

| Service | Port | Purpose |
|---------|------|---------|
| HOJAI Core | 4500-4610 | API Gateway, Event, Memory |
| HOJAI SkillNet | 5120-5140 | Skill marketplace |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| Genie Voice | 4760 | Voice AI |

---

## Docker Deployment

```bash
# Build image
docker build -t hojai-expert-os .

# Run container
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

---

## Security Features

| Feature | Status |
|---------|--------|
| JWT Authentication | ✅ |
| API Key Auth | ✅ |
| Rate Limiting (100/min) | ✅ |
| Input Validation (Zod) | ✅ |
| NoSQL Injection Prevention | ✅ |
| Mass Assignment Protection | ✅ |
| Skill Registry RCE Prevention | ✅ |
| CORS Configuration | ✅ |
| Graceful Shutdown | ✅ |
| Request Correlation IDs | ✅ |
| Non-root Docker User | ✅ |
| Resource Limits | ✅ |

---

## License

Proprietary - RTNM Digital

---

**Last Updated:** June 13, 2026
