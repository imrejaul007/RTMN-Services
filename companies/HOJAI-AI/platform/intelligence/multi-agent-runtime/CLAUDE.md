# Multi-Agent Runtime

**Port:** 4790  
**Status:** ✅ Built  
**Purpose:** Multi-agent coordination - spawn/manage ephemeral agents, assign tasks, collect results

---

## Overview

Multi-Agent Runtime coordinates multiple AI agents:
- Agent creation and management
- Task assignment to agents
- Status tracking (pending, running, completed, failed, cancelled)
- Priority-based task routing
- Audit logging

---

## Tech Stack

- Node.js
- Express.js
- JWT Authentication (`@rtmn/shared/auth`)
- PersistentMap (`@rtmn/shared/lib/persistent-map`)

---

## Agent Structure

```json
{
  "id": "uuid",
  "name": "string",
  "role": "worker|manager|specialist",
  "capabilities": ["array", "of", "capabilities"],
  "status": "idle|busy",
  "createdAt": "ISO date"
}
```

---

## API Endpoints

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents` | Create agent |
| GET | `/api/agents` | List agents (filter: status, role) |
| GET | `/api/agents/:id` | Get agent |
| DELETE | `/api/agents/:id` | Delete agent |

### Task Assignment

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents/:id/assign` | Assign task to agent |
| GET | `/api/agents/:id/tasks` | Get agent's tasks |
| POST | `/api/assignments/:id/complete` | Complete assignment |

### Assignments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assignments` | List assignments (filter: status, agentId) |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/runtime/audit` | View audit log |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health |
| GET | `/api/health` | Detailed health |
| GET | `/ready` | Readiness check |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/multi-agent-runtime
npm install
npm start
```

---

## Example Usage

### Create Agent
```javascript
await fetch('http://localhost:4790/api/agents', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    name: 'research-agent',
    role: 'specialist',
    capabilities: ['web-search', 'data-analysis', 'report-writing']
  })
});
```

### Assign Task
```javascript
const task = await fetch('http://localhost:4790/api/agents/{agent-id}/assign', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    task: 'Research competitors for Q4 strategy',
    priority: 8
  })
});
```

### Complete Task
```javascript
await fetch('http://localhost:4790/api/assignments/{task-id}/complete', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    result: { competitors: [...], analysis: '...' },
    status: 'completed'
  })
});
```

---

## Integration

| Service | Integration |
|---------|-------------|
| `agent-os` | Individual agent execution |
| `agent-builder` | Agent creation |
| `planning-engine` | Task planning |
| `event-platform` | Event triggers |

---

## Related Services

- [agent-os](agent-os/) - Individual agent runtime
- [agent-builder](agent-builder/) - Agent templates
- [planning-engine](planning-engine/) - Task planning
