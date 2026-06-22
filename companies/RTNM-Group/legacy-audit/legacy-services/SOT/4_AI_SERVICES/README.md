# AI Services - Source of Truth v2.0

**Last Updated:** May 11, 2026
**Total AI Services:** 29+

---

## Overview

The ReZ platform includes 29+ AI/ML services for intelligent automation, prediction, personalization, and decision-making.

## Complete AI/ML Service Directory

### Core Intelligence Services (14)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| **Intent Graph** | 3001 | rez-intent-graph | Cross-app intent tracking & AI agents | Active |
| **Intelligence Hub** | 4020 | rez-intelligence-hub | Unified profiles + Voice AI | Active |
| **Intent Predictor** | 4018 | rez-intent-predictor | Real-time user intent scoring | Active |
| **Intent Service** | 4009 | rez-intent-service | Intent signal capture & agents | Active |
| **Lead Intelligence** | 4014 | rez-lead-intelligence | Hot/Warm/Cold lead detection | Active |
| **User Intelligence** | 3016 | rez-user-intelligence-service | User behavior tracking | Active |
| **Merchant Intelligence** | 3015 | rez-merchant-intelligence-service | Merchant analytics | Active |
| **Insights Service** | 3011 | rez-insights-service | AI-powered insights management | Active |
| **ML Model Registry** | 3001 | rez-ml-model-registry | ML model versioning | Active |
| **ML Feature Store** | 3005 | rez-ml-feature-store | Feature serving for ML | Active |
| **ML Engine** | - | rez-ml-engine | ML model training pipeline | Partial |
| **ML** | - | rez-ml | ML utilities | Active |
| **Training Data Service** | - | rez-training-data-service | Training data management | Stub |
| **Identity Graph** | - | rez-identity-graph | User identity resolution | Active |

### Decision & Action Services (10)

| Service | Git Path | Purpose | Status |
|---------|----------|---------|--------|
| **Decision Service** | rez-decision-service | Decision engine | Active |
| **Action Engine** | rez-action-engine | Action triggers | Active |
| **Recommendation Engine** | rez-recommendation-engine | Product recommendations | Active |
| **Price Optimization** | rez-price-optimization-service | Dynamic pricing | Active |
| **Error Intelligence** | rez-error-intelligence | Error tracking & prevention | Active |
| **Targeting Engine** | rez-targeting-engine | Ad targeting | Active |
| **Attribution Engine** | REZ-attribution-system | Attribution tracking | Active |
| **Experimentation Engine** | rez-experimentation-engine | A/B testing | Active |
| **A/B Testing Service** | rez-ab-testing-service | Experiment platform | Active |
| **Personalization Engine** | rez-personalization-engine | Personalized content | Active |

### Copilot & Assistant Services (6)

| Service | Git Path | Purpose | Status |
|---------|----------|---------|--------|
| **REZ Mind (Support)** | REZ-support-copilot | Support AI copilot | Active |
| **Copilot** | rez-copilot | General AI copilot | Active |
| **Merchant Copilot** | rez-merchant-copilot | Merchant AI assistant | Active |
| **Consumer Copilot** | rez-consumer-copilot | Consumer AI assistant | Active |
| **Ad Copilot** | rez-copilot | Ad campaign AI | Active |
| **AI Platform** | rez-ai-platform | AI orchestration | Active |

### Voice & Communication AI (5)

| Service | Git Path | Purpose | Status |
|---------|----------|---------|--------|
| **Voice AI** | rez-ai-voice | Voice processing | Active |
| **Intelligence Hub Voice** | rez-intelligence-hub | Voice integration | Active |
| **Restaurant Voice** | rez-ai-restaurant | Restaurant voice orders | Active |
| **Salon/Fitness Voice** | rez-ai-salon-fitness | Healthcare voice | Active |
| **Mind Hotel Voice** | rez-mind-hotel-service | Hotel voice assistant | Active |

### Vertical AI Services (8)

| Service | Git Path | Vertical | Purpose |
|---------|----------|----------|---------|
| **Restaurant AI** | rez-ai-restaurant | Restaurant | Restaurant intelligence |
| **Hotel Mind** | rez-mind-hotel-service | Hospitality | Hotel AI assistant |
| **Salon/Fitness AI** | rez-ai-salon-fitness | Healthcare | Healthcare AI |
| **Travel AI** | rez-travel-service | Travel | Travel intelligence |
| **Ad AI** | rez-ad-ai | Advertising | Ad optimization |
| **Fraud Detection** | rez-fraud-detection-service | Finance | Fraud prevention |
| **Retail AI** | rez-price-optimization-service | Retail | Retail optimization |
| **Delivery AI** | rez-economic-engine | Delivery | Delivery optimization |

### Knowledge & Data Services (6)

| Service | Git Path | Purpose | Status |
|---------|----------|---------|--------|
| **Knowledge Base** | rez-knowledge-base-service | KB management | Active |
| **Knowledge Service** | rez-knowledge-service | Knowledge queries | Active |
| **Data Pipeline** | rez-data-pipeline | ETL pipeline | Active |
| **Customer 360** | rez-customer-360 | 360-degree view | Active |
| **Cohort Service** | rez-cohort-service | Cohort analysis | Active |
| **Journey Service** | rez-journey-service | User journeys | Active |

