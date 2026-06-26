# Memory Twin Service

**Port:** 4738  
**Type:** Core Twin  
**Phase:** 1  
**Author:** HOJAI AI

---

## What This Service Does

The Memory Twin provides personal memory storage for employee twins:
- Facts
- Experiences
- Preferences
- Context

---

## Key Endpoints

### Add Memory
```
POST /api/memory/:employeeId
Body: {
  type: "fact" | "experience" | "preference" | "context",
  content: string,
  confidence?: number,
  source?: string,
  tags?: []
}
```

### Get Memories
```
GET /api/memory/:employeeId?type=fact&search=...
```

### Get Stats
```
GET /api/memory/:employeeId/stats
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| MemoryOS | 4703 | Persistent storage |
| Memory Confidence | 4152 | Fact reliability |

---

## Memory Types

| Type | Description |
|------|-------------|
| fact | Factual information |
| experience | Past experiences |
| preference | Personal preferences |
| context | Current context |

---

## Data Stored

- Memory entries
- Memory metadata
- Source information
