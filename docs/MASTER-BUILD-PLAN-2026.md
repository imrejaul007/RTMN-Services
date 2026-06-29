# 📋 GENIE ECOSYSTEM — MASTER BUILD PLAN
**Date:** June 29, 2026
**Goal:** Complete Genie OS from 75% → 95%
**Duration:** 16 weeks (4 months)

---

## 📊 CURRENT STATE

| Layer | Score | Status |
|-------|-------|--------|
| Genie Core (41 services) | 90% | ✅ Built |
| Genie Runtime | 90% | ✅ Built |
| MemoryOS (30 services) | 85% | ✅ Built |
| TwinOS (86+ twins) | 80% | ✅ Built |
| VoiceOS (23 services) | 85% | ✅ Built |
| EmotionOS (8 services) | 85% | ✅ Built |
| PresenceOS (2 services) | 85% | ✅ Built |
| TrustOS (16 services) | 75% | ✅ Built |
| FlowOS (22 services) | 85% | ✅ Built |
| SkillOS (14 services) | 75% | ✅ Built |
| SUTAR (42 services) | 55% | ⚠️ Partial |
| Nexha (62 services) | 80% | ✅ Built |
| **RTMN Hub** | 10% | ❌ Missing |
| **Consumer Triangle** | 40% | ❌ Not wired |
| **Test Coverage** | 5% | ❌ 95% untested |

**Current: 75% | Target: 95%**

---

## 🎯 PHASE 0: FIX CRITICAL (Week 1)

### 0.1 Delete Phantom Directories
```
rm -rf companies/razo-keyboard/
rm -rf companies/do-app/
rm -rf REZ-Workspace/industries/genie-os/
```

### 0.2 Resolve Port 4399 Clash
- Move Nexha ecosystem-connector to port 4380
- OR keep at 4380, build RTMN Hub at 4399

### 0.3 Fix DO App Ports
- Update `hojaiClient.ts` to match RTMN canonical ports:
  - Genie: 7100 (keep)
  - CorpID: 4702
  - TwinOS: 4705
  - MemoryOS: 4703
  - SUTAR: 4140

### 0.4 Quick Wins
- Add README to all services missing them
- Add package.json version fields
- Fix any obvious import errors

---

## 🎯 PHASE 1: UNIFIED HUB (Week 2-4)

### What to Build: RTMN Unified Hub

**Location:** `services/rtmn-unified-hub/`

```
rtmn-unified-hub/
├── src/
│   ├── index.ts              # Express server, port 4399
│   ├── routes/
│   │   ├── genie.ts          # /api/genie/* → Genie 7100
│   │   ├── razzo.ts          # /api/razo/* → RAZO 4299
│   │   ├── do.ts             # /api/do/* → DO App 3001
│   │   ├── memory.ts         # /api/memory/* → MemoryOS
│   │   ├── twin.ts           # /api/twin/* → TwinOS
│   │   ├── sutar.ts          # /api/sutar/* → SUTAR
│   │   ├── nexha.ts          # /api/nexha/* → Nexha
│   │   └── health.ts         # /health, /ready
│   ├── services/
│   │   ├── serviceRegistry.ts   # Dynamic service discovery
│   │   ├── loadBalancer.ts      # Round-robin + health
│   │   ├── circuitBreaker.ts    # Failure handling
│   │   ├── rateLimiter.ts       # Per-service limits
│   │   └── requestLogger.ts     # Audit logging
│   └── middleware/
│       ├── auth.ts            # JWT validation
│       ├── cors.ts            # CORS config
│       └── errorHandler.ts    # Error formatting
├── __tests__/
│   └── hub.test.ts
├── package.json
└── README.md
```

**API Endpoints:**
```
GET  /health                      # Hub health
GET  /api/services                # Service registry
GET  /api/services/:name/status   # Service health
POST /api/genie/:path            # → Genie 7100
POST /api/razo/:path             # → RAZO 4299
POST /api/do/:path                # → DO App 3001
GET  /api/memory/:path           # → MemoryOS
GET  /api/twin/:path             # → TwinOS
POST /api/sutar/:path            # → SUTAR 4140
```

**Dependencies:** express, axios,ioredis,zod

---

## 🎯 PHASE 2: CONSUMER TRIANGLE WIRING (Week 3-5)

