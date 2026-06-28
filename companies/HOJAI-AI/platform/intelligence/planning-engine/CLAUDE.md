# Planning Engine

**Port:** 4896  
**Status:** ✅ Built  
**Purpose:** Task decomposition, DAG execution, and goal-to-task planning for autonomous agents

---

## Overview

Planning Engine is the orchestration brain for autonomous operations. It provides:
- Goal decomposition into executable tasks
- DAG (Directed Acyclic Graph) planning
- Topological sorting and cycle detection
- Plan validation and execution
- Strategy suggestion (sequential, parallel, pipeline)
- Multi-level execution

---

## Tech Stack

- Node.js
- Express.js
- JWT Authentication (`@rtmn/shared/auth`)

---

## Core Concepts

### Node Types

| Type | Description |
|------|-------------|
| `task` | Executable unit of work |
| `goal` | High-level objective |
| `condition` | Branch condition |
| `parallel` | Parallel execution group |
| `pipeline` | Sequential pipeline |
| `loop` | Iterative execution |

### Execution States

| State | Description |
|-------|-------------|
| `pending` | Not yet executed |
| `running` | Currently executing |
| `completed` | Successfully finished |
| `failed` | Execution failed |
| `skipped` | Skipped due to condition |

---

## API Endpoints

### Plans

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/plans` | List plans (filter: status, owner) |
| GET | `/api/plans/:id` | Get plan details |
| POST | `/api/plans` | Create new plan |
| PUT | `/api/plans/:id` | Update plan |
| DELETE | `/api/plans/:id` | Delete plan |

**Create Plan:**
```json
{
  "name": "user-onboarding",
  "description": "Complete user onboarding flow",
  "goal": "Onboard new user with email verification and profile setup",
  "owner": "user-service"
}
```

### Goal Decomposition

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/decompose` | Decompose goal into tasks |
| POST | `/api/strategy` | Suggest execution strategy |

### Validation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/validate` | Validate plan structure |
| POST | `/api/plans/:id/validate` | Validate existing plan |

### Graph Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/toposort` | Topological sort |
| POST | `/api/cycles` | Detect cycles in plan |

### Execution

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/plans/:id/execute` | Execute plan |
| GET | `/api/executions` | List executions |
| GET | `/api/executions/:id` | Get execution details |

### Reference Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/node-types` | List available node types |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/planning-engine
npm install
npm start
```

---

## Example: Create and Execute Plan

### 1. Create Plan from Goal
```javascript
const response = await fetch('http://localhost:4896/api/plans', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    name: 'process-order',
    goal: 'Process customer order from payment to delivery',
    owner: 'order-service'
  })
});
const plan = await response.json();
// plan.nodes = decomposed tasks
// plan.edges = dependencies
```

### 2. Execute Plan
```javascript
await fetch('http://localhost:4896/api/plans/' + plan.id + '/execute', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' },
  body: JSON.stringify({
    context: { orderId: '12345', customerId: '67890' }
  })
});
```

### 3. Check Execution
```javascript
const result = await fetch('http://localhost:4896/api/executions?planId=' + plan.id);
const { executions } = await result.json();
```

---

## Integration with Other Services

| Service | Integration |
|---------|-------------|
| `agent-os` | Executes tasks from plans |
| `reasoning-engine` | Goal decomposition |
| `event-platform` | Triggers plan execution |
| `micro-intelligence` | Fallback on plan failure |

---

## Health Endpoints

- `GET /health` - Service health
- `GET /ready` - Readiness check

---

## Related Services

- [agent-os](agent-os/) - Agent execution
- [reasoning-engine](reasoning-engine/) - Goal reasoning
- [event-platform](event-platform/) - Event triggers
