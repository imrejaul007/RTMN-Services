# 🎤 HOJAI VoiceOS - Complete Architecture

> **The Voice Intelligence Layer for the Autonomous Economy**

VoiceOS is NOT just voice dictation. It's the **communication layer of an entire intelligence stack** that connects:
- Your voice → Memory → Personal Twin → Relationships → Emotions → Intelligence → Response

---

## 📊 Complete Service Registry

### VoiceOS Core (15 services)

| # | Service | Port | Purpose | Status |
|---|---------|------|---------|--------|
| 1 | [voice-gateway](core/voice-gateway) | 4880 | STT/TTS with training pipeline | ✅ |
| 2 | [conversation-physics](core/conversation-physics) | 4891 | Turn-taking, silence, backchannel | ✅ |
| 3 | [voice-director](core/voice-director) | 4892 | Emotion → voice directives | ✅ |
| 4 | [life-timeline](core/life-timeline) | 4893 | Life chapters, milestones | ✅ |
| 5 | [voice-identity](core/voice-identity) | 4894 | Voice enrollment, consent | ✅ |
| 6 | [human-growth](core/human-growth) | 4895 | Skills, habits, goals | ✅ |
| 7 | [human-presence](core/human-presence) | 4896 | Energy, attention, multi-person | ✅ |
| 8 | [relationship-os](core/relationship-os) | 4897 | Relationship graph, trust | ✅ |
| 9 | [voice-orchestrator](core/voice-orchestrator) | 4898 | RAZO → Genie → VoiceOS | ✅ |
| 10 | [app-detection](core/app-detection) | 4899 | App context, inline commands | ✅ |
| 11 | [voice-hotkey](core/voice-hotkey) | 4886 | Global hotkey, overlay | ✅ |
| 12 | [attention-engine](core/attention-engine) | - | Attention tracking | ✅ |
| 13 | [conflict-engine](core/conflict-engine) | - | Conflict detection | ✅ |
| 14 | [curiosity-engine](core/curiosity-engine) | - | Curiosity tracking | ✅ |
| 15 | [humor-engine](core/humor-engine) | - | Humor detection | ✅ |

### MemoryOS (26 services)

| Category | Services | Ports |
|----------|----------|-------|
| **Hot Memory** | memory-working-memory, memory-context-engine, memory-confidence | 4780s |
| **Warm Memory** | memory-intelligence, memory-observation, memory-learning-engine | 4785-4788 |
| **Cold Memory** | memory-substrate, memory-federation, memory-import | 4782+ |
| **Emotional** | emotional-memory | 4761 |
| **Voice** | voice-memory-router | 4887 |
| **Governance** | memory-governance, memory-forgetting, memory-lifecycle | 4791-4792 |
| **Network** | memory-network, knowledge-network, data-catalog | 4795-4797 |
| **Advanced** | memory-compiler, memory-truth-engine, memory-multimodal | 4789, 4801-4802 |

### Genie Voice (48 services)

| Category | Services |
|----------|----------|
| **Wake & Listen** | genie-wake-word-service, genie-listening-modes |
| **Memory** | genie-memory-graph, genie-memory-connector, genie-memory-inbox |
| **Twin** | genie-personal-twin, genie-relationship-os |
| **Intelligence** | genie-thinking-engine, genie-research, genie-simulation |
| **Calendar** | genie-calendar-service, genie-briefing-service |
| **Life** | genie-wellness-os, genie-life-gps, genie-life-replay |
| **Commerce** | genie-shopping-agent, genie-money-os |
| **Agents** | genie-creator-agent, genie-consultant-agent, genie-execution-engine |

---

