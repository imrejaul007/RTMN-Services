# @hojai/self-learning

**Real-time learning from interactions**

---

## Overview

Self-learning service that updates memory and patterns in real-time.

## Features

- Pattern detection
- Memory updates
- Real-time improvement
- Confidence scoring

---

## API

### Record Interaction
```typescript
POST /api/interaction
{ aiId, trigger, response, outcome }
```

### Record Correction
```typescript
POST /api/correction
{ aiId, original, corrected, context }
```

### Update Confidence
```typescript
POST /api/feedback
{ patternId, success }
```

### Get Patterns
```typescript
GET /api/patterns/:aiId
```

### Store Memory
```typescript
POST /api/memory
{ aiId, type, content, confidence }
```

### Get Memory
```typescript
GET /api/memory/:aiId
```

---

## Usage

```typescript
import { SelfLearning } from '@hojai/self-learning';

const learning = new SelfLearning();

// Record interaction
await learning.interaction({
  aiId: 'ai_sdr_001',
  trigger: 'customer_interest',
  response: 'offer_demo',
  outcome: 'success'
});

// Record correction
await learning.correction({
  aiId: 'ai_sdr_001',
  original: 'Wrong pitch',
  corrected: 'Right pitch',
  context: 'Enterprise sales'
});
```

---

## Port: 4881
