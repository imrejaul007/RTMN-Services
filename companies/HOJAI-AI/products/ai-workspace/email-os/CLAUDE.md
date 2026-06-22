# email-os

> **Service:** Email OS
> **Port:** 4862
> **Layer:** 5 (Communication Cloud — Channel Services)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

Email AI orchestration with provider abstraction (SendGrid / AWS SES /
nodemailer / mock) plus a built-in **triage engine** and **smart compose**.

Runs fully offline via the `mock` provider. The triage engine uses
lightweight heuristics (keyword + pattern matching) to assign category,
priority, sentiment, and suggested next actions to every inbound email —
no ML model required.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts + provider status |
| GET | `/api/providers` | List available providers + current |
| POST | `/api/providers/switch` | Switch active provider |
| GET | `/api/templates` | List email templates (4 seeded) |
| POST | `/api/templates` | Create template |
| POST | `/api/templates/:id/render` | Render template with vars |
| POST | `/api/emails/send` | Send email (with optional template) |
| POST | `/api/inbox/receive` | Receive inbound email → triage runs automatically |
| GET | `/api/inbox` | List inbox (filter by category/priority/sentiment) |
| GET | `/api/inbox/:id` | Get one message (also marks as read) |
| POST | `/api/inbox/:id/draft-reply` | Smart compose: generate auto-reply draft |
| GET | `/api/threads` | List conversation threads |
| GET | `/api/threads/:id` | Get one thread |
| GET | `/api/contacts` | List known contacts |

## Triage Engine

For each inbound email, computes:
- **category**: sales | support | billing | partnership | press | internal (keyword-match scoring)
- **priority**: P0 (urgent) | P1 | P2 | P3 (default P3)
- **sentiment**: positive | negative | neutral
- **suggestedActions**: e.g. `escalate_immediately`, `route_to_sales_os`, `create_ticket`, `human_review`, `thank_you_reply`

## Smart Compose

`POST /api/inbox/:id/draft-reply` picks a template based on category and
fills variables (ticket ID, sender name extracted from email, SLA hours).
Returns a draft for human review before sending.

## Providers

| Provider | Mode | Required |
|----------|------|----------|
| `mock` | No SMTP — outbox only | None |
| `sendgrid` | Live | `SENDGRID_API_KEY` |
| `ses` | Live (AWS SDK) | `AWS_ACCESS_KEY_ID` |
| `nodemailer` | Live (any SMTP) | `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` |

## Integration

- **ai-intelligence (4881)**: agent `emailTriager` (receive, triage, draft-reply, send, template-list, thread-list)
- **unified-os-hub (4399)**: `/api/email/*` → service URL
- **Notification Service (4870)**: superseded — Email OS is the canonical email layer; notification-service focuses on cross-channel notifications.

## Use Cases

1. Inbound sales lead triage → routes to Sales OS
2. Support email → auto-creates ticket + drafts acknowledgement
3. Billing question → routes to Finance OS
4. Negative-sentiment detection → suggests human review
5. Bulk templated outreach (newsletters, renewal reminders)
