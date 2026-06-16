# RAZO Keyboard - Communication OS

**Version:** 1.0 | **Date:** June 15, 2026  
**Status:** ✅ ACTIVE - Intent Router + Communication OS  
**Port:** 4725

---

## Overview

**Tagline:** *"The Keyboard That Thinks"*

RAZO Keyboard is the Communication OS for the RTMN ecosystem. It transforms every text input into actionable intents, connecting users to Genie AI, DO App, SUTAR OS, and all 24 Industry Operating Systems through a unified communication layer.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RAZO KEYBOARD ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      INTENT ROUTER (4725)                         │  │
│  │  Text Input → Intent Detection → Context Resolution → Action       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      COMMUNICATION LAYER                           │  │
│  │  WhatsApp │ Telegram │ SMS │ Email │ In-App │ Voice              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      ACTION LAYER                                 │  │
│  │  DO App │ Genie │ Merchant │ SUTAR │ Copilot                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Services

| Port | Service | Purpose |
|------|---------|---------|
| 4725 | RAZO Keyboard | Main communication OS |
| 4726 | RAZO Intent Router | Intent detection & routing |
| 4727 | RAZO Context Engine | Context resolution |
| 4728 | RAZO Channel Bridge | Multi-channel messaging |
| 4729 | RAZO Action Engine | Action execution |

---

## Intent Types

| Intent | Action | Connected Service |
|--------|--------|-------------------|
| `order_food` | Place order | DO App → Restaurant OS |
| `book_hotel` | Book room | DO App → Hotel OS |
| `send_message` | Send message | WhatsApp → RAZO |
| `ask_genie` | Query AI | Genie Gateway |
| `make_payment` | Process payment | SUTAR Escrow |
| `check_status` | Check order | Merchant Copilot |
| `schedule_meeting` | Book meeting | Calendar Service |
| `track_expense` | Log expense | Financial Twin |
| `find_service` | Search service | Discovery OS |
| `book_appointment` | Book service | Industry OS |
| `track_order` | Track delivery | Logistics OS |
| `get_insurance` | Insurance quote | Insurance OS |
| `apply_loan` | Loan application | Financial OS |

---

## Consumer Triangle

RAZO is one-third of the **Consumer Triangle**:

| Component | Port | Role |
|-----------|------|------|
| **Genie** | 4701 | Thinks - AI reasoning & memory |
| **DO App** | 3001 | Acts - Execute transactions |
| **RAZO** | 4725 | Communicates - Messaging & intents |

### Integration Flow

```
User types "Order pizza from Domino's"
         ↓
RAZO Intent Router detects `order_food`
         ↓
RAZO Context Engine resolves "Domino's" → Merchant ID
         ↓
RAZO Action Engine calls DO App API
         ↓
DO App → Restaurant OS → Place order
         ↓
RAZO sends confirmation via WhatsApp
```

---

## Channel Integration

### WhatsApp (Primary)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/whatsapp/webhook` | POST | Receive WhatsApp messages |
| `/api/whatsapp/send` | POST | Send WhatsApp message |
| `/api/whatsapp/session/:phone` | GET | Get session by phone |

### Telegram

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/telegram/webhook` | POST | Receive Telegram updates |
| `/api/telegram/send` | POST | Send Telegram message |

### SMS

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sms/send` | POST | Send SMS message |
| `/api/sms/receive` | POST | Receive SMS |

### Email

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/email/send` | POST | Send email |
| `/api/email/webhook` | POST | Receive email replies |

---

## External Integrations

| Service | Port | Purpose |
|---------|------|---------|
| Genie Gateway | 4701 | AI reasoning |
| DO App Backend | 3001 | Transaction execution |
| SUTAR Gateway | 4140 | Autonomous operations |
| Business Copilot | 4600 | Business intelligence |
| CorpID | 4300 | Universal identity |

---

## Quick Start

```bash
# Start RAZO Keyboard
cd razo-keyboard && npm install && npm start

# Health check
curl http://localhost:4725/health

# Test intent detection
curl -X POST http://localhost:4725/api/intent/detect \
  -H "Content-Type: application/json" \
  -d '{"text": "Order pizza from Domino\'s"}'
```

---

## Environment Variables

```env
# Service URLs
GENIE_GATEWAY_URL=http://localhost:4701
DO_APP_URL=http://localhost:3001
SUTAR_GATEWAY_URL=http://localhost:4140
COPILOT_URL=http://localhost:4600
CORPID_URL=http://localhost:4300

# WhatsApp
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# Telegram
TELEGRAM_BOT_TOKEN=

# SMS Provider
SMS_API_KEY=
SMS_SENDER_ID=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

---

## Response Format

All services return consistent JSON:

```typescript
{
  success: true,
  data?: T,
  error?: { code: string, message: string },
  meta: {
    timestamp: string,
    requestId: string,
    intent?: string,
    confidence?: number
  }
}
```

---

## License

Proprietary - RAZO Keyboard / HOJAI AI

---

*Last Updated: June 15, 2026*