### 2.1 Wire Genie → RAZO → DO Flow

**Current:**
```
User → RAZO (4299) → [Genie 7100? DO 3001?] → ???
```

**Target:**
```
User → RAZO (4299)
           ↓ intent detection
           ↓
        Genie (7100) ← MemoryOS, TwinOS
           ↓ decision
           ↓
        RAZO (4299) ← communicate
           ↓
        DO (3001) ← execute
           ↓
        Result → User
```

### 2.2 Add to Genie Runtime

**File:** `genie-os/runtime/genie/src/services/razoBridge.ts`

```typescript
// Forward Genie decisions to RAZO for communication
export async function forwardToRAZO(intent: string, context: Context) {
  return axios.post(`${RAZO_URL}/api/delegate`, {
    intent,
    context,
    source: 'genie'
  });
}
```

### 2.3 Add to RAZO

**File:** `razo-keyboard/src/services/genieBridge.ts`

```typescript
// Forward complex requests to Genie for reasoning
export async function forwardToGenie(text: string, context: Context) {
  return axios.post(`${GENIE_URL}/api/ask`, {
    text,
    context,
    source: 'razo'
  });
}
```

### 2.4 Add to DO App

**File:** `do-app/backend/src/services/genieBridge.ts`

```typescript
// Execute Genie decisions
export async function executeAction(action: Action) {
  return axios.post(`${GENIE_URL}/api/execute`, action);
}
```

### 2.5 Shared Memory Layer

**Add to all three:** `MEMORY_SHARED_URL` pointing to MemoryOS 4703

---

## 🎯 PHASE 3: ADD TESTS (Week 4-8)

### Priority Services for Tests

| # | Service | Target Tests | Priority |
|---|---------|-------------|----------|
| 1 | genie-runtime | 100 | P0 |
| 2 | genie-calendar | 50 | P0 |
| 3 | genie-memory-inbox | 50 | P0 |
| 4 | genie-briefing | 30 | P0 |
| 5 | voice-gateway | 50 | P0 |
| 6 | conversation-physics | 50 | P1 |
| 7 | voice-identity | 30 | P1 |
| 8 | emotion-analytics | 30 | P1 |
| 9 | presence-os | 30 | P1 |
| 10 | memory-os | 50 | P1 |

**Target:** 80% coverage on top 10 services

---

## 🎯 PHASE 4: VOICE CLONE / TTS (Week 6-8)

### What to Build: Voice Clone Service

**Location:** `products/voice-os/core/voice-clone/`

```
voice-clone/
├── src/
│   ├── index.ts              # Express server, port 4890
│   ├── services/
│   │   ├── voiceEnrollment.ts    # Record voice samples
│   │   ├── voiceModel.ts        # Generate/check voice model
│   │   ├── voiceSynthesis.ts    # Synthesize speech
│   │   ├── emotionRenderer.ts   # Add emotion to voice
│   │   ├── permissionEngine.ts  # Permission checks
│   │   └── audioProcessor.ts   # Audio formatting
│   ├── models/
│   │   └── VoiceProfile.ts
│   └── types/
│       └── voice.ts
├── __tests__/
│   └── voiceClone.test.ts
├── package.json
└── README.md
```

**API Endpoints:**
```
POST /api/enroll              # Start voice enrollment
POST /api/enroll/complete     # Complete enrollment
POST /api/synthesize          # Generate speech
GET  /api/profiles            # List voice profiles
DELETE /api/profiles/:id      # Delete profile
GET  /api/permissions         # Get permissions
POST /api/permissions         # Update permissions
```

**Data Model:**
```typescript
interface VoiceProfile {
  id: string;
  userId: string;
  modelUrl: string;
  enrolledAt: Date;
  status: 'enrolling' | 'active' | 'suspended';
  permissions: {
    canSpeakAsUser: boolean;
    allowedContacts: string[];
    disallowedTopics: string[];
  };
}
```

**Dependencies:**
- ElevenLabs API (voice cloning)
- Or: Coqui TTS (open source)
- Or: Azure TTS with custom voice

---

## 🎯 PHASE 5: DECISION INTELLIGENCE (Week 7-9)

### What to Build: Decision Intelligence Engine

**Location:** `products/genie/genie-decision-intelligence/`

