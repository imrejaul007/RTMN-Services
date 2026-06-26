# Decision Twin Service

**Port:** 4742  
**Type:** Core Twin  
**Phase:** 1  
**Author:** HOJAI AI

---

## What This Service Does

The Decision Twin captures and learns decision patterns:
- Decision context and choices
- Reasoning chains
- Prediction based on patterns

---

## Key Endpoints

### Capture Decision
```
POST /api/twin/:employeeId/decision/capture
Body: {
  type: string,
  domain?: string,
  description?: string,
  choice: string,
  alternatives?: string[],
  reasoning?: { factors?: [], steps?: [] },
  outcome?: string
}
```

### Get History
```
GET /api/twin/:employeeId/decision/history?type=purchasing&limit=50
```

### Get Patterns
```
GET /api/twin/:employeeId/decision/patterns
```

### Predict Decision
```
POST /api/twin/:employeeId/decision/predict
Body: { context?: {}, options?: [] }
```

### Add Reasoning
```
POST /api/twin/:employeeId/decision/:decisionId/reasoning
Body: { reasoning: {} }
```

### Get Stats
```
GET /api/twin/:employeeId/decision/stats
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| Twin Observer | 4747 | Event routing |
| DecisionOS | - | Decision engine |

---

## Decision Types

- purchasing
- hiring
- strategic
- operational
- negotiation
- approval
- risk
- investment

---

## Data Stored

- Decisions (context, choice, reasoning, outcome)
- Decision patterns (factors, success rate)
- Reasoning chains
