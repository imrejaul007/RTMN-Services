# Risk Scorer - Service Documentation

**Service:** `@hojai/risk-scorer` | **Port:** 4995 | **Type:** Trust & Safety

Risk Scorer is part of the TrustOS suite, providing content risk assessment across factual accuracy, safety, privacy, legal compliance, and reputational dimensions.

---

## Service Overview

The Risk Scorer analyzes text content and returns risk scores across five dimensions:

| Dimension | Weight | Purpose |
|-----------|--------|---------|
| `factual` | 30% | Detects unverified claims, unsourced statistics |
| `safety` | 30% | Identifies dangerous instructions, harmful advice |
| `privacy` | 20% | Detects PII patterns (SSN, phone, email, credit cards) |
| `legal` | 10% | Flags liability, copyright, defamatory content |
| `reputational` | 10% | Identifies negative sentiment, accusations |

The service returns a weighted `overall` score and a `riskLevel` (low/medium/high/critical).

---

## Key Files

### `src/index.js` (main entry point)

- Express server on port 4995
- Three routes: `POST /score`, `POST /score/batch`, `GET /health`
- Five scoring functions:
  - `scoreRisk(content, options)` - Main orchestrator
  - `scoreFactualRisk(content)` - Factual accuracy analysis
  - `scoreSafetyRisk(content)` - Safety harm detection
  - `scorePrivacyRisk(content)` - PII pattern detection
  - `scoreLegalRisk(content)` - Legal compliance check
  - `scoreReputationalRisk(content)` - Reputational damage analysis

### `__tests__/unit/risk-scorer.test.js`

Unit tests for all scoring functions and API endpoints.

### `vitest.config.js`

Test configuration for vitest.

---

## Architecture

```
POST /score
    │
    ▼
scoreRisk(content)
    │
    ├──► scoreFactualRisk()  ──► regex for unverified claims, stats
    ├──► scoreSafetyRisk()   ──► dangerous patterns, medical/financial advice
    ├──► scorePrivacyRisk()  ──► PII regex patterns (SSN, phone, email, CC)
    ├──► scoreLegalRisk()    ──► liability, copyright, defamatory terms
    └──► scoreReputationalRisk() ──► negative sentiment, accusations
    │
    ▼
{ scores, overall, riskLevel, requiresReview }
```

---

## API Reference

### POST /score

Score single content item.

```javascript
// Request
{
  "content": "string",      // Required: text to analyze
  "options": {}             // Optional: scoring options
}

// Response
{
  "content": "...",        // Truncated to 100 chars
  "scores": {
    "factual": 0.0-1.0,
    "safety": 0.0-1.0,
    "privacy": 0.0-1.0,
    "legal": 0.0-1.0,
    "reputational": 0.0-1.0
  },
  "overall": 0.0-1.0,
  "riskLevel": "low|medium|high|critical",
  "requiresReview": boolean
}
```

### POST /score/batch

Score multiple content items.

```javascript
// Request
{
  "contents": ["string", ...],  // Required: array of texts
  "options": {}                  // Optional: scoring options
}

// Response
{
  "results": [...],             // Array of individual scores
  "summary": {
    "avgOverall": 0.0-1.0,
    "critical": number,
    "high": number,
    "medium": number,
    "low": number
  }
}
```

---

## Common Tasks

### Running the service

```bash
cd companies/HOJAI-AI/platform/trust/risk-scorer
npm install
npm run dev    # Development (auto-reload)
npm start      # Production
```

### Running tests

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

### Adding a new risk dimension

1. Add new type to `RISK_TYPES` object
2. Create `scoreNewRisk(content)` function
3. Add weight in `scoreRisk()` weights object
4. Add test coverage

Example:
```javascript
// In src/index.js
const RISK_TYPES = {
  // ... existing
  newRisk: 'new_risk_type'
};

function scoreNewRisk(content) {
  let risk = 0;
  // Implementation
  return Math.min(1, risk);
}

// Update scoreRisk to include new score
const scores = {
  // ... existing
  newRisk: scoreNewRisk(content)
};

// Update weights
const weights = { 
  // ... existing
  newRisk: 0.1 
};
```

### Integrating with content pipeline

```javascript
async function moderateContent(content) {
  const response = await fetch('http://localhost:4995/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  const risk = await response.json();
  
  if (risk.riskLevel === 'critical') {
    // Block and escalate
  } else if (risk.requiresReview) {
    // Queue for human review
  }
  
  return risk;
}
```

---

## Integration Points

### SADA OS (port 4190)

Risk scores can trigger SADA governance policies:
- Critical risk content → triggers compliance review
- High risk content → requires policy validation
- Medium/Low risk → auto-approved with logging

### Content Pipeline

Used by content moderation services before publishing:
- Healthcare OS - Medical content review
- Legal OS - Compliance checking
- Marketing OS - Ad content safety

### TwinOS Integration

Risk scores can be attached to content twins for historical tracking.

---

## Risk Thresholds

| Level | Score | requiresReview |
|-------|-------|----------------|
| Low | 0.0-0.29 | false |
| Medium | 0.3-0.49 | false |
| High | 0.5-0.69 | true |
| Critical | 0.7-1.0 | true |

---

## Development Notes

### Pattern Detection

The service uses regex patterns for risk detection. Key patterns include:

- **Unverified claims**: `/\b(could be|maybe|possibly|might be|believed to|thought to)/gi`
- **Unsourced stats**: `/\b\d+\s+(million|billion|people|percent|%)/gi` without citation
- **Dangerous content**: `/\b(how to make|instructions for|steps to create)\s+(bomb|weapon|explosive|poison|drug)/i`
- **PII patterns**: SSN, phone (10+ digits), email, credit card numbers

### Weights Customization

Default weights (30/30/20/10/10) can be overridden via `options` parameter:

```javascript
await fetch('/score', {
  body: JSON.stringify({
    content: text,
    options: {
      weights: { factual: 0.4, safety: 0.4, privacy: 0.1, legal: 0.05, reputational: 0.05 }
    }
  })
});
```

---

## Testing Strategy

Tests cover:
1. Individual scoring functions with various inputs
2. Risk level classification (low/medium/high/critical)
3. `requiresReview` flag logic
4. Batch processing summary calculations
5. Error handling (missing content, invalid input)

See `__tests__/unit/risk-scorer.test.js` for full test suite.
