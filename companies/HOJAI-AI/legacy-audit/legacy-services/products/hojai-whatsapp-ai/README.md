# Hojai WhatsApp AI

**Your AI Employee for WhatsApp**

> Transform your WhatsApp Business into a 24/7 customer service powerhouse.

---

## What is Hojai WhatsApp AI?

Hojai WhatsApp AI is an AI-powered employee that:
- Answers customer questions instantly (24/7)
- Books appointments and takes orders
- Handles complaints and escalates to humans
- Learns your business knowledge
- Provides analytics and insights

---

## Features

### Core Capabilities
- **Instant Responses** - AI replies in seconds, 24/7
- **Natural Conversations** - Understands context and intent
- **Booking & Orders** - Complete transactions in WhatsApp
- **Knowledge Training** - Teach AI your business in minutes
- **Smart Escalation** - Complex issues go to human agents
- **Analytics Dashboard** - Track performance and improve

### Supported Industries
- Salons & Beauty
- Restaurants & Cafes
- Clinics & Healthcare
- Retail Stores
- Service Businesses

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   CUSTOMER ──► WhatsApp ──► Hojai AI                      │
│                                      │                      │
│                              ┌──────┴──────┐              │
│                              │              │              │
│                         FAQ Lookup    Intent Detection       │
│                              │              │              │
│                         ┌────┴────┐    ┌───┴───┐        │
│                         │         │    │       │        │
│                      Answer    Book    Order    Escalate   │
│                         │         │    │       │        │
│                         └────┬────┘    └───┬───┘        │
│                              │            │              │
│                              └─────┬──────┘              │
│                                    │                      │
│                              Customer Happy              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Connect WhatsApp

```bash
# Set environment variables
export WHATSAPP_ACCESS_TOKEN=your-token
export WHATSAPP_PHONE_ID=your-phone-id
export WHATSAPP_VERIFY_TOKEN=your-verify-token
```

### 2. Train Your AI

Add Q&A to your knowledge base:

```
Q: What are your prices?
A: Haircut ₹200-500, Facial ₹500-1500

Q: Do you offer home service?
A: Yes! ₹200 extra within 10km

Q: What are your hours?
A: Open 9 AM - 9 PM, Monday-Saturday
```

### 3. Go Live

Your AI employee is ready to handle customer conversations.

---

## Dashboard

Access at: `dashboard/index.html`

Features:
- Conversation history
- AI training management
- Analytics overview
- Settings configuration

---

## Files

```
hojai-whatsapp-ai/
├── src/
│   ├── index.ts              # Main server
│   ├── routes/
│   │   └── webhook.ts       # WhatsApp webhook handler
│   ├── services/
│   │   ├── whatsappService.ts    # WhatsApp API
│   │   ├── conversationService.ts # Chat management
│   │   └── aiService.ts         # AI response engine
│   └── types/
│       └── index.ts          # TypeScript types
├── dashboard/
│   ├── index.html           # Merchant dashboard
│   ├── onboarding.html      # Setup wizard
│   ├── demo.html            # Live demo
│   └── landing.html         # Product landing page
├── package.json
└── README.md
```

---

## API Reference

### Webhook Endpoint
```
POST /webhook/webhook
```

### Send Message
```
POST /api/messages
{
  "channel": "whatsapp",
  "to": "+919876543210",
  "body": "Hello! How can I help?"
}
```

---

## Pricing

| Plan | Price | Features |
|------|-------|----------|
| Starter | ₹999/month | Unlimited conversations, 500+ Q&A |
| Professional | ₹2,499/month | + Custom workflows, priority support |
| Enterprise | Custom | + Dedicated setup, SLA |

---

## Demo

Try the live demo at: `dashboard/demo.html`

---

## Architecture

```
WhatsApp ──► Webhook ──► AI Engine ──► Response
                    │
                    ├── Knowledge Base
                    ├── Intent Detection
                    └── Automation Rules
```

---

## License

Proprietary - Hojai AI
