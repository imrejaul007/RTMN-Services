# Twin Mobile Service

**Port:** 4771  
**Type:** Polish  
**Phase:** 6  
**Author:** HOJAI AI

---

## What This Service Does

The Twin Mobile service provides mobile companion API:
- Voice commands
- Push notifications
- Mobile-specific endpoints

---

## Key Endpoints

### Get Summary
```
GET /api/mobile/:employeeId/summary
```

### Voice Command
```
POST /api/mobile/:employeeId/voice
Body: { audio: string }
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| All Twin Services | - | Mobile access |
| Notification | 4764 | Push |

---

## Mobile Features

- Voice transcription
- Quick actions
- Status updates
