# Emergency Stop Service

**Port:** 4763  
**Type:** Autonomous Execution  
**Phase:** 5  
**Author:** HOJAI AI

---

## What This Service Does

The Emergency Stop service is the safety mechanism:
- Global stop for all twin operations
- Event tracking
- Resume capability

---

## Key Endpoints

### Trigger Stop
```
POST /api/emergency/stop
Body: { employeeId: string, reason: string }
```

### Resume Operations
```
POST /api/emergency/resume
```

### Check Status
```
GET /api/emergency/status
```

### Get Events
```
GET /api/emergency/events
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| All Twin Services | - | Stops all |
| Notification | 4764 | Alerts |

---

## Data Stored

- Stop events
- Status (global stop flag)
