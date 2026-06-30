# Decision Twin Service

**Port:** 4741  
**Version:** 1.0.0

Permanent decision memory that stores **WHY decisions were made**, not just WHAT was decided.

## The Key Use Case

> **"Why did we choose Dubai over Singapore?"**

```json
{
  "what": "Expand to Dubai",
  "why": "High GCC hospitality demand, growing market",
  "who": ["Founder", "Investor A"],
  "alternatives_considered": ["Singapore", "Malaysia", "Indonesia"],
  "rejected_alternatives": [
    { "name": "Singapore", "reason": "Too expensive, saturated market" }
  ],
  "when": "2026-06-30T10:30:00Z",
  "confidence": 0.93,
  "outcome": null,
  "revisit_date": "2026-09-30"
}
```

## Decision Object Schema

```javascript
{
  decision_id: "dec_xxx",
  what: "The decision made",
  why: "Reason/context",
  who: ["Stakeholders involved"],
  alternatives: ["Options considered"],
  rejected_alternatives: [{ name, reason }],
  when: "ISO timestamp",
  confidence: 0.0-1.0,
  status: "active | revisited | reversed",
  outcome: "Result of the decision",
  revisit_date: "When to review",
  linked_meetings: [],
  linked_tasks: [],
  linked_relationships: []
}
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/decision` | Create a new decision |
| POST | `/api/decisions/extract` | Extract decisions from meeting |
| GET | `/api/decision/:id` | Get specific decision |
| GET | `/api/decisions` | List all decisions |
| GET | `/api/decisions/search` | Search decisions |
| **GET** | **`/api/decisions/why`** | **"Why did we X?"** |
| GET | `/api/decisions/timeline` | Timeline view |
| PUT | `/api/decision/:id` | Update decision |
| POST | `/api/decision/:id/revisit` | Revisit decision |
| POST | `/api/decision/:id/reverse` | Reverse decision |
| GET | `/api/decisions/stats` | Decision statistics |

## Usage Examples

### Create Decision

```javascript
await fetch('http://localhost:4741/api/decision', {
  method: 'POST',
  body: JSON.stringify({
    what: "Expand to Dubai",
    why: "High GCC hospitality demand",
    who: ["Founder", "Investor A"],
    alternatives: ["Singapore", "Malaysia"],
    confidence: 0.93,
    revisitDate: "2026-09-30",
    tags: ["expansion", "gcc", "hospitality"]
  })
});
```

### Ask "Why?"

```javascript
// GET /api/decisions/why?what=Dubai
const response = await fetch('http://localhost:4741/api/decisions/why?what=Dubai');

// Response:
{
  "found": true,
  "query": "Dubai",
  "matches": [{
    "what": "Expand to Dubai",
    "why": "High GCC hospitality demand",
    "when": "2026-06-30",
    "who": ["Founder", "Investor A"],
    "confidence": 0.93,
    "outcome": null
  }]
}
```

### Timeline

```javascript
// GET /api/decisions/timeline?groupBy=month
{
  "timeline": [
    { "period": "2026-06", "count": 12, "decisions": [...] },
    { "period": "2026-05", "count": 8, "decisions": [...] }
  ]
}
```

## Integration with Meeting Intelligence

After meeting analysis, `meeting-intelligence` calls `decision-twin`:

```
meeting-intelligence
    ↓ extracts decisions
decision-twin
    ↓ stores with context
    "Why did we choose X?"
    "What alternatives were considered?"
    "Who approved?"
```

## Example: Investor Meeting

**Meeting:** Investor discussion about GCC expansion

**Extracted Decision:**
```json
{
  "what": "Raise $500k via CCD",
  "why": "Need capital for GCC expansion",
  "who": ["Founder", "Investor A"],
  "alternatives_considered": ["VC Round", "Bootstrapping"],
  "confidence": 0.95,
  "linked_meetings": ["meeting_2026_06_30_investor"],
  "linked_relationships": [
    { "userId": "investor_a", "trust_change": 5 }
  ]
}
```

**Six months later:**
> User: "Why did we choose CCD over VC?"
> Genie: "You chose CCD because you wanted to maintain control while funding the GCC expansion. Investor A agreed it was the right move for your stage."

---

*This is the foundation of institutional memory — decisions that persist, that remember WHY.*
