# REZ MIND - Complete AI Intelligence System

**Date:** May 11, 2026  
**Version:** 2.0

---

## OVERVIEW

REZ Mind is the **central AI brain** of the entire ReZ platform. All AI services communicate through the AI Bus for bidirectional data flow.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REZ MIND                                   │
│                    One Source of Truth                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ TRAINING & INTELLIGENCE                                     │ │
│  │ • 25+ Intent Patterns                                       │ │
│  │ • 100+ FAQ Questions                                       │ │
│  │ • 15+ Objection Handlers                                    │ │
│  │ • 12 months Seasonal Promotions                             │ │
│  │ • 6 Customer Personalities                                  │ │
│  │ • Hinglish Pattern Support                                 │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ KNOWLEDGE BASE                                               │ │
│  │ • FAQ (100+ questions)                                       │ │
│  │ • Policy Documents                                           │ │
│  │ • Menu Information                                          │ │
│  │ • Pricing Rules                                             │ │
│  │ • Refund/Cancellation Policies                             │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ USER DATA                                                   │ │
│  │ • User Profiles                                             │ │
│  │ • Transaction History                                       │ │
│  │ • Karma Tier                                               │ │
│  │ • Wallet Balance                                           │ │
│  │ • Loyalty Segments                                         │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## CORE AI SERVICES (15+)

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| **REZ Support Copilot** | 4033 | Chat interface | ✅ Built |
| **Intent Graph** | 3007 | Intent capture & analysis | ✅ Built |
| **Intelligence Hub** | 4020 | User/business profiles | ✅ Built |
| **Intent Predictor** | - | ML predictions | ✅ Built |
| **Kitchen AI** | 4013 | Kitchen operations | ✅ Built |
| **Restaurant AI** | - | Restaurant ML | ✅ Built |
| **Personalization Engine** | 4017 | User-specific content | ✅ Built |
| **Recommendation Engine** | 4015 | Product suggestions | ✅ Built |
| **Targeting Engine** | 3013 | Ad targeting | ✅ Built |
| **Action Engine** | 3014 | Execute intents | ✅ Built |
| **Merchant Intelligence** | - | Business analytics | ✅ Built |
| **User Intelligence** | - | User profiling | ✅ Built |
| **Lead Intelligence** | - | Lead scoring | ✅ Built |
| **Error Intelligence** | - | Error tracking | ✅ Built |
| **Mind Hotel Service** | 4017 | Hotel-specific AI | ✅ Built |

---

## AI BUS INTEGRATION

### Package: `@rez/ai-bus`

Unified event bus for all AI services to communicate with REZ Mind.

### Event Flow
```
AI Service → AI Bus → REZ Mind → All Services
             ↑                      ↓
             └──────────────────────┘
                   (WebSocket)
```

### Connected Services

| Service | Status | Events Emitted | Events Received |
|---------|---------|----------------|----------------|
| **rez-kitchen-ai** | ✅ Connected | ORDER_RECEIVED, ORDER_COMPLETED | INSIGHT, COMMAND |
| **intent-graph** | 🔄 Todo | SEARCH, INTENT_DETECTED | RECOMMENDATION |
| **fraud-detection** | 🔄 Todo | FRAUD_DETECTED | ALERT |
| **recommendation-engine** | 🔄 Todo | CONVERSION, VIEW | PERSONALIZATION |
| **personalization-engine** | 🔄 Todo | SEGMENT_UPDATE | TARGETING |

---

## INTENT TYPES (25+)

| Intent | Description | Trigger |
|--------|-------------|---------|
| `order_food` | Food ordering | "order", "biryani", "pizza" |
| `book_service` | Reservations | "book", "appointment", "schedule" |
| `track_order` | Order tracking | "track", "where is my order" |
| `get_recommendations` | Product suggestions | "suggest", "recommend" |
| `check_balance` | Wallet queries | "balance", "how much" |
| `support_request` | Customer support | "help", "issue", "problem" |
| `refund_request` | Returns/refunds | "refund", "return", "cancel" |
| `search` | Product discovery | "find", "search", "look for" |
| `payment_issue` | Payment problems | "payment failed", "transaction error" |
| `complaint` | Complaints | "complaint", "worst", "terrible" |

---

## CUSTOMER PERSONALITIES (6)

