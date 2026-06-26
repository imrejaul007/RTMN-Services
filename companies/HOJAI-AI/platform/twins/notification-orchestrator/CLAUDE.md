# Notification Orchestrator Service

**Port:** 4764  
**Type:** Autonomous Execution  
**Phase:** 5  
**Author:** HOJAI AI

---

## What This Service Does

The Notification Orchestrator routes notifications:
- Push notifications
- Email
- Slack
- Teams

---

## Key Endpoints

### Send Notification
```
POST /api/notifications/send
Body: { employeeId: string, channel: "push" | "email" | "slack" | "teams", message: string }
```

### Get Notifications
```
GET /api/notifications/:employeeId
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| Slack Connector | 4790 | Slack notifications |
| Email Service | - | Email |

---

## Data Stored

- Notification history
