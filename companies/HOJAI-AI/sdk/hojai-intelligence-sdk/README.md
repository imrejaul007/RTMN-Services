# HOJAI Intelligence SDK

**Version:** 1.0.0  
**Package:** `@hojai/intelligence-sdk`

Unified TypeScript/JavaScript SDK for all HOJAI intelligence services.

---

## Installation

```bash
npm install @hojai/intelligence-sdk
```

---

## Quick Start

```typescript
import { IntelligenceSDK } from '@hojai/intelligence-sdk';

// Initialize with gateway URL
const sdk = new IntelligenceSDK({
  gatewayUrl: 'http://localhost:4750',
  apiKey: 'your-api-key'
});

// Or initialize with individual services
const sdk = new IntelligenceSDK({
  services: {
    aiIntelligence: 'http://localhost:4881',
    intentEngine: 'http://localhost:4786',
    reasoningEngine: 'http://localhost:4933'
  }
});
```

---

## Services

### AI Intelligence

```typescript
// Analyze text
const analysis = await sdk.ai.analyze({
  text: 'I want to buy a laptop',
  userId: 'user-123'
});

// Detect intent
const intent = await sdk.ai.intent({
  text: 'Book a flight to Mumbai'
});

// Analyze sentiment
const sentiment = await sdk.ai.sentiment({
  text: 'This product is amazing!'
});

// Detect fraud
const fraud = await sdk.ai.fraud({
  transaction: { amount: 5000, userId: 'user-123' }
});
```

### Intent Engine

```typescript
// Detect user intent
const result = await sdk.intent.detect({
  text: 'I need a hotel in Bangalore for tomorrow',
  actor: 'user-123'
});
// result.intent = 'search'
// result.confidence = 0.92
```

### Reasoning Engine

```typescript
// Chain-of-thought reasoning
const reasoning = await sdk.reasoning.analyze({
  query: 'If all merchants want lower fees, how should we price?',
  strategy: 'deductive'
});
// reasoning.steps = [...]
// reasoning.conclusion = '...'
```

### Predictive Intelligence

```typescript
// Forecast demand
const forecast = await sdk.predictive.forecast({
  metric: 'sales',
  history: [100, 120, 115, 140, 150]
});

// Detect anomaly
const anomaly = await sdk.predictive.anomaly({
  value: 500,
  baseline: 100
});
```

### Risk Intelligence

```typescript
// Fraud scoring
const fraudScore = await sdk.risk.fraudScore({
  userId: 'user-123',
  transaction: { amount: 10000 }
});

// Churn prediction
const churn = await sdk.risk.churnScore({
  userId: 'user-123',
  metrics: { logins: 2, purchases: 0 }
});
```

### Decision Intelligence

```typescript
// Get recommendations
const recs = await sdk.decision.recommend({
  userId: 'user-123',
  category: 'restaurants',
  limit: 10
});

// Next best action
const nba = await sdk.decision.nba({
  userId: 'user-123',
  context: { cart: ['item1', 'item2'] }
});
```

### Personalization

```typescript
// Get user profile
const profile = await sdk.personalization.getProfile('user-123');

// Track preference
await sdk.personalization.track({
  userId: 'user-123',
  action: 'like',
  itemId: 'restaurant-456',
  itemType: 'restaurant'
});

// Get recommendations
const recs = await sdk.personalization.recommend('user-123', { limit: 10 });
```

### Knowledge

```typescript
// Search knowledge
const results = await sdk.knowledge.search({
  query: 'return policy',
  type: 'policy'
});

// Get asset
const asset = await sdk.knowledge.getAsset('asset-123');

// Create asset
await sdk.knowledge.createAsset({
  name: 'FAQ Document',
  type: 'document',
  content: 'Our return policy is...',
  tags: ['faq', 'returns']
});
```

### Events

```typescript
// Publish event
await sdk.events.publish({
  type: 'user.purchased',
  source: 'ecommerce',
  data: { orderId: 'order-123' }
});

// Subscribe
await sdk.events.subscribe({
  name: 'notify-on-purchase',
  type: 'user.purchased',
  callback: 'http://notification-service/webhook'
});
```

### Planning

```typescript
// Create plan from goal
const plan = await sdk.planning.createFromGoal({
  name: 'process-order',
  goal: 'Process customer order from payment to delivery'
});

// Execute plan
await sdk.planning.execute(plan.id, { context: { orderId: '123' } });
```

### Agents

```typescript
// Create agent
const agent = await sdk.agents.create({
  name: 'sales-agent',
  type: 'sales'
});

// Execute task
const result = await sdk.agents.execute(agent.id, {
  task: 'Qualify lead',
  input: { leadId: 'lead-123' }
});
```

---

## SDK Options

```typescript
interface SDKOptions {
  // Gateway mode (single entry point)
  gatewayUrl?: string;
  apiKey?: string;

  // Direct mode (individual services)
  services?: {
    aiIntelligence?: string;
    intentEngine?: string;
    reasoningEngine?: string;
    predictiveIntelligence?: string;
    riskIntelligence?: string;
    decisionIntelligence?: string;
    personalization?: string;
    knowledgeRegistry?: string;
    eventPlatform?: string;
    agentOS?: string;
    planningEngine?: string;
  };

  // Common options
  timeout?: number;
  retries?: number;
  cache?: boolean;
}
```

---

## Error Handling

```typescript
try {
  const result = await sdk.ai.analyze({ text: 'test' });
} catch (error) {
  if (error.code === 'SERVICE_UNAVAILABLE') {
    // Fallback logic
    console.log('Service unavailable, using cache');
  } else if (error.code === 'RATE_LIMITED') {
    // Retry logic
    await sleep(1000);
  }
}
```

---

## Batch Processing

```typescript
// Process multiple requests in parallel
const results = await sdk.batch([
  sdk.intent.detect({ text: 'buy laptop' }),
  sdk.intent.detect({ text: 'return item' }),
  sdk.ai.sentiment({ text: 'great service!' })
]);
```

---

## Chaining

```typescript
// Chain intelligence services
const result = await sdk.chain([
  { service: 'intent', action: 'detect', data: { text: query }, saveAs: 'intent' },
  { service: 'reasoning', action: 'analyze', contextKey: 'intent', data: {} },
  { service: 'decision', action: 'recommend', contextKey: 'reasoning', data: {} }
]);
```

---

## License

Proprietary - HOJAI AI
