# Twin Health Monitor Service

**Port:** 4773  
**Type:** Polish  
**Phase:** 6  
**Author:** HOJAI AI

---

## What This Service Does

The Health Monitor provides system health monitoring:
- Service status
- Dependency health
- Alert routing

---

## Key Endpoints

### Check All Services
```
GET /api/health/services
```

---

## Services Monitored

| Service | Port |
|---------|------|
| Communication Twin | 4743 |
| Workflow Twin | 4741 |
| Decision Twin | 4742 |
| Relationship Twin | 4744 |
| Behavioral Twin | 4746 |
| Knowledge Twin | 4739 |
| Reputation Twin | 4745 |
| Twin Observer | 4747 |
| Skill Wallet | 4750 |
| Browser Agent | 4751 |
| Autonomy Controller | 4760 |
| Execution Engine | 4761 |

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| All Twin Services | - | Health checks |

---

## Alert Routing

- Unhealthy → Notification Orchestrator
- Critical → Emergency Stop