```
genie-decision-intelligence/
├── src/
│   ├── index.ts              # Express server, port 4740
│   ├── services/
│   │   ├── decisionExtractor.ts    # Extract from text/convo
│   │   ├── decisionStorage.ts     # Store decisions
│   │   ├── contextTracker.ts      # Track alternatives
│   │   ├── reasoningEngine.ts     # Why this decision
│   │   └── queryEngine.ts         # Query decisions
│   ├── models/
│   │   └── Decision.ts
│   └── types/
│       └── decision.ts
├── __tests__/
│   └── decision.test.ts
├── package.json
└── README.md
```

**API Endpoints:**
```
POST /api/decisions/extract      # Extract from text
GET  /api/decisions/:userId      # List decisions
GET  /api/decisions/:id          # Get decision
GET  /api/decisions/why          # "Why did we choose..."
POST /api/decisions/:id/revisit  # Set revisit date
```

**Data Model:**
```typescript
interface Decision {
  id: string;
  userId: string;
  what: string;
  why: string;
  who: string[];
  when: Date;
  alternatives: {
    name: string;
    rejected: boolean;
    reason?: string;
  }[];
  confidence: number;
  context: string;
  source: 'meeting' | 'chat' | 'email' | 'voice';
  revisitDate?: Date;
}
```

---

## 🎯 PHASE 6: MEMORY IMPORTANCE ENGINE (Week 8-10)

### What to Build: Memory Importance Service

**Location:** `products/genie/genie-memory-importance/`

```
genie-memory-importance/
├── src/
│   ├── index.ts              # Express server, port 4741
│   ├── services/
│   │   ├── importanceScorer.ts    # Score memories
│   │   ├── decayEngine.ts         # Time decay
│   │   ├── reinforcementEngine.ts # Strengthen patterns
│   │   └── forgetScheduler.ts    # Schedule deletions
│   └── types/
│       └── memory.ts
├── __tests__/
│   └── memoryImportance.test.ts
├── package.json
└── README.md
```

**Importance Formula:**
```typescript
function calculateImportance(memory: Memory): number {
  return (
    memory.peopleImportance * 0.30 +
    memory.emotionIntensity * 0.20 +
    memory.decisionImpact * 0.20 +
    memory.moneyValue * 0.15 +
    memory.frequency * 0.10 +
    memory.goalRelevance * 0.05
  );
}
```

**API Endpoints:**
```
POST /api/memories/score          # Score a memory
GET  /api/memories/important      # Get important memories
POST /api/memories/decay           # Apply decay
GET  /api/memories/to-forget       # Get memories to delete
DELETE /api/memories/:id           # Manual delete
```

---

## 🎯 PHASE 7: CONTINUOUS LEARNING LOOP (Week 9-11)

### What to Build: Learning Loop Service

**Location:** `products/genie/genie-learning-loop/`

```
genie-learning-loop/
├── src/
│   ├── index.ts              # Express server, port 4742
│   ├── services/
│   │   ├── preferenceLearner.ts    # Learn from feedback
│   │   ├── behaviorTracker.ts    # Track patterns
│   │   ├── adaptationEngine.ts   # Adapt systems
│   │   └── feedbackLoop.ts        # Close the loop
│   ├── models/
│   │   └── LearnedPreference.ts
│   └── types/
│       └── learning.ts
├── __tests__/
│   └── learningLoop.test.ts
├── package.json
└── README.md
```

**Learnable Patterns:**
```typescript
interface LearnedPreference {
  id: string;
  userId: string;
  pattern: string;
  examples: string[];
  action: string;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

// Examples:
// "meetings_after_8pm" → "Don't schedule meetings after 8 PM"
// "morning_focus" → "Block 9-12 for deep work"
// "written_preferred" → "Send instructions in writing"
```

**API Endpoints:**
```
POST /api/feedback              # Record feedback
GET  /api/preferences/:userId   # Get learned preferences
POST /api/preferences/adapt      # Trigger adaptation
GET  /api/patterns/:userId      # Get behavior patterns
```

---

## 🎯 PHASE 8: PERSONAL CONSTITUTION (Week 10-12)

### What to Build: Constitution Engine

**Location:** `products/genie/genie-constitution/`

