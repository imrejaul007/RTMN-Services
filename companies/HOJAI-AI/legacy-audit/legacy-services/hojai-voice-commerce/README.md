# Hojai Voice Commerce

**Port:** 4880

Transactional voice AI - buy, book, pay through voice.

## Features

- **Voice Orders** - Order food, products via voice
- **Voice Bookings** - Book appointments, tables, rides
- **Voice Payments** - UPI, COD, Card
- **Session Management** - Context-aware conversations

## Voice Commands

### Ordering
```
"I want to order a pizza"
"Add 2 coffees"
"Checkout"
```

### Booking
```
"Book a table for 4 tomorrow"
"Schedule a haircut"
"Appointment with doctor"
```

### Status
```
"What's my order status?"
"Cancel my order"
```

## API

### Start Session

```bash
curl -X POST http://localhost:4880/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"customerId": "user_123", "customerPhone": "+919876543210"}'
```

### Process Voice Command

```bash
curl -X POST http://localhost:4880/api/voice/command \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc123", "text": "Order a margherita pizza"}'
```

### Checkout

```bash
curl -X POST http://localhost:4880/api/voice/command \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc123", "text": "checkout"}'
```

## Integrations

| System | Status |
|--------|--------|
| RABTUL Wallet | ✅ |
| RABTUL Payment | ✅ |
| REZ Orders | ✅ |
| REZ Bookings | ✅ |

## Quick Start

```bash
cd hojai-voice-commerce
npm install
npm run dev
```
