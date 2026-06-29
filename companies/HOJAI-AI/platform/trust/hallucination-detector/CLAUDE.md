# Hallucination Detector - Service Documentation

**Port:** 4994
**Package:** `@hojai/hallucination-detector`
**Status:** Production Ready

## Service Overview

The Hallucination Detector is a rule-based service that identifies potential hallucinations in AI-generated text. It analyzes text for unsupported specificity, internal inconsistencies, overconfidence patterns, and ungrounded facts.

## Key Files

```
hallucination-detector/
├── src/
│   └── index.js          # Main service entry point
├── __tests__/
│   └── unit/
│       └── hallucination-detector.test.js  # Unit tests
├── vitest.config.js      # Test configuration
├── package.json          # Dependencies and scripts
├── README.md            # User-facing documentation
└── CLAUDE.md            # This file
```

## Architecture

The service is built on Express.js with the following detection modules:

### Core Functions (in `src/index.js`)

| Function | Purpose |
|----------|---------|
| `detectHallucinations(text, context)` | Main detection function - returns issues, score, and risk level |
| `extractNamedEntities(text)` | Extracts capitalized phrases as potential named entities |
| `checkConsistency(text)` | Detects internal contradictions (however+therefore, but+similarly, etc.) |
| `findUngroundedClaims(text)` | Identifies specific facts without evidence markers |
| `calculateHallucinationScore(issues, text)` | Computes normalized hallucination score (0-1) |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/detect` | Analyze single text for hallucinations |
| POST | `/detect/batch` | Analyze multiple texts, returns summary stats |
| GET | `/health` | Health check |

## Common Tasks

### Adding a New Detection Rule

1. Add the detection logic as a new function in `src/index.js`
2. Call the function within `detectHallucinations()` and push any issues to the `issues` array
3. Add weights in `calculateHallucinationScore()` if needed
4. Add tests for the new rule

Example:
```javascript
// In src/index.js
function detectNewPattern(text) {
  const issues = [];
  // Detection logic here
  if (condition) {
    issues.push({
      type: 'new_pattern',
      severity: 'medium',
      message: 'Description of the issue'
    });
  }
  return issues;
}

// In detectHallucinations(), add:
const newIssues = detectNewPattern(text);
issues.push(...newIssues);
```

### Adjusting Scoring Weights

Modify the weights in `calculateHallucinationScore()`:

```javascript
const weights = { high: 0.3, medium: 0.15, low: 0.05 };
```

### Adding a New Evidence Marker

In `findUngroundedClaims()`, update the evidence regex:

```javascript
const hasEvidence = claim.match(/\b(because|study|research|according|shown|demonstrated|NEW_MARKER)\b/i);
```

## Integration Points

| Service | Integration Method |
|---------|-------------------|
| **TrustOS** | Part of trust verification pipeline |
| **TwinOS** | Can be called from twin services for content validation |
| **AgentOS** | Agents can self-validate outputs before responding |
| **Verification Engine** | Complements source verification |

## Testing

### Running Tests

```bash
npm test          # Run all tests once
npm run dev       # Development mode (uses vitest --watch)
```

### Writing Tests

```javascript
import { describe, it, expect } from 'vitest';
import { detectHallucinations } from '../src/index.js';

describe('detectHallucinations', () => {
  it('should detect overconfidence in text', () => {
    const result = detectHallucinations('This always works 100% of the time.');
    expect(result.risk).toBe('high');
    expect(result.issues.some(i => i.type === 'overconfidence')).toBe(true);
  });
});
```

## Performance Notes

- Detection is synchronous and fast (< 10ms for typical text)
- Batch endpoint processes texts sequentially
- No external dependencies or API calls
- Memory usage scales with text length

## Security Considerations

- Input validation: text field is required, must be string
- No external network calls
- Rate limiting should be handled by gateway (not implemented in service)
- CORS enabled for cross-origin requests

## Related Services

- `verification-engine` (port 4991) - Source verification
- `source-tracker` (port 4992) - Source tracking
- `evidence-collector` (port 4993) - Evidence collection
- `confidence-scorer` (port 4995) - Confidence scoring
- `risk-scorer` (port 4996) - Risk scoring