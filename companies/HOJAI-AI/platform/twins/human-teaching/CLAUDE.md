# Human Teaching Service

**Port:** 4748  
**Type:** Observation Layer  
**Phase:** 2  
**Author:** HOJAI AI

---

## What This Service Does

The Human Teaching Service enables employees to teach their twins through:
- Screen recordings with voice explanations
- Step-by-step guidance
- Knowledge extraction from explanations

---

## Teaching Methods

| Method | Description |
|--------|-------------|
| screen_recording | Record screen with voiceover |
| voice_explanation | Voice notes explaining concepts |
| step_by_step | Structured step-by-step guide |
| document_upload | Upload documents with annotations |

---

## Key Endpoints

### Create Session
```
POST /api/teaching/sessions
Body: { employeeId: string, twinId?: string, topic: string, type?: string }
```

### Start Recording
```
POST /api/teaching/sessions/:id/start
```

### Stop Recording
```
POST /api/teaching/sessions/:id/stop
```

### Add Frame (Screenshot)
```
POST /api/teaching/sessions/:id/frames
Body: { timestamp: number, description: string, keyPoints?: [] }
```

### Add Voice Segment
```
POST /api/teaching/sessions/:id/voice
Body: { start: number, end: number, text: string, confidence?: number }
```

### Add Explanation
```
POST /api/teaching/sessions/:id/explanations
Body: { timestamp: number, text: string, topic?: string }
```

### Extract Knowledge
```
POST /api/teaching/sessions/:id/extract
```

### Add Step
```
POST /api/teaching/sessions/:sessionId/steps
Body: { description: string, screenshot?: string, keyPoints?: [] }
```

### Validate Knowledge
```
POST /api/teaching/knowledge/:knowledgeId/validate
Body: { validated: boolean }
```

### Link to Twin
```
POST /api/teaching/knowledge/:knowledgeId/link
Body: { twinId: string }
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| All Twin Services | Various | Knowledge destination |
| Twin Observer | 4747 | Event routing |
| Knowledge Twin | 4739 | Knowledge storage |

---

## Data Stored

- Teaching sessions
- Screen frames
- Voice segments
- Extracted knowledge
- Step-by-step guides
