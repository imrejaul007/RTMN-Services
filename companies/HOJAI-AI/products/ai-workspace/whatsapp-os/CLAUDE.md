# whatsapp-os

> **Service:** WhatsApp OS
> **Port:** 4860
> **Layer:** 5 (Communication Cloud — Channel Services)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

Orchestration layer for **WhatsApp Business API** across multiple providers —
designed to be region-friendly (360dialog in EU/LATAM, Twilio worldwide, Meta
direct in NA). Runs fully without API keys via the `mock` provider so the
service is testable end-to-end out of the box.

Capabilities:
- Send text / template / media messages
- 6 seeded templates (order update, booking confirm, payment received, OTP, welcome, appointment reminder)
- Conversation state tracking per phone number (with 24h WhatsApp session window)
- Inbound webhook simulation via `/api/webhook/simulate`
- Provider switching + per-provider health

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts + provider status |
| GET | `/api/providers` | List available providers + current |
| POST | `/api/providers/switch` | Switch active provider |
| GET | `/api/templates` | List all templates (6 seeded) |
| POST | `/api/templates` | Create new template |
| GET | `/api/templates/:id` | Get one template |
| POST | `/api/templates/:id/render` | Render a template with vars |
| POST | `/api/messages/send` | Send text / template / media |
| POST | `/api/webhook/simulate` | Simulate inbound webhook |
| GET | `/api/conversations` | List active conversations |
| GET | `/api/conversations/:phone` | Get conversation thread |
| GET | `/api/contacts` | List known contacts |
| POST | `/api/contacts` | Add/update contact |
| GET | `/api/messages` | Message log (filterable by direction/phone) |

## Providers

| Provider | Region | API Key Required | Mode |
|----------|--------|------------------|------|
| `mock` | n/a | No | Local mock — message stored in outbox |
| `360dialog` | EU/LATAM | `D360-API-KEY` | Live |
| `twilio` | Global | `TWILIO_AUTH_TOKEN` | Live |
| `meta` | NA | `META_ACCESS_TOKEN` | Live |

Switch via `POST /api/providers/switch {"provider": "twilio"}` or
`WHATSAPP_PROVIDER` env var.

## Integration

- **ai-intelligence (4881)**: agent `whatsappOrchestrator` (capabilities: send-text, send-template, send-media, template-list, template-create, webhook-inbound, conversation-thread)
- **unified-os-hub (4399)**: `/api/whatsapp/*` → service URL
- **Email OS / Meeting OS**: can use WhatsApp to send meeting confirmations and email-fallback notifications

## Use Cases

1. Order status updates to customers (template-based)
2. Booking confirmations for hospitality (Hotel OS / Restaurant OS)
3. OTP delivery for auth flows
4. Customer support reply channel
5. Appointment reminders (integrates with Meeting OS)

## Notes

- WhatsApp Business API has a 24h session window — conversations track when each session opens/closes.
- Templates must be pre-approved by Meta for live sending. The mock provider skips this.
- Inbound webhooks normally come from the provider; we expose `/api/webhook/simulate` for testing.
