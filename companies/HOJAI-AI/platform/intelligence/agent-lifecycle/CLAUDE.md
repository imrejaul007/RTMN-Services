# Agent Lifecycle Management Service

> **Version:** 1.0.0
> **Phase:** 40
> **Status:** Complete
> **Port:** 4860 (default, configurable via PORT env)

---

## Overview

The Agent Lifecycle Management Service manages the complete lifecycle of AI agents: registration, versioning, deployment, rollback, health monitoring, and retirement.

## Quick Start

```bash
# Install dependencies
npm install

# Start the service
npm start

# Or with custom port
PORT=5000 npm start

# Run tests
npm test
```

## API Endpoints

### Health Check

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |

### Agent Management

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/agents` | Register a new agent |
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/:id` | Get agent details |
| PUT | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Retire agent |
| POST | `/api/agents/:id/versions` | Register new version |
| GET | `/api/agents/:id/versions` | List versions |
| GET | `/api/agents/:id/metrics` | Get performance metrics |

### Version Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/versions/:agentId/:version` | Get specific version |
| GET | `/api/versions/:agentId/latest` | Get latest version |

### Deployment

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/deploy` | Create and start deployment |
| GET | `/api/deploy/:id` | Get deployment status |
| GET | `/api/deploy/agent/:agentId` | Get all deployments for agent |
| GET | `/api/deploy/agent/:agentId/:env` | Get deployments by environment |
| PUT | `/api/deploy/:id/metrics` | Update deployment metrics |

### Rollback

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/rollback/:agentId` | Rollback to previous version |
| GET | `/api/rollback/:agentId` | Get rollback history |
| GET | `/api/rollback/:agentId/:env` | Get rollbacks by environment |
| GET | `/api/rollback/details/:id` | Get rollback details |
| GET | `/api/rollback/:agentId/:env/available` | Get available versions |

### Health Monitoring

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health/:agentId` | Get agent health (all envs) |
| GET | `/api/health/:agentId/:env` | Get agent health in env |
| POST | `/api/health/:agentId/:env` | Update health metrics |
| GET | `/api/health/:agentId/:env/history` | Get health history |
| POST | `/api/health/:agentId/:env/reset` | Reset health data |

---

## Data Models

### Agent

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "type": "reasoning | action | hybrid",
  "createdAt": "ISO string",
  "updatedAt": "ISO string",
  "status": "active | paused | retired",
  "currentVersion": "string | null",
  "environments": {
    "dev": "string | null",
    "staging": "string | null",
    "prod": "string | null"
  },
  "metadata": {}
}
```

### AgentVersion

```json
{
  "id": "uuid",
  "agentId": "string",
  "version": "semver string",
  "changelog": "string",
  "imageUrl": "string",
  "config": {},
  "createdAt": "ISO string",
  "createdBy": "string"
}
```

### Deployment

```json
{
  "id": "uuid",
  "agentId": "string",
  "version": "string",
  "environment": "dev | staging | prod",
  "strategy": "rolling | canary | bluegreen",
  "status": "pending | deploying | healthy | unhealthy | rolled_back",
  "canaryPercent": "number",
  "startedAt": "ISO string",
  "completedAt": "ISO string | null",
  "metrics": {
    "requestsPerSec": "number",
    "errorRate": "number",
    "latencyP99": "number"
  }
}
```

### Rollback

```json
{
  "id": "uuid",
  "agentId": "string",
  "environment": "dev | staging | prod",
  "fromVersion": "string",
  "toVersion": "string",
  "reason": "string",
  "initiatedBy": "string",
  "status": "initiated | rolling_back | completed | failed",
  "createdAt": "ISO string",
  "completedAt": "ISO string | null",
  "logs": ["string"]
}
```

---

## Deployment Strategies

### Rolling Deployment
- Default strategy
- Gradual replacement of old version with new version
- Zero downtime

### Canary Deployment
- Gradual traffic shifting: 5% -> 10% -> 25% -> 50% -> 100%
- Health checks at each step
- Auto-rollback if health thresholds exceeded

### Blue-Green Deployment
- Maintains two identical environments
- Instant switch between versions

---

## Health Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | 1% | 5% |
| P99 Latency | 500ms | 2000ms |
| Requests/sec | < 1 | - |

---

## Auto-Retirement

Agents are automatically marked as unhealthy and deployments failed after:
- 3 consecutive unhealthy health checks

---

## Docker

```bash
# Build
docker build -t agent-lifecycle .

# Run
docker run -p 4860:4860 agent-lifecycle

# Or with volume for data persistence
docker run -p 4860:4860 -v $(pwd)/data:/app/data agent-lifecycle
```

---

## File Structure

```
agent-lifecycle/
├── src/
│   ├── index.js           # Express server
│   ├── registry.js        # Agent version registry
│   ├── deployer.js        # Deployment logic
│   ├── rollback.js        # Rollback logic
│   ├── health.js          # Health monitoring
│   ├── canary.js          # Canary deployment
│   └── routes/
│       ├── health.js      # Health routes
│       ├── agents.js      # Agent CRUD
│       ├── versions.js    # Version management
│       ├── deploy.js      # Deployment endpoints
│       ├── rollback.js    # Rollback endpoints
│       └── agentHealth.js # Health monitoring
├── __tests__/
│   └── agent-lifecycle.test.js
├── data/                  # JSON data storage (created at runtime)
├── Dockerfile
├── package.json
└── CLAUDE.md
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4860 | Service port |
| NODE_ENV | development | Environment |

---

*Part of HOJAI AI Platform - Phase 40: Agent Lifecycle Management*