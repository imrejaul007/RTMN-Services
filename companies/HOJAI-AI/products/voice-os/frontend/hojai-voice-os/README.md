# Hojai VoiceOS - Unified Voice AI Platform

**Version:** 1.0.0 | **Date:** June 1, 2026

---

## What is VoiceOS?

VoiceOS is the **unified voice AI platform** for the Hojai ecosystem. It combines all voice capabilities into a single merchant-facing product.

### VoiceOS Layers

| Layer | Description | Status |
|-------|-------------|---------|
| **Voice Gateway** | Phone, WhatsApp, Web, Mobile | ✅ |
| **Speech Engine** | STT, TTS | ✅ |
| **Voice Brain** | Intent, Context, Memory | ✅ |
| **Action Engine** | Execute transactions | ✅ |
| **Multi-Agent** | Collaborative AI | ✅ |
| **Emotion Engine** | Sentiment detection | ✅ |
| **Human Handoff** | AI → Agent transfer | ✅ |
| **Voice Analytics** | Dashboard & metrics | ✅ |
| **Voice Commerce** | Buy through voice | ✅ |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      VOICE GATEWAY                           │
├─────────────────────────────────────────────────────────────┤
│  Phone (Twilio) │ WhatsApp │ Web │ Mobile │ Video        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      SPEECH ENGINE                            │
├─────────────────────────────────────────────────────────────┤
│  STT: Whisper │ TTS: ElevenLabs │ Translation: Sarvam     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      VOICE BRAIN                            │
├─────────────────────────────────────────────────────────────┤
│  Intent Engine │ Context Engine │ Memory Engine             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      ACTION ENGINE                          │
├─────────────────────────────────────────────────────────────┤
│  Book │ Cancel │ Refund │ Order │ Payment │ Reserve       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      BUSINESS SYSTEMS                        │
├─────────────────────────────────────────────────────────────┤
│  RABTUL │ REZ │ Merchant │ Ride │ Care │ Finance         │
└─────────────────────────────────────────────────────────────┘
```

---

## AI Employees

| Employee | Type | Description |
|----------|------|-------------|
| **Receptionist** | Inbound | Answers calls, books appointments |
| **SDR** | Outbound | Qualifies leads, schedules demos |
| **Support** | Support | Handles complaints, refunds |
| **Booking** | Service | Books tables, appointments |
| **Collections** | Finance | Follows up on payments |
| **CFO** | Finance | Explains financials |
| **HR** | Human Resources | Handles employee queries |

---

## Quick Start

```bash
cd hojai-voice-os
npm install
npm run dev
# Open http://localhost:3000
```

---

## Features

### Dashboard
- Real-time call metrics
- Active AI employees
- Revenue tracking
- Sentiment analysis

### Call Management
- Call history
- Transcripts
- Sentiment badges
- Recording links

### AI Employees
- Performance metrics
- Conversion tracking
- Individual dashboards
- Settings per employee

### Knowledge Base
- FAQ management
- SOP documentation
- Business info
- Multi-language support

### Settings
- Voice selection
- Language support
- Telecom provider
- Integration settings

---

## Integrations

| Integration | Status |
|-------------|--------|
| **Twilio** | ✅ Active |
| **WhatsApp** | ✅ Active |
| **REZ Memory** | ✅ Active |
| **REZ Intent** | ✅ Active |
| **REZ Agents** | ✅ Active |
| **Exotel** | 🔜 Coming |
| **Knowlarity** | 🔜 Coming |
| **Sarvam** | 🔜 Coming |

---

## Multi-Language Support

| Language | Status |
|----------|--------|
| English | ✅ Active |
| Hindi | 🔜 Coming |
| Tamil | 🔜 Coming |
| Telugu | 🔜 Coming |
| Bengali | 🔜 Coming |
| Kannada | 🔜 Coming |

---

## License

Proprietary - Hojai AI
