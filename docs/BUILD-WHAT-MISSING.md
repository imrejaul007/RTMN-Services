# 📋 GENIE — BUILD WHAT'S MISSING
**Date:** June 29, 2026
**Based on:** SPEC-AUDIT-2026-06-29.md

---

## ❌ MISSING ITEMS (Priority Order)

### TIER 1: CRITICAL (Make Genie Irreplaceable)

| # | Feature | Why | Effort | Spec Ref |
|---|---------|-----|--------|----------|
| 1 | **Decision Intelligence** | Store WHY/WHO/WHAT of every decision | HIGH | Part 21 |
| 2 | **Continuous Learning** | "I don't like meetings after 8 PM" → auto-adjust | HIGH | Part 23 |
| 3 | **Anticipation Engine** | "Flight tomorrow — pack tonight" | HIGH | Part 36 |
| 4 | **Ambient Intelligence** | "You look tired" alerts | MEDIUM | Part 25 |
| 5 | **Personal Constitution** | "What would I never do?" | MEDIUM | Part 32 |

### TIER 2: HIGH VALUE (Daily Use)

| # | Feature | Why | Effort | Spec Ref |
|---|---------|-----|--------|----------|
| 6 | **Financial LifeOS** | "Can I afford Dubai?" | MEDIUM | Part 27 |
| 7 | **Health Intelligence** | Gastric triggers, burnout | MEDIUM | Part 28 |
| 8 | **Household OS** | Family management | MEDIUM | Part 9 |
| 9 | **TravelOS** | Packing, jet lag | LOW | Part 29 |
| 10 | **SpiritualOS** | Ramadan, prayer | LOW | Part 30 |

### TIER 3: DIFFERENTIATORS (Long-term Moat)

| # | Feature | Why | Effort | Spec Ref |
|---|---------|-----|--------|----------|
| 11 | **Life Simulation** | "What if I move to Dubai?" | HIGH | Part 34 |
| 12 | **Digital Legacy** | Archive for future | HIGH | Part 35 |
| 13 | **Dream Journal** | Pattern analysis | LOW | Part 33 |
| 14 | **FocusOS** | Deep work intelligence | MEDIUM | Part 31 |

---

## BUILD PLAN

---

## 1. DECISION INTELLIGENCE
**Priority:** P0
**Effort:** 2 weeks
**Spec:** Part 21

### What to Build

```
products/genie/genie-decision-intelligence/
├── src/
│   ├── index.ts                    # Express, port 4740
│   ├── services/
│   │   ├── decisionExtractor.ts    # Extract from meetings/chat
│   │   ├── decisionStorage.ts     # MongoDB storage
│   │   ├── contextTracker.ts      # Track WHY/WHO/WHAT
│   │   ├── alternativesTracker.ts  # Store rejected alternatives
│   │   └── queryEngine.ts         # "Why did we choose X?"
│   └── types/
│       └── decision.ts
└── __tests__/
    └── decision.test.ts
```

### API

```typescript
// Endpoints
POST /api/decisions/extract     // Extract from text
GET  /api/decisions/:userId     // List all
GET  /api/decisions/:id         // Get one
GET  /api/decisions/why         // "Why did we choose Dubai?"
POST /api/decisions/:id/revisit // Set revisit date
```

### Data Model

```typescript
interface Decision {
  id: string;
  userId: string;
  what: string;           // What was decided
  why: string;          // Why this decision
  who: string[];         // Who approved
  when: Date;
  alternatives: {
    name: string;
    rejected: boolean;
    reason?: string;
  }[];
  confidence: number;     // 0-1
  impact: 'low' | 'medium' | 'high';
  source: 'meeting' | 'chat' | 'email' | 'voice';
  revisitDate?: Date;
}
```

---

## 2. CONTINUOUS LEARNING
**Priority:** P0
**Effort:** 2 weeks
**Spec:** Part 23

### What to Build

```
products/genie/genie-learning-loop/
├── src/
│   ├── index.ts                    # Express, port 4742
│   ├── services/
│   │   ├── preferenceLearner.ts   # Learn from feedback
│   │   ├── behaviorTracker.ts    # Track patterns
│   │   ├── scheduleAdapter.ts    # Auto-adjust calendar
│   │   └── feedbackLoop.ts        # Close the loop
│   └── types/
│       └── preference.ts
└── __tests__/
    └── learning.test.ts
```

### API

```typescript
// Endpoints
POST /api/feedback              // Record "I don't like meetings after 8 PM"
GET  /api/preferences/:userId   // Get learned preferences
POST /api/preferences/adapt     // Trigger calendar adjustment
```

### Example Patterns

