# @hojai/genie-client

Official JavaScript/TypeScript SDK for HOJAI Genie AI.

## Quick Start

```bash
npm install @hojai/genie-client
```

```typescript
import { GenieClient, BriefingType } from '@hojai/genie-client';

const genie = new GenieClient({ apiKey: 'YOUR_API_KEY' });

// Chat
const response = await genie.sendMessage("What's on my calendar today?");
console.log(response.text);

// Briefing
const briefing = await genie.getBriefing(BriefingType.Morning);
briefing.sections.forEach(s => console.log(`${s.title}: ${s.content}`));

// Memory search
const memories = await genie.searchMemories('project meeting', 5);
console.log(memories);

// Voice session
const session = await genie.startVoiceSession(
  { sampleRate: 16000, language: 'en-US', wakeWordEnabled: true },
  {
    onTranscript: (text) => console.log('User:', text),
    onResponse: (res) => console.log('Genie:', res.text),
    onError: (err) => console.error(err),
  }
);
// Later: await session.stop();
```

## CommonJS

```javascript
const { GenieClient } = require('@hojai/genie-client');
const genie = new GenieClient({ apiKey: process.env.GENIE_API_KEY });
```

## Publishing

```bash
cd npm-package
npm publish --access public
```
