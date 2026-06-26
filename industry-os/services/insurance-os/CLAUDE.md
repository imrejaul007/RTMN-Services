# Insurance OS

**Port:** 5260  
**Status:** ✅ Built (June 26, 2026)

AI-Powered Insurance Platform: Risk assessment, policy management, claims processing, underwriting automation, and fraud detection.

## AI Agents (5)

| Agent | Purpose |
|-------|---------|
| Risk Assessment Agent | Property/motor/health/life risk evaluation |
| Claims Processing Agent | Claim intake, validation, settlement calculation |
| Underwriting Agent | Policy eligibility, premium calculation, terms determination |
| Fraud Detection Agent | Pattern recognition, anomaly detection, risk scoring |
| Customer Service Agent | Policy inquiries, coverage questions, support |

## Key Features

- **Risk Assessment**: Multi-line risk evaluation (property, motor, health, life, travel)
- **Claims Processing**: Automated intake, document verification, settlement calculation
- **Underwriting**: Eligibility assessment, pricing optimization, terms recommendation
- **Fraud Detection**: Pattern analysis, anomaly detection, investigation prioritization
- **Policy Management**: Policy creation, renewals, endorsements, cancellations

## Endpoints

```
POST /api/policies                    # Create policy
GET  /api/policies                    # List policies
POST /api/claims                      # File claim
GET  /api/claims/:id                  # Claim details
POST /api/underwriting/assess         # Assess risk
POST /api/quotes                      # Generate quote
POST /api/fraud/detect               # Detect fraud
GET  /api/analytics/claims            # Claims analytics
```

## Start

```bash
cd industry-os/services/insurance-os
npm start
# http://localhost:5260/health
```

## Dependencies

- express, cors, helmet, express-rate-limit
