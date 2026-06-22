# Salar OS - Sutar Integration Guide

**Version:** 1.0 | **Date:** June 10, 2026 | **Status:** Ready

---

## Overview

Salar OS provides workforce intelligence to Sutar OS for autonomous task assignment and execution.

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUTAR OS                                 │
│                                                                 │
│  Goal: "Launch Product X"                                      │
│       │                                                         │
│       ├── GoalOS decomposes goal                                  │
│       │                                                         │
│       └── Decision Engine asks:                                   │
│                                                                 │
│              "Who should do this?"                              │
│                     │                                           │
│                     ▼                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  SALAR OS                                  │   │
│  │                                                           │   │
│  │  "Human A + Agent B + Agent C"                          │   │
│  │  Skills: Python ✅  Trust: 0.92 ✅  Capacity: 80% ✅       │   │
│  │                                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│       │                                                         │
│       ▼                                                         │
│  Execution → Monitoring → Learning                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration Flow

### 1. Sutar Decides It Needs Workforce

```
Sutar Decision Engine (4240)
         │
         ├── GoalOS: "Build authentication feature"
         │
         └── Decision Engine: "Need workforce intelligence"
                   │
                   ▼
```

### 2. Salar Provides Recommendations

```
POST /workforce/find
{
  "task": "Build authentication feature",
  "requiredSkills": ["python", "security", "authentication"],
  "allowHybrid": true
}

Response:
{
  "candidates": [
    {
      "type": "HUMAN",
      "corpId": "CI-IND-ABC12",
      "name": "John Developer",
      "matchScore": 0.85,
      "skills": ["python", "security"],
      "cost": 0
    },
    {
      "type": "AGENT",
      "corpId": "CI-AGT-AUTH01",
      "name": "Auth Agent",
      "matchScore": 0.78,
      "capabilities": ["authentication", "security"],
      "cost": 0.02
    }
  ],
  "hybridRecommendation": {
    "human": {...},
    "agent": {...}
  }
}
```

### 3. Sutar Assigns Work

```
Sutar → POST /workforce/assign
{
  "taskId": "task-123",
  "task": "Build authentication feature",
  "assignTo": {
    "human": "CI-IND-ABC12",
    "agent": "CI-AGT-AUTH01"
  },
  "assignType": "HYBRID"
}
```

### 4. Salar Tracks Assignment

```
Salar records:
- Who was assigned
- What skills are being used
- Current workload
- Trust score
```

### 5. Outcome Returns to Salar

```
POST /sutar/decision-executed
{
  "decisionId": "dec-123",
  "workforceAssigned": [...],
  "outcome": "completed",
  "executedBy": "CI-AGT-AUTH01"
}
```

---

## API Endpoints

### Workforce Matching

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/workforce/find` | POST | Find best workforce for task |
| `/workforce/assign` | POST | Assign task to workforce |
| `/workforce/match` | POST | Match specific skills |

### Sutar Callbacks

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/sutar/decision-executed` | POST | Receive execution result |
| `/sutar/decision-outcome` | POST | Receive outcome for learning |
| `/sutar/capabilities/:domain` | GET | Get capabilities for domain |

### Skill & Capacity

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/sutar/skill-availability` | POST | Check if skills available |
| `/sutar/capacity-check` | POST | Check workforce capacity |
| `/sutar/best-workforce/:taskType` | GET | Best config for task type |

---

## Example Integration

### Sutar Decision Engine → Salar

```typescript
// In Sutar Decision Engine
async function makeWorkforceDecision(goal: Goal) {
  // Decompose goal to required skills
  const requiredSkills = decomposeGoalToSkills(goal);

  // Call Salar
  const response = await fetch('http://localhost:4710/workforce/find', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-token': process.env.CORPID_TOKEN,
    },
    body: JSON.stringify({
      task: goal.description,
      requiredSkills,
      allowHybrid: true,
    }),
  });

  const workforce = await response.json();

  // Return workforce recommendations to Decision Engine
  return {
    workforce,
    recommendedTeam: workforce.data.hybridRecommendation || workforce.data.candidates[0],
    confidence: workforce.data.candidates.length > 0 ? 0.85 : 0.0,
  };
}
```

### Salar → Sutar Decision Engine

```typescript
// In Salar
async function receiveDecisionOutcome(outcome: DecisionOutcome) {
  // Record outcome for learning
  await recordDecisionOutcome({
    decisionId: outcome.decisionId,
    workforce: outcome.workforceAssigned,
    outcome: outcome.result,
    quality: outcome.quality,
    timeTaken: outcome.duration,
  });

  // Update workforce state
  await updateWorkforceState({
    corpId: outcome.assignedTo,
    currentWorkload: outcome.newWorkload,
    lastTaskCompleted: outcome.taskId,
  });
}
```

---

## Data Flow

```
MEMORYOS
    │
    ├── Event: GitHub PR merged
    └── Evidence: skill:python

         │
         ▼

CORPID ASSERTION SERVICE
    │
    └── Assertion: skill:python, confidence: 0.72

         │
         ▼

SALAR OS
    │
    ├── Skills Graph: 25 employees with Python
    ├── Team Graph: Team skills coverage
    └── Capacity: 80% utilized

         │
         ▼

SUTAR DECISION ENGINE
    │
    ├── Decision: "Build auth feature"
    └── Workforce needed

         │
         ▼

SALAR WORKFORCE FIND
    │
    └── Best match: Human + Agent hybrid

         │
         ▼

EXECUTION
    │
    └── Outcome recorded → Salar

         │
         ▼

LEARNING
    │
    └── Workforce improves over time
```

---

## Environment Variables

```bash
# Salar OS
SALAR_PORT=4710
SALAR_MONGO_URI=mongodb://localhost:27017/salaros

# Sutar OS (Decision Engine)
SUTAR_URL=http://localhost:4240
SUTAR_TOKEN=sutar-internal-token

# CorpID Services
CORPID_SERVICE_URL=http://localhost:4702
CORPID_TOKEN=corpid-internal-token
ASSERTION_SERVICE_URL=http://localhost:4707
AGENT_REGISTRY_URL=http://localhost:4708
```

---

## Testing

```bash
# Test workforce finding
curl -X POST http://localhost:4710/workforce/find \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Build authentication feature",
    "requiredSkills": ["python", "security"],
    "allowHybrid": true
  }'

# Test skill availability
curl -X POST http://localhost:4710/sutar/skill-availability \
  -H "Content-Type: application/json" \
  -d '{
    "skills": ["python", "security", "authentication"]
  }'
```

---

## Related Documents

- [SALAR-OS-ARCHITECTURE.md](./SALAR-OS-ARCHITECTURE.md)
- [HOJAI-AI-AUDIT.md](./HOJAI-AI-AUDIT.md)
