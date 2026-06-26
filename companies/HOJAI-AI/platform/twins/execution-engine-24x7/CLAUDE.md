# 24x7 Execution Engine Service

**Port:** 4761  
**Type:** Autonomous Execution  
**Phase:** 5  
**Author:** HOJAI AI

---

## What This Service Does

The 24×7 Execution Engine manages continuous task execution:
- Task queuing
- Sleep/wake cycles
- Background execution

---

## Key Endpoints

### Queue Task
```
POST /api/queue
Body: { employeeId: string, description: string, priority?: string, scheduledFor?: string }
```

### Get Queued Tasks
```
GET /api/queue/:employeeId
```

### Execute Task
```
POST /api/queue/:taskId/execute
```

### Get Sleep Schedule
```
GET /api/schedule/:employeeId
```

### Set Mode
```
POST /api/schedule/:employeeId/mode
Body: { mode: "sleep" | "standby" | "active" }
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| Twin Shadow Mode | 4762 | Watch mode |
| Emergency Stop | 4763 | Safety |
| Twin Observer | 4747 | Event trigger |

---

## Data Stored

- Queued tasks
- Sleep schedules
- Execution history
