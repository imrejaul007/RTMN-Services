# 📋 PHASE 5-12: MOAT FEATURES
**Duration:** Week 7-16
**Goal:** Build the features that make Genie impossible to copy

---

## Overview

These phases build the "moat" — features that create defensibility and make Genie irreplaceable.

| Phase | Feature | Week | LOC Est |
|-------|---------|------|---------|
| 5 | Decision Intelligence | 7-9 | 1,500 |
| 6 | Memory Importance | 8-10 | 1,000 |
| 7 | Continuous Learning | 9-11 | 1,200 |
| 8 | Personal Constitution | 10-12 | 800 |
| 9 | Life Event Engine | 11-13 | 1,500 |
| 10 | Anticipation Engine | 12-14 | 1,200 |
| 11 | Ambient Intelligence | 13-15 | 1,000 |
| 12 | Social Intelligence | 14-16 | 1,500 |

**Total: 10,000+ LOC of moat features**

---

## PHASE 5: DECISION INTELLIGENCE (Week 7-9)

### Directory
```
products/genie/genie-decision-intelligence/
```

### Core Concept
Store WHY/WHO/WHAT/WHEN of every decision, not just the outcome.

### Key Files

1. **src/index.ts** - Express server, port 4740
2. **src/services/decisionExtractor.ts** - Extract from meetings/conversations
3. **src/services/decisionStorage.ts** - MongoDB storage
4. **src/models/Decision.ts** - Mongoose schema
5. **src/routes/decisions.ts** - API endpoints

### API Endpoints

```
POST /api/decisions/extract     # Extract from text/meeting
GET  /api/decisions/:userId     # List decisions
GET  /api/decisions/:id        # Get decision
GET  /api/decisions/why        # "Why did we choose..."
POST /api/decisions/:id/revisit # Set revisit date
```

### Data Model

```typescript
interface Decision {
  id: string;
  userId: string;
  what: string;              // What was decided
  why: string;               // Why this decision
  who: string[];             // Who approved
  when: Date;               // When decided
  alternatives: {
    name: string;
    rejected: boolean;
    reason?: string;
  }[];
  confidence: number;         // 0-1
  impact: 'low' | 'medium' | 'high';
  context: string;
  source: 'meeting' | 'chat' | 'email' | 'voice';
  createdAt: Date;
  revisitDate?: Date;
}
```

---

## PHASE 6: MEMORY IMPORTANCE (Week 8-10)

### Directory
```
products/genie/genie-memory-importance/
```

### Core Concept
Score every memory by importance, apply decay, strengthen patterns.

### Key Files

1. **src/index.ts** - Express server, port 4741
2. **src/services/importanceScorer.ts** - Score memories
3. **src/services/decayEngine.ts** - Time decay
4. **src/services/reinforcementEngine.ts** - Strengthen patterns

### API Endpoints

```
POST /api/memories/score         # Score a memory
GET  /api/memories/important   # Get top memories
POST /api/memories/decay        # Apply decay
GET  /api/memories/forget      # Get memories to delete
```

### Importance Formula

```typescript
function calculateImportance(memory: Memory): number {
  return (
    memory.peopleImportance * 0.30 +    // Who's involved
    memory.emotionIntensity * 0.20 +    // How emotional
    memory.decisionImpact * 0.20 +       // Decisions made
    memory.moneyValue * 0.15 +           // Financial impact
    memory.frequency * 0.10 +          // How often mentioned
    memory.goalRelevance * 0.05         // Linked to goals
  );
}
```

---

## PHASE 7: CONTINUOUS LEARNING (Week 9-11)

### Directory
```
products/genie/genie-learning-loop/
```

### Core Concept
Learn from every interaction, adapt automatically.

### Key Files

1. **src/index.ts** - Express server, port 4742
2. **src/services/preferenceLearner.ts** - Learn preferences
3. **src/services/behaviorTracker.ts** - Track behavior patterns
4. **src/services/adaptationEngine.ts** - Adapt systems

### API Endpoints

```
POST /api/feedback               # Record feedback
GET  /api/preferences/:userId  # Get learned preferences
POST /api/preferences/adapt     # Trigger adaptation
```

### Learnable Patterns

```typescript
interface LearnedPreference {
  id: string;
  userId: string;
  pattern: string;
  examples: string[];
  action: string;
  confidence: number;
  autoApply: boolean;
}

// Examples:
// { pattern: "meetings_after_8pm", action: "Block 8-10 PM" }
// { pattern: "morning_deep_work", action: "Reserve 9-12 for focus" }
// { pattern: "written_communication", action: "Prefer email over calls" }
```

---

## PHASE 8: PERSONAL CONSTITUTION (Week 10-12)

### Directory
```
products/genie/genie-constitution/
```

### Core Concept
"What would I never do?" — values-based autonomy limits.

### Key Files

1. **src/index.ts** - Express server, port 4743
2. **src/services/valueExtractor.ts** - Extract values from behavior
3. **src/services/boundaryEnforcer.ts** - Enforce limits

### API Endpoints

```
GET  /api/constitution/:userId      # Get constitution
POST /api/constitution               # Create/update
POST /api/constitution/check         # Check if action allowed
```

### Data Model

```typescript
interface Constitution {
  userId: string;
  always: string[];         // "disclose AI identity"
  never: string[];          // "lie to investors"
  requiresApproval: string[]; // "transfers > 1L"
  values: {
    name: string;
    weight: number;
  }[];
  updatedAt: Date;
}
```

---

