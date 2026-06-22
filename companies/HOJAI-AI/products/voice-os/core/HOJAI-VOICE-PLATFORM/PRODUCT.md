# HOJAI VOICE PLATFORM
## Product Documentation

**Version:** 1.0.0
**Date:** June 3, 2026
**Built from:** voice-service, hojai-voice-os, hojai-telecom-bridge, hojai-multilingual

---

## WHAT IS HOJAI VOICE?

HOJAI Voice is a comprehensive voice AI platform for enterprise customer interactions. It handles phone calls, transcribes speech, understands intent, and responds naturally.

**Competitor:** ElevenLabs, Wispr Flow, Twilio

---

## PRODUCTS

### 1. Voice Agent (Core)
- [x] Speech-to-Text (Whisper)
- [x] Intent Recognition
- [x] Text-to-Speech
- [x] Multi-turn Conversation
- [x] Call Transfer
- [x] Sentiment Detection

### 2. Voice Commerce
- [x] Product Search by Voice
- [x] Order Placement
- [x] Order Tracking
- [x] Appointment Booking
- [x] Customer Support

### 3. Telecom Bridge
- [x] Twilio Integration
- [x] Exotel Integration
- [x] Knowlarity Integration
- [x] SIP Trunking

### 4. Multilingual Voice
- [x] Hindi
- [x] Tamil
- [x] Telugu
- [x] Bengali
- [x] Kannada
- [x] Malayalam
- [x] Marathi
- [x] Gujarati
- [x] Punjabi
- [x] English

---

## USE CASES

### Customer Service
```
"Call the restaurant and book a table for 4 tonight"
```

### Voice Commerce
```
"Order my usual pizza delivery"
```

### Voice Search
```
"Find me a hotel near the beach with pool"
```

### Appointments
```
"Schedule an appointment with Dr. Sharma tomorrow at 10am"
```

---

## API

```javascript
// Initialize voice agent
const voice = new VoiceAgent({
  language: 'en-IN',
  voiceId: '预设-indian-female-1',
  greeting: 'Namaste! How can I help you today?'
});

// Handle incoming call
voice.on('speech', async (text, audio) => {
  const intent = await voice.detectIntent(text);
  const response = await voice.handleIntent(intent);
  await voice.speak(response);
});

// Start session
voice.start(sessionId);
```

---

## PRICING

| Plan | Price | Features |
|------|-------|----------|
| Starter | ₹9,999/month | 1000 mins, 1 agent |
| Growth | ₹24,999/month | 5000 mins, 5 agents |
| Enterprise | Custom | Unlimited mins, custom |

---

## INTEGRATIONS

### Already Built
- Twilio
- Exotel
- Knowlarity
- WhatsApp Voice
- Web SDK
- Mobile SDK

---

**Last Updated:** June 3, 2026
