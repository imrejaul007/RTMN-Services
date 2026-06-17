# Voice AI + Customer Operations - Integration Guide

**Last Updated:** June 17, 2026

---

## How Voice Connects to Customer Operations

### Architecture

```
CUSTOMER CALLS
        │
        ▼
┌───────────────────────┐
│   VOICE AI (Bland/Twilio)│
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Voice Twin (4876)     │  ← Customer Operations
│  - Call recording      │
│  - Transcription       │
│  - Sentiment           │
└───────────┬─────────────┘
            │
            │ All connected to Customer Operations
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CUSTOMER OPERATIONS OS                             │
│                                                                     │
│  Customer Twin ←─────────────────────────────────────────────────┐   │
│  ├── Voice calls recorded                                       │   │
│  ├── Transcripts stored                                        │   │
│  └── Sentiment analysis added                                  │   │
│                                                                     │
│  Ticket Engine ←───────────────────────────────────────────────│───────┤
│  ├── Auto-create ticket from voice call                       │       │
│  ├── AI summary generated                                    │       │
│  └── Customer 360 updated                                   │       │
│                                                                     │
│  AI Intelligence ←───────────────────────────────────────────│───────┤
│  ├── Intent detection                                        │       │
│  ├── Sentiment analysis                                     │       │
│  └── CSAT prediction                                       │       │
│                                                                     │
│  Decision Engine ←──────────────────────────────────────────│────────┘
│  ├── Refund decision
│  ├── Escalate to human
│  └── Route to department
│
│  Customer Twin ←─────────────────────────────────────────────────────────┐
│  └── All voice data stored                                      │
│
│  Agent Dashboard ←─────────────────────────────────────────────────────┤
│  └── Agent sees voice call history + transcript                     │
│                                                                     │
│  Executive Dashboard ←─────────────────────────────────────────────┤
│  └── Voice analytics (avg call duration, sentiment trends, etc)        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Voice Services Available

### 1. Axomi Voice BPO
**Location:** `companies/AdBazaar/axomi-bpo/axomi-bpo-voice-bpo`

```typescript
// Voice BPO for call center operations
// Human agents handle complex voice calls
```

### 2. Voice AI Integration Points

```typescript
// Services that connect voice to Customer Operations:

1. voice-twin (Port 4876) - Voice-specific Twin
2. bpo-manager (Port 4891) - BPO worker management
3. journey-intelligence (Port 4954) - Track voice journey
4. ai-intelligence (Port 4881) - Transcription, sentiment
```

---

## Complete Voice Flow

```
CALLER (Customer)
        │
        │ Phone call
        ▼
┌───────────────────────┐
│   TWILIO / BLAND API │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Voice AI Runtime    │
│  ├── STT (Speech-to-text)│
│  ├── AI Analysis      │
│  └── Route decision   │
└───────────┬───────────┘
            │
            ├──→ [Simple Query] → AI responds
            │
            ├──→ [Complex Issue] → Create Ticket
            │
            └──→ [Escalation → Agent dashboard
                      │
                      ▼
               ┌────────────────┐
               │ Ticket Engine   │
               │ (Port 4872)   │
               └───────┬────────┘
                       │
                       ▼
               ┌────────────────────────────────┐
               │     CUSTOMER TWIN UPDATED      │
               │                                │
               │  {
               │    voiceCalls: [{
               │      transcript: "...",
               │      sentiment: "frustrated",
               │      intent: "refund_request",
               │      csatPrediction: 3.2,
               │      escalationRisk: "high"
               │    }]
               │  }
               └────────────────────────────────┘
```

---

## Voice + Customer Operations Endpoints

### Voice Twin (Port 4876)
```typescript
// Voice-specific customer data
VoiceTwin {
  calls: [{
    id: string
    transcript: string
    duration: number
    sentiment: 'positive' | 'neutral' | 'negative'
    intent: string
    resolution?: string
  }]
}
```

### AI Intelligence (Port 4881)
```typescript
// Voice analysis
POST /api/ai/transcribe
POST /api/ai/sentiment
POST /api/ai/intent
POST /api/ai/summary
```

### Customer Operations Integration
```typescript
// Voice call creates ticket
POST /api/tickets
{
  source: 'voice',
  transcript: '...',
  customer: { id: 'cust_001' },
  ai: {
    sentiment: 'frustrated',
    intent: 'refund_request',
    csatPrediction: 3.2,
    escalationRisk: 'high'
  }
}
```

---

## Voice Analytics Dashboard

```
VOICE ANALYTICS (in Executive Dashboard)
├── Calls Today: 234
├── Avg Duration: 4.2 min
├── Sentiment Breakdown:
│   ├── Positive: 45%
│   ├── Neutral: 35%
│   └── Negative: 20%
├── Top Intents:
│   ├── Refund Request: 45%
│   ├── Order Status: 30%
│   └── Complaint: 15%
└── AI Resolution Rate: 62%
```

---

## Next Steps

To connect Voice AI fully:

1. **Build voice-twin service** (Port 4876)
2. **Integrate with Twilio/Bland**
3. **Add voice analytics to dashboard**
4. **Train AI on voice data**

**Want me to build voice-twin service?**
