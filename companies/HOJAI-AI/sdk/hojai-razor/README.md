# @hojai/razor

> The official TypeScript SDK for the **HOJAI RAZO Keyboard Communication OS v2.1** (port 4299). The "keyboard that thinks" — now with Magic Wand, Emotion Detection, Voice, i18n, Family Quick Reply, Pay Anyone, Auto Life, Founder Mode, Negotiation Mode, Photo Intelligence, and MemoryOS integration.

[![npm version](https://img.shields.io/npm/v/@hojai/razor.svg)](https://www.npmjs.com/package/@hojai/razor)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What it does

RAZO Keyboard is the **Communication OS** for the HOJAI ecosystem. v2.1 adds 12 new clients with 84+ endpoints:

- **Magic Wand** — One-tap help, let RAZO figure out what you need
- **Emotion Detection** — Detect emotion, get suggested replies
- **Voice** — Speech-to-text, text-to-speech, voice sessions
- **i18n** — 6 languages, cultural translation, festival greetings
- **Family Quick Reply** — Relationship-aware replies (mother, father, etc.)
- **Pay Anyone** — Voice, QR, or contact-based payments
- **Auto Life Assistant** — Proactive suggestions based on context
- **Founder Mode** — Strategic communications for founders
- **Negotiation Mode** — Get the best deal with SUTAR-powered bargaining
- **Photo Intelligence** — Upload images → extract info (receipts, orders, cards)
- **MemoryOS** — Persistent memory, preferences, learning
- **TwinOS** — Customer/merchant twin data

## Install

```bash
npm install @hojai/razor
```

## Quick Start

```typescript
import { Razor } from '@hojai/razor';

const razor = new Razor({ baseUrl: 'http://localhost:4299' });

// ✨ Magic Wand - One tap help
const help = await razor.magic.help({ text: 'Order pizza', userId: 'user-1' });

// 🆘 Emotion Detection
const emotion = await razor.emotion.analyze({ message: 'This is RIDICULOUS!!' });

// 🎤 Voice
const text = await razor.voice.stt({ audio: base64Audio });

// 🌍 i18n
const lang = await razor.i18n.detect('नमस्ते');

// 👨‍👩‍👧 Family Reply
const reply = await razor.family.reply({ message: 'When are you coming?', userId: 'user-1' });

// 💰 Pay
const pay = await razor.pay.voice({ text: 'Send Rahul 500', userId: 'user-1' });

// 🔮 Auto Life
const suggestions = await razor.life.check({ userId: 'user-1' });

// 👨‍💼 Founder Mode
const content = await razor.founder.generate({
  text: 'Weekly metrics',
  audience: 'investor',
  tone: 'confident'
});

// 💰 Negotiation
const neg = await razor.negotiation.start({ sellerPrice: 1000, item: 'jacket' });

// 📷 Photo Intelligence
const photo = await razor.photo.analyze({ imageData: base64, photoType: 'receipt' });

// 🧠 Memory
const ctx = await razor.memory.getContext('user-1');
```

## API Reference

### Magic Wand

```typescript
await razor.magic.help({ text, userId, sessionId, context });
await razor.magic.execute({ actionId, userId, context });
```

### Emotion Detection

```typescript
await razor.emotion.analyze({ message, context });
```

### Voice

```typescript
await razor.voice.stt({ audio, userId, language });
await razor.voice.tts({ text, userId, voice, speed });
await razor.voice.startSession(userId);
await razor.voice.processSession(sessionId, audio);
await razor.voice.endSession(sessionId);
```

### i18n

```typescript
await razor.i18n.detect(text);
await razor.i18n.translate({ text, targetLanguage, sourceLanguage? });
await razor.i18n.greeting({ userId?, language?, context? });
await razor.i18n.festival(festival);
```

### Family

```typescript
await razor.family.detect({ sender?, userId });
await razor.family.reply({ message, sender?, relationship?, userId });
```

### Pay

```typescript
await razor.pay.voice({ audio?, text?, userId });
await razor.pay.qr({ qrData, userId });
await razor.pay.contact({ recipientId, amount, userId, note? });
await razor.pay.recent(userId);
await razor.pay.history(userId, limit?);
```

### Auto Life

```typescript
await razor.life.check({ userId, categories? });
await razor.life.snooze(suggestionId, hours?);
await razor.life.disableCategory(userId, category);
await razor.life.track(suggestionId, action);
```

### Founder Mode

```typescript
await razor.founder.generate({ text?, audience, tone, userId? });
await razor.founder.templates(audience);
```

### Negotiation Mode

```typescript
await razor.negotiation.start({ userId?, sellerPrice, item, category? });
await razor.negotiation.counter({ negotiationId, yourOffer, message?, tactic? });
await razor.negotiation.accept(negotiationId);
await razor.negotiation.walkAway(negotiationId);
await razor.negotiation.status(negotiationId);
```

### Photo Intelligence

```typescript
await razor.photo.analyze({ imageData, photoType, action?, userId? });
await razor.photo.actions(extractedData);
// photoType: 'receipt' | 'order' | 'menu' | 'business_card' | 'document' | 'product' | 'price_tag' | 'screenshot'
```

### MemoryOS

```typescript
await razor.memory.getContext(userId);
await razor.memory.saveContext(userId, context);
await razor.memory.history(userId, limit?);
await razor.memory.preferences(userId);
await razor.memory.updatePreferences(userId, preferences);
await razor.memory.learn(userId, behavior);
await razor.memory.recommendations(userId);
await razor.memory.search(userId, query);
await razor.memory.getCustomerTwin(userId);
await razor.memory.getMerchantTwin(merchantId);
```

### Modes

```typescript
await razor.modes.momMode();
await razor.modes.actions();
```

## Clients

| Client | Purpose |
|--------|---------|
| `razor.magic` | Magic Wand (one-tap help) |
| `razor.emotion` | Emotion detection |
| `razor.voice` | Voice input/output |
| `razor.i18n` | Translation, greetings |
| `razor.family` | Family quick reply |
| `razor.pay` | Payments |
| `razor.life` | Proactive suggestions |
| `razor.founder` | Founder communications |
| `razor.negotiation` | Bargaining |
| `razor.photo` | Photo analysis |
| `razor.memory` | Memory & twins |
| `razor.modes` | Mode configurations |

## Error Handling

All methods throw on network errors. Wrap in try/catch:

```typescript
try {
  const result = await razor.magic.help({ text: 'Order pizza' });
} catch (error) {
  console.error('Failed:', error.message);
}
```

## TypeScript

Full TypeScript support with typed requests and responses.

```typescript
import { Razor } from '@hojai/razor';
const razor = new Razor();
const result = await razor.magic.help({ text: 'hi' });
```

## React Hooks (`@hojai/razor/hooks`)

```bash
npm install @hojai/razor
```

### Main Hook

```tsx
import { useRazo } from '@hojai/razor/hooks';

function App() {
  const { razor, loading, magic, emotion, voice, photo, negotiation } = useRazo({
    baseUrl: 'http://localhost:4299',
    userId: 'user-1',
  });

  if (loading) return <Spinner />;

  return (
    <ChatInput>
      <MagicWandButton razor={razor} userId="user-1" />
      <EmotionButtons razor={razor} message={message} />
      <PhotoCapture razor={razor} userId="user-1" photoType="receipt" />
    </ChatInput>
  );
}
```

### Individual Hooks

```tsx
import { useMagicWand, useEmotion, useNegotiation, usePhoto } from '@hojai/razor/hooks';

// Magic Wand
const { help, execute, loading } = useMagicWand(razor, 'user-1');
await help('Order pizza');

// Emotion
const { analyze, emotion, buttons } = useEmotion(razor);
await analyze('This is RIDICULOUS!!');

// Negotiation
const { start, counter, accept, walkAway } = useNegotiation(razor, 'user-1');
await start(1000, 'jacket');

// Photo
const { analyze, result } = usePhoto(razor, 'user-1');
await analyze(base64Image, 'receipt');
```

## React Components (`@hojai/razor/components`)

```tsx
import { MagicWandButton, EmotionButtons, PhotoCapture, MomModeUI, NegotiationUI } from '@hojai/razor/components';

// Magic Wand Button
<MagicWandButton
  razor={razor}
  userId="user-1"
  onHelp={(result) => console.log(result)}
  onExecute={(actionId) => handle(actionId)}
/>

// Emotion Buttons
<EmotionButtons
  razor={razor}
  message="This is RIDICULOUS!!"
  onReply={(reply) => sendMessage(reply)}
/>

// Photo Capture
<PhotoCapture
  razor={razor}
  userId="user-1"
  photoType="receipt"
  onAnalyze={(result) => console.log(result)}
/>

// Mom Mode (simplified UI)
<MomModeUI razor={razor} onAction={(id) => handle(id)} />

// Negotiation UI
<NegotiationUI
  razor={razor}
  userId="user-1"
  initialItem="jacket"
  initialPrice={1000}
  onComplete={(result) => console.log('Deal!', result)}
/>
```

## License

MIT
