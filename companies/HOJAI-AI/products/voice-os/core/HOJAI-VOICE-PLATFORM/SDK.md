# HOJAI VOICE SDK - Documentation

## Installation

```bash
npm install @hojai/voice-sdk
```

## Quick Start

### Node.js / Vanilla JavaScript

```typescript
import { VoiceAgent } from '@hojai/voice-sdk';

const agent = new VoiceAgent({
  apiKey: 'your-api-key',
  agentId: 'your-agent-id',
  language: 'en-IN',
  voiceId: '预设-indian-female-1',
});

// Listen for responses
agent.on('response', (text, audio) => {
  console.log('Agent:', text);
  if (audio) {
    // Play the audio response
    const audioElement = new Audio(audio);
    audioElement.play();
  }
});

// Handle errors
agent.on('error', (error) => {
  console.error('Error:', error);
});

// Start the session
await agent.start();

// Speak a greeting
await agent.speak('Namaste! How can I help you today?');
```

### React

```typescript
import { useVoiceAgent } from '@hojai/voice-sdk/react';

function VoiceAssistant() {
  const {
    connected,
    start,
    speak,
    onResponse,
    onError,
  } = useVoiceAgent({
    apiKey: 'your-api-key',
    agentId: 'your-agent-id',
    language: 'hi-IN',
  });

  // Set up event handlers
  useEffect(() => {
    onResponse((text, audio) => {
      console.log('Agent:', text);
      if (audio) {
        new Audio(audio).play();
      }
    });

    onError((error) => {
      console.error('Error:', error);
    });
  }, [onResponse, onError]);

  return (
    <div>
      <button onClick={start} disabled={connected}>
        {connected ? 'Connected' : 'Start'}
      </button>
      <button onClick={() => speak('नमस्ते!')}>
        Say Namaste
      </button>
    </div>
  );
}
```

## VoiceAgent Class

### Constructor Options

```typescript
interface VoiceAgentOptions {
  apiKey: string;           // Required: API key
  agentId: string;          // Required: Voice agent ID
  baseUrl?: string;        // Optional: API base URL (default: http://localhost:4850)
  language?: string;        // Optional: Language code (default: en-IN)
  voiceConfig?: {
    voiceId?: string;      // Optional: Voice ID
    ttsEngine?: string;    // Optional: TTS engine
    sttEngine?: string;   // Optional: STT engine
    speed?: number;        // Optional: Speech speed
    pitch?: number;        // Optional: Speech pitch
  };
  autoConnect?: boolean;    // Optional: Auto-connect on init (default: true)
}
```

### Methods

#### `start(): Promise<void>`
Connect to the voice service and start a session.

```typescript
await agent.start();
```

#### `stop(): Promise<void>`
End the current session.

```typescript
await agent.stop();
```

#### `speak(text: string, options?: SynthesisOptions): Promise<void>`
Convert text to speech and play.

```typescript
await agent.speak('Namaste!', {
  speed: 1.0,
  pitch: 1.0,
});
```

#### `sendMessage(text: string): Promise<void>`
Send a text message and get a response.

```typescript
const { response, intent, sentiment } = await agent.sendMessage(
  'I want to track my order'
);
console.log('Response:', response);
console.log('Intent:', intent);
console.log('Sentiment:', sentiment);
```

#### `processAudio(audio: Blob | ArrayBuffer): Promise<void>`
Send audio and get a response.

```typescript
await agent.processAudio(audioBlob);
```

#### `startVoiceConversation()`
Start a real-time voice conversation using the microphone.

```typescript
const { stop } = await agent.startVoiceConversation(
  (transcript) => {
    console.log('User said:', transcript);
  },
  (response, audio) => {
    console.log('Agent:', response);
    if (audio) new Audio(audio).play();
  },
  (error) => {
    console.error('Error:', error);
  }
);

// To stop:
stop();
```

### Events

```typescript
agent.on('connected', (session) => {
  console.log('Session started:', session.sessionId);
});

agent.on('disconnected', () => {
  console.log('Session ended');
});

agent.on('response', (text, audio) => {
  console.log('Agent said:', text);
});

agent.on('speech', (text, intent) => {
  console.log('User said:', text);
  console.log('Detected intent:', intent);
});

agent.on('sentiment', (sentiment) => {
  console.log('Sentiment:', sentiment);
});

agent.on('error', (error) => {
  console.error('Error:', error);
});
```