## 🏗️ 12-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VOICEOS 12-LAYER STACK                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 12: Human Presence                                          │
│           └── Energy, attention, context adaptation                  │
│                                                                     │
│  Layer 11: Human Growth                                           │
│           └── Skills, habits, goals tracking                        │
│                                                                     │
│  Layer 10: Life Timeline                                          │
│           └── Life chapters, milestones, evolution                   │
│                                                                     │
│  Layer 9: Multi-Agent Voice                                       │
│           └── RAZO → Genie → VoiceOS orchestration                 │
│                                                                     │
│  Layer 8: TrustOS                                                 │
│           └── Voice identity, consent, verification                │
│                                                                     │
│  Layer 7: PresenceOS                                              │
│           └── Multi-person, group dynamics                          │
│                                                                     │
│  Layer 6: Voice Director                                          │
│           └── Emotion → pace, volume, warmth, pauses               │
│                                                                     │
│  Layer 5: Conversation Physics                                     │
│           └── Turn-taking, silence, backchannel, repair             │
│                                                                     │
│  Layer 4: RelationshipOS                                          │
│           └── Family, friends, trust, voice preferences             │
│                                                                     │
│  Layer 3: MemoryOS                                                │
│           └── Hot, warm, cold, emotional, voice memory              │
│                                                                     │
│  Layer 2: EmotionOS                                                │
│           └── Emotional detection, response                         │
│                                                                     │
│  Layer 1: SpeechOS                                                │
│           └── STT, TTS, Whisper, ElevenLabs, training             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Data Flow

### Voice Command: "Order my usual pizza"

```
USER SPEAKS
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: SpeechOS (voice-gateway :4880)                          │
│ • STT: Whisper/Deepgram → "Order my usual pizza"                │
│ • Detects language, speaker                                      │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: EmotionOS (genie-companion-service)                    │
│ • Detects emotion from voice: happy, hungry                      │
│ • "User seems excited about food"                                 │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: MemoryOS (memory-os :4703)                             │
│ • Queries hot memory: "usual" → Margherita, Domino's              │
│ • Queries preference memory: no allergies                          │
│ • Queries context: last ordered 3 days ago                         │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: RelationshipOS (:4897)                                 │
│ • Detects relationship: user ordering for themselves               │
│ • Trust level: high                                             │
│ • Voice preferences: casual, friendly                             │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 5: ConversationPhysics (:4891)                            │
│ • Turn status: complete                                         │
│ • Should speak now: yes                                          │
│ • Response style: conversational                                  │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 6: VoiceDirector (:4892)                                   │
│ • Emotion: friendly, excited                                    │
│ • Pace: normal (120 WPM)                                        │
│ • Warmth: 0.7                                                  │
│ • Pause before response: 200ms                                    │
│ • SSML markup generated                                         │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 7: PresenceOS (:4896)                                     │
│ • Energy: medium (lunchtime)                                     │
│ • User alone: yes                                               │
│ • Attention: focused                                            │
│ • Adapt: slightly faster response                                 │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 8: TrustOS (voice-identity :4894)                         │
│ • Voice verified: yes                                           │
│ • Consent for food order: granted                               │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 9: MultiAgentVoice (voice-orchestrator :4898)             │
│ • Routes to RAZO: intent = order_food                           │
│ • Routes to Genie: generates personalized response               │
│ • Executes: DO App API                                          │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 10: LifeTimeline (:4893)                                 │
│ • Checks: any dietary changes this month?                        │
│ • No changes detected                                          │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 11: HumanGrowth (:4895)                                   │
│ • Tracks: food ordering habit                                    │
│ • Streak: 5 days                                                │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 12: HumanPresence (:4896)                                 │
│ • Updates: user is happy, engaged                               │
│ • Logs interaction for future context                            │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
VOICE RESPONSE
    │
    ▼
" Sure! Your usual Margherita from Domino's?
 It's 25 minutes away. Want to add garlic bread?"
```

---

## 🔗 Service Wiring

### Voice → Memory → Twin → Relationship

```javascript
// VoiceOrchestrator wires everything
const VOICE_WIRING = {
  // Speech
  'voice-gateway': {
    url: 'http://localhost:4880',
    calls: ['conversation-physics', 'voice-director', 'tts'],
  },

  // Memory
  'memory-os': {
    url: 'http://localhost:4703',
    calls: ['emotional-memory', 'voice-memory-router'],
    queries: ['hot', 'warm', 'cold'],
  },

  // Context
  'genie-gateway': {
    url: 'http://localhost:4701',
    calls: ['personal-twin', 'relationship-os', 'calendar'],
  },

  // Intelligence
  'voice-orchestrator': {
    url: 'http://localhost:4898',
    wires: ['app-detection', 'conversation-physics', 'relationship-os', 'voice-director'],
  },
};
```

