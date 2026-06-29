# HOJAI Platform - Production Ready

> **Version:** 3.0
> **Date:** June 29, 2026
> **Status:** Production Ready

---

## Quick Start

```bash
# 1. Run setup
cd platform && chmod +x hojai-cli/setup.sh && ./hojai-cli/setup.sh

# 2. Add API keys to .env

# 3. Test
curl http://localhost:4500/health
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   HOJAI API Gateway                   │
│                  (port 4500)                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │              6 Real Connectors                │  │
│  ├─────────────────────────────────────────────┤  │
│  │ Twilio SMS    │ Twilio Voice  │ WhatsApp    │  │
│  │ Background Check │ Meeting │ Voice-to-Task │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │            4 Production Services             │  │
│  ├─────────────────────────────────────────────┤  │
│  │ Reply Drafting │ Refund Approval │ RCA │ ROI│  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
  ┌──────────┐     ┌──────────┐     ┌──────────┐
  │ Database │     │  Redis   │     │   LLM    │
  │ Postgres │     │          │     │ Claude   │
  └──────────┘     └──────────┘     └──────────┘
```

---

## API Endpoints

### Twilio SMS
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sms/send` | Send SMS |
| POST | `/api/sms/otp` | Send OTP |
| POST | `/api/sms/bulk` | Bulk SMS |
| GET | `/api/sms/balance` | Account balance |
| POST | `/api/sms/validate` | Validate phone |

### Twilio Voice
| Method | Endpoint |
|--------|----------|
| POST | `/api/voice/call` |
| GET | `/api/voice/call/:sid` |
| GET | `/api/voice/recordings/:sid` |

### WhatsApp Business
| Method | Endpoint |
|--------|----------|
| GET | `/webhooks/whatsapp` |
| POST | `/webhooks/whatsapp` |
| POST | `/api/whatsapp/send` |
| POST | `/api/whatsapp/template` |
| POST | `/api/whatsapp/buttons` |

### Background Check
| Method | Endpoint |
|--------|----------|
| POST | `/api/background-check` |
| GET | `/api/background-check/:id` |
| POST | `/api/background-check/webhook` |

### Meeting Recording
| Method | Endpoint |
|--------|----------|
| POST | `/api/meeting/process` |
| GET | `/api/meeting/zoom/:userId` |

### Voice-to-Task
| Method | Endpoint |
|--------|----------|
| POST | `/api/voice/transcribe` |
| POST | `/api/voice/to-tasks` |
| POST | `/api/voice/process` |

### Reply Drafting
| Method | Endpoint |
|--------|----------|
| POST | `/api/reply/draft` |
| POST | `/api/reply/refine` |

### Refund Approval
| Method | Endpoint |
|--------|----------|
| POST | `/api/refund/process` |
| POST | `/api/refund/approve` |

### Root Cause Analysis
| Method | Endpoint |
|--------|----------|
| POST | `/api/incidents/analyze` |

### ROI Calculator
| Method | Endpoint |
|--------|----------|
| POST | `/api/roi/calculate` |
| POST | `/api/roi/department` |

---

## Connectors Built

| Connector | Purpose | Real API |
|-----------|---------|----------|
| twilio-sms-connector | SMS, OTP, Bulk | ✅ Twilio |
| twilio-voice-connector | Voice, AI Answer | ✅ Twilio |
| whatsapp-business-connector | WhatsApp Cloud API | ✅ Meta |
| background-check-connector | KYC, Verification | ✅ Checkr |
| meeting-recording-connector | Zoom/Teams + AI | ✅ Zoom |
| voice-to-task-connector | Whisper transcription | ✅ OpenAI |

## Services Built

| Service | Purpose | Real APIs |
|---------|---------|-----------|
| reply-drafting-service | LLM reply generation | ✅ GPT-4o |
| refund-approval-service | Workflow-based approval | - |
| root-cause-service | Incident analysis | ✅ LLM |
| roi-calculator-service | AI workforce ROI | - |

---

## Environment Variables

```env
# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
AI_CALLBACK_URL=

# WhatsApp
WA_PHONE_ID=
WA_ACCESS_TOKEN=
WA_BUSINESS_ID=
WA_VERIFY_TOKEN=
WA_APP_SECRET=

# Background Check
BACKGROUND_CHECK_API_KEY=

# Zoom
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_ACCOUNT_ID=
ZOOM_WEBHOOK_SECRET=

# LLMs
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Internal Services
AI_AGENT_URL=http://localhost:4004
KB_SERVICE_URL=http://localhost:4500/api/knowledge
```

---

## Deployment

### Docker

```bash
cd platform/docker
docker-compose up -d
```

### Manual

```bash
# Each service
cd platform/services/hojai-api && node src/index.js
cd platform/connectors/twilio-sms && node src/index.js
# ...
```

---

## Tests

```bash
cd platform/services/hojai-api
npx vitest run
```

---

## Architecture Documents

- [PLATFORM_ASSETS.md](PLATFORM_ASSETS.md) - All assets inventory
- [Docker Compose](docker/docker-compose.yml) - Full deployment

---

## Built By

- Date: June 29, 2026
- Phase 2 Complete