### Properties

```typescript
agent.isConnected();  // boolean - Check connection status
```

## VoiceSession Class

Lower-level WebSocket session for custom implementations.

```typescript
import { VoiceSession } from '@hojai/voice-sdk';

const session = new VoiceSession({
  apiKey: 'your-api-key',
  baseUrl: 'http://localhost:4850',
  autoConnect: true,
});

// Send audio
const mediaRecorder = new MediaRecorder(stream);
mediaRecorder.ondataavailable = async (e) => {
  await session.sendAudio(e.data, 'audio/webm');
};
mediaRecorder.start();

// Send text
await session.sendText('Hello!');

// Handle events
session.on('response', (text, audio) => {
  // ...
});
```

## React Hook

```typescript
import { useVoiceAgent } from '@hojai/voice-sdk/react';

const {
  connected,           // boolean
  sessionInfo,         // SessionInfo | null
  error,               // Error | null
  start,               // () => Promise<void>
  stop,                // () => Promise<void>
  speak,               // (text: string) => Promise<void>
  sendMessage,         // (text: string) => Promise<void>
  processAudio,        // (audio: Blob) => Promise<void>
  startStreaming,      // () => Promise<void>
  stopStreaming,       // () => void
  onSpeech,            // (callback) => void
  onResponse,          // (callback) => void
  onSentiment,          // (callback) => void
} = useVoiceAgent({
  apiKey: 'your-api-key',
  agentId: 'your-agent-id',
  language: 'en-IN',
  autoStart: false,
});
```

## Type Definitions

### Supported Languages
```typescript
type SupportedLanguage =
  | 'en-IN' | 'hi-IN' | 'ta-IN' | 'te-IN' | 'bn-IN'
  | 'kn-IN' | 'ml-IN' | 'mr-IN' | 'gu-IN' | 'pa-IN';
```

### Supported Voices
```typescript
type SupportedVoice =
  | '预设-indian-female-1' | '预设-indian-female-2'
  | '预设-indian-male-1' | '预设-indian-male-2'
  | '预设-indian-child-1';
```

### TTS Engines
```typescript
type TTSEngine = 'elevenlabs' | 'cartesia' | 'sarvam';
```

### STT Engines
```typescript
type STTEngine = 'whisper' | 'sarvam' | 'google';
```

### Intent Result
```typescript
interface IntentResult {
  intent: string;
  confidence: number;
  parameters: Record<string, unknown>;
  entities: Array<{
    entity: string;
    type: string;
    value: unknown;
    confidence: number;
  }>;
}
```

### Sentiment Score
```typescript
interface SentimentScore {
  label: 'positive' | 'negative' | 'neutral';
  score: number;      // -1 to 1
  confidence: number; // 0 to 1
}
```

## Examples

### Voice Commerce
```typescript
const agent = new VoiceAgent({
  apiKey: '...',
  agentId: 'commerce-agent-id',
  language: 'hi-IN',
});

await agent.start();

agent.on('response', async (text, audio) => {
  if (audio) {
    await new Audio(audio).play();
  }

  // Handle different responses
  if (text.includes('added to cart')) {
    console.log('Item added!');
  }
});

await agent.speak('नमस्ते! आज आप क्या ऑर्डर करना चाहेंगे?');
```

### Customer Support
```typescript
const agent = new VoiceAgent({
  apiKey: '...',
  agentId: 'support-agent-id',
});

agent.on('sentiment', (sentiment) => {
  if (sentiment.label === 'negative' && sentiment.score < -0.5) {
    // Escalate to human
    agent.speak('Let me connect you with a specialist.');
  }
});

await agent.start();
await agent.speak('Hello! How can I assist you today?');
```

### Appointment Booking
```typescript
const agent = new VoiceAgent({
  apiKey: '...',
  agentId: 'appointment-agent-id',
  language: 'ta-IN',
});

const result = await agent.sendMessage(
  'Book an appointment with Dr. Sharma tomorrow at 10am'
);

console.log('Appointment:', result.response);
console.log('Intent:', result.intent);
```

## Browser Compatibility

Requires:
- WebSocket support
- MediaDevices API (for microphone)
- ES6+ features

Tested on:
- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

## License

Proprietary - HOJAI-AI
