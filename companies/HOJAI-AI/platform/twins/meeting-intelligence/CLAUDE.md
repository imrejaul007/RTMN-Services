# Meeting Intelligence Service

**Port:** 4749  
**Type:** Observation Layer  
**Phase:** 2  
**Author:** HOJAI AI

---

## What This Service Does

The Meeting Intelligence service captures meeting data:
- Transcription
- Decisions extracted
- Action items

---

## Key Endpoints

### Create Meeting
```
POST /api/meetings/:employeeId
Body: { title: string, participants?: [] }
```

### Get Meetings
```
GET /api/meetings/:employeeId
```

### Transcribe Meeting
```
POST /api/meetings/:meetingId/transcribe
Body: { transcript: string }
```

### Add Decision
```
POST /api/meetings/:meetingId/decisions
Body: { decision: string }
```

### Add Action Item
```
POST /api/meetings/:meetingId/actions
Body: { description: string, assignee: string, dueDate?: string }
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| Calendar Connector | 4795 | Meeting data |
| Zoom Connector | - | Transcription |

---

## Data Stored

- Meetings
- Transcripts
- Decisions
- Action items
