# REZ Intelligence + Hojai AI Architecture

## The Vision

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THE INTELLIGENCE NETWORK                        │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────────┐
                         │   REZ INTELLIGENCE   │
                         │   (The Brain)        │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
           ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
           │ REZ Ecosystem│  │    HOJAI     │  │   External   │
           │    Apps     │  │      AI      │  │  Merchants   │
           └──────────────┘  └──────────────┘  └──────────────┘
                 │                  │                  │
                 └──────────────────┴──────────────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                       │
                         ▼                       ▼
              ┌──────────────────┐    ┌──────────────────┐
              │   REZ INTELLIGENCE│    │   REZ INTELLIGENCE│
              │  (Enrichment)    │    │  (New Training)   │
              └──────────────────┘    └──────────────────┘
```

## Data Flow

### 1. REZ Ecosystem → REZ Intelligence

All REZ-owned apps send data to REZ Intelligence:

```
REZ Apps ──► REZ Intelligence
│
├── RisaCare ──► Health signals
├── ReZ Ride ──► Mobility signals
├── Airzy ──────► Travel signals
├── BuzzLocal ──► Local signals
├── Karma ──────► Social impact
├── Rendez ─────► Relationship graph
├── RidZa ──────► Finance signals
├── CorpPerks ──► Employment data
└── ... (all apps)
```

### 2. REZ Intelligence → Hojai AI

REZ Intelligence processes and sends enriched insights to Hojai:

```
REZ Intelligence ──► Hojai AI
│
├── User segments
├── LTV scores
├── Churn risk
├── Travel intent
├── Spending patterns
├── Life stage changes
└── Cross-app behavior
```

### 3. External Merchants → Hojai AI

Non-REZ businesses connect directly to Hojai:

```
External Merchants ──► Hojai AI
│
├── Salon Magic (WhatsApp)
├── Cafe Rosso (WhatsApp)
├── Clinic Plus (WhatsApp)
├── Retail Store (WhatsApp)
└── ... (all SMBs)
```

### 4. Hojai AI → REZ Intelligence

Hojai AI sends signals back to enrich REZ Intelligence:

```
Hojai AI ──► REZ Intelligence
│
├── Commerce behaviors
├── Merchant insights
├── Local patterns
├── SMB trends
└── New user signals
```

## The Virtuous Cycle

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│   More Merchants on Hojai = More Training Data            │
│                    │                                      │
│                    ▼                                      │
│         REZ Intelligence Gets Smarter                     │
│                    │                                      │
│                    ▼                                      │
│         Better Insights for Hojai                         │
│                    │                                      │
│                    ▼                                      │
│         Better AI for Merchants                           │
│                    │                                      │
│                    ▼                                      │
│            More Merchants Join                            │
│                    │                                      │
│                    └──────────────────────────────────► 🔄│
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Why This Works

### REZ Intelligence Benefits

| From | Gets |
|-----|------|
| REZ Apps | Deep behavioral data |
| Hojai Merchants | SMB trends, commerce patterns, local insights |
| Both | Training data for better AI |

### Hojai AI Benefits

| From | Gets |
|------|------|
| REZ Intelligence | User enrichment, segments, predictions |
| Direct Merchants | Training data, use cases |
| REZ Apps | Cross-app signals |

### Merchant Benefits

| From | Gets |
|-------|------|
| Hojai AI | AI employee, automation |
| REZ Intelligence | User insights, targeting |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REZ ECOSYSTEM                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │RisaCare│ │ReZ Ride│ │  Airzy  │ │ BuzzLocal│ │ Karma  │           │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
│       │           │           │           │           │                  │
│       └───────────┴─────┬─────┴───────────┴───────────┘                  │
│                         │                                                  │
│                         ▼                                                  │
│              ┌──────────────────────┐                                      │
│              │   REZ INTELLIGENCE   │                                      │
│              │                      │                                      │
│              │  • Identity Graph    │                                      │
│              │  • Behavior Analysis │                                      │
│              │  • Predictions      │                                      │
│              │  • Segments         │                                      │
│              │  • Cross-App Signals│                                      │
│              └──────────┬───────────┘                                      │
│                         │                                                  │
│                         │ Enrichment                                       │
│                         ▼                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                         EXTERNAL WORLD                                    │
│                         │                                                  │
│                         ▼                                                  │
│              ┌──────────────────────┐                                      │
│              │       HOJAI AI       │                                      │
│              │                      │                                      │
│              │  • WhatsApp AI       │                                      │
│              │  • Merchant Onboarding│                                      │
│              │  • Knowledge Base    │                                      │
│              │  • Sessions          │                                      │
│              └──────────┬───────────┘                                      │
│                         │                                                  │
│       ┌─────────────────┴─────────────────┐                                │
│       │                                   │                                │
│       ▼                                   ▼                                │
│  ┌──────────────┐               ┌──────────────┐                         │
│  │  REZ INTEL. │               │ EXTERNAL     │                         │
│  │  (Signals)  │               │ MERCHANTS    │                         │
│  └──────────────┘               └──────────────┘                         │
│       ▲                                   │                                │
│       │                                   │                                │
│       └───────────────────────────────────┘                                │
│                     Feedback Loop                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Privacy Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    CONSENT FRAMEWORK                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  REZ ECOSYSTEM DATA                                       │
│  ├── User consents in each app                             │
│  ├── Tiers: Basic → Personalization → Sensitive           │
│  └── REZ Intelligence processes internally                │
│                                                            │
│  HOJAI AI DATA                                            │
│  ├── Merchant-scoped (tenant isolation)                   │
│  ├── User consents via WhatsApp                          │
│  └── Signals shared with REZ (anonymized)                │
│                                                            │
│  BRIDGE SECURITY                                          │
│  ├── PII stripped before sharing                         │
│  ├── Aggregate signals only                               │
│  └── Audit logging on all transfers                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Technical Implementation

### Signal Flow

```typescript
// 1. REZ App emits signal
REZ_APP.emit('commerce.purchase', { userId, product, amount });