```
genie-constitution/
├── src/
│   ├── index.ts              # Express server, port 4743
│   ├── services/
│   │   ├── valueExtractor.ts      # Extract values from behavior
│   │   ├── boundaryEnforcer.ts   # Enforce limits
│   │   ├── constitutionBuilder.ts # Build constitution
│   │   └── ethicsEngine.ts       # Ethics checks
│   ├── models/
│   │   └── Constitution.ts
│   └── types/
│       └── constitution.ts
├── __tests__/
│   └── constitution.test.ts
├── package.json
└── README.md
```

**Data Model:**
```typescript
interface Constitution {
  userId: string;
  always: string[];      // "disclose AI identity"
  never: string[];      // "lie to investors"
  requiresApproval: string[];  // "financial transfers > 1L"
  values: {
    name: string;
    weight: number;      // 0-1
  }[];
  updatedAt: Date;
}
```

**API Endpoints:**
```
GET  /api/constitution/:userId       # Get constitution
POST /api/constitution                # Create/update
POST /api/constitution/check          # Check if action allowed
GET  /api/constitution/values         # Get extracted values
```

---

## 🎯 PHASE 9: LIFE EVENT ENGINE (Week 11-13)

### What to Build: Life Events Service

**Location:** `products/genie/genie-life-events/`

```
genie-life-events/
├── src/
│   ├── index.ts              # Express server, port 4744
│   ├── services/
│   │   ├── eventDetector.ts       # Detect life events
│   │   ├── modeSwitcher.ts        # Switch modes (Ramadan, etc.)
│   │   ├── contextAdjuster.ts     # Adjust recommendations
│   │   └── timelineBuilder.ts    # Build event timeline
│   └── types/
│       └── events.ts
├── __tests__/
│   └── lifeEvents.test.ts
├── package.json
└── README.md
```

**Supported Event Modes:**
```typescript
type EventMode = 
  | 'ramadan'        // Prayer schedule, diet changes
  | 'eid'           // Celebrations, family
  | 'marriage'       // Wedding planning mode
  | 'fundraising'    // Investor focus
  | 'travel'         // Trip planning
  | 'health_event'   // Health focus
  | 'baby'           // Newborn care
  | 'relocation'     // Moving cities
  | 'default';       // Normal operation
```

**API Endpoints:**
```
POST /api/events/detect           # Detect current event
GET  /api/events/current          # Get current mode
GET  /api/events/upcoming         # Get upcoming events
POST /api/events/mode             # Switch mode manually
GET  /api/events/timeline         # Get event timeline
```

---

## 🎯 PHASE 10: ANTICIPATION ENGINE (Week 12-14)

### What to Build: Anticipation Service

**Location:** `products/genie/genie-anticipation/`

```
genie-anticipation/
├── src/
│   ├── index.ts              # Express server, port 4745
│   ├── services/
│   │   ├── predictiveEngine.ts    # Predict needs
│   │   ├── proactiveNotifier.ts   # Send suggestions
│   │   ├── calendarLinker.ts      # Link to calendar
│   │   └── contextAggregator.ts  # Aggregate context
│   └── types/
│       └── anticipation.ts
├── __tests__/
│   └── anticipation.test.ts
├── package.json
└── README.md
```

**Prediction Examples:**
```typescript
// Based on calendar + memory + patterns
predictions: [
  {
    type: 'travel',
    trigger: 'flight tomorrow 8 AM',
    suggestion: 'Pack tonight - early flight'
  },
  {
    type: 'follow_up',
    trigger: 'Investor meeting 7 days ago',
    suggestion: 'Draft follow-up email'
  },
  {
    type: 'relationship',
    trigger: "Mother's birthday in 5 days",
    suggestion: 'Gift ideas generated'
  }
]
```

**API Endpoints:**
```
GET  /api/anticipations/:userId   # Get predictions
POST /api/anticipations/dismiss    # Dismiss prediction
GET  /api/anticipations/active     # Get active suggestions
```

---

## 🎯 PHASE 11: AMBIENT INTELLIGENCE (Week 13-15)

### What to Build: Ambient Intelligence Service

**Location:** `products/genie/genie-ambient/`

