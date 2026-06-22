# RAZO Keyboard - Feature Specification

**Version:** 1.0.0  
**Port:** 4725  
**Status:** ✅ FULLY IMPLEMENTED

---

## 🎯 Core Feature Overview

RAZO Keyboard is the **Communication OS** for the RTMN Consumer Triangle - the intelligent keyboard that transforms natural language into actionable intents and executes them across services.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CONSUMER TRIANGLE                                       │
│                                                                                 │
│    GENIE (Think)        RAZO (Communicate)         DO APP (Act)                 │
│       4701                   4725                     3001                       │
│         ↘                      ↑                         ↑                       │
│          →→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Core Modules

### 1. Intent Router (src/intents/router.js)
**Purpose:** Detects user intent from natural language input

| Feature | Description |
|---------|-------------|
| **22 Supported Intents** | Commerce, Financial, Communication, Information, Action categories |
| **Keyword Matching** | Multi-keyword detection with scoring |
| **Pattern Matching** | Regex-based pattern recognition |
| **Entity Extraction** | Automatic extraction of amounts, dates, times, recipients |
| **Confidence Scoring** | Weighted confidence (0-1) based on match quality |
| **Statistics Tracking** | Request counts, top intents, performance metrics |

### 2. Context Engine (src/context/engine.js)
**Purpose:** Maintains conversation context and session state

| Feature | Description |
|---------|-------------|
| **Session Management** | Create, retrieve, update, end sessions |
| **Conversation History** | Last 50 messages per session |
| **Entity Collection** | Pending entities for multi-turn forms |
| **Merchant Context** | Restaurant, hotel, service provider info |
| **Location Context** | Current, delivery, search locations |
| **User Preferences** | Cached preferences for personalization |
| **External Context Merge** | Pull context from Genie, CorpID |
| **Session Cleanup** | Automatic cleanup of old sessions (24h default) |

### 3. Action Engine (src/actions/engine.js)
**Purpose:** Routes detected intents to appropriate backend services

| Feature | Description |
|---------|-------------|
| **12 Service Integrations** | Routes to Genie, DO App, SUTAR, Copilot, etc. |
| **Service Health Check** | Monitor connectivity to all services |
| **Timeout Handling** | Per-service timeouts (5-30 seconds) |
| **Error Recovery** | Graceful failure with error codes |
| **Request Tracking** | UUID for every action execution |
| **Statistics** | Success/failure tracking per intent |

### 4. Channel Bridge (src/channels/bridge.js)
**Purpose:** Multi-channel messaging integration

| Feature | Description |
|---------|-------------|
| **WhatsApp** | Send/receive via WhatsApp Business API |
| **Telegram** | Bot integration for messaging |
| **SMS** | Twilio integration for SMS |
| **Email** | SMTP-based email delivery |
| **Broadcast** | Multi-recipient messaging |
| **Scheduled Messages** | Time-delayed message delivery |
| **Template Messages** | Pre-defined message templates |
| **Channel Status** | Real-time channel availability |

---

## 🎯 Intent Categories

### Commerce Intents (4)

| Intent | Description | Entities | Service |
|--------|-------------|----------|---------|
| `order_food` | Place food delivery order | item, restaurant, quantity, address | DO App |
| `book_hotel` | Book hotel room | hotel_name, check_in, check_out, guests, room_type | DO App |
| `book_appointment` | Book service appointment | service, provider, date, time | DO App |
| `purchase_subscription` | Subscribe to plan | plan_type, duration, billing_cycle | DO App |

### Financial Intents (4)

| Intent | Description | Entities | Service |
|--------|-------------|----------|---------|
| `make_payment` | Transfer money | amount, recipient, purpose, payment_method | SUTAR |
| `track_expense` | Log expense | amount, category, merchant, date | Financial Twin |
| `check_balance` | Check account balance | account_type | Financial Twin |
| `apply_loan` | Apply for loan | loan_type, amount, tenure | Financial OS |

### Communication Intents (2)

| Intent | Description | Entities | Service |
|--------|-------------|----------|---------|
| `send_message` | Send message | recipient, content, channel | Channel |
| `schedule_meeting` | Book meeting | title, attendees, date, time, duration, platform | Calendar |

### Information Intents (5)

| Intent | Description | Entities | Service |
|--------|-------------|----------|---------|
| `ask_genie` | AI query | query, context | Genie |
| `get_status` | Check status | order_id, type | DO App |
| `find_service` | Search services | service, location | Discovery |
| `get_recommendation` | Get suggestions | based_on, preferences | Copilot |
| `check_availability` | Check slots | service, date, time | Industry OS |

