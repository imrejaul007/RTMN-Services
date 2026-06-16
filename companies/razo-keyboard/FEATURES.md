# RAZO Keyboard - Complete Feature List

**Last Updated:** June 15, 2026  
**Location:** `companies/razo-keyboard/`  
**Status:** ✅ ACTIVE - Communication OS

---

## Overview

RAZO Keyboard is the Communication OS for the RTMN ecosystem. It transforms every text input into actionable intents, connecting users to Genie AI, DO App, SUTAR OS, and all 24 Industry Operating Systems.

**Tagline:** *"The Keyboard That Thinks"*

---

## Core Features

### 1. Intent Router

**Purpose:** Transform natural language into actionable intents

| Feature | Description |
|---------|-------------|
| NLU Engine | Natural Language Understanding for intent detection |
| Entity Extraction | Extract entities (names, locations, amounts, dates) |
| Intent Classification | Classify intents across 24 industries |
| Confidence Scoring | Confidence score for each intent detection |
| Context Preservation | Maintain context across conversation turns |

### 2. Communication Layer

**Purpose:** Multi-channel messaging and communication

| Feature | Description |
|---------|-------------|
| WhatsApp Integration | Send/receive WhatsApp messages |
| Telegram Bridge | Telegram bot integration |
| SMS Gateway | SMS send/receive |
| Email Integration | Email send with rich formatting |
| In-App Messaging | Real-time in-app notifications |
| Voice Integration | Voice message processing |

### 3. Action Engine

**Purpose:** Execute actions based on detected intents

| Feature | Description |
|---------|-------------|
| DO App Integration | Transaction execution |
| Genie Integration | AI query and response |
| SUTAR Integration | Autonomous operations |
| Copilot Integration | Business intelligence |
| Merchant Integration | Merchant services |

### 4. Context Engine

**Purpose:** Maintain conversation context and user history

| Feature | Description |
|---------|-------------|
| Session Management | Multi-turn conversation support |
| User Context | User preferences and history |
| Merchant Context | Merchant information caching |
| Location Context | Location-based services |
| Time Context | Time-aware responses |

---

## Intent Types

### Commerce Intents

| Intent | Description | Connected Service |
|--------|-------------|------------------|
| `order_food` | Place food order | Restaurant OS |
| `order_product` | Place product order | Retail OS |
| `book_hotel` | Book hotel room | Hotel OS |
| `book_appointment` | Book service appointment | Industry OS |
| `purchase_subscription` | Subscribe to service | Subscription OS |
| `request_quote` | Request service quote | Home Services OS |

### Financial Intents

| Intent | Description | Connected Service |
|--------|-------------|------------------|
| `make_payment` | Process payment | SUTAR Escrow |
| `track_expense` | Log expense | Financial Twin |
| `check_balance` | Check account balance | Financial Twin |
| `apply_loan` | Loan application | Financial OS |
| `get_insurance` | Insurance quote | Insurance OS |
| `transfer_funds` | Transfer money | Wallet Service |

### Communication Intents

| Intent | Description | Connected Service |
|--------|-------------|------------------|
| `send_message` | Send message | WhatsApp/Telegram |
| `send_email` | Send email | Email Service |
| `schedule_meeting` | Book meeting | Calendar Service |
| `make_call` | Initiate call | Voice OS |
| `broadcast` | Broadcast message | Multi-channel |

### Information Intents

| Intent | Description | Connected Service |
|--------|-------------|------------------|
| `ask_genie` | Query AI | Genie Gateway |
| `get_status` | Check order/booking status | Merchant Copilot |
| `find_service` | Search for service | Discovery OS |
| `get_recommendation` | Get recommendations | Business Copilot |
| `check_availability` | Check availability | Industry OS |
| `get_weather` | Get weather info | Weather Service |

### Action Intents

| Intent | Description | Connected Service |
|--------|-------------|------------------|
| `track_order` | Track delivery | Logistics OS |
| `cancel_order` | Cancel order | Merchant Copilot |
| `modify_booking` | Modify booking | Industry OS |
| `request_refund` | Request refund | SUTAR Refund |
| `file_complaint` | File complaint | Support OS |
| `update_profile` | Update user profile | CorpID |

---

## API Endpoints

### Intent Detection

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/intent/detect` | POST | Detect intent from text |
| `/api/intent/parse` | POST | Parse structured intent |
| `/api/intent/validate` | POST | Validate intent parameters |

### Communication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/message/send` | POST | Send message |
| `/api/message/schedule` | POST | Schedule message |
| `/api/message/broadcast` | POST | Broadcast message |
| `/api/message/template` | POST | Send template message |

