# Twin Shadow Mode Service

**Port:** 4762  
**Type:** Autonomous Execution  
**Phase:** 5  
**Author:** HOJAI AI

---

## What This Service Does

The Shadow Mode service enables watch mode:
- Observe without acting
- Generate suggestions
- Track acceptance rate

---

## Key Endpoints

### Start Session
```
POST /api/shadow/sessions
Body: { employeeId: string }
```

### Get Session
```
GET /api/shadow/sessions/:sessionId
```

### End Session
```
POST /api/shadow/sessions/:sessionId/end
```

### Generate Suggestion
```
POST /api/shadow/sessions/:sessionId/suggest
Body: { description: string, confidence: number }
```

### Accept Suggestion
```
POST /api/shadow/suggestions/:id/accept
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| Twin Observer | 4747 | Observation |
| Autonomy Controller | 4760 | Mode control |

---

## Data Stored

- Shadow sessions
- Suggestions
- Acceptance metrics
