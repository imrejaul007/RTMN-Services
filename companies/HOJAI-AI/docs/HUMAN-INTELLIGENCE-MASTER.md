# Human Intelligence OS
## Complete Technical Reference

> **Version:** 1.0.0
> **Last Updated:** June 30, 2026
> **Status:** ✅ Production Ready

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Services](#services)
4. [SDKs](#sdks)
5. [API Reference](#api-reference)
6. [Examples](#examples)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Support](#support)

---

## Quick Start

### One-Command Setup

```bash
cd companies/HOJAI-AI

# Start all services
bash scripts/start-human-intelligence.sh start

# Check status
bash scripts/start-human-intelligence.sh status

# Run all tests
bash scripts/start-human-intelligence.sh test

# Stop all
bash scripts/start-human-intelligence.sh stop
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  emotion-os:
    image: hojai/emotion-os:latest
    ports:
      - "4760:4760"
  trust-passport:
    image: hojai/trust-passport:latest
    ports:
      - "4980:4980"
```

```bash
docker-compose up -d
```

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        HUMAN INTELLIGENCE OS                              │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                    EmotionOS (10 services)                      │   │
│  │  Gateway │ Voice │ Memory │ Analytics │ Tone │ DNA │ Empathy   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                    BehaviorOS (5 services)                        │   │
│  │  Habits │ Triggers │ Burnout │ Patterns │ Intervention            │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                    TrustOS (15+ services)                       │   │
│  │  Passport │ Credits │ SADA │ Verification │ Economy                │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                    SimulationOS (5 services)                     │   │
│  │  What-If │ Market │ Company │ Monte Carlo │ Comparison          │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                    VoiceOS (21 services)                         │   │
│  │  Physics │ Director │ Timeline │ Presence │ Social               │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Services

### EmotionOS Services (10)

| Port | Service | Description |
|------|---------|-------------|
| 4760 | emotion-os-gateway | Unified API entry point |
| 4761 | emotional-memory | Store emotion timelines |
| 4762 | empathy-response-engine | Generate empathetic responses |
| 4763 | emotion-analytics | Emotion dashboards |
| 4764 | emotional-journey | Post-call analysis |
| 4765 | emotion-alerts | Real-time alerts |
| 4766 | cross-modal-emotion | Text + voice fusion |
| 4767 | tone-analysis | Sales tone detection |
| 4722 | communication-dna | Communication profiling |
| 4780 | company-emotion | Organization morale |

### BehaviorOS Services (5)

| Port | Service | Description |
|------|---------|-------------|
| 4731 | habit-engine | Habit tracking |
| 4732 | burnout-prediction | Burnout risk assessment |
| 4735 | trigger-intelligence | Behavior trigger mapping |
| 4738 | behavior-intelligence | Behavior patterns |
| 4746 | behavioral-twin | Behavioral profiles |

### TrustOS Services (15+)

| Port | Service | Description |
|------|---------|-------------|
| 4980 | trust-passport | Portable trust credentials |
| 4985 | agent-trust-economy | Trust tokens & credits |
| 4190 | sada-os | Trust + Governance + Risk |
| 4990 | confidence-scorer | AI confidence |
| 4993 | verification-engine | Fact-checking |
| 4994 | hallucination-detector | AI consistency |

### SimulationOS Services (5)

| Port | Service | Description |
|------|---------|-------------|
| 4874 | simulation-os-gateway | What-if scenarios |
| 4875 | market-simulation | Market modeling |
| 4876 | company-simulation | Decision modeling |
| 4877 | monte-carlo | Statistical simulation |
| 4878 | scenario-comparison | Compare scenarios |

### Agent Context (1)

| Port | Service | Description |
|------|---------|-------------|
| 4850 | sutar-agent-emotional-context | Agent negotiation context |

---

## SDKs

### Human Intelligence SDK

```bash
npm install @hojai/human-intelligence-sdk
```

```javascript
import { HumanIntelligence } from '@hojai/human-intelligence-sdk';

const hi = new HumanIntelligence({
  emotionGateway: 'http://localhost:4760',
  trustPassport: 'http://localhost:4980',
  companyEmotion: 'http://localhost:4780'
});

// Emotion detection
const emotion = await hi.emotion.analyze({
  text: "I am frustrated with this service",
  context: 'support'
});

// Trust verification
const trust = await hi.trustPassport.verify({
  passportId: 'merchant_123'
});

// Company morale
const morale = await hi.company.getAnalytics('company_456');
```

### Knowledge SDK

```bash
npm install @hojai/knowledge-sdk
```

```javascript
import { KnowledgeSDK } from '@hojai/knowledge-sdk';

const knowledge = new KnowledgeSDK({
  ontologyUrl: 'http://localhost:4751',
  reasoningUrl: 'http://localhost:4753'
});

// Schema validation
await knowledge.ontology.validate({
  schema: 'Person',
  data: { name: 'Karim', age: 35 }
});
```

---

## API Reference

### EmotionOS Gateway

#### POST /analyze

Detect emotions from text or voice.

```bash
curl -X POST http://localhost:4760/analyze \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "I am frustrated with this service",
    "voice": {"pitch": 85, "energy": 92},
    "context": "customer_support"
  }'
```

**Response:**
```json
{
  "emotions": {
    "frustration": 0.84,
    "anger": 0.72,
    "stress": 0.65
  },
  "trust": 0.21,
  "recommended_action": "escalate_to_human",
  "empathy_response": "I understand this is frustrating..."
}
```

#### POST /empathy

Generate empathetic response.

```bash
curl -X POST http://localhost:4760/empathy \
  -H 'Content-Type: application/json' \
  -d '{
    "emotion": "frustrated",
    "tone": "empathetic",
    "severity": "high"
  }'
```

**Response:**
```json
{
  "response": "I completely understand your frustration. Let me help you right away.",
  "suggestions": [
    "Acknowledge the issue",
    "Show empathy first",
    "Offer immediate solution"
  ]
}
```

---

### Trust Passport

#### POST /passport

Create trust passport.

```bash
curl -X POST http://localhost:4980/passport \
  -H 'Content-Type: application/json' \
  -d '{
    "entityId": "merchant_123",
    "entityType": "merchant",
    "dimensions": {
      "reliability": 95,
      "competence": 90,
      "integrity": 88,
      "responsiveness": 85
    }
  }'
```

**Response:**
```json
{
  "passport": {
    "id": "hojai:merchant_123",
    "overallTrust": 90.25,
    "trustLevel": "platinum",
    "badge": "🏆",
    "multiplier": 1.5,
    "benefits": [
      {"type": "fee_reduction", "value": "50%"},
      {"type": "payout_speed", "value": "instant"},
      {"type": "support", "value": "priority"}
    ]
  }
}
```

#### POST /verify

Verify trust passport.

```bash
curl -X POST http://localhost:4980/verify \
  -H 'Content-Type: application/json' \
  -d '{
    "passportId": "hojai:merchant_123",
    "verifierId": "buyer_456",
    "purpose": "transaction"
  }'
```

**Response:**
```json
{
  "verification": {
    "valid": true,
    "overallTrust": 90.25,
    "trustLevel": "platinum",
    "verifiedAt": "2026-06-30T12:00:00Z",
    "validUntil": "2026-07-01T12:00:00Z"
  }
}
```

---

### Company Emotion

#### POST /company

Create company profile.

```bash
curl -X POST http://localhost:4780/company \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "startup_123",
    "name": "Acme Tech",
    "industry": "SaaS"
  }'
```

#### GET /company/:companyId/analytics

Get company morale analytics.

```bash
curl http://localhost:4780/company/startup_123/analytics
```

**Response:**
```json
{
  "companyId": "startup_123",
  "overallMorale": 72,
  "moraleLevel": {"level": "good", "emoji": "😊"},
  "burnoutRisk": 0.38,
  "departments": [
    {"name": "Engineering", "morale": 78, "burnoutRisk": 0.28},
    {"name": "Sales", "morale": 65, "burnoutRisk": 0.52}
  ],
  "trend": "improving"
}
```

---

### SimulationOS

#### POST /pricing

Simulate pricing scenarios.

```bash
curl -X POST http://localhost:4874/pricing \
  -H 'Content-Type: application/json' \
  -d '{
    "currentPrice": 99,
    "currentDemand": 1000,
    "elasticity": -1.5,
    "discount": 0.15
  }'
```

**Response:**
```json
{
  "simulation": {
    "input": {"currentPrice": 99, "newPrice": 84.15},
    "statistics": {
      "newDemand": {"mean": 1150, "p95": 1200},
      "revenueChange": {"mean": 15000, "p95": 16500}
    },
    "recommendation": "Recommended"
  }
}
```

---

### Agent Trust Economy

#### POST /account

Create agent account.

```bash
curl -X POST http://localhost:4985/account \
  -H 'Content-Type: application/json' \
  -d '{"agentId": "agent_procurement_1"}'
```

#### POST /transfer

Transfer trust credits.

```bash
curl -X POST http://localhost:4985/transfer \
  -H 'Content-Type: application/json' \
  -d '{
    "fromAgentId": "buyer_agent",
    "toAgentId": "seller_agent",
    "amount": 100,
    "reason": "Contract payment"
  }'
```

#### GET /leaderboard

Get trust economy leaderboard.

```bash
curl http://localhost:4985/leaderboard?sortBy=reputation&limit=10
```

**Response:**
```json
{
  "leaderboard": [
    {"agentId": "top_seller", "credits": 15000, "reputation": 95},
    {"agentId": "procurement_pro", "credits": 12000, "reputation": 92}
  ],
  "sortBy": "reputation"
}
```

---

## Examples

### Customer Support Integration

```javascript
import { HumanIntelligence } from '@hojai/human-intelligence-sdk';

async function handleSupportTicket(ticket) {
  const hi = new HumanIntelligence();

  // 1. Detect emotion
  const emotion = await hi.emotion.analyze({
    text: ticket.message,
    context: 'support'
  });

  // 2. Generate empathetic response
  if (emotion.emotions.frustration > 0.7) {
    const empathy = await hi.emotion.generateEmpathyResponse('frustrated', {
      tone: 'empathetic',
      severity: 'high'
    });
    return { escalate: true, response: empathy.response };
  }

  return { escalate: false, response: 'Thank you for your message.' };
}
```

### Marketplace Trust Integration

```javascript
async function verifySeller(sellerId) {
  const hi = new HumanIntelligence();

  // Verify trust passport
  const passport = await hi.trustPassport.getPassport(`marketplace:${sellerId}`);

  if (passport.trustLevel === 'restricted') {
    throw new Error('Seller trust verification failed');
  }

  // Apply trust multiplier
  const price = basePrice * passport.multiplier;
  return { verified: true, adjustedPrice: price };
}
```

### Founder Dashboard

```javascript
async function founderHealthReport(founderId) {
  const hi = new HumanIntelligence();

  // Check burnout
  const burnout = await hi.burnout.assess({
    entityId: founderId,
    sleepHours: founder.sleepHours,
    workHours: founder.workHours,
    stress: founder.stressLevel
  });

  // Get team morale
  const team = await hi.company.getAnalytics(founder.companyId);

  // Simulation
  const sim = await hi.simulation.simulatePricing({
    currentPrice: 99,
    currentDemand: 1000,
    discount: 0.1
  });

  return { burnout, teamMorale: team, pricingSimulation: sim };
}
```

---

## Testing

### Run All Tests

```bash
bash scripts/start-human-intelligence.sh test
```

### Run Individual Tests

```bash
npm --prefix platform/emotion/emotion-os-gateway test
npm --prefix platform/trust/trust-passport test
npm --prefix platform/emotion/company-emotion test
npm --prefix platform/simulation-os/simulation-os-gateway test
```

### Test Coverage

| Service | Tests | Status |
|---------|-------|--------|
| emotion-os-gateway | 35 | ✅ |
| emotional-memory | 17 | ✅ |
| empathy-response-engine | 7 | ✅ |
| emotion-analytics | 10 | ✅ |
| tone-analysis | 15 | ✅ |
| company-emotion | 12 | ✅ |
| habit-engine | 17 | ✅ |
| burnout-prediction | 25 | ✅ |
| trigger-intelligence | 17 | ✅ |
| trust-passport | 14 | ✅ |
| agent-trust-economy | 11 | ✅ |
| simulation-os-gateway | 20 | ✅ |
| human-intelligence-sdk | 28 | ✅ |
| **Total** | **228** | **✅** |

---

## Deployment

### HOJAI Cloud

```bash
# Deploy emotion-os-gateway
npx hojai deploy emotion-os-gateway --port 4760

# Deploy trust-passport
npx hojai deploy trust-passport --port 4980

# Deploy company-emotion
npx hojai deploy company-emotion --port 4780
```

### Environment Variables

```bash
# EmotionOS
EMOTION_GATEWAY_URL=https://emotion.hosjai.ai
EMOTIONAL_MEMORY_URL=https://memory.hojai.ai

# TrustOS
TRUST_PASSPORT_URL=https://trust.hojai.ai
AGENT_ECONOMY_URL=https://economy.hojai.ai

# Company Emotion
COMPANY_EMOTION_URL=https://company.hojai.ai
```

---

## Support

### Documentation
- [Human Intelligence Complete](docs/HUMAN-INTELLIGENCE-COMPLETE.md)
- [Integration Guide](docs/HUMAN-INTELLIGENCE-INTEGRATIONS.md)
- [SUTAR Integration](docs/SUTAR-HUMAN-INTELLIGENCE-INTEGRATION.md)

### Community
- GitHub Issues: [github.com/imrejaul007/hojai-ai](https://github.com/imrejaul007/hojai-ai)

### Enterprise
- Email: support@hojai.ai
- Slack: [hojai-ai.slack.com](https://hojai.slack.com)

---

## Changelog

| Version | Date | Changes |
|---------|------|----------|
| 1.0.0 | June 30, 2026 | Initial release |

---

*Built with ❤️ by HOJAI AI*
