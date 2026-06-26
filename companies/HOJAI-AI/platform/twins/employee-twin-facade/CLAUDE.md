# Employee Twin Facade

**Version:** 1.0.0  
**Date:** June 26, 2026  
**Port:** 4739

---

## Overview

Employee Twin Facade is the **single unified API** that ties together all twin services. This is the main entry point for all employee twin operations.

---

## Integrated Services

| Service | Port | Purpose |
|---------|------|---------|
| Twin Learning OS | 4735 | Twin context and learning |
| Twin Feedback OS | 4736 | Human corrections |
| Twin Execution OS | 4737 | Task execution |
| Twin Learning Bridge | 4748 | CorpPerks events |
| CorpPerks Backend | 4006 | HRMS data |
| Salar OS | 4710 | Skills |
| SADA OS | 4190 | Trust/reputation |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Employee Twin Facade (4739)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │                    MAIN API                                │ │
│   │           GET /api/employee/:id/twin                      │ │
│   └──────────────────────────────────────────────────────────┘ │
│                              │                                   │
│      ┌───────────────┬───────┴───────┬───────────────┐         │
│      ▼               ▼               ▼               ▼         │
│ ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│ │Learning │   │ Feedback │   │Execution │   │CorpPerks │  │
│ │   OS   │   │    OS   │   │    OS   │   │ Backend  │  │
│ │ (4735) │   │  (4736) │   │  (4737) │   │  (4006)  │  │
│ └─────────┘   └──────────┘   └──────────┘   └──────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Main API

### Get Complete Employee Twin

```
GET /api/employee/:employeeId/twin
```

Returns complete employee twin with all 9 types:

```json
{
  "employeeId": "emp_123",
  "timestamp": "2026-06-26T12:00:00Z",

  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "department": "Sales",
    "email": "john@company.com"
  },

  "twins": {
    "identity": { ... },
    "memory": { ... },
    "knowledge": { ... },
    "skills": { ... },
    "communication": { ... },
    "workflow": { ... },
    "decisions": { ... },
    "relationships": { ... },
    "reputation": { ... }
  },

  "health": {
    "coverage": 80,
    "score": 85,
    "level": "healthy"
  },

  "skills": {
    "capabilities": ["Sales", "Negotiation", "CRM"]
  },

  "reputation": {
    "trustScore": 92
  },

  "feedback": {
    "total": 45,
    "recent": [...]
  },

  "tasks": {
    "pending": 2,
    "approved": 1,
    "completed": 45,
    "failed": 1
  },

  "summary": {
    "name": "John Doe",
    "department": "Sales",
    "twinLevel": "healthy",
    "twinScore": 85,
    "automationReady": true
  }
}
```

---

## All Endpoints

### Twin Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employee/:id/twin` | **Get complete twin** |
| GET | `/api/employee/:id/twin/health` | Get twin health |
| GET | `/api/employee/:id/twin/:type` | Get specific twin type |
| POST | `/api/employee/:id/learn` | Learn from events |
| POST | `/api/observe` | Observe event |

### Feedback Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employee/:id/feedback` | Get feedback history |
| GET | `/api/employee/:id/patterns` | Get correction patterns |
| GET | `/api/employee/:id/confidence` | Get confidence scores |
| GET | `/api/employee/:id/rlhf` | Get RLHF training data |
| POST | `/api/feedback` | Submit feedback |

### Task Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employee/:id/tasks` | Get task queue |
| GET | `/api/tasks/:id` | Get task by ID |
| GET | `/api/employee/:id/history` | Get execution history |
| POST | `/api/tasks` | Create task |
| POST | `/api/tasks/:id/approve` | Approve task |
| POST | `/api/tasks/:id/reject` | Reject task |
| POST | `/api/tasks/:id/cancel` | Cancel task |
| POST | `/api/tasks/:id/retry` | Retry failed task |
| POST | `/api/tasks/:id/rollback` | Rollback completed task |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employee/:id/permissions` | Get tool permissions |
| PATCH | `/api/employee/:id/permissions` | Update permissions |
| GET | `/api/employee/:id/skills` | Get skills |
| POST | `/api/events` | Emit CorpPerks event |

---

## Usage Examples

### Get Complete Twin
```javascript
const twin = await fetch('http://localhost:4739/api/employee/emp_123/twin');
console.log(twin.summary);
// { name: "John Doe", twinScore: 85, automationReady: true }
```

### Submit Feedback
```javascript
await fetch('http://localhost:4739/api/feedback', {
  method: 'POST',
  body: JSON.stringify({
    employeeId: 'emp_123',
    capability: 'email_composition',
    feedbackType: 'correct',
    twinAction: { description: 'Send 10% discount' },
    correction: { value: '5%', reason: 'Enterprise clients max 5%' }
  })
});
```

### Create Task
```javascript
await fetch('http://localhost:4739/api/tasks', {
  method: 'POST',
  body: JSON.stringify({
    employeeId: 'emp_123',
    description: 'Follow up with client X',
    taskType: 'email',
    capability: 'email_composition'
  })
});
```

### Approve Task
```javascript
await fetch('http://localhost:4739/api/tasks/task_123/approve', {
  method: 'POST'
});
```

---

## Environment Variables

```bash
PORT=4739

# Core Services
TWIN_LEARNING_OS_URL=http://localhost:4735
TWIN_FEEDBACK_OS_URL=http://localhost:4736
TWIN_EXECUTION_OS_URL=http://localhost:4737
TWIN_LEARNING_BRIDGE_URL=http://localhost:4748

# External Services
CORPPERKS_BACKEND_URL=http://localhost:4006
EMPLOYEE_TWIN_URL=http://localhost:4730
MEMORY_OS_URL=http://localhost:4703
SALAR_OS_URL=http://localhost:4710
SKILL_OS_URL=http://localhost:4743
FLOW_ORCHESTRATOR_URL=http://localhost:4244
DECISION_ENGINE_URL=http://localhost:4240
SADA_OS_URL=http://localhost:4190
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| API Response Time | < 500ms |
| Twin Coverage | 80%+ |
| Twin Score | 70%+ |
| Task Success Rate | 90%+ |
| Automation Ready | 50%+ twins at L3+ |
