# Twin Execution OS

**Version:** 1.0.0  
**Date:** June 26, 2026  
**Port:** 4737

---

## Overview

Twin Execution OS is the **task queue and execution engine** for employee twins. Tasks are executed through the existing Flow Orchestrator with human approval for high-risk actions.

---

## How It Works

```
Task Created
      │
      ▼
Confidence Check
      │
      ▼
┌─────┴─────┐
│           │
High Conf   Low Conf
(>95%)     (<95%)
      │           │
      ▼           ▼
Auto-Approve   Human Review
      │           │
      ▼           ▼
Execute via   Employee Decides
Flow Orch.      │
                ▼
            ┌───┴───┐
            │       │
         Approve  Reject
            │       │
            ▼       ▼
          Execute  Feedback
```

---

## Confidence Thresholds

| Tool Risk | Threshold | Example |
|-----------|----------|---------|
| Critical | 99% | Payments |
| High | 95% | Approvals, refunds |
| Medium | 85% | Email, CRM |
| Low | 70% | Chat, tasks, calendar |

---

## API Endpoints

### Create Task
```
POST /api/tasks
{
  "employeeId": "emp_123",
  "description": "Send follow-up email to client X",
  "taskType": "email",
  "capability": "email_composition",
  "context": { "clientId": "xyz" },
  "priority": "normal"
}
```

### Get Task Queue
```
GET /api/queue/:employeeId
GET /api/queue/:employeeId?status=pending
```

### Approve Task
```
POST /api/tasks/:taskId/approve
```

### Reject Task
```
POST /api/tasks/:taskId/reject
{
  "reason": "Use formal tone for enterprise clients"
}
```

### Retry Failed Task
```
POST /api/tasks/:taskId/retry
```

### Rollback Completed Task
```
POST /api/tasks/:taskId/rollback
```

### Get Tool Permissions
```
GET /api/permissions/:employeeId
```

### Get Execution History
```
GET /api/history/:employeeId?days=7
```

---

## Tool Permissions

| Tool | Risk | Default |
|------|------|---------|
| email | medium | allowed |
| chat | low | allowed |
| calendar | low | allowed |
| crm | medium | allowed |
| task | low | allowed |
| document | low | allowed |
| approval | high | NOT allowed |
| payment | critical | NOT allowed |
| refund | high | NOT allowed |
| contract | high | NOT allowed |

---

## Task Lifecycle

```
pending → approved → executing → completed
    │         │
    │         └── failed → retry → executing
    │
    └── rejected (feedback sent to Twin Feedback OS)
```

---

## Example: Twin Handles Email

```javascript
// Employee defines boundary
await TwinExecution.updatePermissions('emp_123', {
  email: true,
  crm: true,
  approval: false
});

// Twin creates task
const task = await TwinExecution.createTask({
  employeeId: 'emp_123',
  description: 'Send follow-up to client X',
  taskType: 'email',
  capability: 'email_composition'
});

// Task auto-approved (high confidence)
// Twin executes via Flow Orchestrator

// Employee reviews completed task
// If wrong, sends feedback via Twin Feedback OS
```

---

## Integration

| Service | Purpose |
|---------|---------|
| Flow Orchestrator (4244) | Actual task execution |
| Twin Learning OS (4735) | Get confidence |
| Twin Feedback OS (4736) | Send feedback on rejection |

---

## Environment Variables

```bash
PORT=4737

FLOW_ORCHESTRATOR_URL=http://localhost:4244
TWIN_LEARNING_OS_URL=http://localhost:4735
TWIN_FEEDBACK_OS_URL=http://localhost:4736
```