### Action Intents (5)

| Intent | Description | Entities | Service |
|--------|-------------|----------|---------|
| `track_order` | Track delivery | order_id | DO App |
| `cancel_order` | Cancel order | order_id, reason | DO App |
| `request_refund` | Request refund | order_id, amount, reason | SUTAR |
| `file_complaint` | File complaint | order_id, issue_type, description | Support |
| `update_profile` | Update user info | field, value | CorpID |

### Miscellaneous Intents (2)

| Intent | Description | Entities | Service |
|--------|-------------|----------|---------|
| `get_insurance` | Insurance quote | insurance_type, coverage_amount | Insurance OS |

---

## 🌐 API Endpoints

### Intent Detection

```
POST /api/intent/detect
  Input:  { text, userId }
  Output: { intent, confidence, entities, action, endpoint }

POST /api/intent/execute
  Input:  { text, userId }
  Output: { success, intent, result, requestId }

POST /api/intent/parse
  Input:  { intent, entities }
  Output: { parsed, validation }

POST /api/intent/validate
  Input:  { intent, entities }
  Output: { valid, missing_fields, errors }

GET  /api/intent/list
  Output: { intents: [list of 22 intents] }
```

### Messaging

```
POST /api/message/send
  Input:  { channel, to, message, from? }
  Output: { success, message_id, channel }

POST /api/message/schedule
  Input:  { channel, to, message, scheduled_at }
  Output: { success, scheduled_id }

POST /api/message/broadcast
  Input:  { channel, recipients[], message }
  Output: { success, sent_count, failed_count }

POST /api/message/template
  Input:  { template_id, to, variables }
  Output: { success, message_id }

GET  /api/message/channels
  Output: { channels: [{ name, status, last_activity }] }
```

### Sessions

```
POST /api/session/create
  Input:  { userId, metadata? }
  Output: { session: { id, createdAt, ... } }

GET  /api/session/:id
  Output: { session: { id, userId, context, ... } }

PUT  /api/session/:id/context
  Input:  { updates }
  Output: { session }

POST /api/session/:id/message
  Input:  { message, sender }
  Output: { session }

DELETE /api/session/:id
  Output: { success }
```

### Webhooks

```
GET  /api/webhook/whatsapp
  Output: { challenge } (verification)

POST /api/webhook/whatsapp
  Input:  { entry[] }
  Output: { success }

POST /api/webhook/telegram
  Input:  { update }
  Output: { success }

POST /api/webhook/sms
  Input:  { from, body, to }
  Output: { success }

POST /api/webhook/email
  Input:  { from, subject, body }
  Output: { success }
```

---

## 🔌 Service Integrations

| Service | Port | Protocol | Endpoints Used |
|---------|------|----------|----------------|
| **Genie Gateway** | 4701 | HTTP | /api/query, /api/intent |
| **DO App** | 3001 | HTTP | /api/orders, /api/hotel-booking, /api/appointments |
| **SUTAR** | 4140 | HTTP | /api/escrow/transfer, /api/refunds |
| **Business Copilot** | 4600 | HTTP | /api/query |
| **CorpID** | 4300 | HTTP | /api/profile |
| **Calendar** | 4709 | HTTP | /api/events |
| **Financial Twin** | 4715 | HTTP | /api/accounts/balance, /api/expenses |
| **Discovery** | 4500 | HTTP | /api/search |
| **Support** | 4601 | HTTP | /api/complaints |
| **Unified Hub** | 4399 | HTTP | /api/workflow/process |
| **WhatsApp API** | - | HTTPS | Webhook |
| **Telegram API** | - | HTTPS | Bot API |

---

## 📊 Example Flows

### Flow 1: Food Ordering

```
User: "Order pizza from Domino's for delivery"

RAZO Intent Router
  → Detects: order_food (95% confidence)
  → Entities: { item: "pizza", restaurant: "Domino's" }

RAZO Context Engine
  → Creates/updates session
  → Stores pending entities

RAZO Action Engine
  → Routes to DO App /api/orders
  → Transforms to: { restaurant: "Domino's", items: [{ name: "pizza", quantity: 1 }] }

RAZO Channel Bridge
  → Sends confirmation via WhatsApp
```

### Flow 2: Payment

```
User: "Pay ₹500 to Rahul for lunch"

RAZO Intent Router
  → Detects: make_payment (96% confidence)
  → Entities: { amount: "500", recipient: "Rahul", purpose: "lunch" }

RAZO Action Engine
  → Routes to SUTAR /api/escrow/transfer
  → Adds: { method: "upi", userId: "user_123" }

SUTAR
  → Executes UPI transfer
  → Returns: { transaction_id, status: "success" }

RAZO Channel Bridge
  → Notifies via SMS/WhatsApp
```

