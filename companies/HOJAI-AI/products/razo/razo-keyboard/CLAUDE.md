# RAZO Keyboard - Communication OS

**Version:** 1.0.0  
**Port:** 4725  
**Status:** ✅ FULLY IMPLEMENTED

---

## Overview

RAZO Keyboard is the **Communication OS** for the RTMN Consumer Triangle:

```
┌─────────────────────────────────────────────────────────────┐
│                  CONSUMER TRIANGLE                           │
│                                                             │
│     GENIE (Think)  ←AI Brain→  RAZO (Communicate)           │
│        4701                   4725                          │
│           ↘                     ↑                            │
│            →→→  DO (Act)  ←←←←←←                             │
│               3001                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
services/razo-keyboard/
├── src/
│   ├── index.js              # Main entry point (Express server)
│   ├── intents/
│   │   └── router.js        # Intent detection engine (22 intents)
│   ├── channels/
│   │   └── bridge.js         # Multi-channel messaging
│   ├── context/
│   │   └── engine.js         # Session & conversation management
│   ├── actions/
│   │   └── engine.js         # Action routing to services
│   └── routes/
│       ├── intents.js        # /api/intent/*
│       ├── messages.js       # /api/message/*
│       ├── sessions.js       # /api/session/*
│       └── webhooks.js       # /api/webhook/*
├── test/
└── package.json
```

---

## Intent Types (22 Total)

### Commerce Intents
| Intent | Action | Service |
|--------|--------|---------|
| `order_food` | Place order | DO App → Restaurant OS |
| `book_hotel` | Book room | DO App → Hotel OS |
| `book_appointment` | Book service | DO App |
| `purchase_subscription` | Subscribe | DO App |

### Financial Intents
| Intent | Action | Service |
|--------|--------|---------|
| `make_payment` | Transfer money | SUTAR Escrow |
| `track_expense` | Log expense | Financial Twin |
| `check_balance` | Check balance | Financial Twin |
| `apply_loan` | Loan application | Financial OS |

### Communication Intents
| Intent | Action | Service |
|--------|--------|---------|
| `send_message` | Send message | Channel Bridge |
| `schedule_meeting` | Book meeting | Calendar |

### Information Intents
| Intent | Action | Service |
|--------|--------|---------|
| `ask_genie` | AI query | Genie Gateway |
| `get_status` | Check status | DO App |
| `find_service` | Search | Discovery |
| `get_recommendation` | Get suggestions | Copilot |
| `check_availability` | Check slots | Industry OS |

### Action Intents
| Intent | Action | Service |
|--------|--------|---------|
| `track_order` | Track delivery | DO App |
| `cancel_order` | Cancel order | DO App |
| `request_refund` | Request refund | SUTAR |
| `file_complaint` | File complaint | Support |
| `update_profile` | Update info | CorpID |
| `get_insurance` | Insurance quote | Insurance OS |

---

## API Endpoints

### Intent Detection
```
POST /api/intent/detect     # Detect intent from text
POST /api/intent/execute    # Detect + execute in one call
POST /api/intent/parse      # Parse structured intent
POST /api/intent/validate   # Validate parameters
GET  /api/intent/list       # List all intents
```

### Messaging
```
POST /api/message/send      # Send message
POST /api/message/schedule  # Schedule message
POST /api/message/broadcast # Broadcast to many
POST /api/message/template  # Send templated message
GET  /api/message/channels  # Channel status
```

### Sessions
```
POST /api/session/create    # Create session
GET  /api/session/:id       # Get session
PUT  /api/session/:id/context # Update context
POST /api/session/:id/message # Add to history
DELETE /api/session/:id/end # End session
```

### Webhooks
```
GET  /api/webhook/whatsapp  # WhatsApp verification
POST /api/webhook/whatsapp  # Receive WhatsApp
POST /api/webhook/telegram  # Receive Telegram
POST /api/webhook/sms       # Receive SMS
POST /api/webhook/email     # Receive email
```

---

## Example Usage

### Detect Intent
```bash
curl -X POST http://localhost:4725/api/intent/detect \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Order pizza from Domino\'s",
    "userId": "user_123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": "order_food",
    "confidence": 0.95,
    "entities": {
      "item": "pizza",
      "restaurant": "Domino's"
    },
    "action": "do-app",
    "endpoint": "/api/orders"
  }
}
```

### Execute Intent
```bash
curl -X POST http://localhost:4725/api/intent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Pay ₹500 to Rahul for lunch",
    "userId": "user_123"
  }'
```

### Send Message
```bash
curl -X POST http://localhost:4725/api/message/send \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "whatsapp",
    "to": "919876543210",
    "message": "Your order is confirmed!"
  }'
```

---

## Service Integrations

| Service | Port | Purpose |
|---------|------|---------|
| Genie Gateway | 4701 | AI reasoning |
| DO App | 3001 | Transactions |
| SUTAR | 4140 | Autonomous ops |
| Business Copilot | 4600 | BI queries |
| CorpID | 4300 | Identity |
| Calendar | 4709 | Scheduling |
| Financial Twin | 4715 | Finance tracking |
| Unified Hub | 4399 | Industry OS |

---

## Environment Variables

```env
# Service URLs
GENIE_GATEWAY_URL=http://localhost:4701
DO_APP_URL=http://localhost:3001
SUTAR_GATEWAY_URL=http://localhost:4140
COPILOT_URL=http://localhost:4600
CORPID_URL=http://localhost:4300
CALENDAR_URL=http://localhost:4709

# WhatsApp
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WEBHOOK_TOKEN=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_TOKEN=

# SMS (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
SMS_SENDER_ID=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

---

## Quick Start

```bash
# Install dependencies
cd companies/HOJAI-AI/services/razo-keyboard
npm install

# Start service
npm start

# Health check
curl http://localhost:4725/health
```

---

## Consumer Triangle Flow

```
User: "Book a table at Domino's for 7pm tonight"
         ↓
RAZO Intent Router: Detects book_appointment (92%)
         ↓
RAZO Context Engine: Resolves "Domino's" → Merchant, time
         ↓
RAZO Action Engine: Calls DO App → Restaurant OS
         ↓
RAZO Channel Bridge: Sends confirmation via WhatsApp
```

---

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test
```

---

*Last Updated: June 18, 2026*
