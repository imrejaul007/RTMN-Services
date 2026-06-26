# Twin Feedback OS

**Version:** 1.0.0  
**Date:** June 26, 2026  
**Port:** 4736

---

## Overview

Twin Feedback OS handles **human feedback and corrections** for employee twins. This is the RLHF (Reinforcement Learning from Human Feedback) loop that makes twins smarter.

---

## Feedback Types

| Type | Description | Impact |
|------|-------------|--------|
| **approve** | Twin was correct | +5% confidence |
| **reject** | Twin was wrong | -10% confidence |
| **correct** | Here's the correct answer | Updates pattern |
| **explain** | Here's why I'm doing it this way | Adds context |
| **suggest** | Try this alternative | Adds option |

---

## How It Works

```
Human reviews twin action
        │
        ▼
Was the twin correct?
        │
    ┌───┴───┐
    │       │
   Yes      No
    │       │
    ▼       ▼
Approve  Reject
    │       │
    │   ┌───┴───┐
    │   │       │
    │  Wrong  Correct
    │   │       │
    │   ▼       ▼
    │  Store  Store correction
    │  +5%    + pattern
    │       │
    └───────┴──────► Update twins
                        │
                        ▼
                Memory + Decision Engine
                        │
                        ▼
                  Twin learns
```

---

## API Endpoints

### Submit Feedback
```
POST /api/feedback
{
  "employeeId": "emp_123",
  "capability": "email_composition",
  "feedbackType": "correct",
  "twinAction": {
    "id": "action_456",
    "description": "Send 10% discount",
    "value": "10%"
  },
  "correction": {
    "value": "5%",
    "reason": "Enterprise clients only get 5% margin"
  }
}
```

### Get Feedback History
```
GET /api/feedback/:employeeId
```

### Get Correction Patterns
```
GET /api/patterns/:employeeId
```

### Get Capability Confidence
```
GET /api/confidence/:employeeId
```

### Get RLHF Training Data
```
GET /api/rlhf/:employeeId
```

---

## Confidence Calculation

| Feedback Type | Adjustment |
|--------------|------------|
| approve | +5% |
| reject | -10% |
| correct | 0% (updates pattern instead) |
| explain | +2% |
| suggest | +1% |

---

## Example Flow

```javascript
// Twin suggests sending 10% discount
await TwinFeedback.submit({
  employeeId: 'emp_123',
  capability: 'discount_approval',
  feedbackType: 'correct',
  twinAction: {
    id: 'action_789',
    description: 'Send 10% discount'
  },
  correction: {
    value: '5%',
    reason: 'Enterprise clients get max 5% per policy'
  }
});

// Result: Twin learns "5% for enterprise" pattern
```

---

## Integration with Other Services

| Service | Update |
|---------|--------|
| MemoryOS | Stores correction as new fact |
| Decision Engine | Updates decision patterns |
| Salar OS | Updates skill confidence |
| Twin Learning OS | Improves overall learning |

---

## Environment Variables

```bash
PORT=4736

MEMORY_OS_URL=http://localhost:4703
DECISION_ENGINE_URL=http://localhost:4240
SALAR_OS_URL=http://localhost:4710
TWIN_LEARNING_OS_URL=http://localhost:4735
```
