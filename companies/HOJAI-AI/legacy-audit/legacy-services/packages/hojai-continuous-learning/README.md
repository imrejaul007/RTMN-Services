# @hojai/continuous-learning

**Learn from everything: chats, signals, events, conversions, corrections**

---

## Overview

Continuous learning service that captures and learns from every interaction.

## Learn From

| Source | What We Learn |
|--------|--------------|
| **Chat** | Q&A patterns, responses |
| **Signal** | User preferences, behavior |
| **Event** | Task success/failure |
| **Conversion** | What sells, triggers |
| **Correction** | AI mistakes |

---

## API

### Learn from Chat
```typescript
POST /learn/chat
{ intent, query, response, success }
```

### Learn from Signal
```typescript
POST /learn/signal
{ signalType, userAction, outcome }
```

### Learn from Conversion
```typescript
POST /learn/conversion
{ trigger, action, result, revenue }
```

### Learn from Correction
```typescript
POST /learn/correction
{ wrong, correct, context }
```

### Learn Everything
```typescript
POST /learn/batch
{ chats, signals, events, conversions, corrections }
```

---

## Usage

```typescript
import { 
  learnFromChat,
  learnFromSignal,
  learnFromConversion,
  learnFromCorrection 
} from '@hojai/continuous-learning';

// After chat
await learnFromChat({ intent, query, response, success });

// After signal
await learnFromSignal({ signalType, userAction, outcome });

// After conversion
await learnFromConversion({ trigger, action, result, revenue });

// After correction
await learnFromCorrection({ wrong, correct, context });
```

---

## Port: 4891