```typescript
interface LearnedPreference {
  pattern: "meetings_after_8pm";
  action: "Block 8-10 PM daily";
  confidence: 0.85;
  examples: ["I don't like late meetings", "No calls after 8"];
}

interface LearnedPreference {
  pattern: "morning_focus";
  action: "Reserve 9-12 for deep work";
  confidence: 0.92;
  examples: ["I work better in morning", "Schedule calls in afternoon"];
}
```

---

## 3. ANTICIPATION ENGINE
**Priority:** P0
**Effort:** 2 weeks
**Spec:** Part 36

### What to Build

```
products/genie/genie-anticipation/
├── src/
│   ├── index.ts                    # Express, port 4745
│   ├── services/
│   │   ├── predictiveEngine.ts   # Predict needs
│   │   ├── calendarLinker.ts     # Link to calendar
│   │   ├── proactiveNotifier.ts # Send suggestions
│   │   └── contextAggregator.ts  # Aggregate context
│   └── types/
│       └── prediction.ts
└── __tests__/
    └── anticipation.test.ts
```

### API

```typescript
// Endpoints
GET  /api/anticipations/:userId   // Get predictions
POST /api/anticipations/dismiss    // Dismiss "not now"
GET  /api/anticipations/active     // Active suggestions
```

### Example Predictions

```typescript
interface Prediction {
  type: 'travel' | 'follow_up' | 'relationship' | 'health' | 'work';
  trigger: string;
  suggestion: string;
  urgency: 'low' | 'medium' | 'high';
  dismissUntil?: Date;
}

// Examples:
// { type: 'travel', trigger: 'Flight tomorrow 8 AM', suggestion: 'Pack tonight' }
// { type: 'follow_up', trigger: 'Investor meeting 7 days ago', suggestion: 'Draft email' }
// { type: 'relationship', trigger: "Mother's birthday in 5 days", suggestion: 'Gift ideas' }
```

---

## 4. AMBIENT INTELLIGENCE
**Priority:** P1
**Effort:** 1 week
**Spec:** Part 25

### What to Build

```
products/genie/genie-ambient/
├── src/
│   ├── index.ts                    # Express, port 4746
│   ├── services/
│   │   ├── ambientDetector.ts    # Detect signals
│   │   ├── wellnessChecker.ts    # Check wellness
│   │   ├── relationshipChecker.ts # Check relationships
│   │   └── alertEngine.ts        # Generate alerts
│   └── types/
│       └── ambient.ts
└── __tests__/
    └── ambient.test.ts
```

### API

```typescript
// Endpoints
GET  /api/ambient/:userId         # Get signals
GET  /api/ambient/alerts/:userId   # Get alerts
POST /api/ambient/dismiss          # Dismiss alert
```

### Example Alerts

```typescript
// From voice + sleep + calendar
{
  type: 'wellness',
  message: 'You look tired — move 2 meetings today',
  actions: ['Move to tomorrow', 'Skip workout']
}

{
  type: 'relationship',
  message: "Haven't called parents in 6 days (longest ever: 7)",
  actions: ['Call now', 'Schedule this week']
}
```

---

## 5. PERSONAL CONSTITUTION
**Priority:** P1
**Effort:** 1 week
**Spec:** Part 32

### What to Build

```
products/genie/genie-constitution/
├── src/
│   ├── index.ts                    # Express, port 4743
│   ├── services/
│   │   ├── valueExtractor.ts     # Extract from behavior
│   │   ├── boundaryEnforcer.ts   # Enforce limits
│   │   └── ethicsChecker.ts     # Ethics validation
│   └── types/
│       └── constitution.ts
└── __tests__/
    └── constitution.test.ts
```

### API

```typescript
// Endpoints
GET  /api/constitution/:userId       # Get constitution
POST /api/constitution                # Create/update
POST /api/constitution/check          # Check if allowed
```

### Data Model

```typescript
interface Constitution {
  userId: string;
  always: string[];        // "disclose AI identity"
  never: string[];         // "lie to investors", "take loans without asking"
  requiresApproval: string[]; // "transfers > 1L", "hiring"
  values: {
    name: string;
    weight: number;
  }[];
}
```

---

## 6. FINANCIAL LIFEOS
**Priority:** P1
**Effort:** 2 weeks
**Spec:** Part 27

### What to Build

```
products/genie/genie-financial-life/
├── src/
│   ├── index.ts                    # Express, port 4747
│   ├── services/
│   │   ├── burnAnalyzer.ts       # Monthly burn rate
│   │   ├── affordabilityEngine.ts # "Can I afford X?"
│   │   ├── investmentAdvisor.ts   # Recommendations
│   │   └── futureSimulator.ts     # "If I save 50K/month..."
│   └── types/
│       └── financial.ts
└── __tests__/
    └── financial.test.ts
```

### API

