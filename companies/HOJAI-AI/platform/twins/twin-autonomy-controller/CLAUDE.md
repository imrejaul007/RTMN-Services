# Twin Autonomy Controller Service

**Port:** 4760  
**Type:** Autonomous Execution  
**Phase:** 5  
**Author:** HOJAI AI

---

## What This Service Does

The Autonomy Controller controls twin execution modes:
- Mode management (shadow/assist/delegate/autonomous)
- Confidence thresholds
- Boundary enforcement
- Approval routing

---

## Key Endpoints

### Get Settings
```
GET /api/autonomy/:employeeId/settings
```

### Update Settings
```
PATCH /api/autonomy/:employeeId/settings
Body: { mode?: string, confidenceThresholds?: {}, workingHours?: {} }
```

### Set Mode
```
POST /api/autonomy/:employeeId/mode
Body: { mode: "shadow" | "assist" | "delegate" | "autonomous" }
```

### Add Boundary
```
POST /api/autonomy/:employeeId/boundaries
Body: {
  type: "amount" | "vendor" | "risk" | "department",
  condition: string,
  allowed?: boolean,
  maxValue?: number
}
```

### Get Boundaries
```
GET /api/autonomy/:employeeId/boundaries
```

### Delete Boundary
```
DELETE /api/autonomy/:employeeId/boundaries/:boundaryId
```

### Check Approval
```
POST /api/autonomy/:employeeId/check-approval
Body: { confidence: number, type?: string, amount?: number, vendor?: string }
```

### Get Pending Approvals
```
GET /api/autonomy/:employeeId/pending-approvals
```

### Approve Task
```
POST /api/autonomy/:employeeId/approve/:taskId
```

### Reject Task
```
POST /api/autonomy/:employeeId/reject/:taskId
Body: { reason?: string }
```

---

## Execution Modes

| Mode | Description |
|------|-------------|
| shadow | Watch only, no actions |
| assist | Suggest, human approves |
| delegate | Execute within boundaries |
| autonomous | 24×7, escalate exceptions |

---

## Confidence Thresholds

| Level | Default | Action |
|-------|---------|--------|
| critical | 99% | Always ask |
| high | 95% | Manager approval |
| medium | 85% | Auto-execute |
| low | 70% | Auto-execute |

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| Twin Shadow Mode | 4762 | Shadow execution |
| Emergency Stop | 4763 | Safety |
| Notification | 4764 | Alerts |

---

## Data Stored

- Autonomy settings
- Boundaries
- Approval requests
