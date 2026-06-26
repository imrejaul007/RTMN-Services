# HOJAI Studio — Build Any AI Company in 30 Minutes

> **The Platform-as-an-Economy** - 17 templates, 510 companies, 50 services, 5 Enterprise OS

---

## Quick Start

```bash
# Start all services
bash scripts/start-hojai.sh

# Test services
bash test-all.sh

# Open Studio UI
open http://localhost:3001
```

---

## What's Built

- **17 Templates** — OTA, E-Commerce, Food Delivery, Mobility, Healthcare, Education, Fintech, Logistics, and more
- **50 Services** — All industry-specific services ready
- **510 Companies** — All pre-mapped from master list
- **50+ Flows** — All business flows ready
- **Studio UI** — Web wizard at port 3001
- **5 Enterprise OS** — ConnectorOS, KnowledgeOS, BillingOS, MobileOS, ObservabilityOS

---

## Enterprise OS (The Missing Systems)

| Service | Port | Purpose |
|---------|------|---------|
| **ConnectorOS** | 4585 | 38+ integrations (Salesforce, Stripe, Slack, etc.) |
| **KnowledgeOS** | 4590 | Continuous learning for AI workers |
| **ObservabilityOS** | 4592 | Monitoring, metrics, analytics |
| **BillingOS** | 4595 | Subscriptions, invoices, payments |
| **MobileOS** | 4598 | App store infrastructure (iOS/Android builds) |

### ConnectorOS — 38 Integrations

| Category | Connectors |
|----------|-----------|
| CRM (5) | HubSpot, Salesforce, Pipedrive, Zoho CRM, HubSpot Free |
| Payments (6) | Stripe, Razorpay, PayPal, Square, PhonePe, Cashfree |
| Commerce (5) | Shopify, WooCommerce, Magento, BigCommerce, Magento 2 |
| Email (6) | Gmail, SendGrid, Mailchimp, Amazon SES, Brevo, Resend |
| Calendar (4) | Google Calendar, Outlook, Calendly, Cal.com |
| Storage (4) | Google Drive, Dropbox, S3, OneDrive |
| Chat (6) | Slack, Teams, Discord, WhatsApp, Intercom, Twilio |
| Accounting (5) | QuickBooks, Xero, Tally, Zoho Books, FreshBooks |
| HR (5) | BambooHR, Workday, Gusto, Rippling, Zoho People |
| Project (6) | Jira, Asana, Monday, Linear, Notion, Trello |

### KnowledgeOS — AI Worker Learning

- **Knowledge Bases** — Organized document collections with RAG
- **Agent Memory** — Per-agent learning history
- **Semantic Search** — Vector-based retrieval
- **Feedback Loops** — Learning from outcomes

### ObservabilityOS — Monitoring

- **AI Worker Metrics** — Accuracy, latency, token usage, cost
- **Platform Metrics** — Requests, errors, uptime
- **Dashboards** — CEO, Operations, AI Workforce, Engineering
- **Alerts** — Proactive anomaly detection

### BillingOS — Revenue

- **4 Plans** — Starter ($499) → Enterprise ($14,999/mo)
- **Subscriptions** — Monthly/annual with trials
- **Usage Billing** — AI tokens, API calls
- **Marketplace** — Partner payouts, revenue splits

### MobileOS — App Store

- **Builds** — iOS (IPA) and Android (APK/AAB)
- **Code Signing** — Certificates and provisioning profiles
- **Store Submission** — App Store and Play Store
- **OTA Updates** — CodePush-style updates
- **Crash Reporting** — Real-time crash analytics

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        HOJAI STUDIO                              │
├─────────────────────────────────────────────────────────────────┤
│  Studio UI (3001)                                               │
├─────────────────────────────────────────────────────────────────┤
│  FOUNDRY CORE                                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │Template │ │   BAM   │ │  Agent  │ │  Auth   │             │
│  │Compiler │ │         │ │Generator │ │         │             │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │ Deploy  │ │  Flows  │ │Company  │ │  Code   │             │
│  │Pipeline │ │ Engine  │ │ Mapper  │ │Generator│             │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
├─────────────────────────────────────────────────────────────────┤
│  ENTERPRISE OS                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │Connector│ │Knowledge│ │Observa-│ │ Billing │ │ Mobile  │ │
│  │   OS    │ │   OS    │ │bility  │ │   OS    │ │   OS    │ │
│  │  4585   │ │  4590   │ │   OS    │ │  4595   │ │  4598   │ │
│  └─────────┘ └─────────┘ │  4592   │ └─────────┘ └─────────┘ │
│                           └─────────┘                             │
├─────────────────────────────────────────────────────────────────┤
│  INDUSTRY SERVICES                                              │
│  OTA | E-Commerce | Mobility | Healthcare | Education | ...     │
└─────────────────────────────────────────────────────────────────┘
```

---

For the actual working HOJAI AI services, see [./services/](./services/):

- **MemoryOS** → [./services/memory-os/](./services/memory-os/) (port 4703)
- **TwinOS Hub** → [./services/twinos-hub/](./services/twinos-hub/) (port 4705)
- **AI Intelligence** → [./services/ai-intelligence/](./services/ai-intelligence/) (port 4881)
- **Customer Intelligence** → [./services/customer-intelligence/](./services/customer-intelligence/) (port 4885)
- **CorpID** → [./services/corpid-service/](./services/corpid-service/) (port 4702)

A pre-rebrand snapshot of the original HOJAI AI tree (real TypeScript source) is preserved at [HOJAI-AI-restored/](../HOJAI-AI-restored/) for reference.

See [CLAUDE.md](./CLAUDE.md) for the full architecture policy and external-client rules.

---

## Products (Marketing)

### Flagship
- **BLR AI Marketplace** → [blr-ai-marketplace/](./blr-ai-marketplace/) (Next.js, planned; not yet implemented)

### Other Products
| Product | Status |
|---------|--------|
| Genie Personal AI | ✅ Lives in [./services/genie-*](./services/) (ports 4701-4727) |
| Agent Marketplace | ✅ Lives in [./services/agent-marketplace](./services/agent-marketplace/) |
| ExpertOS | ✅ Lives in [./services/](./services/) |
| SkillNet | ✅ Lives in [./services/](./services/) |
| SUTAR OS | ✅ Lives in [./services/](./services/) |
| Business Copilot | ✅ Lives in [./services/business-copilot](./services/business-copilot/) |

---

## Support

- Website: https://hojai.ai
- Marketplace: https://hojai.ai/marketplace
- Sales: sales@hojai.ai
- Support: support@hojai.ai

---

*Last Updated: 2026-06-26 (Enterprise OS added)*
*HOJAI AI - The AI Infrastructure Company*