```typescript
// Endpoints
GET  /api/financial/:userId         # Dashboard
GET  /api/financial/burn            # Monthly burn rate
POST /api/financial/afford         # "Can I afford Dubai trip?"
GET  /api/financial/simulation     # Future simulation
POST /api/financial/recommendations # Investment advice
```

### Example Queries

```
User: "Can I afford to fly to Dubai next month?"
Genie: "Dubai trip estimated: ₹45,000. 
        Your monthly burn: ₹1.2L.
        Savings this month: ₹80,000.
        After trip: ₹35,000.
        Recommendation: YES, but book economy."
```

---

## 7. HEALTH INTELLIGENCE
**Priority:** P1
**Effort:** 2 weeks
**Spec:** Part 28

### What to Build

```
products/genie/genie-health-intelligence/
├── src/
│   ├── index.ts                    # Express, port 4748
│   ├── services/
│   │   ├── sleepOptimizer.ts     # Sleep patterns
│   │   ├── gastricDetector.ts    # Food triggers
│   │   ├── energyTracker.ts      # Energy levels
│   │   └── burnoutPredictor.ts   # Burnout prediction
│   └── types/
│       └── health.ts
└── __tests__/
    └── health.test.ts
```

### API

```typescript
// Endpoints
GET  /api/health/:userId           # Dashboard
GET  /api/health/sleep             # Sleep analysis
POST /api/health/gastric-log       # Log food reaction
GET  /api/health/energy           # Energy forecast
GET  /api/health/burnout          # Burnout risk
```

### Example Insights

```
Your gastric issues spike when:
- Eating after 9 PM (80% correlation)
- Spicy food for dinner (65% correlation)
- Less than 6 hours sleep (70% correlation)

Recommendation: Eat before 8:30 PM, lighter dinners
```

---

## 8. HOUSEHOLD OS
**Priority:** P1
**Effort:** 2 weeks
**Spec:** Part 9

### What to Build

```
products/genie/genie-household/
├── src/
│   ├── index.ts                    # Express, port 4749
│   ├── services/
│   │   ├── homeManager.ts        # Home automation
│   │   ├── expenseManager.ts     # Family expenses
│   │   ├── familyPlanner.ts      # Calendars, schedules
│   │   └── healthGuardian.ts      # Medicine reminders
│   └── types/
│       └── household.ts
└── __tests__/
    └── household.test.ts
```

### API

```typescript
// Endpoints
GET  /api/household/:userId        # Dashboard
POST /api/household/grocery        # Add to list
GET  /api/household/bills          # Upcoming bills
POST /api/household/medicine       # Set reminder
GET  /api/household/schedule       # Family calendar
```

### Example Alerts

```
Milk running low — add to grocery?
Electricity bill due in 3 days.
Mother's medicine ends tomorrow — reorder?
Kids have summer camp next week — confirm attendance.
```

---

## 9. TRAVEL OS
**Priority:** P2
**Effort:** 1 week
**Spec:** Part 29

### What to Build

```
products/genie/genie-travel/
├── src/
│   ├── index.ts                    # Express, port 4750
│   ├── services/
│   │   ├── packingAdvisor.ts     # Packing list
│   │   ├── documentTracker.ts    # Passport, visa
│   │   └── jetLagOptimizer.ts   # Sleep adjustment
│   └── types/
│       └── travel.ts
└── __tests__/
    └── travel.test.ts
```

### API

```typescript
// Endpoints
POST /api/travel/plan              # Plan trip
GET  /api/travel/packing/:tripId  # Packing list
GET  /api/travel/documents         # Document tracker
GET  /api/travel/jetlag           # Adjustment plan
```

---

## 10. SPIRITUAL OS
**Priority:** P2
**Effort:** 1 week
**Spec:** Part 30

### What to Build

```
products/genie/genie-spiritual/
├── src/
│   ├── index.ts                    # Express, port 4751
│   ├── services/
│   │   ├── prayerTracker.ts      # Prayer times
│   │   ├── ramadanMode.ts       # Ramadan adjustments
│   │   ├── charityReminder.ts   # Zakat reminders
│   │   └── quranProgress.ts     # Quran study
│   └── types/
│       └── spiritual.ts
└── __tests__/
    └── spiritual.test.ts
```

### API

```typescript
// Endpoints
GET  /api/spiritual/:userId        # Dashboard
GET  /api/spiritual/prayer         # Today's times
GET  /api/spiritual/ramadan        # Ramadan mode status
POST /api/spiritual/charity         # Set reminder
```

---

## 11. LIFE SIMULATION
**Priority:** P2
**Effort:** 2 weeks
**Spec:** Part 34

### What to Build

