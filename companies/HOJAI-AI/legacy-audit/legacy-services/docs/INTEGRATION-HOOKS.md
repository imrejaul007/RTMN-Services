# INTEGRATION HOOKS - Connect Every Service to Continuous Learning

## Complete Integration Guide

---

## HOOK INTO: REZ Signal Aggregator (4142)

### File: `REZ-Intelligence/REZ-signal-aggregator/src/index.ts`

Add to signal processing:

```typescript
import axios from 'axios';

const LEARNING_URL = 'http://localhost:4891';

// After processing signal:
await axios.post(`${LEARNING_URL}/learn/signal`, {
  signalType: signal.type,
  userAction: signal.action,
  outcome: signal.confidence > 0.8 ? 'success' : 'low_confidence'
});
```

---

## HOOK INTO: HOJAI Agents (4550)

### File: `hojai-ai/packages/hojai-agents/src/index.ts`

Add after agent response:

```typescript
// After agent responds:
await axios.post(`${LEARNING_URL}/learn/chat`, {
  intent: detectedIntent,
  query: userMessage,
  response: agentResponse,
  success: userAccepted
});

// If user corrects:
if (userCorrection) {
  await axios.post(`${LEARNING_URL}/learn/correction`, {
    wrong: agentResponse,
    correct: userCorrection,
    context: conversationHistory
  });
}
```

---

## HOOK INTO: HOJAI Memory (4520)

### File: `hojai-ai/packages/hojai-memory/src/index.ts`

Add after memory operations:

```typescript
// After memory read:
await axios.post(`${LEARNING_URL}/learn/event`, {
  eventType: 'memory_read',
  context: { memoryType, accessed },
  success: true
});

// After memory write:
await axios.post(`${LEARNING_URL}/learn/event`, {
  eventType: 'memory_write',
  context: { memoryType, dataSize },
  success: true
});
```

---

## HOOK INTO: HOJAI Workforce (4820)

### File: `hojai-ai/packages/hojai-workforce/src/index.ts`

Add after task completion:

```typescript
// After task completes:
await axios.post(`${LEARNING_URL}/learn/conversion`, {
  trigger: 'task_completion',
  action: task.type,
  result: task.success ? 'converted' : 'failed',
  revenue: task.value
});

// After AI employee level up:
await axios.post(`${LEARNING_URL}/learn/event`, {
  eventType: 'ai_level_up',
  context: { employeeId, newLevel, xp },
  success: true
});
```

---

## HOOK INTO: HOJAI Training Pipeline (4880)

### File: `hojai-ai/packages/hojai-training-pipeline/src/index.ts`

Add after training completion:

```typescript
// After training completes:
await axios.post(`${LEARNING_URL}/learn/event`, {
  eventType: 'model_trained',
  context: { modelId, accuracy, trainingTime },
  success: true
});
```

---

## HOOK INTO: All Chat Services

### Add to any chat service:

```typescript
// After every conversation:
await axios.post(`${LEARNING_URL}/learn/batch`, {
  chats: [{
    intent: detectedIntent,
    query: userMessage,
    response: botResponse,
    success: goalCompleted
  }],
  corrections: userCorrections
});
```

---

## BATCH INTEGRATION

### Nightly batch - Learn from everything:

```typescript
// Cron job every night
async function nightlyBatchLearn() {
  // Get all data from yesterday
  const [chats, signals, events] = await Promise.all([
    getYesterdayChats(),
    getYesterdaySignals(),
    getYesterdayEvents()
  ]);

  // Send to continuous learning
  await axios.post(`${LEARNING_URL}/learn/batch`, {
    chats,
    signals,
    events
  });

  // Then trigger batch training
  await axios.post('http://localhost:4880/api/jobs', {
    type: 'batch',
    data: { chats, signals, events }
  });
}
```

---

## AUTO-HOOK WRAPPER

### Create middleware that auto-hooks everything:

```typescript
// middleware/autoLearn.ts
export function autoLearnMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', async () => {
    const duration = Date.now() - start;
    const { intent, query, response, success } = req.body;
    
    // Learn from request
    await axios.post(`${LEARNING_URL}/learn/chat`, {
      intent,
      query,
      response,
      success: res.statusCode < 400,
      duration
    });
  });
  
  next();
}
```

---

## QUICK IMPLEMENTATION CHECKLIST

- [ ] HOOK INTO: REZ Signal Aggregator (4142)
- [ ] HOOK INTO: HOJAI Agents (4550)
- [ ] HOOK INTO: HOJAI Memory (4520)
- [ ] HOOK INTO: HOJAI Workforce (4820)
- [ ] HOOK INTO: HOJAI Training Pipeline (4880)
- [ ] HOOK INTO: REZ Attribution (4120)
- [ ] HOOK INTO: REZ Identity Graph (4050)
- [ ] SETUP: Nightly batch job
- [ ] SETUP: Auto-learn middleware