### Session Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/session/create` | POST | Create session |
| `/api/session/:id` | GET | Get session |
| `/api/session/:id/context` | PUT | Update context |
| `/api/session/:id/end` | DELETE | End session |

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhook/whatsapp` | POST | WhatsApp webhook |
| `/api/webhook/telegram` | POST | Telegram webhook |
| `/api/webhook/sms` | POST | SMS webhook |
| `/api/webhook/email` | POST | Email webhook |

---

## Integration Patterns

### Consumer Flow

```
User: "Book a table at Domino's for 7pm tonight"
         ↓
RAZO Intent Router: Detects `book_appointment` + entity extraction
         ↓
RAZO Context Engine: Resolves "Domino's" → Merchant ID, "7pm tonight" → DateTime
         ↓
RAZO Action Engine: Calls DO App API with resolved parameters
         ↓
DO App → Restaurant OS → Create reservation
         ↓
RAZO sends confirmation via WhatsApp
```

### Business Flow

```
User: "How are my sales this week?"
         ↓
RAZO Intent Router: Detects `get_recommendation` with `sales` context
         ↓
RAZO Action Engine: Calls Business Copilot with sales query
         ↓
Copilot → Analytics → Generate sales report
         ↓
RAZO formats and sends via Telegram
```

### SUTAR Flow

```
User: "Pay ₹500 to Rahul for lunch"
         ↓
RAZO Intent Router: Detects `make_payment` + amount + recipient
         ↓
RAZO Action Engine: Calls SUTAR Escrow with payment params
         ↓
SUTAR Escrow → Wallet → Process transfer
         ↓
RAZO sends payment confirmation
```

---

## Multi-Channel Features

### WhatsApp Features

- Text messages
- Image attachments
- Document sharing
- Location sharing
- Contact sharing
- Button responses
- List messages
- Template messages
- Interactive messages

### Telegram Features

- Text messages
- Photos/Videos/Documents
- Inline keyboards
- Reply keyboards
- Callback queries
- Voice messages
- Video notes
- Stickers

### SMS Features

- Text messages (160 chars)
- Long SMS (concatenated)
- Unicode support
- Sender ID customization
- Delivery reports

### Email Features

- Rich HTML emails
- Template emails
- Attachment support
- BCC/CC support
- Read receipts
- Unsubscribe links

---

## Context Features

### User Context

| Data | Source | Usage |
|------|--------|-------|
| Name | CorpID | Personalization |
| Preferences | Genie Personal Twin | Recommendations |
| Location | Device/Input | Local services |
| History | Memory | Context continuity |

### Merchant Context

| Data | Source | Usage |
|------|--------|-------|
| Name | Merchant Copilot | Display |
| Services | Menu Service | Options |
| Availability | Booking Service | Scheduling |
| Reviews | Review Service | Trust signals |

### Session Context

| Data | Usage |
|------|-------|
| Conversation history | Multi-turn support |
| Current intent | Action routing |
| Pending confirmations | User prompts |
| Entity values | Form filling |

---

## Security Features

| Feature | Description |
|---------|-------------|
| Webhook verification | WhatsApp/Telegram signature verification |
| Rate limiting | Per-user and per-IP rate limits |
| Input sanitization | XSS and injection prevention |
| Auth validation | JWT token validation |
| Encryption | TLS for all connections |

---

## Analytics Features

| Feature | Description |
|---------|-------------|
| Intent tracking | Most common intents |
| Channel analytics | Channel performance |
| Response time | Average response time |
| Success rate | Action completion rate |
| User engagement | Session metrics |

---

## Error Handling

| Error Code | Description | Action |
|------------|-------------|--------|
| `INVALID_INTENT` | Could not detect intent | Ask for clarification |
| `MISSING_ENTITY` | Required entity missing | Prompt for value |
| `SERVICE_UNAVAILABLE` | Backend unavailable | Retry with delay |
| `AUTH_FAILED` | Authentication failed | Redirect to login |
| `RATE_LIMITED` | Too many requests | Wait and retry |

---

## Quick Start

```bash
# Install dependencies
cd razo-keyboard && npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start service
npm start

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
WHATSAPP_WEBHOOK_TOKEN=

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

# Server
PORT=4725
NODE_ENV=production
```

---

## Response Format

```typescript
// Success Response
{
  success: true,
  data: {
    intent: "order_food",
    confidence: 0.95,
    entities: {
      merchant: "Domino's",
      item: "pizza"
    },
    action: {
      service: "do-app",
      endpoint: "/api/orders",
      params: {...}
    }
  },
  meta: {
    timestamp: "2026-06-15T10:30:00Z",
    requestId: "req_abc123",
    processingTime: 45
  }
}

// Error Response
{
  success: false,
  error: {
    code: "INVALID_INTENT",
    message: "Could not determine user intent"
  },
  meta: {
    timestamp: "2026-06-15T10:30:00Z",
    requestId: "req_abc123"
  }
}
```

---

## License

Proprietary - RAZO Keyboard / HOJAI AI

---

*Last Updated: June 15, 2026*
