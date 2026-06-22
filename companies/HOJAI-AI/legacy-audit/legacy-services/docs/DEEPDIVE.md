# HOJAI AI - Complete Technical Deep Dive

## What is HOJAI AI?

**HOJAI AI** = Operational intelligence platform that:
- Receives WhatsApp messages
- Understands intent
- Generates responses
- Enriches with REZ Intelligence
- Tracks analytics
- Respects privacy

## Complete Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HOJAI AI PLATFORM
│
│  ┌─────────────────────────────────────────────────┐
│  │ WhatsApp Webhook (Port 4570)
│  │ ├── Verify signatures
│  │ ├── Parse messages
│  │ └── Queue for processing
│  └───────────────────────────────────────────────┘
│                       │
│                       ▼
│  ┌─────────────────────────────────────────────────┐
│  │ Intent Engine
│  │ ├── Keyword matching
│  │ ├── Entity extraction
│  │ └── Confidence scoring
│  └───────────────────────────────────────────────┘
│                       │
│                       ▼
│  ┌──────────────────────────────────────────────┐
│  │ Knowledge Engine
│  │ ├── Q&A matching
│  │ ├── Business rules
│  │ └── Pricing/availability
│  └──────────────────────────────────────────┘
│                       │
│                       ▼
│  ┌──────────────────────────────────────────────┐
│  │ Response Generator
│  │ ├── Persona injection
│  │ ├── Language detection
│  │ └── Multi-format support
│  └──────────────────────────────────────────┘
│                       │
│                       ▼
│  ┌──────────────────────────────────────────┐
│  │ REZ Intelligence Bridge
│  │ ├── Emit signals
│  │ └── Receive enrichment
│  └──────────────────────────────────────────┘
│                       │
│           ┌───────────┴───────────┐
│           ▼                           ▼
│  ┌──────────────┐           ┌──────────────┐
│  │ WhatsApp    │           │ Admin Panel │
│  │ Response   │           │ Metrics    │
│  │ Template   │           │ Dashboard │
│  └────────────┘           └────────────┘
└─────────────────────────────────────────────────────┘
```

## Data Sources (16 Inputs)

### Direct Inputs

| Source | Data | Privacy |
|--------|------|----------|
| WhatsApp | Messages, calls | Tenant |
| Knowledge Base | Q&A, rules | Tenant |
| Session Redis | Context, memory | Tenant |
| Business Profile | Hours, pricing | Tenant |

### REZ Intelligence Inputs

| Source | Signal | Privacy |
|--------|--------|----------|
| RisaCare | Wellness metrics | Tier 3 |
| Commerce Apps | Purchase intent | Tier 1 |
| ReZ Ride | Commute patterns | Tier 1 |
| Airzy | Travel booking | Tier 2 |
| BuzzLocal | Hyperlocal behavior | Tier 1 |
| Karma | Social impact | Tier 2 |
| rendez | Relationship graph | Tier 3 |
| CorpPerks | Employment data | Tier 2 |
| RidZa | Transactions | Tier 3 |
| REZ Card | Spending patterns | Tier 1 |
| PeopleOS | Workforce data | Tier 2 |
| StayOwn | Stay preferences | Tier 1 |
| RisnaEstate | Property views | Tier 2 |
| Cosmic OS | Birth charts | Tier 1 |
| Insights Campus | Student behavior | Tier 2 |
| Z Events | Event attendance | Tier 1 |
| REZ Merchant | Business ops | Tenant |

## Complete Data Flow

```
WhatsApp Customer Message
    │
    ├── Verify HMAC signature
    │
    ├── Parse message (text, media, location)
    │
    ├── Queue to Redis
    │
    ├── Detect intent
    │   ├── Keyword matching
    │   ├── Entity extraction
    │   └── Confidence scoring
    │
    ├── Match knowledge base
    │   ├── Q&A lookup
    │   ├── Rule matching
    │   └── Fallback response
    │
    ├── Generate response
    │   ├── Inject persona
    │   ├── Format template
    │   └── Localize
    │
    ├── Emit to REZ
    │   ├── Strip PII
    │   └── Publish signal
    │
    ├── Store conversation
    │   ├── MongoDB persistence
    │   └── Redis session update
    │
    ├── Track metric
    │   └── Analytics pipeline
    │
    └── Send WhatsApp template
        └── Delivery confirmation
