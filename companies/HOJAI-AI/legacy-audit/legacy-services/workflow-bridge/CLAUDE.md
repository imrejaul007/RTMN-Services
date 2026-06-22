# 🔗 HOJAI Workflow Bridge

## Overview

**Service Name:** HOJAI Workflow Bridge  
**Version:** 1.0.0  
**Port:** 4800  
**Location:** `companies/hojai-ai/workflow-bridge/`  
**Tagline:** "Agent<->Workflow Integration"  
**Purpose:** Bidirectional integration between AgentOS and FlowOS

**Status:** ✅ PRODUCTION READY  
**Last Updated:** June 13, 2026

---

## Quick Start

```bash
cd companies/hojai-ai/workflow-bridge

# Install dependencies
npm install

# Build
npm run build

# Start service
PORT=4800 npm start

# Development mode
PORT=4800 npm run dev
```

---

## Features

### Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| Agent-to-Workflow | Invoke workflows from agents | ✅ |
| Workflow-to-Agent | Trigger agents from workflows | ✅ |
| Bidirectional Sync | Real-time sync between systems | ✅ |
| Event Publishing | Publish events to both systems | ✅ |
| State Management | Shared state across systems | ✅ |
| Error Handling | Graceful error handling | ✅ |
| Logging | Structured Pino logging | ✅ |

### Integration Points

| System | Port | Purpose |
|--------|------|---------|
| AgentOS | 4550 | Agent execution platform |
| FlowOS | 4244 | Workflow execution engine |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    HOJAI WORKFLOW BRIDGE                         │
│                         Port: 4800                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API Layer                             │  │
│  │  /health │ /api/agent/* │ /api/workflow/*             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               Bridge Engine Layer                          │  │
│  │  Agent Adapter │ Workflow Adapter │ Sync Manager        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  External Systems                         │  │
│  │  AgentOS (4550) │ FlowOS (4244)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe |

### Agent Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agent/invoke` | Invoke agent from workflow |
| GET | `/api/agent/:id/status` | Get agent status |
| POST | `/api/agent/:id/cancel` | Cancel agent execution |

### Workflow Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workflow/trigger` | Trigger workflow from agent |
| GET | `/api/workflow/:id/status` | Get workflow status |
| POST | `/api/workflow/:id/cancel` | Cancel workflow execution |

### Sync Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sync/state` | Sync shared state |
| GET | `/api/sync/state/:key` | Get shared state |
| POST | `/api/sync/events` | Publish sync event |

---

## API Examples

### Invoke Agent from Workflow

```bash
curl -X POST http://localhost:4800/api/agent/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-123",
    "action": "process",
    "context": {"workflowId": "wf-456", "step": 2},
    "input": {"data": "sample"}
  }'
```

### Trigger Workflow from Agent

```bash
curl -X POST http://localhost:4800/api/workflow/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "wf-456",
    "trigger": "agent_complete",
    "agentId": "agent-123",
    "output": {"result": "success"}
  }'
```

### Sync State

```bash
curl -X POST http://localhost:4800/api/sync/state \
  -H "Content-Type: application/json" \
  -d '{
    "key": "shared-context",
    "value": {"agentState": {}, "workflowState": {}},
    "ttl": 3600
  }'
```

---

## Project Structure

```
workflow-bridge/
├── src/
│   ├── index.ts              # Main entry point
│   ├── routes/
│   │   ├── health.ts        # Health endpoints
│   │   ├── agent.ts        # Agent endpoints
│   │   ├── workflow.ts     # Workflow endpoints
│   │   └── sync.ts         # Sync endpoints
│   ├── adapters/
│   │   ├── agentAdapter.ts # AgentOS adapter
│   │   └── workflowAdapter.ts # FlowOS adapter
│   ├── services/
│   │   ├── bridgeService.ts # Bridge logic
│   │   └── syncService.ts  # Sync service
│   ├── middleware/
│   │   └── error.ts        # Error handling
│   └── utils/
│       └── logger.ts        # Pino logger
├── dist/                     # Compiled JavaScript
├── package.json
├── tsconfig.json
└── CLAUDE.md               # This file
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4800 | Service port |
| `AGENT_OS_URL` | `http://localhost:4550` | AgentOS URL |
| `FLOW_OS_URL` | `http://localhost:4244` | FlowOS URL |
| `MONGODB_URI` | `mongodb://localhost:27017/workflow-bridge` | MongoDB |
| `REDIS_URL` | `redis://localhost:6379` | Redis |
| `NODE_ENV` | development | Environment |

---

## Connected Services

### AgentOS (Port 4550)

The bridge connects to AgentOS for:
- Agent invocation
- Status monitoring
- Cancellation

### FlowOS (Port 4244)

The bridge connects to FlowOS for:
- Workflow triggering
- Status monitoring
- Step execution

### RAZO Keyboard Integration

Workflow Bridge is connected to **RAZO Keyboard** via AgentOS:

| Integration | Purpose |
|-------------|---------|
| Agent Mode | Execute workflows via keyboard |
| Automation | Trigger workflows from keyboard |

---

## Security

| Feature | Status |
|---------|--------|
| Helmet.js Security Headers | ✅ |
| CORS Configuration | ✅ |
| Input Validation | ✅ |
| Error Handling | ✅ |
| Structured Logging | ✅ |

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | Web framework |
| mongoose | ^8.0.0 | MongoDB ODM |
| ioredis | ^5.3.2 | Redis client |
| pino | ^8.17.0 | Structured logging |
| axios | ^1.6.0 | HTTP client |
| uuid | ^9.0.0 | UUID generation |
| helmet | ^7.1.0 | Security headers |
| cors | ^2.8.5 | CORS support |

---

## Related Documentation

- [HOJAI AI CLAUDE.md](../CLAUDE.md)
- [RAZO Keyboard CLAUDE.md](../RAZO-Keyboard/CLAUDE.md)
- [RTNM-COMPANIES-AUDIT.md](../../RTNM-COMPANIES-AUDIT.md)
- [RTNM-PRODUCTS-FEATURES-AUDIT.md](../../RTNM-PRODUCTS-FEATURES-AUDIT.md)

---

**Built with ❤️ by RTNM**  
**"Agent<->Workflow Integration"**
