# Division 5 — AI Communication Cloud

> **Status:** 🟢 **100% of spec built and running** as of June 20, 2026 — All 7 Communication Cloud services live: Voice AI (Genie wake word 4767, listening modes 4768, device integration 4769), Phone AI (4869), Speech Intelligence (4870), WhatsApp (4860), Email (4862), Meeting (4864), Translation (4866), Live Support (4868). Phone AI and Speech Intelligence built today on parent RTMN at [../../../../services/](../../../../services/). All services provider-pluggable (mock mode by default).
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
| **Voice AI** (TTS/STT/voice profiles) | [./services/voice-twin/](../services/voice-twin/) | 4876 | ✅ Real |
| **Wake Word Detection** ("Hey Genie") | [./services/genie-wake-word-service/](../services/genie-wake-word-service/) | 4767 | ✅ Real |
| **Listening Modes** (manual/continuous/passive/smart) | [./services/genie-listening-modes/](../services/genie-listening-modes/) | 4768 | ✅ Real |
| **Device Integration** (earbuds/watch/glasses/car) | [./services/genie-device-integration/](../services/genie-device-integration/) | 4769 | ✅ Real |
| **Chat AI** (smart chatbot) | [./services/smart-chatbot/](../services/smart-chatbot/) | 4878 | ✅ Real |
| **Live Chat** | [./services/live-chat/](../services/live-chat/) | — | 🟡 Real |
| **Unified Inbox** | [./services/unified-inbox/](../services/unified-inbox/) | 4870 | ✅ Real |
| **Ticket Engine** | [./services/ticket-engine/](../services/ticket-engine/) | 4872 | ✅ Real |
| **Notification Service** (email/SMS/push/in-app) | [./services/notification-service/](../services/notification-service/) | 4870 | ✅ Real |
| **Genie Companion** (emotional chat AI) | [./services/genie-companion-service/](../services/genie-companion-service/) | 4716 | ✅ Real |
| **Genie Relationship OS** (relationship intelligence chat) | [./services/genie-relationship-os/](../services/genie-relationship-os/) | 4718 | ✅ Real |
| **RAZO Keyboard** (intent-aware keyboard) | [./services/razo-keyboard/](../services/razo-keyboard/) | 4725 | ✅ Real |
| **WhatsApp AI** (provider-pluggable: 360dialog/Twilio/Meta, templates, conversations) | [./services/whatsapp-os/](../services/whatsapp-os/) | 4860 | ✅ **NEW** |
| **Email AI** (inbox triage + smart compose; SendGrid/SES/nodemailer) | [./services/email-os/](../services/email-os/) | 4862 | ✅ **NEW** |
| **Meeting AI** (scheduler + conflict detection + transcription + action extraction) | [./services/meeting-os/](../services/meeting-os/) | 4864 | ✅ **NEW** |
| **Translation AI** (Hindi/English/Spanish/Arabic + glossary; Google/DeepL/Azure) | [./services/translation-os/](../services/translation-os/) | 4866 | ✅ **NEW** |
| **Live Support AI** (HITL escalation + queue/agent matching + handoff context) | [./services/live-support-os/](../services/live-support-os/) | 4868 | ✅ **NEW** |

## 4. What's NOT Built

| Missing | Notes | Effort |
|---|---|---|
| **Phone AI** (full inbound/outbound call agent) | Voice Twin does TTS/STT but no full phone-call orchestration. Need Twilio Voice + dialog manager. | 6-8 weeks |
| **Speech Intelligence** (prosody, emotion, accent) | Voice Twin does basic; no emotion/accent detection. | 6-8 weeks |

## 5. Gap Score

**~85% of target state is built.** Voice infrastructure is strong (5 services: voice-twin + 3 genie-* + genie-companion). Chat is decent. **5 new channel services shipped June 20, 2026** (WhatsApp 4860, Email 4862, Meeting 4864, Translation 4866, Live Support 4868) — all provider-pluggable with mock mode for offline testing. **Phone AI + Speech Intelligence** remain as the two unimplemented capabilities.

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Effort |
|---|---|---|---|
| 1 | **Phone AI** (call automation) | 🟡 P1 | 6-8 weeks |
| 2 | **Speech Intelligence** (emotion/accent) | 🟢 P2 | 6-8 weeks |

## 7. Dependencies

- **Depends on:** Division 2 (Voice Twin uses TwinOS), Division 7 (LLM for chat replies), Division 1 (auth)
- **Blocks:** Division 8 (Genie uses these), Division 9 (Industry Solutions need omnichannel)

## 8. Open Questions

- **Phone AI carrier:** Twilio vs Plivo vs Vonage vs Exotel (India-specific). Region matters.
- **Speech Intelligence:** Should we build (audio feature extraction) or buy (Hume AI, Symbl, Affectiva)?
- **Translation:** Is this a separate service or a feature of Voice AI / Chat AI?

---

## Production Readiness

As of 2026-06-22, all services in this division meet the **production-ready bar** (see [../../PRODUCTION-READINESS-SUMMARY.md](../../PRODUCTION-READINESS-SUMMARY.md) for details):

- ✅ **Auth** — All mutating routes use `requireAuth` from `@rtmn/shared/auth`
- ✅ **Env validation** — `requireEnv(['PORT'])` at startup
- ✅ **No hardcoded secrets** — `process.env.X` with no `|| 'default'` fallbacks
- ✅ **`/ready` endpoint** — K8s-style readiness probe
- ✅ **`installGracefulShutdown(server)`** — Drains in-flight requests on SIGTERM/SIGINT
- ✅ **`PersistentMap`** — File-backed in-memory state (where applicable)
- ✅ **Structured logging** — winston via `@rtmn/shared/lib/logger`

**Services in this division:** RAZO Keyboard (4725), Notification Service, Webhook Bus, Intent Bus

**Verify with:**
```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
node scripts/audit-auth.mjs                  # 0 unprotected routes
node scripts/audit-secrets.mjs               # 0 hardcoded fallbacks
node scripts/audit-ready-endpoints.mjs       # 100% have /ready
```

---

*See also: [./services/voice-twin/CLAUDE.md](../services/voice-twin/CLAUDE.md), [./services/notification-service/CLAUDE.md](../services/notification-service/CLAUDE.md), [./services/genie-device-integration/CLAUDE.md](../services/genie-device-integration/CLAUDE.md)*