# HOJAI AI - Complete Technical Reference

## All Functions

### Intent Engine

```typescript
class IntentEngine {
  // Intent detection
  detectIntent(message: string): IntentResult
  
  // Supported intents
  intents = [
    'booking', 'order', 'inquiry',
    'support', 'feedback', 'greeting'
  ]
  
  // Confidence scoring
  confidence: 0-1 score
}
```

### Knowledge Engine

```typescript
class KnowledgeEngine {
  // Match Q&A
  findAnswers(query: string): Answer[]
  
  // Rank by relevance
  rank(answers: Answer[]): Answer[]
}
```

### Response Generator

```typescript
class ResponseGenerator {
  // GPT-4 response
  generate(params): string
  
  // Persona injection
  applyPersona(text: string): string
}
```

### Session Manager

```typescript
class SessionManager {
  // Redis-backed sessions
  getSession(userId: string): Session
  
  // Context window
  context(window: number): Message[]
}
```

---

## Complete Feature Matrix

| Feature | Implementation | Source |
|---------|----------------|---------|
| Intent detection | Keyword + GPT-4 | Hojai + REZ |
| Knowledge base | MongoDB + vector | Hojai |
| Session memory | Redis TTL | Hojai |
| Cross-app signals | REZ Intelligence | REZ |
| Payment processing | RABTUL | RABTUL |
| Analytics | Real-time | Hojai |

---

## Data Flow (Complete)

```
Customer WhatsApp
      │
      ▼
┌─────────────────────────────┐
│  1. Message received      │
│  2. Intent detected     │
│  3. Knowledge matched   │
│  4. REZ enrichment     │
│  5. Response generated │
│  6. Session updated    │
│  7. Signal emitted    │
└─────────────────────────────┘
      │
      ▼
┌─────────────────────────────┐
│  ANALYTICS                 │
│  • Messages/minute         │
│  • Resolution rate         │
│  • AI confidence          │
│  • Cost tracking         │
└───────────────────────────┘
      │
      ▼
┌─────────────────────────────┐
│  REZ INTELLIGENCE          │
│  • Behavioral signals     │
│  • LTV prediction       │
│  • Churn risk           │
│  • Segments             │
└───────────────────────────┘
```

---

## Function Reference

### Input Functions

```typescript
// Webhook handler
webhook(req, res) → IntentEngine → KnowledgeEngine → ResponseGenerator

// Knowledge base
addKnowledge(params) → validate → embed → store

// Session management
getSession(userId) → Redis → enrich → return
```

### Processing Functions

```typescript
// Intent detection
detectIntent(message) → classify → confidence → route

// Knowledge matching
search(query) → vector → rank → return top-k
```

### Output Functions

```typescript
// WhatsApp response
sendMessage(to, template) → format → deliver

// Analytics event
trackEvent(name, properties) → increment → dashboard

// REZ signal
emitSignal(type, data) → validate → publish → ack
```

---

## Training Pipeline

```
Raw conversation
      │
      ▼
┌─────────────────┐
│  1. Label intent    │
│  2. Extract entities │
│  3. Match knowledge │
│  4. Generate response│
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  REZ Intelligence │
│  • Behavioral ML  │
│  • Feedback loop  │
│  • Cross-app sigs │
└─────────────────┘
```

---

## Output Channels

| Channel | Format | Frequency |
|---------|--------|------------|
| WhatsApp | Template | Real-time |
| Dashboard | Metrics | Real-time |
| REZ | Signals | Batch |
| MongoDB | Events | Real-time |
| Redis | Sessions | Real-time |
</parameter>
