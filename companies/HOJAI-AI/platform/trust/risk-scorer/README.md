# Risk Scorer - Content Risk Assessment Service

**Version:** 1.0.0 | **Port:** 4995 | **Package:** `@hojai/risk-scorer`

---

## Overview

Risk Scorer is a content risk assessment service that analyzes text content across five risk dimensions: factual accuracy, safety, privacy, legal compliance, and reputational impact. It provides weighted overall risk scores and flags content requiring human review.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Risk Scorer Service                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Input Content                                                  │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │  Factual    │  │   Safety    │  │   Privacy   │           │
│  │  Accuracy   │  │   Harm      │  │   Leak      │           │
│  │  (30%)      │  │   (30%)     │  │   (20%)     │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐                            │
│  │   Legal     │  │ Reputational│                            │
│  │ Compliance  │  │   Damage    │                            │
│  │   (10%)     │  │   (10%)     │                            │
│  └─────────────┘  └─────────────┘                            │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────┐                       │
│  │         Overall Risk Score          │                       │
│  │  low (0-0.3) | medium (0.3-0.5)    │                       │
│  │  high (0.5-0.7) | critical (0.7-1) │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Risk Dimensions

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Factual Accuracy** | 30% | Detects unverified claims, unsourced statistics, outdated info |
| **Safety Harm** | 30% | Identifies dangerous instructions, unverified medical/financial advice |
| **Privacy Leak** | 20% | Detects PII (SSN, phone, email, credit cards), privacy concerns |
| **Legal Compliance** | 10% | Flags liability language, copyright issues, defamatory content |
| **Reputational Damage** | 10% | Identifies negative sentiment, named accusations |

---

## API Endpoints

### POST `/score` - Score Single Content

Evaluate risk for a single piece of content.

**Request:**
```bash
curl -X POST http://localhost:4995/score \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This product might help you lose weight. It could be the best solution for your health. Studies show 10 million people use it daily."
  }'
```

**Response:**
```json
{
  "content": "This product might help you lose weight. It could be the best solution...",
  "scores": {
    "factual": 0.5,
    "safety": 0.4,
    "privacy": 0,
    "legal": 0,
    "reputational": 0.2
  },
  "overall": 0.32,
  "riskLevel": "medium",
  "requiresReview": false
}
```

### POST `/score/batch` - Batch Score Multiple Contents

Evaluate risk for multiple content pieces.

**Request:**
```bash
curl -X POST http://localhost:4995/score/batch \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      "This investment could return 100% profit. You might become a millionaire.",
      "How to make a bomb for self-defense purposes.",
      "Contact me at john@example.com for more details."
    ]
  }'
```

**Response:**
```json
{
  "results": [
    {
      "content": "This investment could return 100% profit...",
      "scores": { "factual": 0.2, "safety": 0.2, "privacy": 0, "legal": 0, "reputational": 0 },
      "overall": 0.14,
      "riskLevel": "low",
      "requiresReview": false
    },
    {
      "content": "How to make a bomb for self-defense purposes.",
      "scores": { "factual": 0, "safety": 1, "privacy": 0, "legal": 0, "reputational": 0 },
      "overall": 0.3,
      "riskLevel": "medium",
      "requiresReview": true
    },
    {
      "content": "Contact me at john@example.com for more details.",
      "scores": { "factual": 0, "safety": 0, "privacy": 0.4, "legal": 0, "reputational": 0 },
      "overall": 0.08,
      "riskLevel": "low",
      "requiresReview": false
    }
  ],
  "summary": {
    "avgOverall": 0.173,
    "critical": 0,
    "high": 0,
    "medium": 1,
    "low": 2
  }
}
```

### GET `/health` - Health Check

```bash
curl http://localhost:4995/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "risk-scorer",
  "port": 4995
}
```

---

## Risk Level Thresholds

| Level | Score Range | Action |
|-------|-------------|--------|
| **Low** | 0.0 - 0.29 | Safe to publish |
| **Medium** | 0.3 - 0.49 | Review recommended |
| **High** | 0.5 - 0.69 | Human review required |
| **Critical** | 0.7 - 1.0 | Block and escalate |

Content with `overall >= 0.5` will have `requiresReview: true`.

---

## Scoring Algorithms

### Factual Risk (0-1)

- Unverified claims: +0.2 (words: "could be", "maybe", "possibly", "might be", "believed to")
- Unsourced statistics: +0.3 (numbers + units without citations)
- Outdated indicators: +0.1 (words: "old", "outdated", "former", "previous")

### Safety Risk (0-1)

- Dangerous instructions: 1.0 (immediate block for bomb/weapon/explosive/poison)
- Medical advice without disclaimer: +0.4
- Financial advice: +0.2
- Legal advice: +0.2

### Privacy Risk (0-1)

- SSN pattern: +0.4
- Phone numbers (10+ digits): +0.4
- Email addresses: +0.4
- Credit card numbers: +0.4
- Privacy-related content: +0.1

### Legal Risk (0-1)

- Liability language: +0.2
- Copyright/trademark: +0.1
- Defamatory terms: +0.3

### Reputational Risk (0-1)

- Negative sentiment: +0.2
- Named accusations: +0.3

---

## Installation & Usage

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd companies/HOJAI-AI/platform/trust/risk-scorer
npm install
```

### Running the Service

```bash
# Development mode (auto-reload on changes)
npm run dev

# Production mode
npm start

# Run tests
npm test
```

### Docker (optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 4995
CMD ["npm", "start"]
```

---

## Architecture

```
risk-scorer/
├── src/
│   └── index.js           # Express server + all scoring logic
├── __tests__/
│   └── unit/
│       └── risk-scorer.test.js
├── vitest.config.js       # Test configuration
├── package.json
├── README.md
└── CLAUDE.md
```

**Dependencies:**
- `express` - HTTP server
- `cors` - Cross-origin resource sharing
- `helmet` - Security headers

**Dev Dependencies:**
- `vitest` - Test runner

---

## Integration Points

### With SADA OS (port 4190)

Risk scores can be fed into SADA's governance engine:

```javascript
// Example: Feed risk score to SADA governance
const riskScore = await fetch('http://localhost:4995/score', {
  method: 'POST',
  body: JSON.stringify({ content: userContent })
});

// If critical, trigger SADA policy validation
if (riskScore.requiresReview) {
  await fetch('http://localhost:4190/governance/validate', {
    method: 'POST',
    body: JSON.stringify({ 
      action: 'publish_content', 
      riskScore: riskScore.overall 
    })
  });
}
```

### With Content Moderation Pipeline

```javascript
async function moderateContent(content) {
  const risk = await riskScorer.score(content);
  
  if (risk.riskLevel === 'critical') {
    await blockContent(content, 'CRITICAL_RISK');
    await notifyModerator(risk);
  } else if (risk.requiresReview) {
    await queueForReview(content, risk);
  } else {
    await approveContent(content);
  }
  
  return risk;
}
```

---

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4995 | Service port |
| `NODE_ENV` | development | Environment mode |

---

## Error Handling

| Status Code | Error | Cause |
|-------------|-------|-------|
| 400 | `Content is required` | Missing content field |
| 400 | `Contents array is required` | Batch request without array |
| 500 | Internal Server Error | Unexpected server error |

---

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## License

Internal - HOJAI AI Platform
