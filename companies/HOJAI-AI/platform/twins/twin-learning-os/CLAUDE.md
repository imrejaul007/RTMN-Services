# Twin Learning OS

**Version:** 1.0.0  
**Date:** June 26, 2026  
**Port:** 4735

---

## Overview

Twin Learning OS is the **unified orchestrator** that connects all 9 twin types into a single employee context.

---

## The 9 Twin Types

| # | Twin Type | Purpose | Service |
|---|----------|---------|---------|
| 1 | **Identity** | Who is this person? | employee-twin (4730) |
| 2 | **Memory** | What have they done? | MemoryOS (4703) |
| 3 | **Knowledge** | What do they know? | KnowledgeGraph (4755) |
| 4 | **Communication** | How do they communicate? | Intent Bus (4154) |
| 5 | **Workflow** | How do they work? | Flow Orchestrator (4244) |
| 6 | **Decision** | How do they decide? | Decision Engine (4240) |
| 7 | **Relationship** | Who do they know? | Partner Twin (4892) |
| 8 | **Reputation** | What do others think? | SADA OS (4190) |
| 9 | **Skill** | What can they do? | Salar OS (4710) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Twin Learning OS (4735)                          │
│                  Unified Orchestrator                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │Identity │ │ Memory  │ │Knowledge│ │Communic │            │
│  │  Twin   │ │   OS    │ │  Graph  │ │ation    │            │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘            │
│       │            │            │            │                  │
│  ┌────┴────────────┴────────────┴────────────┴────┐            │
│  │              All Twins Connected                │            │
│  └────────────────────┬─────────────────────────┘            │
│                       │                                        │
│                       ▼                                        │
│              ┌────────────────┐                                │
│              │  Single API   │                                │
│              │  GET /twin/:id│                                │
│              └────────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Get Complete Twin Context
```
GET /api/twin/:employeeId

Response:
{
  employeeId: "emp_123",
  health: {
    coverage: 80,
    score: 85,
    level: "healthy"
  },
  twins: {
    identity: { ... },
    memory: { ... },
    knowledge: { ... },
    skills: { ... },
    communication: { ... },
    workflow: { ... },
    decisions: { ... },
    relationships: { ... },
    reputation: { ... }
  },
  summary: {
    who: "John Doe",
    skills: ["Sales", "Negotiation"],
    connections: 42
  }
}
```

### Get Specific Twin Type
```
GET /api/twin/:employeeId/identity
GET /api/twin/:employeeId/memory
GET /api/twin/:employeeId/decisions
etc.
```

### Learn Patterns
```
POST /api/twin/:employeeId/learn
{
  "events": [
    { "type": "decision.made", "context": {...} },
    { "type": "workflow.executed", "workflow": "..." }
  ]
}
```

### Observe Event
```
POST /api/observe
{
  "employeeId": "emp_123",
  "event": { "type": "decision.made", ... }
}
```

### Get Twin Health
```
GET /api/health/:employeeId
```

---

## Twin Health Levels

| Level | Score | Description |
|-------|-------|-------------|
| **New** | 0-50% | Twin just created, learning |
| **Developing** | 50-80% | Gathering data, patterns emerging |
| **Healthy** | 80-100% | Twin well-trained, ready for tasks |

---

## Usage Example

```javascript
// Get complete employee twin
const twin = await fetch('http://localhost:4735/api/twin/emp_123');
console.log(twin.summary);
// { who: "John Doe", skills: ["Sales", "Negotiation"], connections: 42 }

// Learn from events
await fetch('http://localhost:4735/api/twin/emp_123/learn', {
  method: 'POST',
  body: JSON.stringify({
    events: [
      { type: 'decision.made', choice: 'Supplier A', reasoning: 'Better delivery' },
      { type: 'workflow.executed', workflow: 'procurement', outcome: 'success' }
    ]
  })
});
```

---

## Environment Variables

```bash
PORT=4735

# Twin Services
EMPLOYEE_TWIN_URL=http://localhost:4730
MEMORY_OS_URL=http://localhost:4703
KNOWLEDGE_GRAPH_URL=http://localhost:4755
INTENT_BUS_URL=http://localhost:4154
FLOW_ORCHESTRATOR_URL=http://localhost:4244
DECISION_ENGINE_URL=http://localhost:4240
PARTNER_TWIN_URL=http://localhost:4892
SADA_OS_URL=http://localhost:4190
SALAR_OS_URL=http://localhost:4710
```

---

## Next Steps

1. **Phase 4**: Twin Feedback OS (4736) - Human corrections
2. **Phase 5**: Twin Execution OS (4737) - Task queue
3. **Phase 6**: Employee Twin Facade - Single API for all
