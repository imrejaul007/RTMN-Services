# Human Intelligence OS - Quick Start

> **One command to start everything: Human Intelligence OS**

---

## Quick Start

```bash
cd companies/HOJAI-AI

# Start all services
bash scripts/start-human-intelligence.sh start

# Check status
bash scripts/start-human-intelligence.sh status

# Run tests
bash scripts/start-human-intelligence.sh test

# Stop all
bash scripts/start-human-intelligence.sh stop
```

---

## Services Overview

| OS | Services | Description |
|----|----------|-------------|
| **EmotionOS** | 8 | Emotion detection, empathy, tone analysis |
| **BehaviorOS** | 3 | Habits, triggers, burnout prediction |
| **TrustOS** | 2 | Trust passports, agent economy |
| **SimulationOS** | 1 | What-if scenarios, Monte Carlo |
| **Agent Context** | 1 | SUTAR agent emotional intelligence |

---

## Port Map

```
EmotionOS:    4722, 4760-4767
BehaviorOS:    4731, 4732, 4735
Company:       4780
TrustOS:       4980, 4985
SimulationOS:   4874
Agent Context:  4850
```

---

## Example Usage

### Emotion Detection

```javascript
import { HumanIntelligence } from '@hojai/human-intelligence-sdk';

const hi = new HumanIntelligence();

// Detect emotion
const emotion = await hi.emotion.analyze({
  text: "I'm frustrated with this service",
  voice: { pitch: 85, energy: 92 }
});

// Response
// { emotions: { frustration: 0.84, anger: 0.72 }, trust: 0.21 }
```

### Burnout Assessment

```javascript
const burnout = await hi.burnout.assess({
  entityId: "founder_1",
  sleepHours: 5,
  workHours: 65,
  stress: 9,
  exerciseDays: 1
});

// Response
// { riskScore: 0.78, riskLevel: "high", recommendations: [...] }
```

### Trust Passport

```javascript
const passport = await hi.trustPassport.createPassport({
  entityId: "merchant_1",
  entityType: "merchant",
  dimensions: {
    reliability: 95,
    competence: 90,
    integrity: 88
  }
});

// Response
// { overallTrust: 90, trustLevel: "platinum", badge: "🏆", multiplier: 1.5 }
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [HUMAN-INTELLIGENCE-COMPLETE.md](HUMAN-INTELLIGENCE-COMPLETE.md) | Complete API reference |
| [HUMAN-INTELLIGENCE-INTEGRATIONS.md](HUMAN-INTELLIGENCE-INTEGRATIONS.md) | Integration examples |
| [SUTAR-HUMAN-INTELLIGENCE-INTEGRATION.md](SUTAR-HUMAN-INTELLIGENCE-INTEGRATION.md) | SUTAR integration |
| [CORPPERKS-HUMAN-INTELLIGENCE-INTEGRATION.md](CORPPERKS-HUMAN-INTELLIGENCE-INTEGRATION.md) | CorpPerks integration |
| [GENIE-HUMAN-INTELLIGENCE-INTEGRATION.md](GENIE-HUMAN-INTELLIGENCE-INTEGRATION.md) | Genie integration |

---

## Test Results

```
EmotionOS Tests:    35+ tests ✅
BehaviorOS Tests:    50+ tests ✅
TrustOS Tests:      25+ tests ✅
SimulationOS Tests: 20+ tests ✅
SDK Tests:          33+ tests ✅
─────────────────────────────
Total:             200+ tests ✅
```

---

## SDKs

### Human Intelligence SDK
```bash
npm install @hojai/human-intelligence-sdk
```

### Knowledge SDK
```bash
npm install @hojai/knowledge-sdk
```

---

## Status

**Version:** 1.0.0  
**Updated:** June 30, 2026  
**Status:** ✅ Production Ready
