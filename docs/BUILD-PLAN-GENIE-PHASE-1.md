# 📋 GENIE ECOSYSTEM — EXECUTION PLAN
**Phase 1: P0 Critical Fixes**
**Start:** June 30, 2026
**Duration:** 2 weeks

---

## WEEK 1: CRITICAL FIXES

### Day 1-2: EmotionOS (Build from Scratch)

**Location:** `companies/HOJAI-AI/products/voice-os/core/emotion-os/`

**What to build:**
```
emotion-os/
├── src/
│   ├── index.ts              # Express server, port 4882
│   ├── services/
│   │   ├── prosodyAnalyzer.ts    # Pitch, volume, speed, pauses, breathing
│   │   ├── stressDetector.ts     # Stress patterns from voice
│   │   ├── confidenceScorer.ts    # Confidence from voice features
│   │   ├── trustDetector.ts      # Trust signals from speech
│   │   ├── confusionDetector.ts   # Hesitation, uncertainty
│   │   ├── fatigueDetector.ts    # Tiredness from voice
│   │   ├── emotionClassifier.ts   # Aggregate emotion output
│   │   └── realtimeEmitter.ts    # Real-time emotion events
│   ├── types/
│   │   └── emotion.ts
│   └── config/
│       └── index.ts
├── __tests__/
│   └── emotion.test.ts
├── package.json
└── README.md
```

**API Endpoints:**
- `POST /api/analyze` — Analyze audio/emotion
- `GET /api/emotions/:sessionId` — Get emotion timeline
- `POST /api/realtime` — WebSocket for real-time
- `GET /api/health`

**Dependencies:**
- Azure Speech SDK or Web Audio API for prosody
- TensorFlow.js or ONNX for emotion classification
- Redis for session storage

---

### Day 3-4: PresenceOS (Build from Scratch)

**Location:** `companies/HOJAI-AI/products/voice-os/core/presence-os/`

**What to build:**
```
presence-os/
├── src/
│   ├── index.ts              # Express server, port 4883
│   ├── services/
│   │   ├── locationService.ts    # GPS integration
│   │   ├── calendarService.ts     # Calendar context
│   │   ├── bluetoothService.ts    # Car, devices
│   │   ├── wifiService.ts        # Location inference
│   │   ├── batteryService.ts     # Battery level
│   │   ├── motionService.ts      # Motion detection
│   │   ├── timeService.ts        # Time of day
│   │   ├── prayerService.ts      # Prayer times
│   │   ├── environmentService.ts # Noise level
│   │   ├── deviceService.ts      # Connected devices
│   │   └── presenceEngine.ts     # Aggregate context
│   ├── types/
│   │   └── presence.ts
│   └── config/
│       └── index.ts
├── __tests__/
│   └── presence.test.ts
├── package.json
└── README.md
```

**API Endpoints:**
- `GET /api/presence/:userId` — Current presence context
- `POST /api/location` — Update location
- `GET /api/devices` — Connected devices
- `GET /api/prayer-times` — Today's prayer times
- `POST /api/mode/suggest` — Suggest listening mode

---

### Day 5: Delete Phantoms

```bash
# Delete these directories:
rm -rf /Users/rejaulkarim/Documents/RTMN/companies/razo-keyboard/
rm -rf /Users/rejaulkarim/Documents/RTMN/companies/do-app/
rm -rf /Users/rejaulkarim/Documents/RTMN/REZ-Workspace/industries/genie-os/
```

---

### Day 6-7: Port 4399 Resolution

**Issue:** Nexha ecosystem-connector claims port 4399

**Options:**
1. Move Nexha to a different port (e.g., 4380)
2. Build RTMN Hub at a different port
3. Merge ecosystem-connector into a unified hub

**Recommendation:** Keep Nexha at 4380, build RTMN Hub at 4399

**Action:** Update Nexha port in `ecosystem-connector/start.sh`

---

## WEEK 2: TEST COVERAGE + INTEGRATION

### Day 8-10: Add Tests to Top Services

**Priority services for tests:**
1. genie-os/runtime/genie — 100 tests
2. genie-calendar-service — 50 tests
3. genie-shopping-agent — 50 tests
4. genie-memory-inbox — 50 tests
5. genie-briefing-service — 30 tests
6. voice-gateway — 50 tests
7. conversation-physics — 50 tests

**Test framework:** vitest

---

### Day 11-14: Wire Consumer Triangle

**Current state:**
- Genie at 7100
- RAZO at 4299
- DO App expects 7100 for Genie

**Fix:**
1. Update DO App `hojaiClient.ts` to use correct ports
2. Add Genie routes to RTMN Hub (if built)
3. Wire RAZO → Genie → RAZO flow

**Genie API endpoints needed:**
```
POST /api/ask              # Ask Genie
POST /api/voice/process    # Process voice
GET  /api/memory/search   # Search memory
GET  /api/twin/:type      # Get twin data
POST /api/action/execute   # Execute action
```

---

## MONTH 2: MOAT FEATURES

### Voice Clone / TTS with User Voice

**Location:** `companies/HOJAI-AI/products/voice-os/core/voice-clone/`

**What to build:**
```
voice-clone/
├── src/
│   ├── index.ts              # Express server
│   ├── services/
│   │   ├── voiceEnrollment.ts  # Record voice samples
│   │   ├── voiceSynthesis.ts   # Generate speech in user's voice
│   │   ├── emotionRenderer.ts  # Emotional voice rendering
│   │   └── permissionEngine.ts # Permission policies
│   ├── types/
│   │   └── voice.ts
│   └── config/
│       └── index.ts
├── __tests__/
│   └── voiceClone.test.ts
└── package.json
```