### AI Plugins & Extensions (2)

| Service | Git Path | Purpose |
|---------|----------|---------|
| **AI Plugins** | rez-ai-plugins | AI extensions |
| **ML Feature Store** | rez-ml-feature-store | Feature serving |

---

## Intent Categories

The Intent Predictor supports these categories:

| Intent | Description | Trigger Action |
|--------|-------------|----------------|
| `ready_to_buy` | User ready to purchase | Show checkout |
| `just_browsing` | Casual browsing | Light engagement |
| `research_mode` | Comparison shopping | Show comparisons |
| `deal_hunting` | Looking for discounts | Show offers |
| `loyalty_checking` | Checking rewards | Show karma points |
| `cart_abandonment_risk` | High abandonment risk | Send reminder |
| `reactivation_needed` | Dormant user | Win-back campaign |
| `high_value_opportunity` | High-value customer | VIP treatment |
| `impulse_buy_signals` | Impulse purchase indicators | Flash sale |
| `subscription_ready` | Ready for subscription | Show plans |

---

## Push Notification Triggers

AI services trigger push notifications based on intent:

| Trigger | Intent | Action |
|---------|--------|--------|
| High-value opportunity | `high_value_opportunity` | Promotional offers |
| Cart abandonment | `cart_abandonment_risk` | Reminder notifications |
| Win-back | `reactivation_needed` | Win-back campaigns |
| Flash sale | `deal_hunting` | Flash sale alerts |
| Subscription | `subscription_ready` | Plan recommendations |
| Loyalty check | `loyalty_checking` | Points summary |

---

## Voice AI Integration

The Intelligence Hub integrates with Twilio for:

| Capability | Description |
|------------|-------------|
| Voice Order Processing | Natural language ordering |
| Text-to-Speech | Voice responses |
| Voice Webhooks | Twilio integration |
| Restaurant Voice | Menu navigation |
| Hotel Voice | Booking assistance |
| Healthcare Voice | Appointment booking |

### Supported Voice Flows

1. **Restaurant**: "Order pizza from Dominos" -> AI processes -> Order created
2. **Hotel**: "Book a room for tomorrow" -> AI processes -> Reservation created
3. **Healthcare**: "Book appointment with Dr. Smith" -> AI processes -> Booking created

---

## ML Pipeline

```
Data Collection -> Feature Engineering -> Model Training ->
Model Registry -> Feature Store -> Inference -> Insights -> Actions
```

### Components

| Stage | Service | Description |
|-------|---------|-------------|
| Data Collection | Training Data Service | Collects and prepares data |
| Feature Engineering | ML Feature Store | Feature preparation |
| Model Training | ML Engine | Trains models |
| Model Versioning | ML Model Registry | Versions and stores models |
| Feature Serving | ML Feature Store | Serves features for inference |
| Inference | Intent Predictor, etc. | Real-time predictions |
| Insights | Insights Service | Generates actionable insights |
| Actions | Action Engine, Notification | Executes actions |

---

## Intent Graph Architecture

The Intent Graph service maintains cross-app user intent:

```
┌─────────────────────────────────────────────────────────────┐
│                    INTENT GRAPH                              │
├─────────────────────────────────────────────────────────────┤
│  User 1 ─── Intent A ───> Service 1                        │
│      │          │                                           │
│      │          └──> Service 2                              │
│      │                                                      │
│      └──> Intent B ───> Service 3                           │
│                                                              │
│  Signals: clicks, searches, views, purchases, abandonment   │
└─────────────────────────────────────────────────────────────┘
```

### Intent Graph Features

- Cross-app intent tracking
- Real-time signal processing
- User profile enrichment
- Personalized recommendations
- Predictive analytics

---

## Lead Intelligence

Scoring based on behavior:

| Score | Tier | Action |
|-------|------|--------|
| 80-100 | Hot | Immediate outreach |
| 50-79 | Warm | Nurture campaign |
| 0-49 | Cold | Long-term engagement |

---

## AI Service Ports

| Service | Port | Protocol |
|---------|------|----------|
| Intent Graph | 3001 | REST + WebSocket |
| Intelligence Hub | 4020 | REST + gRPC |
| Intent Predictor | 4018 | REST |
| Intent Service | 4009 | REST |
| Lead Intelligence | 4014 | REST |
| User Intelligence | 3016 | REST |
| Merchant Intelligence | 3015 | REST |
| Insights Service | 3011 | REST |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API |
| `ANTHROPIC_API_KEY` | Anthropic API |
| `TWILIO_*` | Twilio config |
| `INTENT_GRAPH_URL` | Intent Graph endpoint |
| `ML_MODEL_REGISTRY_URL` | ML Registry endpoint |
| `FEATURE_STORE_URL` | Feature Store endpoint |

---

## Related Documentation

- [Common Services](../1_COMMON_SERVICES/README.md)
- [Verticals](../2_VERTICALS/README.md)
- [Full AI Audit](../../AUDIT-AI-SERVICES.md)

---

**Last Updated:** May 11, 2026
**Maintained By:** Claude Code
