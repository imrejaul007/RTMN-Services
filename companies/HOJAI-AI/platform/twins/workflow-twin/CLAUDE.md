# Workflow Twin Service

**Port:** 4741  
**Type:** Core Twin  
**Phase:** 1  
**Author:** HOJAI AI

---

## What This Service Does

The Workflow Twin captures and learns workflow patterns:
- Task sequences
- Approval chains
- Tool usage patterns
- SOP generation

---

## Key Endpoints

### Observe Action
```
POST /api/twin/:employeeId/workflow/observe
Body: { tool: string, action: string, target: string, duration?: number, outcome?: string }
```

### Batch Observe
```
POST /api/twin/:employeeId/workflow/batch-observe
Body: { actions: [] }
```

### Get Actions
```
GET /api/twin/:employeeId/workflow/actions?limit=50&tool=...
```

### Get Workflow Patterns
```
GET /api/twin/:employeeId/workflow/patterns?status=active
```

### Create Workflow
```
POST /api/twin/:employeeId/workflow/patterns
Body: { name: string, steps: [], triggers?: {} }
```

### Simulate Workflow
```
POST /api/twin/:employeeId/workflow/simulate
Body: { workflowId?: string, context?: {}, dryRun?: boolean }
```

### Get Stats
```
GET /api/twin/:employeeId/workflow/stats
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| Twin Observer | 4747 | Event routing |
| FlowOS | - | Workflow engine |

---

## Data Stored

- Workflow patterns (steps, triggers, approvals)
- Task sequences
- Observed actions
- Automation opportunities
