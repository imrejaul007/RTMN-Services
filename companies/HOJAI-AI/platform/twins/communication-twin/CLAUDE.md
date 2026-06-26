# Communication Twin Service

**Port:** 4743  
**Type:** Core Twin  
**Phase:** 1  
**Author:** HOJAI AI

---

## What This Service Does

The Communication Twin learns an employee's communication patterns including:
- Writing style (vocabulary, sentence structure, patterns)
- Tone (formal/friendly, emotional range)
- Response patterns (timing, channel preferences)
- Negotiation style

---

## Key Endpoints

### Writing Style Analysis
```
POST /api/twin/:employeeId/communication/style
Body: { text: string, channel?: "email" | "slack" | "chat" }
```

### Tone Analysis
```
POST /api/twin/:employeeId/communication/tone
Body: { text: string, channel?: string }
```

### Get Profile
```
GET /api/twin/:employeeId/communication/profile
```

### Get Tone History
```
GET /api/twin/:employeeId/communication/tone-history
```

### Set Negotiation Style
```
POST /api/twin/:employeeId/communication/negotiation-style
Body: { style: "aggressive" | "collaborative" | "compromising" | "accommodating" | "principled" }
```

### Get Stats
```
GET /api/twin/:employeeId/communication/stats
```

### Simulate Response
```
POST /api/twin/:employeeId/communication/simulate
Body: { context: string, recipientType?: string, channel?: string }
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| Twin Observer | 4747 | Event routing |
| MemoryOS | 4703 | Persistent storage |

---

## Integration

Observes events from:
- Slack Connector (4790)
- Gmail Connector (4792)

Routes to:
- Communication patterns → Communication Twin
- Tone analysis → Communication Twin

---

## Data Stored

- Writing profiles (vocabulary, sentence structure, patterns)
- Tone profiles (baseline, per-channel, negotiation style)
- Communication samples
- Communication patterns (greeting, closing, signature)
