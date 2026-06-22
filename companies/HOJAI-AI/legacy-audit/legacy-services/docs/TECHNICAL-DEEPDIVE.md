# HOJAI AI - Complete Technical Deep Dive

## Table of Contents
1. [What is Hojai AI](#what-is-hojai-ai)
2. [Architecture](#architecture)
3. [Data Sources](#data-sources)
4. [AI Training](#ai-training)
5. [Output & Feedback](#output--feedback)
6. [Privacy & Governance](#privacy--governance)
7. [API Reference](#api-reference)

---

## What is Hojai AI

Hojai AI is an **operational intelligence platform** that:
- Understands customer intent
- Automates responses
- Enriches with REZ Intelligence
- Learns from every interaction

### Core Value

```
Input: Customer WhatsApp message
     ↓
Hojai AI processes
     ↓
Output: Intelligent response + enriched insights
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOJAI AI PLATFORM                         │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ WhatsApp Webhook Handler                          │   │
│  │ • Receive messages                              │   │
│  │ • Verify signatures                            │   │
│  │ • Queue for processing                        │   │
│  └─────────────────────────────────────────────┘       │
│                          │                                │
│                          ▼                                │
│  ┌────────────────────────────────────────────────┐   │
│  │ Intent Engine                                │   │
│  │ • Keyword matching                           │   │
│  │ • Context analysis                          │   │
│  │ • Confidence scoring                        │   │
│  └────────────────────────────────────────────┘       │
│                          │                                │
│                          ▼                                │
│  ┌────────────────────────────────────────────────┐   │
│  │ Knowledge Base                              │   │
│  │ • Q&A matching                             │   │
│  │ • Business rules                          │   │
│  │ • Pricing/facts                           │   │
│  └────────────────────────────────────────────┘       │
│                          │                                │
│                          ▼                                │
│  ┌────────────────────────────────────────────────┐   │
│  │ Response Generator                          │   │
│  │ • GPT-4 mini                            │   │
│  │ • Persona injection                       │   │
│  │ • Multi-language                         │   │
│  └────────────────────────────────────────────┘       │
│                                                           │
│  ┌───────────────────────────────────────────────┐      │
│  │ REZ Intelligence Bridge                        │      │
│  │ Enriches with cross-app signals                 │      │
│  └───────────────────────────────────────────────┘      │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Service Ports

| Service | Port | Purpose |
|----------|-------|---------|
| API Gateway | 4500 | Routing |
| Event Bus | 4510 | Real-time events |
| Memory | 4520 | Customer profiles |
| Intelligence | 4530 | ML predictions |
| WhatsApp AI | 4570 | Main product |

---

## Data Sources (16 Inputs)

### Direct Sources (Merchant Data)

| Source | Data Type | Privacy |
|--------|------------|---------|
| WhatsApp messages | Chat, intent | Tier 1 |
| Knowledge Base | Q&A, rules | Tenant |
| Business Profile | Hours, pricing | Tenant |
| Conversation history | Context | Tenant |

### Connected Sources (REZ Intelligence)

| Source | Data | Privacy |
|--------|------|---------|
| RisaCare | Wellness, fitness | Tier 3 |
| Commerce | Purchases, browse | Tier 1 |
| ReZ Ride | Commute, routes | Tier 1 |
| Airzy | Travel, bookings | Tier 2 |
| BuzzLocal | Hyperlocal behavior | Tier 1 |
| Karma | Good deeds | Tier 2 |
| rendez | Social graph | Tier 3 |
| CorpPerks | Employment | Tier 2 |
| RidZa | Transactions | Tier 3 |
| REZ Card | Spending | Tier 1 |

### Data Categories

| Category | Examples | Sensitivity |
|----------|----------|-------------|
| Behavioral | Clicks, views | Low |
| Transactional | Purchases, orders | Medium |
| Identifiable | Phone, email | High |
| Financial | Bank, wallet | Restricted |
| Health | Medical, fitness | Tier 3 |
| Location | GPS, routes | Tier 2 |

---

## AI Training

### Training Inputs

```
┌────────────────────────────────────────────────────┐
│                 TRAINING DATA                         │
├────────────────────────────────────────────────┤
│                                                    │
│  1. MERCHANT DATA                               │
│     • Industry verticals                        │
│     • Business types (salon, clinic, restaurant)  │
│     • Common queries                          │
│     • Pricing patterns                        │
│     • Response templates                     │
│                                                    │
│  2. CONVERSATION LOGS                       │
│     • Historical chats                       │
│     • Resolution patterns                    │
│     • Escalation points                     │
│     • Time-to-resolution                    │
│                                                    │
│  3. REZ CROSS-APP SIGNALS                  │
│     • Shopping patterns                     │
│     • Travel intent                        │
│     • Finance health                       │
│     • Wellness trends                      │
│                                                    │
└────────────────────────────────────────────┘
```

### Training Method

```
Step 1: Ingest merchant Q&A
        │
        ▼
Step 2: Learn business context
        │
        ▼
Step 3: Apply REZ enrichment
        │
        ▼
Step 4: Generate persona
        │
        ▼
Step 5: Deploy to WhatsApp
```

### Prompt Engineering

```typescript
System Prompt Template:
"""
You are {{merchantName}}'s AI assistant.
Business: {{industry}}
Language: {{locale}}
Rules:
- {{pricing_rules}}
- {{availability_rules}}
- Keep responses under 100 words
"""
```

---

## Features

### Core Features

| Feature | Description |
|----------|-------------|
| Intent detection | Understands booking/order/query |
| Response generation | GPT-4 powered |
| Multi-turn context | Conversation memory |
| Intent prediction | GPT-4 via REZ |
| Sentiment analysis | Real-time emotion |
| Personalization | REZ cross-app signals |

### Advanced Features

| Feature | How |
|---------|-----|
| Predictive intents | Churn risk, LTV scores |
| Commerce predictions | Purchase probability |
| Mobility signals | Commute patterns |
| Finance signals | Spending capacity |
| Wellness signals | Health patterns |
| Social signals | Engagement history |

---

## Data Flow

### Input Processing

```
WhatsApp message
    │
    ▼
Webhook validation
    │
    ▼
Intent detection
    │
    ▼
Context retrieval (Redis)
    │
    ▼
REZ enrichment (optional)
    │
    ▼
AI response generation
    │
    ▼
Message storage (MongoDB)
```

### Enrichment Pipeline

```
REZ Intelligence API
    │
    ├── /signals/user/:id
    │       │
    │       ▼
    │   LTV score
    │       │
    │   Churn risk
    │       │
    │   Segments
    │       │
    │   Preferences
    │
    ▼
Hojai Memory
    │
    └── Context stored
```

### Output Channels

```
Response generated
    │
    ├── WhatsApp message (outbound)
    │
    ├── MongoDB (conversation)
    │
    ├── Redis (session)
    │
    ├── Analytics (metrics)
    │
    └── REZ Bridge (signals)
```

---

## Functions

### Intent Engine

```typescript
class IntentEngine {
  // Matches message to intent
  detectIntent(message: string): IntentResult
  
  // Checks for booking/order/support keywords
  // Returns confidence score
  // Routes to appropriate handler
}
```

### Knowledge Engine

```typescript
class KnowledgeEngine {
  // Finds relevant Q&A
  find(query: string): Answer[]
  
  // Scores relevance
  rank(answers: Answer[]): Answer[]
}
```

### Response Generator

```typescript
class ResponseGenerator {
  // GPT-4 powered
  generate(params): string
  
  // Persona injection
  applyPersona(text: string): string
}
```

---

## Output & Feedback

### Generated Outputs

| Output | Destination |
|--------|-------------|
| AI response | WhatsApp |
| Session update | Redis |
| Analytics event | Dashboard |
| Training signal | REZ Intelligence |
| Conversation log | MongoDB |

### Feedback Loops

```
Customer interaction
    │
    ▼
Positive/negative feedback
    │
    ▼
Model improvement
    │
    ▼
Knowledge base updates
    │
    ▼
Better responses
```

### Analytics Outputs

| Metric | Dashboard |
|--------|----------|
| Messages/day | Admin panel |
| Resolution rate | Monitoring |
| AI confidence | Admin panel |
| Cost tracking | Analytics |

---

## Privacy & Governance

### Consent Tiers

| Tier | Data | Consent |
|------|------|---------|
| Essential | Login, basic | Implicit |
| Personalization | Recommendations | Opt-in |
| Sensitive | Health, finance | Explicit |

### Data Rights

| Right | Implementation |
|-------|----------------|
| Access | GET /api/data/:userId |
| Erasure | DELETE /api/users/:id |
| Portability | Export JSON |
| Restriction | Masking |
| Consent | Dashboard UI |

### Tenant Isolation

```
Each merchant gets:
    ├── Own MongoDB collection
    ├── Own Redis namespace
    ├── Own API key
    └── Own session keys
```

---

## API Reference

### Core Endpoints

```bash
POST /webhook/whatsapp
GET  /api/knowledge
POST /api/knowledge
GET  /api/analytics
POST /api/consent
```

### Response Format

```json
{
  "success": true,
  "data": {
    "response": "Your appointment is confirmed for 3 PM"
  }
}
```

---

## Summary

| Aspect | Implementation |
|--------|----------------|
| Training | Merchant Q&A + REZ signals |
| Memory | MongoDB + Redis |
| Intelligence | GPT-4 + REZ enrichment |
| Privacy | Tiered consent + isolation |
| Analytics | Real-time dashboards |
| Deployment | Docker + Railway |