| Personality | Behavior | Response Style |
|------------|-----------|----------------|
| **Bargain Hunter** | Price sensitive | Highlight savings |
| **Quality Seeker** | Premium preference | Emphasize quality |
| **Impulse Buyer** | Quick decisions | Urgency messaging |
| **Researcher** | Compares options | Detailed info |
| **Loyal Customer** | Repeat buyer | Reward recognition |
| **New Customer** | First-time | Onboarding flow |

---

## OBJECTION HANDLERS (15+)

| Objection | Handler |
|-----------|---------|
| Too expensive | Offer payment plans, highlight value |
| Need time | Create urgency, limited availability |
| Checking competition | Compare unique benefits |
| Bad experience | Empathy + compensation |
| Not available | Alternative suggestions |

---

## PSYCHOLOGICAL TRIGGERS

| Trigger | Application |
|---------|-------------|
| Scarcity | "Only 2 left" |
| Urgency | "Offer ends in 2 hours" |
| Social Proof | "500+ bought today" |
| Authority | "Recommended by chefs" |
| Reciprocity | "Free sample with order" |

---

## SEASONAL PROMOTIONS (12 months)

| Month | Campaign |
|-------|----------|
| January | New Year Sale |
| February | Valentine's Day |
| March | Holi Celebrations |
| April | Summer Start |
| May | Summer Sale |
| June | Gudi Padwa |
| July | Monsoon Relief |
| August | Independence Day |
| September | Festive Preview |
| October | Diwali Bonanza |
| November | Sale Season |
| December | Year End Sale |

---

## AI SERVICES BY VERTICAL

### Restaurant AI

| Service | Features |
|---------|----------|
| Kitchen AI | Order routing, prep time prediction |
| Intent Graph | Menu understanding, dietary preferences |
| Recommendation | Dish suggestions, combos |
| Personalization | User taste profile |

### Hotel AI

| Service | Features |
|---------|----------|
| Mind Hotel Service | Check-in, room service, housekeeping |
| Intent Predictor | Guest behavior prediction |
| Personalization | Preferences recall |

### Ad AI

| Service | Features |
|---------|----------|
| Targeting Engine | Demographics, location |
| Recommendation | Ad placement optimization |
| Fraud Detection | Click fraud, fake views |

---

## KNOWLEDGE BASE

### FAQ (100+ questions)

| Category | Count |
|----------|-------|
| Order Status | 25 |
| Payment Issues | 20 |
| Refunds | 15 |
| Menu/Products | 20 |
| Account | 20 |

### Policies Documented

| Policy | Coverage |
|--------|----------|
| Refund Policy | 100% |
| Cancellation | 100% |
| Delivery | 100% |
| Privacy | 100% |
| Terms | 100% |

---

## INTEGRATION POINTS

### Services Using REZ Mind (40+)

| Service | Integration |
|---------|-------------|
| `rez-app-consumer` | Chat, recommendations |
| `rez-app-merchant` | Order alerts, analytics |
| `rez-now` | Menu AI, suggestions |
| `rez-order-service` | Status updates |
| `rez-payment-service` | Transaction alerts |
| `rez-wallet-service` | Balance inquiries |
| `Hotel OTA` | Guest support |
| `AdBazaar` | Campaign optimization |

---

## DEPLOYMENTS

| Service | URL | Port |
|---------|-----|------|
| Support Copilot | `REZ-support-copilot.onrender.com` | 4033 |
| Intelligence Hub | `rez-intelligence-hub.onrender.com` | 4020 |
| Kitchen AI | Built | 4013 |
| Intent Graph | Built | 3007 |

---

## SECURITY

| Feature | Status |
|---------|--------|
| API Key Auth | ✅ |
| JWT Verification | ✅ |
| Rate Limiting | ✅ |
| Input Validation | ✅ Zod |
| Helmet | ✅ |
| CORS | ✅ Configured |

---

## DEVELOPMENT

### SDK: `@rez/ai-bus`

```typescript
import { createAIBus } from '@rez/ai-bus';

const bus = createAIBus({
  serviceName: 'my-service',
  REZ_MIND_URL: process.env.REZ_MIND_URL
});

// Emit event
bus.emit('order:created', { orderId, amount });

// Subscribe
bus.on('mind:recommendation', (data) => {
  console.log('Recommendation:', data);
});
```

---

**Last Updated:** May 11, 2026
