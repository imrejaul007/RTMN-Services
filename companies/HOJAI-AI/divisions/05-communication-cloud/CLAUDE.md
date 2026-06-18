# Division 5 — AI Communication Cloud

> **Status:** 🟡 ~60% built (voice is strong; other channels are thin)
> **Owner:** HOJAI AI Voice + Channels team

---

## 1. Mission

Every **communication capability** as a service. Voice, phone, WhatsApp, email, SMS, chat, meetings, translation, speech intelligence, notifications. This is what makes HOJAI conversational.

## 2. Target State (per plan)

```
Communication Cloud
├── Voice AI            (speech-to-text, text-to-speech, voice agents)
├── Phone AI            (inbound/outbound call automation)
├── WhatsApp AI         (WhatsApp Business API + AI replies)
├── Email AI            (inbox triage, smart compose, auto-reply)
├── SMS AI              (conversational SMS, two-way)
├── Chat AI             (live chat, web chat, in-app messaging)
├── Meeting AI          (scheduling, transcription, action items)
├── Live Support AI     (human-in-the-loop escalation)
├── Translation AI      (real-time multilingual — supports Hindi/English today)
├── Speech Intelligence (prosody, emotion, accent detection)
└── Notification Platform (multi-channel push, in-app, web push)
```

## 3. Current State — What's Built

| Capability | Service | Port | State |
|---|---|---|---|
| **Voice AI** (TTS/STT/voice profiles) | [services/voice-twin/](../../../services/voice-twin/) | 4876 | ✅ Real |
| **Wake Word Detection** ("Hey Genie") | [services/genie-wake-word-service/](../../../services/genie-wake-word-service/) | 4767 | ✅ Real |
| **Listening Modes** (manual/continuous/passive/smart) | [services/genie-listening-modes/](../../../services/genie-listening-modes/) | 4768 | ✅ Real |
| **Device Integration** (earbuds/watch/glasses/car) | [services/genie-device-integration/](../../../services/genie-device-integration/) | 4769 | ✅ Real |
| **Chat AI** (smart chatbot) | [services/smart-chatbot/](../../../services/smart-chatbot/) | 4878 | ✅ Real |
| **Live Chat** | [services/live-chat/](../../../services/live-chat/) | — | 🟡 Real |
| **Unified Inbox** | [services/unified-inbox/](../../../services/unified-inbox/) | 4870 | ✅ Real |
| **Ticket Engine** | [services/ticket-engine/](../../../services/ticket-engine/) | 4872 | ✅ Real |
| **Notification Service** (email/SMS/push/in-app) | [services/notification-service/](../../../services/notification-service/) | 4870 | ✅ Real |
| **HOJAI Notification Service** (recovered, nodemailer+twilio) | [companies/HOJAI-AI-restored/hojai-notification-service/](../../HOJAI-AI-restored/hojai-notification-service/) | — | 🟡 Recovered |
| **Genie Companion** (emotional chat AI) | [services/genie-companion-service/](../../../services/genie-companion-service/) | 4716 | ✅ Real |
| **Genie Relationship OS** (relationship intelligence chat) | [services/genie-relationship-os/](../../../services/genie-relationship-os/) | 4718 | ✅ Real |
| **RAZO Keyboard** (intent-aware keyboard) | [services/razo-keyboard/](../../../services/razo-keyboard/) | 4725 | ✅ Real |

## 4. What's NOT Built

| Missing | Notes | Effort |
|---|---|---|
| **Phone AI** (full inbound/outbound call agent) | Voice Twin does TTS/STT but no full phone-call orchestration. Need Twilio Voice + dialog manager. | 6-8 weeks |
| **WhatsApp AI** (WhatsApp Business API + AI) | Notification Service has SMS/email but no WhatsApp. Need 360dialog/Twilio + template mgmt. | 4-6 weeks |
| **Email AI** (smart inbox triage + auto-reply) | Inbound email is handled in support-copilot; no full Email AI yet. | 6-8 weeks |
| **Meeting AI** (scheduling + transcription + action items) | Genie Calendar exists but no meeting transcription/AI. | 6-8 weeks |
| **Live Support AI** (human-in-the-loop escalation) | Ticket engine + smart chatbot exist but no formal escalation flow. | 4 weeks |
| **Translation AI** (real-time multilingual) | Genie ecosystem has Hindi support; no real-time translation service. | 4-6 weeks |
| **Speech Intelligence** (prosody, emotion, accent) | Voice Twin does basic; no emotion/accent detection. | 6-8 weeks |

## 5. Gap Score

**~60% of target state is built.** Voice infrastructure is strong (5 services: voice-twin + 3 genie-* + genie-companion). Chat is decent. Phone, WhatsApp, Email, Meeting are missing.

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Effort |
|---|---|---|---|
| 1 | **WhatsApp AI** (huge in India, MENA, LATAM) | 🔴 P0 | 4-6 weeks |
| 2 | **Phone AI** (call automation) | 🟡 P1 | 6-8 weeks |
| 3 | **Email AI** (inbox AI) | 🟡 P1 | 6-8 weeks |
| 4 | **Meeting AI** (transcription + action items) | 🟡 P1 | 6-8 weeks |
| 5 | **Live Support AI** (escalation flow) | 🟡 P1 | 4 weeks |
| 6 | **Translation AI** (multilingual real-time) | 🟢 P2 | 4-6 weeks |
| 7 | **Speech Intelligence** (emotion/accent) | 🟢 P2 | 6-8 weeks |

## 7. Dependencies

- **Depends on:** Division 2 (Voice Twin uses TwinOS), Division 7 (LLM for chat replies), Division 1 (auth)
- **Blocks:** Division 8 (Genie uses these), Division 9 (Industry Solutions need omnichannel)

## 8. Open Questions

- **WhatsApp provider:** 360dialog vs Twilio vs Meta direct — affects cost + reliability. Decision needed.
- **Phone AI carrier:** Twilio vs Plivo vs Vonage vs Exotel (India-specific). Region matters.
- **Meeting AI:** Should we build (Whisper + custom) or buy (Otter, Fireflies.ai, Read.ai)?
- **Translation:** Is this a separate service or a feature of Voice AI / Chat AI?

---

*See also: [services/voice-twin/CLAUDE.md](../../../services/voice-twin/CLAUDE.md), [services/notification-service/CLAUDE.md](../../../services/notification-service/CLAUDE.md), [services/genie-device-integration/CLAUDE.md](../../../services/genie-device-integration/CLAUDE.md)*