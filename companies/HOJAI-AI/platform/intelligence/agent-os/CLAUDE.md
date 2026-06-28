# Agent OS

**Port:** 4892  
**Status:** ✅ Built  
**Purpose:** Production agent runtime - lifecycle management, state machines, health monitoring, and inter-process communication

---

## Overview

Agent OS is the production runtime for autonomous AI agents. It provides:
- Agent lifecycle management (create, start, pause, resume, stop)
- State machine validation
- Process spawning and management
- Heartbeat monitoring and health checks
- Inter-process communication (IPC)
- Sandbox isolation
- Dead agent detection and cleanup

---

## Tech Stack

- Node.js
- Express.js
- JWT Authentication (`@rtmn/shared/auth`)

---

## Agent States

```
┌─────────┐
│  idle   │ ← Created, not started
└────┬────┘
     │ start
     ▼
┌─────────┐
│ running │ ← Active, executing tasks
└────┬────┘
     │ pause
     ▼
┌─────────┐
│ paused  │ ← Temporarily stopped
└────┬────┘
     │ resume
     ▼
┌─────────┐     │ stop
│ running │ ─────┘
└────┬────┘
     │ error or completion
     ▼
┌──────────┐
│ stopped  │
└──────────┘
```

---

## API Endpoints

### Agent CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/:id` | Get agent details |
| POST | `/api/agents` | Create new agent |
| PUT | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Delete agent |

### Lifecycle Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents/:id/start` | Start agent |
| POST | `/api/agents/:id/pause` | Pause agent |
| POST | `/api/agents/:id/resume` | Resume agent |
| POST | `/api/agents/:id/stop` | Stop agent |
| POST | `/api/agents/:id/execute` | Execute task |

### Health & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/:id/health` | Get agent health |
| GET | `/api/agents/:id/heartbeat` | Record heartbeat |
| POST | `/api/health/cleanup` | Cleanup dead agents |

### Inter-Process Communication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ipc/send` | Send message to agent |
| GET | `/api/ipc/inbox/:agentId` | Get agent inbox |
| GET | `/api/ipc/conversations/:agentId` | Get conversations |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get runtime statistics |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/agent-os
npm install
npm start
```

---

## Example Usage

### Create Agent
```javascript
const response = await fetch('http://localhost:4892/api/agents', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    name: 'order-processor',
    type: 'workflow-agent',
    config: {
      maxRetries: 3,
      timeout: 30000
    }
  })
});
const agent = await response.json();
// agent.id = "uuid"
// agent.state = "idle"
```

### Start Agent
```javascript
await fetch('http://localhost:4892/api/agents/' + agent.id + '/start', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' }
});
```

### Execute Task
```javascript
const result = await fetch('http://localhost:4892/api/agents/' + agent.id + '/execute', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    task: 'process-order',
    input: { orderId: '12345' }
  })
});
```

### IPC - Send Message
```javascript
await fetch('http://localhost:4892/api/ipc/send', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    from: 'orchestrator',
    to: agent.id,
    message: 'New order received',
    type: 'notification'
  })
});
```

---

## Integration with Other Services

| Service | Integration |
|---------|-------------|
| `planning-engine` | Receives task execution commands |
| `multi-agent-runtime` | Coordinates multiple agents |
| `agent-builder` | Creates agent templates |
| `agent-security` | Enforces security policies |
| `micro-intelligence` | Fallback when agent fails |

---

## Health Endpoints

- `GET /health` - Service health
- `GET /ready` - Readiness check

---

## Related Services

- [agent-builder](agent-builder/) - Agent creation
- [agent-lifecycle](agent-lifecycle/) - Lifecycle hooks
- [multi-agent-runtime](multi-agent-runtime/) - Multi-agent coordination
- [planning-engine](planning-engine/) - Task planning
