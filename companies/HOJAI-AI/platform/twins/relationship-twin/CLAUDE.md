# Relationship Twin Service

**Port:** 4744  
**Type:** Core Twin  
**Phase:** 1  
**Author:** HOJAI AI

---

## What This Service Does

The Relationship Twin captures professional relationships:
- Network graph
- Influence mapping
- Interaction patterns

---

## Key Endpoints

### Get Relationship Graph
```
GET /api/twin/:employeeId/relationship/graph
```

### Connect/Add Relationship
```
POST /api/twin/:employeeId/relationship/connect
Body: { name: string, email?: string, role?: string, company?: string, type?: string }
```

### Update Relationship
```
PATCH /api/twin/:employeeId/relationship/:personId
Body: { influence?: number, trust?: number, sentiment?: number }
```

### Add Interaction
```
POST /api/twin/:employeeId/relationship/interaction
Body: { personId: string, type: string, subject?: string, outcome?: string, sentiment?: string }
```

### Get Influence Metrics
```
GET /api/twin/:employeeId/relationship/influence
```

### Get Interaction History
```
GET /api/twin/:employeeId/relationship/interactions/:personId
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| Twin Observer | 4747 | Event routing |
| CRM | 4056 | Customer data |

---

## Data Stored

- Relationship nodes (people)
- Relationship edges (connections)
- Interactions (meetings, calls, emails)
- Influence scores
