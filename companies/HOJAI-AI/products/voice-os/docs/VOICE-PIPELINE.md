# 🎤 VoiceOS Pipeline — How RAZO → Genie → VoiceOS Work Together

## Overview

VoiceOS is NOT just a speech interface. It's the **communication layer of an entire intelligence stack** that transforms:

```
User speaks → AI understands → AI responds → Voice delivers
```

---

## The 3 Products

### 1. RAZO Keyboard (Port 4299) — "The Keyboard That Thinks"
**What it does:** Transforms natural language into actionable intents

```
User types/says: "Book a table for 2 at Taj for dinner"
         ↓
RAZO detects: book_restaurant intent
         ↓
Extracts entities: { restaurant: "Taj", guests: 2, time: "dinner" }
         ↓
Executes action via DO App API
```

### 2. Genie AI (Port 4701) — "Your Personal AI"
**What it does:** AI-powered conversational assistant with memory

```
User: "What should I eat for dinner tonight?"
         ↓
Genie checks: Memory (preferences), Twin (health), Calendar (schedule)
         ↓
Genie responds: "Based on your health goals and the Italian dinner you had 
last night, how about Thai? There's a new Thai place nearby with great reviews."
```

### 3. Voice Gateway (Port 4880) — "The Voice Engine"
**What it does:** Speech-to-text and text-to-speech with training pipeline

```
Audio input → STT (Whisper/Deepgram/HOJAI) → Text
Text → TTS (ElevenLabs/Cartesia/HOJAI) → Audio output
```

---

## How They Work Together

### Scenario 1: Voice Command → Food Order

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VOICE PIPELINE                                  │
└─────────────────────────────────────────────────────────────────────────┘

1. USER SPEAKS
   "Hey Genie, order pizza from Domino's"
   ┌─────────────────────────────────────────┐
   │  Microphone captures audio              │
   └─────────────────────────────────────────┘
                    ↓
2. SPEECH-TO-TEXT (Voice Gateway :4880)
   ┌─────────────────────────────────────────┐
   │  Whisper/Deepgram/HOJAI converts:      │
   │  Audio → "order pizza from Domino's"   │
   └─────────────────────────────────────────┘
                    ↓
3. INTENT DETECTION (RAZO :4299)
   ┌─────────────────────────────────────────┐
   │  RAZO Router detects:                   │
   │  Intent: order_food                     │
   │  Entities: { restaurant: "Domino's" }  │
   │  Action: execute via DO App             │
   └─────────────────────────────────────────┘
                    ↓
4. CONTEXT GATHERING (Voice Orchestrator :4898)
   ┌─────────────────────────────────────────┐
   │  • Human Presence → User energy, mood   │
   │  • Relationship OS → How formal?        │
   │  • Conversation Physics → Turn status   │
   │  • Life Timeline → Past preferences    │
   └─────────────────────────────────────────┘
                    ↓
5. AI RESPONSE (Genie :4701)
   ┌─────────────────────────────────────────┐
   │  Genie generates response:               │
   │  "Sure! Your usual Margherita pizza     │
   │   from Domino's? It'll arrive in        │
   │   30 minutes."                          │
   │                                          │
   │  (Based on memory of past orders)       │
   └─────────────────────────────────────────┘
                    ↓
6. VOICE DIRECTIVES (Voice Director :4892)
   ┌─────────────────────────────────────────┐
   │  Generate speech instructions:           │
   │  • Emotion: friendly                    │
   │  • Pace: normal                        │
   │  • Pause before: 200ms                  │
   │  • Volume: medium                      │
   │  • Warmth: 0.7                         │
   └─────────────────────────────────────────┘
                    ↓
7. TEXT-TO-SPEECH (Voice Gateway :4880)
   ┌─────────────────────────────────────────┐
   │  ElevenLabs/Cartesia/HOJAI generates:  │
   │  Audio response with proper tone        │
   └─────────────────────────────────────────┘
                    ↓
8. USER HEARS
   "Sure! Your usual Margherita pizza from 
    Domino's? It'll arrive in 30 minutes."
```

---

### Scenario 2: Conversational AI Companion

```
USER: "I'm feeling stressed about work"
         ↓
Voice Gateway (STT) → "I'm feeling stressed about work"
         ↓
RAZO → Intent: express_emotion, entities: { emotion: "stressed" }
         ↓
Voice Orchestrator:
  • Human Presence → Energy: low, Mood: stressed
  • Conversation Physics → User needs empathy, not solutions
  • Relationship OS → User is close friend level
         ↓
Genie (with context):
  • Checks Memory: recent work events, past stress patterns
  • Checks Life Timeline: similar periods in past
  • Response tone: empathetic, warm, patient
         ↓
Voice Director:
  • Emotion: empathetic
  • Pace: slower (user stressed)
  • Warmth: high
  • Pause: longer pauses (giving space)
         ↓
Voice Gateway (TTS) → "I hear you. Work has been intense lately. 
  Want to talk about what's bothering you, or should we try a 
  quick breathing exercise?"