## PHASE 9: LIFE EVENT ENGINE (Week 11-13)

### Directory
```
products/genie/genie-life-events/
```

### Core Concept
Detect and respond to life events — Ramadan, marriage, fundraising, travel.

### Key Files

1. **src/index.ts** - Express server, port 4744
2. **src/services/eventDetector.ts** - Detect events
3. **src/services/modeSwitcher.ts** - Switch modes

### API Endpoints

```
POST /api/events/detect       # Detect current event
GET  /api/events/current     # Get current mode
POST /api/events/mode        # Switch mode manually
```

### Event Modes

```typescript
type EventMode = 
  | 'ramadan'        // Prayer schedule, diet changes
  | 'eid'           // Celebrations
  | 'marriage'       // Wedding planning
  | 'fundraising'    // Investor focus
  | 'travel'         // Trip planning
  | 'health_event'  // Health focus
  | 'baby'           // Newborn care
  | 'relocation'     // Moving
  | 'default';       // Normal
```

---

## PHASE 10: ANTICIPATION ENGINE (Week 12-14)

### Directory
```
products/genie/genie-anticipation/
```

### Core Concept
Predict needs before they arise — "Flight tomorrow, pack tonight."

### Key Files

1. **src/index.ts** - Express server, port 4745
2. **src/services/predictiveEngine.ts** - Predict needs
3. **src/services/proactiveNotifier.ts** - Send suggestions

### API Endpoints

```
GET  /api/anticipations/:userId   # Get predictions
POST /api/anticipations/dismiss    # Dismiss prediction
```

### Predictions

```typescript
interface Prediction {
  type: 'travel' | 'follow_up' | 'relationship' | 'health' | 'work';
  trigger: string;
  suggestion: string;
  urgency: 'low' | 'medium' | 'high';
  dismissUntil?: Date;
}
```

---

## PHASE 11: AMBIENT INTELLIGENCE (Week 13-15)

### Directory
```
products/genie/genie-ambient/
```

### Core Concept
Passive awareness — "You look tired today."

### Key Files

1. **src/index.ts** - Express server, port 4746
2. **src/services/ambientDetector.ts** - Detect signals
3. **src/services/alertEngine.ts** - Generate alerts

### API Endpoints

```
GET  /api/ambient/:userId        # Get ambient signals
GET  /api/ambient/alerts/:userId  # Get alerts
```

### Signals

```typescript
interface AmbientSignals {
  voiceTone: { stressed: boolean; tired: boolean };
  sleep: { hours: number; quality: string };
  calendar: { meetingsToday: number; focusTime: number };
  relationships: { contactGap: number };
}
```

---

## PHASE 12: SOCIAL INTELLIGENCE (Week 14-16)

### Directory
```
products/genie/genie-social/
```

### Core Concept
Living relationship graph — trust, communication style, history.

### Key Files

1. **src/index.ts** - Express server, port 4747
2. **src/services/relationshipGraph.ts** - Build graph
3. **src/services/trustTracker.ts** - Track trust

### API Endpoints

```
GET  /api/social/graph/:userId          # Get relationship graph
GET  /api/social/person/:personId       # Get person details
POST /api/social/interaction            # Log interaction
GET  /api/social/suggestions/:userId   # Get contact suggestions
```

### Data Model

```typescript
interface SocialNode {
  personId: string;
  relationship: string;
  trust: number;           // 0-100
  communicationStyle: {
    preferred: 'email' | 'call' | 'whatsapp';
    frequency: number;
    responseTime: number;
    bestTime: string;
  };
  lastContact: Date;
  nextSuggested: Date;
  sharedMemories: string[];
}
```

---

## Summary

| Phase | Service | Port | Key Output |
|-------|---------|------|-----------|
| 5 | Decision Intelligence | 4740 | Decisions with WHY/WHO/WHAT |
| 6 | Memory Importance | 4741 | Scored, decaying memories |
| 7 | Learning Loop | 4742 | Learned preferences |
| 8 | Constitution | 4743 | Values-based limits |
| 9 | Life Events | 4744 | Event-aware modes |
| 10 | Anticipation | 4745 | Proactive suggestions |
| 11 | Ambient | 4746 | Wellness alerts |
| 12 | Social | 4747 | Relationship intelligence |

---

## Integration

All 8 services connect to:
- MemoryOS (4703) for storage
- TwinOS (4705) for user data
- Genie (7100) for orchestration
- RAZO (4299) for notifications

```
Genie (7100)
    ↓ orchestrates
    ├── Decision Intelligence (4740)
    ├── Memory Importance (4741)
    ├── Learning Loop (4742)
    ├── Constitution (4743)
    ├── Life Events (4744)
    ├── Anticipation (4745)
    ├── Ambient (4746)
    └── Social (4747)
           ↓ use
    MemoryOS + TwinOS
           ↓ update
    Genie twin data
           ↓ inform
    RAZO notifications
```

---

## Checklist

- [ ] Phase 5: Decision Intelligence (Week 7-9)
- [ ] Phase 6: Memory Importance (Week 8-10)
- [ ] Phase 7: Learning Loop (Week 9-11)
- [ ] Phase 8: Constitution (Week 10-12)
- [ ] Phase 9: Life Events (Week 11-13)
- [ ] Phase 10: Anticipation (Week 12-14)
- [ ] Phase 11: Ambient (Week 13-15)
- [ ] Phase 12: Social (Week 14-16)
- [ ] Integration tests for all 8 services
- [ ] Commit each phase