---

## 📡 API Quick Reference

### Voice Pipeline

```bash
# Full orchestration
POST /api/v1/pipeline/voice
POST /api/voice/orchestrate

# Voice gateway
POST /api/v1/stt    # Speech-to-text
POST /api/v1/tts    # Text-to-speech
```

### Memory

```bash
# Remember something
POST http://localhost:4703/api/memory/remember

# Query memory
GET  http://localhost:4703/api/memory/:userId

# Emotional memory
POST http://localhost:4761/api/emotion
GET  http://localhost:4761/api/emotion/:entityId/timeline
```

### Context

```bash
# Personal twin
GET  http://localhost:4701/api/user/:userId/context

# Relationships
GET  http://localhost:4897/api/relationships/:userId

# Presence
POST http://localhost:4896/api/presence
GET  http://localhost:4896/api/presence/:userId/adaptation
```

### Intelligence

```bash
# Genie chat
POST http://localhost:4701/api/chat

# Briefing
GET  http://localhost:4706/api/briefing/:userId/today

# Calendar
POST http://localhost:4709/api/events
```

---

## 🧠 Memory Types

| Type | Temperature | Latency | Use Case |
|------|------------|---------|---------|
| **Hot Memory** | Active context | <10ms | Current conversation |
| **Warm Memory** | Recent facts | <50ms | Today's events |
| **Cold Memory** | Long-term | <200ms | Historical data |
| **Emotional** | Feelings | <50ms | Mood tracking |
| **Voice** | Acoustic | <10ms | Voice patterns |

---

## 🎯 Wispr Flow vs HOJAI VoiceOS

| Feature | Wispr Flow | HOJAI VoiceOS |
|---------|-----------|---------------|
| Voice dictation | ✅ | ✅ |
| Speed | <100ms | <150ms (target) |
| Wake word | ❌ | ✅ "Hey Genie" |
| Memory | ❌ | ✅ 26 services |
| Personal twin | ❌ | ✅ |
| Emotional intelligence | ❌ | ✅ |
| Relationship awareness | ❌ | ✅ |
| Multi-person support | ❌ | ✅ |
| Life timeline | ❌ | ✅ |
| Skills/habits tracking | ❌ | ✅ |
| Price | $15/mo | Free |
| Platform | Mac only | Cross-platform |

---

## 🚀 Getting Started

```bash
# Start all VoiceOS services
bash scripts/dev-stack.sh start

# Or individual services
cd companies/HOJAI-AI/products/voice-os/core/voice-gateway && npm start
cd companies/HOJAI-AI/products/voice-os/core/voice-orchestrator && npm start
cd companies/HOJAI-AI/products/memory-os && npm start
```

---

## 📁 Documentation Structure

```
voice-os/
├── docs/
│   ├── VOICE-OS-COMPLETE.md        # This file
│   ├── VOICE-PIPELINE.md           # How services wire together
│   └── WISPR-FLOW-COMPARISON.md   # Competitive analysis
├── core/
│   ├── voice-gateway/             # STT/TTS
│   ├── voice-orchestrator/        # Main orchestrator
│   ├── conversation-physics/      # Turn management
│   ├── voice-director/            # Voice directives
│   ├── relationship-os/           # Relationship graph
│   ├── human-presence/           # Energy, attention
│   ├── human-growth/             # Skills, habits
│   ├── life-timeline/           # Life chapters
│   ├── voice-identity/           # Voice auth
│   ├── app-detection/            # App context
│   └── voice-hotkey/             # Global hotkey
└── platform/
    └── memory-os/                 # 26 memory services
```

---

*Last Updated: June 29, 2026*
*RTMN VoiceOS - The Voice Intelligence Layer*
