# Agent Builder

**Port:** 4791  
**Status:** ✅ Built  
**Purpose:** Agent template/blueprint builder for creating reusable AI agent configurations

---

## Overview

Agent Builder creates and manages AI agent blueprints/templates:
- Blueprint CRUD operations
- Blueprint versioning
- Agent instantiation from blueprints
- Tool and knowledge attachment
- Audit logging

---

## Tech Stack

- Node.js
- Express.js
- JWT Authentication (`@rtmn/shared/auth`)
- PersistentMap (`@rtmn/shared/lib/persistent-map`)

---

## Blueprint Structure

```json
{
  "id": "uuid",
  "name": "string",
  "systemPrompt": "string",
  "tools": ["array", "of", "tools"],
  "model": "hojai-base",
  "knowledge": "optional knowledge base",
  "version": 1,
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

## API Endpoints

### Blueprints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/blueprints` | List all blueprints |
| GET | `/api/blueprints/:id` | Get blueprint |
| POST | `/api/blueprints` | Create blueprint |
| PUT | `/api/blueprints/:id` | Update blueprint |
| DELETE | `/api/blueprints/:id` | Delete blueprint |

### Instantiation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/blueprints/:id/instantiate` | Create agent from blueprint |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List instantiated agents |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/builder/audit` | View audit log |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health |
| GET | `/api/health` | Detailed health |
| GET | `/ready` | Readiness check |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/agent-builder
npm install
npm start
```

---

## Example Usage

### Create Blueprint
```javascript
await fetch('http://localhost:4791/api/blueprints', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    name: 'sales-agent',
    systemPrompt: 'You are a helpful sales assistant...',
    tools: ['crm-api', 'email-sender', 'calendar-checker'],
    model: 'hojai-base',
    knowledge: 'sales-knowledge-base-id'
  })
});
```

### Instantiate Agent
```javascript
const agent = await fetch('http://localhost:4791/api/blueprints/{bp-id}/instantiate', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    name: 'johns-sales-agent'
  })
});
// agent.config contains blueprint settings
```

---

## Integration

| Service | Integration |
|---------|-------------|
| `agent-os` | Executes instantiated agents |
| `agent-lifecycle` | Lifecycle hooks |
| `knowledge-registry` | Knowledge attachment |
| `ai-intelligence` | Model selection |

---

## Related Services

- [agent-os](agent-os/) - Agent execution
- [agent-lifecycle](agent-lifecycle/) - Lifecycle management
- [multi-agent-runtime](multi-agent-runtime/) - Multi-agent coordination
