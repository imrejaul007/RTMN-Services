# Twin Dashboard Service

**Port:** 4770  
**Type:** Polish  
**Phase:** 6  
**Author:** HOJAI AI

---

## What This Service Does

The Twin Dashboard provides a unified view:
- All twin health status
- Productivity metrics
- Learning progress

---

## Key Endpoints

### Get Dashboard
```
GET /api/dashboard/:employeeId
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| All Twin Services | - | Aggregated data |
| Health Monitor | 4773 | Service health |

---

## Data Displayed

- Twin health scores
- Active workflows
- Recent decisions
- Communication patterns
