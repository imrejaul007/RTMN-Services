# REZ Trust Scorer Features

Comprehensive feature list for the RABTUL Trust Scorer (Port 4180).

## 1. Trust Score Calculation

### 25/25/25/25 Weighted Formula

The trust score is calculated using four equally weighted components:

#### Credit History (25%)
| Sub-Factor | Weight | Calculation |
|------------|--------|-------------|
| Account Age | 40% | (days / 365) * 1000, capped at 1000 |
| Transaction Volume | 30% | log10(volume + 1) * 200, capped at 1000 |
| Transaction Count | 20% | (count / 100) * 1000, capped at 1000 |
| Diversity | 10% | (types / 10) * 1000 |

#### Payment History (25%)
| Sub-Factor | Weight | Calculation |
|------------|--------|-------------|
| On-Time Rate | 50% | (onTime / total) * 1000 |
| Avg Payment Time | 30% | 500 + (daysEarly * 20), clamped 0-1000 |
| Payment Diversity | 20% | Bonus for multiple payment methods |

#### Dispute Rate (25%) - Inverse
| Sub-Factor | Weight | Calculation |
|------------|--------|-------------|
| Dispute Rate | 60% | 1000 * (1 - disputeRate * 10), min 0 |
| Resolution Rate | 30% | (won / totalDisputes) * 1000 |
| Severity | 10% | 1000 - (avgDisputeValue / 10) |

#### Delivery Success (25%)
| Sub-Factor | Weight | Calculation |
|------------|--------|-------------|
| Success Rate | 50% | (successful / total) * 1000 |
| On-Time Rate | 30% | onTimeRate * 1000 |
| Return Rate | 20% | 1000 * (1 - returnRate * 5), min 0 |

## 2. Trust Tiers

| Tier | Score | Color | Badge |
|------|-------|-------|-------|
| Excellent | 850-1000 | 🟢 Green | Trusted Elite |
| Good | 700-849 | 🔵 Blue | Trusted |
| Fair | 550-699 | 🟡 Yellow | Standard |
| Poor | 400-549 | 🟠 Orange | Caution |
| Untrusted | 0-399 | 🔴 Red | Restricted |

## 3. Trust Events

### Payment Events
- `payment_completed`: Successful on-time payment
- `payment_late`: Payment made after due date
- `payment_failed`: Payment failed

### Dispute Events
- `dispute_opened`: Formal dispute filed
- `dispute_resolved`: Dispute resolved in entity's favor
- `dispute_lost`: Dispute resolved against entity

### Delivery Events
- `delivery_completed`: Delivery successful
- `delivery_failed`: Delivery failed
- `delivery_returned`: Item returned

### Verification Events
- `verification_completed`: Identity/account verified
- `review_received`: Review received (with rating)

### SLA Events
- `sla_met`: SLA target achieved
- `sla_breached`: SLA target missed

### Contract Events
- `contract_completed`: Contract fulfilled
- `contract_breached`: Contract terms violated

## 4. Bonus and Penalty System

### Bonuses
| Bonus | Max Points | Condition |
|-------|-----------|-----------|
| Verification | +25 | Account verified |
| Review | +20 | Average rating > 4 |
| SLA | +15 | 100% SLA compliance |

### Penalties
| Penalty | Max Points | Condition |
|---------|-----------|-----------|
| Dispute | -50 | 10+ disputes |
| Late Payment | -30 | 10+ late payments |
| Failed Delivery | -30 | 6+ failed deliveries |

## 5. Score Breakdown

Each trust calculation provides detailed breakdown:
- Raw scores for each of 4 components
- Weighted scores (25% each)
- Sub-factor values
- Bonus application
- Penalty application
- Final normalized score (0-1000)

## 6. Event-Driven Updates

Trust scores can be updated via:
- Direct API calls (`POST /events`)
- Event Bus subscriptions
- Automatic recalculation on factor changes

## 7. Comparison and Ranking

- Compare up to N entities
- Rank by trust score
- Show tier and score for each

## 8. Audit Trail

All trust changes logged with:
- Previous score
- New score
- Change delta
- Reason/cause
- Timestamp
- Performed by

## 9. Integration with SUTAR OS Layers

### Upstream (provides signals)
- **Economy (4251):** Payment events, transaction volumes
- **SLA Monitor (4195):** SLA breach events
- **Breach Detector (4196):** Contract breach events
- **Negotiation (4191):** Deal completion events

### Downstream (consumes scores)
- **Decision Engine (4240):** Authorization decisions
- **Negotiation (4191):** Negotiation terms
- **Economy (4251):** Credit scoring inputs
- **Contract:** Terms based on trust tier
- **Discovery (4256):** Agent matching by trust

## 10. Configuration

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4180 | Service port |
| `NODE_ENV` | development | Environment |
| `EVENT_BUS_URL` | http://localhost:4510 | Event bus URL |
| `EVENT_BUS_ENABLED` | true | Enable events |
| `ECONOMY_OS_URL` | http://localhost:4251 | Economy OS URL |
| `LOG_LEVEL` | info | Logging level |

### Trust Weights
- `creditHistory`: 0.25
- `paymentHistory`: 0.25
- `disputeRate`: 0.25
- `deliverySuccess`: 0.25

### Tier Thresholds
- Excellent: 850
- Good: 700
- Fair: 550
- Poor: 400