### Flow 3: Multi-turn Booking

```
User: "Book a table"
RAZO → Detects: book_appointment (90%) → Entities: {}

User: "At Domino's"
RAZO → Updates pending_entities → { restaurant: "Domino's" }

User: "For 7pm tonight"
RAZO → Updates pending_entities → { time: "7pm", date: "today" }

RAZO Action Engine (when all entities collected)
  → Routes to DO App → Confirms booking
```

---

## 🛡️ Security Features

| Feature | Implementation |
|---------|---------------|
| **Rate Limiting** | 100 requests/minute per IP |
| **Request IDs** | UUID tracking for all requests |
| **Helmet.js** | Security headers (CSP, XSS, etc.) |
| **CORS** | Cross-origin resource sharing |
| **Input Validation** | All inputs validated before processing |
| **Webhook Verification** | Token-based webhook verification |
| **Environment Variables** | Sensitive config via env vars |

---

## 📈 Statistics & Monitoring

### Endpoint Statistics
```
GET /health     → Service status, port, timestamp
GET /ready      → Module readiness (4 modules)
```

### Internal Statistics
- **Intent Router:** totalRequests, supportedIntents, topIntents
- **Context Engine:** activeSessions, cachedContexts
- **Action Engine:** totalActions, actionResults per intent
- **Channel Bridge:** messagesSent, channelStatus

---

## 🔄 Consumer Triangle Integration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CONSUMER TRIANGLE                                      │
│                                                                                  │
│  ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐   │
│  │      GENIE      │←──────→│       RAZO      │←──────→│       DO        │   │
│  │      4701       │         │       4725       │         │       3001      │   │
│  │                 │         │                 │         │                 │   │
│  │  • AI Reasoning │         │  • Intent Detect│         │  • Transactions│   │
│  │  • Memory       │         │  • Context      │         │  • Orders       │   │
│  │  • Personal OS  │         │  • Actions      │         │  • Bookings     │   │
│  │  • Briefing     │         │  • Channels     │         │  • Payments     │   │
│  └─────────────────┘         └─────────────────┘         └─────────────────┘   │
│                                                                                  │
│  Flow: "I want pizza" → GENIE (understand) → RAZO (route) → DO (execute)      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Test Intent Detection
```bash
curl -X POST http://localhost:4725/api/intent/detect \
  -H "Content-Type: application/json" \
  -d '{"text": "Order pizza from Dominos", "userId": "test_user"}'
```

### Test Messaging
```bash
curl -X POST http://localhost:4725/api/message/send \
  -H "Content-Type: application/json" \
  -d '{"channel": "whatsapp", "to": "919876543210", "message": "Hello!"}'
```

### Test Session
```bash
# Create session
curl -X POST http://localhost:4725/api/session/create \
  -H "Content-Type: application/json" \
  -d '{"userId": "test_user"}'

# Execute intent in session
curl -X POST http://localhost:4725/api/intent/execute \
  -H "Content-Type: application/json" \
  -d '{"text": "Book a table", "userId": "test_user"}'
```

---

## ⚙️ Configuration

### Environment Variables
```env
# Service URLs (defaults shown)
GENIE_GATEWAY_URL=http://localhost:4701
DO_APP_URL=http://localhost:3001
SUTAR_GATEWAY_URL=http://localhost:4140
COPILOT_URL=http://localhost:4600
CORPID_URL=http://localhost:4300
CALENDAR_URL=http://localhost:4709

# WhatsApp
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_number
WHATSAPP_WEBHOOK_TOKEN=your_token

# Telegram
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_WEBHOOK_TOKEN=your_token

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
SMS_SENDER_ID=your_sender

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=pass
```

---

## 🚀 Deployment

```bash
# Install dependencies
cd companies/HOJAI-AI/services/razo-keyboard
npm install

# Start production server
npm start

# Start development (with auto-reload)
npm run dev

# Health check
curl http://localhost:4725/health
```

---

## 📝 Summary

| Aspect | Details |
|--------|---------|
| **Total Intents** | 22 |
| **Service Integrations** | 12 |
| **Channels** | WhatsApp, Telegram, SMS, Email |
| **API Endpoints** | 18 |
| **Core Modules** | 4 (Router, Context, Action, Channel) |
| **Session Management** | Yes (in-memory) |
| **Rate Limiting** | 100 req/min |
| **Authentication** | Request ID tracking |
| **Consumer Triangle** | Communication layer |

---

*Last Updated: June 18, 2026*
