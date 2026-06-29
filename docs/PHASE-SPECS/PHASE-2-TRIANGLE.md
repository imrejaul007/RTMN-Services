# 📋 PHASE 2: WIRE CONSUMER TRIANGLE
**Duration:** Week 3-5
**Goal:** Connect Genie → RAZO → DO end-to-end

---

## Current Architecture

```
User → RAZO → ???
User → Genie → ???
User → DO → ???
```

## Target Architecture

```
User Input (voice/text)
       ↓
     RAZO (4299)
   Intent Detection
       ↓
   Route Intent
       ↓
┌─────────────────────────────────┐
│                                 │
│  Genie (7100)                 │ ← Think
│  MemoryOS (4703)              │
│  TwinOS (4705)                │
│                                 │
└─────────────────────────────────┘
       ↓ Decision
┌─────────────────────────────────┐
│                                 │
│  RAZO (4299)                  │ ← Communicate
│  WhatsApp/Telegram/SMS         │
│                                 │
└─────────────────────────────────┘
       ↓ Action
┌─────────────────────────────────┐
│                                 │
│  DO (3001)                    │ ← Act
│  Book/Pay/Create               │
│                                 │
└─────────────────────────────────┘
```

---

## Files to Create

### 1. Genie → RAZO Bridge

**File:** `companies/HOJAI-AI/products/genie/genie-os/runtime/genie/src/services/razoBridge.ts`

```typescript
import axios from 'axios';

const RAZO_URL = process.env.RAZZO_URL || 'http://localhost:4299';

interface RazoIntent {
  type: 'message' | 'call' | 'schedule' | 'notify';
  recipient: string;
  content: string;
  channel?: 'whatsapp' | 'sms' | 'telegram' | 'email';
}

export async function forwardToRAZO(intent: RazoIntent): Promise<{ success: boolean }> {
  try {
    const response = await axios.post(`${RAZO_URL}/api/delegate`, {
      intent,
      source: 'genie',
      timestamp: new Date().toISOString()
    });
    return response.data;
  } catch (error) {
    console.error('Failed to forward to RAZO:', error);
    return { success: false };
  }
}

export async function sendMessage(recipient: string, message: string, channel: string = 'whatsapp') {
  return forwardToRAZO({
    type: 'message',
    recipient,
    content: message,
    channel: channel as any
  });
}

export async function scheduleCall(recipient: string, time: Date, message: string) {
  return forwardToRAZO({
    type: 'schedule',
    recipient,
    content: message,
    channel: 'call'
  });
}
```

### 2. Genie → DO Bridge

**File:** `companies/HOJAI-AI/products/genie/genie-os/runtime/genie/src/services/doBridge.ts`

```typescript
import axios from 'axios';

const DO_URL = process.env.DO_URL || 'http://localhost:3001';

interface DOAction {
  type: 'book' | 'pay' | 'order' | 'create_task' | 'send';
  payload: Record<string, any>;
}

export async function forwardToDO(action: DOAction): Promise<{ success: boolean; result?: any }> {
  try {
    const response = await axios.post(`${DO_URL}/api/execute`, {
      action,
      source: 'genie',
      timestamp: new Date().toISOString()
    });
    return response.data;
  } catch (error) {
    console.error('Failed to forward to DO:', error);
    return { success: false };
  }
}

export async function bookFlight(details: {
  from: string;
  to: string;
  date: string;
  passengers: number;
}) {
  return forwardToDO({ type: 'book', payload: { category: 'flight', ...details } });
}

export async function makePayment(to: string, amount: number, currency: string = 'INR') {
  return forwardToDO({ type: 'pay', payload: { to, amount, currency } });
}

export async function createTask(title: string, dueDate: string, assignee?: string) {
  return forwardToDO({ type: 'create_task', payload: { title, dueDate, assignee } });
}
```

### 3. RAZO → Genie Bridge

**File:** `companies/HOJAI-AI/products/razo/razo-keyboard/src/services/genieBridge.ts`