```

## Complete Feature List

### Core Features

| Feature | Implementation |
|---------|----------------|
| WhatsApp webhook | Express + HMAC verification |
| Intent detection | Keyword + ML routing |
| Knowledge base | MongoDB + Redis cache |
| Session memory | Redis TTL sessions |
| Response generation | GPT-4 mini + prompts |
| Multi-language | i18n + translation |
| Analytics | Real-time metrics |
| Tenant isolation | Schema + query scoping |
| Rate limiting | Token bucket per tenant |
| Webhook security | HMAC + IP allowlist |

### Advanced Features

| Feature | Implementation |
|---------|----------------|
| Cross-app enrichment | REZ signal API |
| Churn prediction | REZ ML models |
| LTV scoring | REZ Intelligence |
| Segment mapping | REZ Identity Graph |
| Consent management | Per-data-type flags |
| Data export | GDPR compliance |
| Session replay | Conversation context |
| A/B testing | Feature flags |

## Training Pipeline

```
Raw Data
    │
    ├── INGRESS
    │   ├── WhatsApp messages
    │   ├── Knowledge base
    │   └── REZ signals
    │
    ├── PROCESSING
    │   ├── Label intents
    │   ├── Extract entities
    │   ├── Score confidence
    │   └── Classify feedback
    │
    ├── ENRICH
    │   ├── REZ segments
    │   ├── Cross-app patterns
    │   └── Persona mapping
    │
    └── DEPLOY
        ├── Model versioning
        ├── Gradual rollout
        └── Monitoring dashboards
```

## Feedback Loop

```
Customer Interaction
    │
    ├── Positive signal
    │   ├── Thumbs up
    │   ├── Repeated query
    │   └── Conversion
    │
    ├── Negative signal
    │   ├── Thumbs down
    │   ├── Escalation
    │   └── Silence
    │
    └── Model update
        ├── Fine-tune prompts
        ├── Adjust weights
        └── Knowledge base sync
```

## REZ Intelligence Connection

```
┌─────────────────────────────────────────────────────┐
│                   REZ INTELLIGENCE
│
│  Inputs (16 sources)
│  ├── Commerce signals
│  ├── Mobility patterns
│  ├── Health metrics
│  ├── Financial data
│  └── Social graphs
│
│  Processing
│  ├── Identity resolution
│  ├── Signal aggregation
│  └── ML predictions
│
│  Outputs
│  ├── LTV scores
│  ├── Churn risk
│  ├── Segments
│  └── Behavioral patterns
└─────────────────────────────────────────────────┘
    │
    │
    ▼
┌─────────────────────────────────────────────────┐
│               HOJAI AI ENRICHMENT
│
│  Input
│  ├── User message
│  ├── Merchant context
│  └── Business rules
│
│  Enrichment
│  ├── Customer tier
│  ├── Spending capacity
│  ├── Churn risk
│  └── Life stage
│
│  Output
│  ├── Personalized response
│  ├── Priority routing
│  └── Offer selection
└──────────────────────────────────────────────┘
```

## Complete Function Reference

### Webhook Handler

```typescript
verifyWebhook(mode, token, challenge) → boolean
parseMessage(payload) → Message
queueForProcessing(message) → void
```

### Intent Engine

```typescript
classifyIntent(text) → Intent
extractEntities(text) → Entities
scoreConfidence(intent) → number
routeIntent(intent) → Handler
```

### Knowledge Engine

```typescript
match(query) → Answer[]
rank(answers) → TopK
formatAnswer(template, context) → string
applyPersona(text, merchant) → string
```

### REZ Bridge

```typescript
emitSignal(type, data) → void
fetchEnrichment(userId) → Enrichment
trackCrossApp(userId, signal) → void
```

### Session Manager

```typescript
getSession(userId) → Context
updateContext(userId, updates) → void
expireSession(userId) → void
```

## Privacy Implementation

### Tier 1: Essential
```
Login, auth, basic features
Implicit consent
```

### Tier 2: Personalization
```
Recommendations, offers
Opt-in consent
```

### Tier 3: Sensitive
```
Health, finances, relationships
Explicit consent + encryption
```

### Tenant Isolation

```typescript
// Every query scoped
await Model.find({
  tenantId: req.tenantId,
  merchantId: req.merchantId
});
```

## Complete Output Reference

### WhatsApp Response

| Type | Template |
|------|----------|
| Text | Dynamic prompts |
| Buttons | Interactive |
| Lists | Catalog browsing |
| Media | Rich cards |

### Analytics Dashboard

| Metric | Frequency |
|---------|-----------|
| Messages/min | Real-time |
| Resolution rate | Hourly |
| Cost tracking | Per-call |

### REZ Signals

| Signal | Purpose |
|---------|---------|
| engagement.buy | Commerce intent |
| mobility.commute | Transit patterns |
| wellness.tracking | Health context |
| finance.assess | Capacity signals |

## Deployment

```bash
# Quick start
docker-compose up -d

# Production
railway deploy
# Configure env vars
# Set up MongoDB + Redis
# Connect WhatsApp Business API
```

## Complete Status

| Component | Status |
|-----------|--------|
| WhatsApp webhook | Built |
| Intent engine | Built |
| Knowledge base | Built |
| Session manager | Built |
| REZ bridge | Built |
| Analytics | Built |
| Admin panel | Built |
| Consent UI | Built |
| CI/CD | Built |

**HOJAI AI is production-ready.**
