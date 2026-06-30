# Voice Cloning Service

**Port:** 4897  
**Version:** 1.0.0

Voice cloning and synthesis for Genie RAZO. This enables Genie to **speak as you** with your permission.

## Setup

```bash
# ElevenLabs API (production)
export ELEVENLABS_API_KEY=your_api_key
```

## Usage

### Clone Voice

```javascript
// POST /api/voice/clone
await fetch('http://localhost:4897/api/voice/clone', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'rejaul_001',
    name: 'Rejaul',
    samples: [audio1, audio2, audio3], // 3-30 minutes recommended
    description: 'Rejaul Karim'
  })
});
```

### Speak as User

```javascript
// POST /api/voice/speak
const result = await fetch('http://localhost:4897/api/voice/speak', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'rejaul_001',
    text: 'Hello, thank you for calling. How can I help you today?',
    emotion: 'professional' // neutral, happy, sad, excited, calm
  })
});

// result.audio — base64 encoded audio
```

### RAZO Integration

```javascript
// POST /api/razo/speak
// Genie thinks → RAZO speaks with YOUR voice
await fetch('http://localhost:4897/api/razo/speak', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'rejaul_001',
    message: 'I confirm our meeting tomorrow at 10 AM.',
    emotion: 'professional',
    channel: 'whatsapp' // or 'sms', 'call'
  })
});
```

## AI Disclosure

Required by Genie Constitution:

> "This is Rejaul's Genie AI assistant speaking with his permission."

```javascript
// POST /api/voice/prepare-message
const prepared = await fetch('http://localhost:4897/api/voice/prepare-message', {
  method: 'POST',
  body: JSON.stringify({
    userName: 'Rejaul',
    message: 'I confirm our meeting.',
    addDisclosure: true
  })
});

// prepared.withDisclosure
// "This is Rejaul's Genie AI assistant speaking with his permission. I confirm our meeting."
```

## Emotional Voice Rendering

Same voice, different emotions:

| Emotion | Stability | Style | Use Case |
|---------|-----------|-------|----------|
| neutral | 0.5 | 0.5 | Professional |
| happy | 0.4 | 0.8 | Celebrations |
| sad | 0.6 | 0.3 | Condolences |
| excited | 0.3 | 1.0 | Announcements |
| calm | 0.7 | 0.2 | Meditation |

---

*Genie thinks, RAZO speaks with your voice.*