```

---

### Scenario 3: Morning Briefing with Voice

```
6:00 AM - User wakes up
         ↓
Morning Briefing (Genie):
  • Weather, calendar, emails summarized
  • Mood check: "Good morning! You have 3 meetings today..."
         ↓
Voice Director:
  • Time: morning
  • User energy: likely low (just woke up)
  • Tone: gentle, supportive
  • Pace: slower
         ↓
Voice Gateway (TTS):
  "Good morning, Rejaul. It's Monday, June 29. 
   You have a team standup at 9, a client call at 11, 
   and a project review at 3. The weather is sunny, 28°C.
   Coffee at your usual spot opens in 10 minutes."
```

---

## The 12-Layer VoiceOS Architecture

Each layer serves a purpose:

```
Layer 1: SpeechOS (voice-gateway :4880)
         ├── STT engines (Whisper, Deepgram, Google, Sarvam, HOJAI)
         └── TTS engines (ElevenLabs, Cartesia, HOJAI)

Layer 2: EmotionOS (Genie emotion detection)
         ├── Sentiment analysis
         └── Emotional context

Layer 3: MemoryOS (26 services at 4703, 4152, etc.)
         ├── Past conversations
         ├── User preferences
         └── Learning patterns

Layer 4: RelationshipOS (:4897) ← NEW
         ├── Family, friends, colleagues
         ├── Trust levels
         └── Voice preferences per relationship

Layer 5: ConversationPhysics (:4891) ← NEW
         ├── Turn-taking logic
         ├── Silence handling
         └── Backchannel generation

Layer 6: VoiceDirector (:4892) ← NEW
         ├── Emotion → voice directives
         ├── Pace, pause, volume
         └── SSML markup

Layer 7: PresenceOS (:4896) ← Enhanced
         ├── User energy level
         ├── Attention state
         └── Multi-person detection

Layer 8: TrustOS (voice-identity :4894)
         ├── Voice enrollment
         └── Consent management

Layer 9: MultiAgentVoice (voice-orchestrator :4898) ← NEW
         ├── RAZO → intent
         ├── Genie → response
         └── All other layers → context

Layer 10: LifeTimeline (:4893) ← NEW
         ├── Life chapters
         ├── Milestones
         └── Evolution tracking

Layer 11: HumanGrowth (:4895) ← NEW
         ├── Skills development
         ├── Habits tracking
         └── Goals management

Layer 12: HumanPresence (:4896) ← Enhanced
         ├── Energy analysis
         ├── Attention tracking
         └── Contextual adaptation
```

---

## API Endpoints

### RAZO (Intent Detection)
```bash
POST /api/intent/detect
{
  "text": "order pizza from Domino's"
}

Response:
{
  "intent": "order_food",
  "entities": { "restaurant": "Domino's" },
  "confidence": 0.95,
  "action": "execute"
}
```

### Voice Orchestrator (Full Pipeline)
```bash
POST /api/voice/orchestrate
{
  "userId": "user-123",
  "input": "I'm feeling stressed",
  "context": {
    "relationship": "friend"
  }
}

Response:
{
  "response": "I hear you. Want to talk about it?",
  "audioBase64": "...",
  "emotion": "empathetic",
  "directives": {
    "pace": 0.9,
    "warmth": 0.8,
    "pauseBeforeMs": 300
  },
  "latencyMs": 450
}
```

### Voice Gateway (STT/TTS)
```bash
# STT
POST /api/v1/stt
{ "audio": "...", "engine": "whisper" }

# TTS
POST /api/v1/tts
{ "text": "Hello!", "engine": "elevenlabs" }
```

---

## Example Flows

### Flow 1: Order Food (Text)
```bash
curl -X POST http://localhost:4299/api/intent/detect \
  -d '{"text": "Book a table at Taj for 2"}'

# RAZO returns:
# { "intent": "book_restaurant", "entities": {...} }
```

### Flow 2: Voice Command
```bash
curl -X POST http://localhost:4898/api/voice/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "input": { "audio": "...", "mimeType": "audio/webm" },
    "context": { "relationship": "colleague" }
  }'

# Returns: response + audio + directives
```

### Flow 3: Genie Chat
```bash
curl -X POST http://localhost:4701/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "message": "What should I do today?",
    "context": { "time": "morning" }
  }'
```

---

## Summary

| Product | Port | Role |
|---------|------|------|
| **RAZO** | 4299 | Intent detection from text/voice |
| **Genie** | 4701 | AI conversational brain |
| **Voice Gateway** | 4880 | Speech-to-text, text-to-speech |
| **Voice Orchestrator** | 4898 | Wires all services together |
| **Other VoiceOS** | 4891-4897 | Context, adaptation, directives |

**The magic:** When you say "Hey Genie, order my usual pizza", the entire pipeline activates:
1. Voice → Text (Voice Gateway)
2. Intent → Action (RAZO)
3. Context → Adaptation (All VoiceOS layers)
4. AI → Response (Genie)
5. Response → Voice (Voice Director + Voice Gateway)