```typescript
import axios from 'axios';

const GENIE_URL = process.env.GENIE_URL || 'http://localhost:7100';

interface GenieContext {
  userId: string;
  intent: string;
  entities: Record<string, any>;
  channel: string;
  timestamp: string;
}

export async function forwardToGenie(text: string, context: Partial<GenieContext>) {
  try {
    const response = await axios.post(`${GENIE_URL}/api/ask`, {
      text,
      context: {
        source: 'razo',
        ...context
      }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to forward to Genie:', error);
    return { error: 'Genie unavailable' };
  }
}

export async function getRecommendation(context: GenieContext) {
  return forwardToGenie('What should I do?', context);
}

export async function searchMemory(query: string, userId: string) {
  return forwardToGenie(`Search my memory: ${query}`, { userId });
}
```

### 4. DO → Genie Bridge

**File:** `companies/do-app/backend/src/services/genieBridge.ts`

```typescript
import axios from 'axios';

const GENIE_URL = process.env.GENIE_URL || 'http://localhost:7100';

export async function notifyGenie(action: string, result: any) {
  try {
    await axios.post(`${GENIE_URL}/api/action/completed`, {
      action,
      result,
      source: 'do'
    });
  } catch (error) {
    console.error('Failed to notify Genie:', error);
  }
}

export async function askGenie(question: string, userId: string) {
  try {
    const response = await axios.post(`${GENIE_URL}/api/ask`, {
      text: question,
      context: { source: 'do', userId }
    });
    return response.data;
  } catch (error) {
    return { error: 'Genie unavailable' };
  }
}
```

### 5. Shared Memory

Add to all three services:

```typescript
// Environment variables
MEMORYOS_URL: 'http://localhost:4703'
TWINOS_URL: 'http://localhost:4705'

// Shared memory namespaces
const NAMESPACES = {
  personal: 'genie:personal',
  household: 'genie:household',
  health: 'genie:health',
  financial: 'genie:financial'
};
```

---

## Integration Points

### RAZO Intent Flow

```
User: "Book flight to Dubai tomorrow"
       ↓
RAZO Intent Detection
       ↓
Intent: order_flight
Entities: { destination: 'Dubai', date: 'tomorrow' }
       ↓
Forward to Genie
       ↓
Genie: "I found flights. Book?"
User: "Yes"
       ↓
RAZO → DO (book)
       ↓
Confirmation sent via RAZO
```

### Update RAZO action engine

**File:** `companies/HOJAI-AI/products/razo/razo-keyboard/src/services/actionEngine.js`

Add handler:

```javascript
// In actionEngine.js
const actionHandlers = {
  // ... existing handlers ...
  
  ask_genie: async (entities, context) => {
    const { forwardToGenie } = await import('./genieBridge.js');
    const response = await forwardToGenie(entities.question, context);
    return { type: 'genie_response', data: response };
  },
  
  delegate_to_do: async (entities, context) => {
    const { forwardToDO } = await import('./doBridge.js');
    const action = {
      type: entities.action_type,
      payload: entities.action_payload
    };
    return await forwardToDO(action);
  }
};
```

---

## Checklist

- [ ] Create Genie → RAZO bridge
- [ ] Create Genie → DO bridge
- [ ] Create RAZO → Genie bridge
- [ ] Create DO → Genie bridge
- [ ] Add shared memory configuration
- [ ] Update RAZO action engine
- [ ] Add tests for all bridges
- [ ] End-to-end test the flow
- [ ] Commit

---

## Test Flow

```bash
# 1. Start all services
cd services/rtmn-unified-hub && npm start &
cd companies/HOJAI-AI/products/genie/genie-os && npm start &
cd companies/HOJAI-AI/products/razo/razo-keyboard && npm start &
cd companies/do-app/backend && npm start &

# 2. Test flow
curl -X POST http://localhost:4299/api/detect \
  -H "Content-Type: application/json" \
  -d '{"text": "Book flight to Dubai"}'

# Expected: Genie receives request, returns flight options
```
