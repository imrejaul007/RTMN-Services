# Twin Observer Service

**Port:** 4747  
**Type:** Observation Layer  
**Phase:** 2  
**Author:** HOJAI AI

---

## What This Service Does

The Twin Observer is the central event ingestion service:
- Captures events from various sources
- Routes events to appropriate twin services
- Manages subscriptions

---

## Key Endpoints

### Subscribe to Events
```
POST /api/observer/subscribe
Body: { employeeId: string, twinId?: string, sources?: [] }
```

### Get Subscriptions
```
GET /api/observer/subscriptions/:employeeId
```

### Ingest Event
```
POST /api/observer/events
Body: { employeeId: string, source: string, type?: string, data?: {} }
```

### Batch Ingest Events
```
POST /api/observer/events/batch
Body: { events: [] }
```

### Get Events
```
GET /api/observer/events/:employeeId?source=email&limit=100
```

### Get Stats
```
GET /api/observer/stats/:employeeId
```

### Delete Subscription
```
DELETE /api/observer/subscribe/:subscriptionId
```

---

## Event Sources

| Source | Routes To |
|--------|----------|
| email | Communication Twin |
| slack | Communication Twin |
| chat | Communication Twin |
| crm | Workflow Twin |
| task | Workflow Twin |
| approval | Decision Twin |
| decision | Decision Twin |
| calendar | Relationship Twin |
| document | Knowledge Twin |

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| Communication Twin | 4743 | Communication events |
| Workflow Twin | 4741 | Workflow events |
| Decision Twin | 4742 | Decision events |

---

## Data Stored

- Observed events
- Subscriptions
- Event metadata
