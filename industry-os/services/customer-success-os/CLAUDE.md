# Customer Success OS - Developer Context

## Overview

Customer Success OS (port 4050) manages customer lifecycle from onboarding to churn prevention.

## Models

| Model | Purpose |
|-------|---------|
| CustomerSuccess | Customer profiles |
| OnboardingJourney | Welcome flows |
| NPSSurvey | Net Promoter Score |
| HealthScore | Customer health metrics |
| ChurnPrediction | Risk analysis |
| CheckIn | Scheduled touchpoints |
| Touchpoint | Engagement tracking |

## Key Features

### Customer Lifecycle Stages
```
prospect → onboarding → active → expansion → churn_risk → churn
```

### Health Score Factors
- NPS Score (30%)
- Engagement (25%)
- Product Adoption (25%)
- Support Response Rate (20%)

### Churn Risk Indicators
- Low NPS (<7)
- Poor health (<50)
- Stalled onboarding (<50% progress)
- Inactivity (>7 days)

## Integration Points

| Service | Port | Connection |
|---------|------|------------|
| Sales OS | 5055 | Lead handoff |
| Marketing OS | 5500 | Campaigns |
| REZ Care | 4055 | Support tickets |
| CorpID | 4702 | User identity |

## Environment

```
PORT=4050
JWT_SECRET=<secret>
```

*Last Updated: June 17, 2026*
