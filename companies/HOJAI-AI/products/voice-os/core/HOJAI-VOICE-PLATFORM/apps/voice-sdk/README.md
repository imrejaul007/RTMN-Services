# HOJAI Voice SDK

Client SDK for integrating HOJAI Voice Platform into any application.

## Installation

```bash
npm install @hojai/voice-sdk
```

## Quick Start

```typescript
import { VoiceAgent } from '@hojai/voice-sdk';

const agent = new VoiceAgent({
  apiKey: 'your-api-key',
  agentId: 'agent-id',
  language: 'en-IN',
  voiceId: '预设-indian-female-1',
});

agent.on('response', (text, audio) => {
  console.log('Agent said:', text);
  if (audio) {
    new Audio(audio).play();
  }
});

await agent.start();
await agent.speak('Namaste! How can I help you?');
```

## React Hook

```typescript
import { useVoiceAgent } from '@hojai/voice-sdk/react';

function MyComponent() {
  const {
    connected,
    start,
    speak,
    onResponse,
  } = useVoiceAgent({
    apiKey: 'your-api-key',
    agentId: 'agent-id',
    language: 'hi-IN',
  });

  onResponse((text, audio) => {
    if (audio) {
      new Audio(audio).play();
    }
  });

  return (
    <div>
      <button onClick={start} disabled={connected}>
        {connected ? 'Connected' : 'Start'}
      </button>
      <button onClick={() => speak('Namaste!')}>
        Speak
      </button>
    </div>
  );
}
```

## Features

- Real-time voice conversations via WebSocket
- Speech-to-Text with multiple engine support
- Text-to-Speech with voice customization
- Intent recognition and sentiment analysis
- Multi-language support (10 Indian languages)
- TypeScript support

## Supported Languages

- English (en-IN)
- Hindi (hi-IN)
- Tamil (ta-IN)
- Telugu (te-IN)
- Bengali (bn-IN)
- Kannada (kn-IN)
- Malayalam (ml-IN)
- Marathi (mr-IN)
- Gujarati (gu-IN)
- Punjabi (pa-IN)

## License

Proprietary - HOJAI-AI
