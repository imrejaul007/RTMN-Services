# Identity Twin

**Service:** Digital Twin
**Port:** 4702 (via gateway)
**Prefix:** `/api/twin`

---

## Overview

The Identity Twin service creates a digital twin of user identity for simulation, prediction, and analysis. It aggregates data from all CorpID services to create a comprehensive virtual representation.

## Features

- **Digital Twin Creation:** Synthesized from all identity data
- **Profile Aggregation:** Demographics, psychographics, technographics
- **Behavior Tracking:** Login patterns, purchase patterns, communication
- **Relationship Mapping:** Strongest, frequent, recent connections
- **Preference Inference:** Explicit and inferred preferences with confidence
- **Predictions:** Churn risk, upsell potential, lifetime value
- **State Tracking:** Health, risk, engagement, satisfaction
- **Simulations:** What-if scenarios for decision making
- **Version Control:** Track changes to twin data

## Twin Data Structure

```
Identity Twin
├── Profile
│   ├── Demographics (country, city, timezone, language)
│   ├── Psychographics (interests, tier, engagement)
│   └── Technographics (device usage, connectivity)
├── Behaviors
│   ├── Login Patterns
│   ├── Purchase Patterns
│   ├── Communication Patterns
│   └── Risk Patterns
├── Relationships
│   ├── Strongest
│   ├── Frequent
│   └── Recent
├── Preferences
│   ├── Explicit (user-stated)
│   ├── Inferred (AI-derived)
│   └── Confidence scores
├── State
│   ├── Health (0-100)
│   ├── Risk (0-100)
│   ├── Engagement (0-100)
│   └── Satisfaction (0-100)
└── Predictions
    ├── Churn Risk
    ├── Upsell Potential
    ├── Engagement Forecast
    └── Lifetime Value
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/twin/me` | Get my identity twin |
| POST | `/api/twin/me/refresh` | Refresh from sources |
| PUT | `/api/twin/me` | Update twin manually |
| POST | `/api/twin/me/simulate` | Run simulation |
| GET | `/api/twin/me/predictions` | Get predictions |
| GET | `/api/twin/me/profile` | Get twin profile |
| GET | `/api/twin/me/behaviors` | Get behaviors |
| GET | `/api/twin/user/:userId` | Get user twin (admin) |
| GET | `/api/twin/stats` | Statistics (admin) |
| GET | `/api/twin/simulations/:id` | Get simulation result |

## Simulation Types

### Price Change
Simulates impact of price changes on lifetime value and churn.
```json
{
  "name": "10% Price Increase",
  "type": "price_change",
  "parameters": {
    "priceChange": 0.1
  }
}
```

### Engagement Campaign
Simulates impact of marketing campaigns.
```json
{
  "name": "Q4 Engagement Push",
  "type": "engagement_campaign",
  "parameters": {}
}
```

### Tier Upgrade
Simulates impact of upgrading customer tier.
```json
{
  "name": "Silver to Gold Upgrade",
  "type": "tier_upgrade",
  "parameters": {}
}
```

## Usage Example

```bash
# Get my twin
curl http://localhost:4702/api/twin/me \
  -H "Authorization: Bearer $TOKEN"

# Refresh from latest data
curl -X POST http://localhost:4702/api/twin/me/refresh \
  -H "Authorization: Bearer $TOKEN"

# Run engagement campaign simulation
curl -X POST http://localhost:4702/api/twin/me/simulate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q4 Push",
    "type": "engagement_campaign"
  }'
```

Response:
```json
{
  "success": true,
  "simulation": {
    "id": "sim-abc",
    "scenario": "Q4 Push",
    "baseline": {
      "churnRisk": 30,
      "ltv": 5000,
      "satisfaction": 70,
      "engagement": 60
    },
    "projected": {
      "churnRisk": 15,
      "ltv": 6000,
      "satisfaction": 70,
      "engagement": 80
    },
    "changes": {
      "engagement": 20,
      "churnRisk": -15,
      "ltv": 1000
    },
    "confidence": 0.7
  }
}
```

## Prediction Calculations

### Churn Risk
```
Base: 30%
+ Days since last activity (>30 days: +30%, >14 days: +15%)
+ Low activity count (<3: +10%)
+ Low trust score (<40: +20%)
Max: 100%
```

### Upsell Potential
```
Base: 20%
+ Tier bonus (Silver: +30%, Gold: +20%)
+ High activity (>10: +15%)
+ High trust (>70: +15%)
Max: 100%
```

### Lifetime Value
```
Base LTV × Tier Multiplier
- Bronze: 1.0x
- Silver: 1.5x
- Gold: 2.0x
- Platinum: 3.0x
```

## File Structure

```
twin/
├── src/
│   ├── models/
│   │   └── twin.model.js
│   └── routes/
│       └── twin.routes.js
└── CLAUDE.md
```