// 2. REZ Intelligence processes
REZ_INTELLIGENCE.processSignal(event);
// Updates: identity graph, segments, predictions

// 3. REZ Intelligence sends enrichment to Hojai
REZ_INTELLIGENCE.sendToHojai({
  userId,
  segments: ['traveler', 'premium'],
  ltv: 50000,
  churnRisk: 0.2
});

// 4. Hojai AI uses enrichment
HOJAI.enrichContext(enrichment);
// "User is premium traveler" → better response

// 5. Hojai sends signals back
HOJAI.emitSignal({
  source: 'merchant',
  type: 'engagement',
  data: { intent: 'booking' }
});

// 6. REZ Intelligence learns from Hojai
REZ_INTELLIGENCE.processExternalSignal(signal);
// Updates: SMB trends, local patterns
```

## Value Proposition

| Stakeholder | Value |
|-------------|-------|
| REZ | More training data, richer intelligence |
| Hojai | Better AI, more merchants |
| Merchants | AI employee, customer insights |
| Users | Better experiences across apps |

## The Moat

```
REZ Intelligence + Hojai AI creates:

1. DATA COMPOUNDING
   More sources → Better AI → More sources

2. BEHAVIORAL INTELLIGENCE
   Cross-app patterns → Deep understanding

3. SMB NETWORK
   More merchants → More data → Better AI

4. PRIVACY-FIRST
   User control → Trust → More participation
```

## Summary

```
REZ Ecosystem ──────► REZ Intelligence ◄────── Hojai AI
     │                       │                       │
     │                       │                       │
     │   Cross-app data      │   Enrichment         │
     │                       │◄───────              │
     │                       │                       │
     │                       │      External data    │
     │                       │      + Signals       │
     │                       │                       │
     └───────────────────────┴────────────────────►
                    The Intelligence Network
```

**REZ Intelligence is the brain. Hojai AI is the arms that reach every business.**
