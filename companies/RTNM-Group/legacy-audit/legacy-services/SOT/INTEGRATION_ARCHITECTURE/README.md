# INTEGRATION ARCHITECTURE

**Date:** May 10, 2026

---

## USER FLOW

```
USER QR Scan
    ↓
REZ Support Copilot (AI Chat)
    ↓
REZ Mind (Intent + Context)
    ↓
REZ Profile (Identity)
    ↓
REZ Wallet (Payment)
    ↓
Service Execution
    ↓
Confirmation + Tracking
```

---

## SERVICE CONNECTIONS

### Identity Flow
```
User → REZ Profile → Unified Identity Graph → All Services
```

### Payment Flow
```
User → REZ Wallet → Payment Gateway → Merchant Settlement
                ↓
           REZ Karma (Loyalty)
```

### AI Flow
```
User Input → REZ Mind → Intent Graph → Decision Engine
                ↓
        Action Execution → Services
```

---

## DATA FLOWS

| Flow | Services | Purpose |
|------|-----------|---------|
| Order | Profile → Wallet → Order → Merchant | Commerce |
| Booking | Profile → Calendar → Payment → Provider | Reservations |
| Rewards | Action → Karma → Wallet → Leaderboard | Engagement |
| Analytics | Events → Intent Graph → ML Engine → Dashboard | Insights |

---

## SHARED INFRASTRUCTURE

| Component | Services Using |
|-----------|---------------|
| MongoDB | All services |
| Redis Cache | Auth, Sessions, Cart |
| BullMQ | Orders, Notifications, Jobs |
| Sentry | Error tracking |
| OpenTelemetry | Distributed tracing |

---

## EXTERNAL INTEGRATIONS

| Provider | Services | Purpose |
|----------|---------|---------|
| Razorpay | Wallet, Payments | Money movement |
| Twilio | Notifications | SMS/WhatsApp |
| Firebase | Auth, Push | User management |
| OpenAI | Mind, Copilot | AI responses |
| Anthropic | Mind | Claude integration |

---

**Last Updated:** May 10, 2026