```
products/genie/genie-simulation/
├── src/
│   ├── index.ts                    # Express, port 4752
│   ├── services/
│   │   ├── scenarioBuilder.ts    # Build "what if" scenarios
│   │   ├── impactAnalyzer.ts     # Analyze impacts
│   │   └── riskCalculator.ts     # Calculate risks
│   └── types/
│       └── simulation.ts
└── __tests__/
    └── simulation.test.ts
```

### API

```typescript
// Endpoints
POST /api/simulation/what-if       # "What if I move to Dubai?"
GET  /api/simulation/:scenarioId   # Get results
```

### Example

```
User: "What if I move to Dubai?"

Simulating:
- Monthly rent: ₹1.5L (vs ₹40K current)
- Tax savings: ₹3L/year
- Family adjustment: High
- Business opportunity: High
- Distance from parents: +3,000 km

Recommendation: "High upside, significant trade-offs. 
Consider 6-month trial first."
```

---

## 12. FOCUS OS
**Priority:** P3
**Effort:** 1 week
**Spec:** Part 31

### What to Build

```
products/genie/genie-focus/
├── src/
│   ├── index.ts                    # Express, port 4753
│   ├── services/
│   │   ├── deepWorkTracker.ts   # Track focus time
│   │   ├── distractionAnalyzer.ts # Analyze distractions
│   │   └── scheduleOptimizer.ts  # Optimize timing
│   └── types/
│       └── focus.ts
└── __tests__/
    └── focus.test.ts
```

### API

```typescript
// Endpoints
GET  /api/focus/:userId           # Dashboard
POST /api/focus/session           # Log focus session
GET  /api/focus/optimal-times     # Best meeting times
```

---

## 13. DREAM JOURNAL
**Priority:** P3
**Effort:** 1 week
**Spec:** Part 33

### What to Build

```
products/genie/genie-dreams/
├── src/
│   ├── index.ts                    # Express, port 4754
│   ├── services/
│   │   ├── dreamCapture.ts       # Voice capture
│   │   ├── interpretation.ts     # AI analysis
│   │   └── patternDetector.ts     # Recurring themes
│   └── types/
│       └── dream.ts
└── __tests__/
    └── dreams.test.ts
```

---

## 14. DIGITAL LEGACY
**Priority:** P3
**Effort:** 3 weeks
**Spec:** Part 35

### What to Build

```
products/genie/genie-legacy/
├── src/
│   ├── index.ts                    # Express, port 4755
│   ├── services/
│   │   ├── archiveBuilder.ts     # Build archive
│   │   ├── lifeStoryWriter.ts   # AI-assisted story
│   │   └── familyHistory.ts     # Family connections
│   └── types/
│       └── legacy.ts
└── __tests__/
    └── legacy.test.ts
```

---

## TIMELINE

```
Week 1-2:  Decision Intelligence (P0)
Week 3-4:  Continuous Learning (P0)
Week 5-6:  Anticipation Engine (P0)
Week 7:    Ambient Intelligence (P1)
Week 8:    Personal Constitution (P1)
Week 9-10: Financial LifeOS (P1)
Week 11-12: Health Intelligence (P1)
Week 13-14: Household OS (P1)
Week 15:    TravelOS (P2)
Week 16:    SpiritualOS (P2)
Week 17-18: Life Simulation (P2)
Week 19:    FocusOS (P3)
Week 20:    Dream Journal (P3)
Week 21-23: Digital Legacy (P3)
```

---

## SERVICES SUMMARY

| # | Service | Port | LOC Est | Priority |
|---|---------|------|---------|----------|
| 1 | Decision Intelligence | 4740 | 1,500 | P0 |
| 2 | Learning Loop | 4742 | 1,200 | P0 |
| 3 | Anticipation | 4745 | 1,200 | P0 |
| 4 | Ambient | 4746 | 1,000 | P1 |
| 5 | Constitution | 4743 | 800 | P1 |
| 6 | Financial Life | 4747 | 1,500 | P1 |
| 7 | Health Intelligence | 4748 | 1,500 | P1 |
| 8 | Household | 4749 | 1,200 | P1 |
| 9 | Travel | 4750 | 800 | P2 |
| 10 | Spiritual | 4751 | 800 | P2 |
| 11 | Life Simulation | 4752 | 1,500 | P2 |
| 12 | Focus | 4753 | 800 | P3 |
| 13 | Dreams | 4754 | 600 | P3 |
| 14 | Legacy | 4755 | 1,500 | P3 |

**TOTAL: 14 new services | ~16,000 LOC**

---

## FILES TO CREATE

For each service (14 total):
- src/index.ts
- src/types/*.ts
- src/services/*.ts
- __tests__/*.test.ts
- package.json
- README.md

**TOTAL: 84 new files**

---

*Plan created June 29, 2026*