```
genie-ambient/
├── src/
│   ├── index.ts              # Express server, port 4746
│   ├── services/
│   │   ├── ambientDetector.ts    # Detect ambient signals
│   │   ├── wellnessChecker.ts    # Check wellness signals
│   │   ├── relationshipChecker.ts # Check relationships
│   │   └── alertEngine.ts        # Generate alerts
│   └── types/
│       └── ambient.ts
├── __tests__/
│   └── ambient.test.ts
├── package.json
└── README.md
```

**Ambient Signals:**
```typescript
// From various sources
ambientSignals: {
  voiceTone: { stressed: true, tired: false },
  calendar: { meetings_today: 8, focus_time: 0 },
  sleep: { hours: 5, quality: 'poor' },
  energy: { level: 'low', trend: 'declining' },
  relationships: { parents_contact_gap: 6, days: longest_ever }
}

// Alerts generated
alerts: [
  { type: 'wellness', message: 'You look tired - move meetings' },
  { type: 'relationship', message: "Haven't called parents in 6 days" },
  { type: 'energy', message: 'Energy low - schedule rest' }
]
```

**API Endpoints:**
```
GET  /api/ambient/:userId         # Get ambient signals
GET  /api/ambient/alerts/:userId   # Get alerts
POST /api/ambient/dismiss          # Dismiss alert
```

---

## 🎯 PHASE 12: SOCIAL INTELLIGENCE GRAPH (Week 14-16)

### What to Build: Social Intelligence Service

**Location:** `products/genie/genie-social/`

```
genie-social/
├── src/
│   ├── index.ts              # Express server, port 4747
│   ├── services/
│   │   ├── relationshipGraph.ts    # Build relationship graph
│   │   ├── trustTracker.ts        # Track trust over time
│   │   ├── communicationLearner.ts # Learn communication style
│   │   └── networkAnalyzer.ts    # Analyze social network
│   └── types/
│       └── social.ts
├── __tests__/
│   └── social.test.ts
├── package.json
└── README.md
```

**Data Model:**
```typescript
interface SocialNode {
  personId: string;
  relationship: string;        // 'investor', 'mother', 'employee'
  trust: number;                // 0-100
  communicationStyle: {
    preferred: 'email' | 'call' | 'whatsapp',
    frequency: number,          // contacts per week
    responseTime: number,      // hours
    bestTime: string,          // 'morning', 'evening'
    tone: 'formal' | 'casual'
  };
  sharedMemories: string[];    // Memory IDs
  lastContact: Date;
  nextSuggested: Date;
  influence: number;            // 0-100
}
```

**API Endpoints:**
```
GET  /api/social/graph/:userId         # Get relationship graph
GET  /api/social/person/:personId     # Get person details
POST /api/social/interaction          # Log interaction
GET  /api/social/suggestions/:userId  # Get contact suggestions
GET  /api/social/trust/:personId      # Get trust score
```

---

## 📅 TIMELINE OVERVIEW

```
Week  1: Phase 0 - Fix Critical (delete phantoms, port fix)
Week  2: Phase 1 - Start Hub
Week  3: Phase 1 + Phase 2 - Hub + Triangle Wiring
Week  4: Phase 2 - Triangle Wiring
Week  5: Phase 3 - Start Tests
Week  6: Phase 3 - Tests + Phase 4 Start (Voice Clone)
Week  7: Phase 4 - Voice Clone
Week  8: Phase 4 + Phase 5 - Voice Clone + Decision
Week  9: Phase 5 - Decision Intelligence
Week 10: Phase 5 + Phase 6 - Decision + Memory Importance
Week 11: Phase 6 + Phase 7 - Memory Importance + Learning
Week 12: Phase 7 + Phase 8 - Learning + Constitution
Week 13: Phase 8 + Phase 9 - Constitution + Life Events
Week 14: Phase 9 + Phase 10 - Life Events + Anticipation
Week 15: Phase 10 + Phase 11 - Anticipation + Ambient
Week 16: Phase 11 + Phase 12 - Ambient + Social
```

---

## 📁 FILES TO CREATE

### Phase 1: Hub
- [ ] `services/rtmn-unified-hub/src/index.ts`
- [ ] `services/rtmn-unified-hub/src/routes/*.ts`
- [ ] `services/rtmn-unified-hub/src/services/*.ts`
- [ ] `services/rtmn-unified-hub/__tests__/hub.test.ts`
- [ ] `services/rtmn-unified-hub/package.json`
- [ ] `services/rtmn-unified-hub/README.md`

