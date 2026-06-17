# HOJAI Intelligence Layer

**Service Name:** hojai-intelligence  
**Port:** 4881  
**Version:** 1.0.0  
**Status:** Development Ready

---

## Overview

HOJAI Intelligence Layer is the AI orchestration service for the RTMN ecosystem. It provides multi-agent AI capabilities including intent detection, sentiment analysis, knowledge retrieval, outcome prediction, and actionable recommendations.

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │         HOJAI Intelligence Layer         │
                    │              Port: 4881                  │
                    └─────────────────────────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        │                               │                               │
┌───────▼───────┐              ┌───────▼───────┐              ┌───────▼───────┐
│  Intent Agent │              │ Sentiment Agent│              │ Retrieval Agent│
│  (intent.ts)  │              │ (sentiment.ts) │              │ (retrieval.ts) │
└───────────────┘              └───────────────┘              └───────────────┘
        │                               │                               │
┌───────▼───────┐              ┌───────▼───────┐              ┌───────▼───────┐
│Prediction Agent│              │Recommendation │              │  Policy Engine │
│(prediction.ts) │              │   Agent       │              │  (policy/)     │
└───────────────┘              └───────────────┘              └────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
            ┌───────▼───────┐    ┌───────▼───────┐   ┌──────▼──────┐
            │Conversation   │    │   Customer    │   │Organization │
            │   Memory      │    │   Memory      │   │   Memory    │
            │(Redis/Memory) │    │ (Redis/Memory)│   │(Redis/Memory)│
            └───────────────┘    └───────────────┘   └─────────────┘
```

## API Endpoints

### Core Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Run full multi-agent analysis |
| POST | `/api/generate-brief` | Generate customer brief |

### Policy Engine

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/policy/evaluate` | Evaluate policies for context |

### Conversation Memory

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/conversation/session` | Create session |
| GET | `/api/conversation/session/:id` | Get session |
| POST | `/api/conversation/session/:id/turn` | Add turn |

### Customer Memory

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/customer/profile` | Get/create profile |
| GET | `/api/customer/:id/insights` | Get insights |
| PUT | `/api/customer/:id/preferences` | Update preferences |

### Organization Memory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organization/:id/policies` | Get policies |
| POST | `/api/organization/:id/policies` | Add policy |
| PUT | `/api/organization/:id/brand-voice` | Update brand voice |

### Health & Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/metrics` | Service metrics |
| GET | `/api/agents` | List agents |

## Request/Response Examples

### Analyze Request

```bash
curl -X POST http://localhost:4881/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I am very frustrated with my order. It has been 2 weeks and still no delivery!",
    "customerId": "cust-123",
    "orgId": "org-acme",
    "sessionId": "sess-456",
    "context": {
      "channel": "chat"
    }
  }'
```

### Analyze Response

```json
{
  "requestId": "uuid",
  "timestamp": 1709200000000,
  "intent": {
    "primaryIntent": "complaint",
    "confidence": 0.85,
    "secondaryIntents": [
      { "intent": "status_check", "confidence": 0.6 }
    ],
    "entities": {
      "date": ["2 weeks"]
    },
    "suggestedActions": ["acknowledge", "empathize", "escalate_to_manager"]
  },
  "sentiment": {
    "sentiment": "negative",
    "score": -0.75,
    "confidence": 0.92,
    "emotions": [
      { "emotion": "frustration", "intensity": 0.85 }
    ],
    "keyPhrases": ["very frustrated", "2 weeks", "no delivery"]
  },
  "retrieval": {
    "relevantDocuments": [...],
    "knowledgeGraphInsights": [...],
    "contextSummary": "..."
  },
  "prediction": {
    "csatScore": 2.1,
    "escalationProbability": 0.78,
    "churnRisk": "high",
    "recommendedProactiveActions": ["Offer supervisor call", "Prepare compensation"],
    "confidence": 0.88
  },
  "recommendations": {
    "recommendations": [
      {
        "action": "Offer to connect with supervisor",
        "priority": "critical",
        "reasoning": "High escalation probability detected",
        "expectedOutcome": "Prevent complaint escalation",
        "confidence": 0.85
      }
    ],
    "nextBestActions": ["Listen actively", "Acknowledge issue", "Propose solution"],
    "automationEligible": false
  },
  "processingTimeMs": 45
}
```

### Policy Evaluate Request

```bash
curl -X POST http://localhost:4881/api/policy/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "orgId": "org-acme",
      "customerId": "cust-123",
      "situation": "Customer requesting $600 refund",
      "customerAttributes": {
        "tier": "vip",
        "accountAge": 365
      },
      "transactionAmount": 600
    }
  }'
```

## Three Memory Layers

### 1. Conversation Memory
- Session-based storage for real-time conversation context
- Stores conversation turns with metadata
- Supports session resumption and context retrieval
- TTL: 24 hours (configurable)

### 2. Customer Memory
- Persistent customer profiles
- Lifetime value tracking
- Sentiment trend analysis
- Interaction history
- Tier management (standard, premium, vip)

### 3. Organization Memory
- Policy storage and retrieval
- Brand voice configuration
- Common issues tracking
- Escalation patterns
- Success metrics

## Agents

### Intent Agent
- Pattern-based intent classification
- Entity extraction (products, orders, amounts, dates)
- Suggested action generation
- 10+ built-in intent types

### Sentiment Agent
- Multi-level sentiment scoring (-1 to 1)
- Emotion detection (anger, frustration, satisfaction, etc.)
- Key phrase extraction
- Support for multiple languages

### Retrieval Agent
- Knowledge base search
- Similar case finding
- Context-aware relevance scoring
- Knowledge graph insights

### Prediction Agent
- CSAT score prediction (1-5)
- Escalation probability (0-1)
- Churn risk assessment (low/medium/high)
- Proactive action recommendations

### Recommendation Agent
- Priority-ranked action recommendations
- Response template suggestions
- Automation eligibility check
- Next best action sequence

## Policy Engine

Evaluates organizational policies against customer context:

- Condition-based policy matching
- Priority-based policy ordering
- Approval workflow support
- Audit trail logging

## Configuration

Environment variables:

```bash
PORT=4881
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
MONGODB_URI=mongodb://localhost:27017/hojai_intelligence
OPENAI_API_KEY=your-key
LOG_LEVEL=info
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Integration

Connects to other RTMN services:
- **Memory OS (4703)**: Shared customer memory
- **Goal OS (4242)**: Goal tracking for AI tasks
- **Event Bus (4510)**: Publish/subscribe for updates
- **Service Registry (4399)**: Service discovery

---

*Last Updated: June 2026*