**API Endpoints:**
- `POST /api/enroll` — Enroll voice (record 30 seconds)
- `POST /api/synthesize` — Synthesize speech in user's voice
- `GET /api/permissions` — Get permission policies
- `POST /api/permissions` — Update permission policies

**Dependencies:**
- ElevenLabs API (voice cloning)
- Or: Coqui TTS (open source)
- Or: Custom voice synthesis model

---

### Decision Intelligence Engine

**Location:** `companies/HOJAI-AI/products/genie/genie-decision-intelligence/`

**What to build:**
```
genie-decision-intelligence/
├── src/
│   ├── index.ts
│   ├── services/
│   │   ├── decisionExtractor.ts   # Extract decisions from text
│   │   ├── decisionStorage.ts     # Store WHY/WHO/WHAT/WHEN
│   │   ├── decisionContext.ts      # Store alternatives rejected
│   │   ├── decisionReasoning.ts     # Why this decision
│   │   └── decisionQuery.ts        # Query decisions
│   ├── models/
│   │   └── Decision.ts
│   └── types/
│       └── decision.ts
└── __tests__/
    └── decision.test.ts
```

**Data Model:**
```typescript
interface Decision {
  id: string;
  userId: string;
  what: string;           // What was decided
  why: string;            // Why this decision
  who: string[];          // Who approved
  when: Date;             // When decided
  alternatives: string[];  // Alternatives considered
  rejected: boolean[];    // Which were rejected
  confidence: number;     // Decision confidence
  context: string;        // Additional context
  source: 'meeting' | 'chat' | 'email' | 'voice';
  followUp?: Date;        // When to revisit
}
```

**API Endpoints:**
- `POST /api/decisions/extract` — Extract from conversation
- `GET /api/decisions/:userId` — Get all decisions
- `GET /api/decisions/:id` — Get single decision
- `POST /api/decisions/:id/follow-up` — Set follow-up
- `GET /api/decisions/why` — Query "Why did we..."

---

### Memory Importance Engine

**Location:** `companies/HOJAI-AI/products/genie/genie-memory-importance/`

**What to build:**
```
genie-memory-importance/
├── src/
│   ├── index.ts
│   ├── services/
│   │   ├── importanceScorer.ts    # Score each memory
│   │   ├── decayEngine.ts          # Apply time decay
│   │   ├── reinforcementEngine.ts   # Strengthen repeated
│   │   └── forgetScheduler.ts      # Schedule deletions
│   └── types/
│       └── memory.ts
└── __tests__/
    └── memoryImportance.test.ts
```

**Importance Formula:**
```
importance = 
  (people_importance × 0.3) +
  (emotion_intensity × 0.2) +
  (decision_impact × 0.2) +
  (money_value × 0.15) +
  (frequency × 0.1) +
  (goal_relevance × 0.05)
```

**API Endpoints:**
- `POST /api/memories/score` — Score a memory
- `GET /api/memories/important` — Get important memories
- `POST /api/memories/decay` — Apply decay
- `GET /api/memories/forget` — Get memories to forget

---

### Continuous Learning Loop

**Location:** `companies/HOJAI-AI/products/genie/genie-learning-loop/`

**What to build:**
```
genie-learning-loop/
├── src/
│   ├── index.ts
│   ├── services/
│   │   ├── preferenceLearner.ts    # Learn from feedback
│   │   ├── behaviorTracker.ts      # Track behavior patterns
│   │   ├── adaptationEngine.ts     # Adapt based on patterns
│   │   └── feedbackLoop.ts         # Close the loop
│   └── types/
│       └── learning.ts
└── __tests__/
    └── learningLoop.test.ts
```

**Example patterns to learn:**
- "I don't like meetings after 8 PM"
- "I prefer short emails"
- "I work better in the morning"
- "I need 24 hours before major decisions"

---

## MONTH 3: INTELLIGENCE LAYER

### Life Event Engine

Detect and respond to life events:
- Ramadan mode
- Marriage mode
- Fundraising mode
- Travel mode
- Health events

### Anticipation Engine

Proactive suggestions:
- "Flight tomorrow — suggest packing tonight"
- "Investor follow-up due — draft email"
- "Mother's birthday in 5 days — gift ideas"

### Ambient Intelligence

Passive awareness:
- "You look tired"
- "You haven't called your parents in 6 days"
- "Your energy is low"

---

## EXECUTION CHECKLIST

### Week 1
- [ ] Build EmotionOS
- [ ] Build PresenceOS
- [ ] Delete phantom directories
- [ ] Resolve Port 4399

### Week 2
- [ ] Add 100 tests to genie-runtime
- [ ] Fix DO App port mismatch
- [ ] Wire RAZO → Genie flow
- [ ] Add Genie to Hub routes

### Month 2
- [ ] Voice Clone / TTS
- [ ] Decision Intelligence
- [ ] Memory Importance
- [ ] Continuous Learning Loop
- [ ] Personal Constitution Engine

### Month 3
- [ ] Life Event Engine
- [ ] Anticipation Engine
- [ ] Ambient Intelligence
- [ ] Social Intelligence Graph
- [ ] Audio Memory Graph

---

## METRICS TO TRACK

| Metric | Target |
|--------|--------|
| EmotionOS coverage | 10 emotion types |
| PresenceOS contexts | 8 context types |
| Test coverage | 80% |
| Decision extraction accuracy | 90% |
| Memory importance accuracy | 85% |
| Learning loop feedback | 95% |

---

*Plan created June 29, 2026*