### Phase 2: Triangle Wiring
- [ ] `products/genie/genie-os/runtime/genie/src/services/razoBridge.ts`
- [ ] `products/razo/razo-keyboard/src/services/genieBridge.ts`
- [ ] `companies/do-app/backend/src/services/genieBridge.ts`

### Phase 3: Tests
- [ ] `products/genie/genie-os/runtime/genie/__tests__/genie.test.ts`
- [ ] `products/genie/genie-calendar-service/__tests__/calendar.test.ts`
- [ ] `products/genie/genie-memory-inbox/__tests__/inbox.test.ts`
- [ ] `products/genie/genie-briefing-service/__tests__/briefing.test.ts`
- [ ] `products/voice-os/core/voice-gateway/__tests__/gateway.test.ts`

### Phase 4: Voice Clone
- [ ] `products/voice-os/core/voice-clone/src/index.ts`
- [ ] `products/voice-os/core/voice-clone/src/services/*.ts`
- [ ] `products/voice-os/core/voice-clone/__tests__/voiceClone.test.ts`

### Phase 5: Decision Intelligence
- [ ] `products/genie/genie-decision-intelligence/src/index.ts`
- [ ] `products/genie/genie-decision-intelligence/src/services/*.ts`
- [ ] `products/genie/genie-decision-intelligence/__tests__/decision.test.ts`

### Phase 6: Memory Importance
- [ ] `products/genie/genie-memory-importance/src/index.ts`
- [ ] `products/genie/genie-memory-importance/src/services/*.ts`
- [ ] `products/genie/genie-memory-importance/__tests__/memoryImportance.test.ts`

### Phase 7: Learning Loop
- [ ] `products/genie/genie-learning-loop/src/index.ts`
- [ ] `products/genie/genie-learning-loop/src/services/*.ts`
- [ ] `products/genie/genie-learning-loop/__tests__/learningLoop.test.ts`

### Phase 8: Constitution
- [ ] `products/genie/genie-constitution/src/index.ts`
- [ ] `products/genie/genie-constitution/src/services/*.ts`
- [ ] `products/genie/genie-constitution/__tests__/constitution.test.ts`

### Phase 9: Life Events
- [ ] `products/genie/genie-life-events/src/index.ts`
- [ ] `products/genie/genie-life-events/src/services/*.ts`
- [ ] `products/genie/genie-life-events/__tests__/lifeEvents.test.ts`

### Phase 10: Anticipation
- [ ] `products/genie/genie-anticipation/src/index.ts`
- [ ] `products/genie/genie-anticipation/src/services/*.ts`
- [ ] `products/genie/genie-anticipation/__tests__/anticipation.test.ts`

### Phase 11: Ambient
- [ ] `products/genie/genie-ambient/src/index.ts`
- [ ] `products/genie/genie-ambient/src/services/*.ts`
- [ ] `products/genie/genie-ambient/__tests__/ambient.test.ts`

### Phase 12: Social
- [ ] `products/genie/genie-social/src/index.ts`
- [ ] `products/genie/genie-social/src/services/*.ts`
- [ ] `products/genie/genie-social/__tests__/social.test.ts`

**TOTAL: 52 new files**

---

## ✅ SUCCESS METRICS

| Metric | Current | Target |
|--------|---------|--------|
| Test Coverage | 5% | 80% |
| Consumer Triangle | 40% wired | 100% wired |
| Hub Services | 10% | 100% |
| Voice Clone | 0% | 100% |
| Decision Intelligence | 0% | 100% |
| Learning Loop | 0% | 100% |
| Overall Score | 75% | 95% |

---

## 🚀 QUICK START

### Week 1 Commands:
```bash
# 1. Delete phantoms
rm -rf companies/razo-keyboard/
rm -rf companies/do-app/
rm -rf REZ-Workspace/industries/genie-os/

# 2. Start Hub scaffolding
mkdir -p services/rtmn-unified-hub/src/{routes,services,middleware}
cd services/rtmn-unified-hub
npm init -y

# 3. Run existing tests
cd companies/HOJAI-AI/products/genie
npm test
```

---

*Plan created June 29, 2026*
*12 phases | 16 weeks | 52 files | 95% target*
