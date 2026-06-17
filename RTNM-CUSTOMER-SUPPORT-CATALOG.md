# RTNM AI Customer Operations OS - Complete Feature Catalog

**Last Updated:** June 17, 2026  
**Status:** ✅ **UNIFIED** - Building World's First AI-Native Customer Operations Platform

---

## 🎯 Vision

> *"One platform to rule them all - AI-powered, multi-tenant, omnichannel customer operations that predicts problems before they happen and learns continuously."*

## 📋 Plan Documents

| Document | Description |
|----------|-------------|
| [PLAN-AI-CUSTOMER-OPS-OS.md](PLAN-AI-CUSTOMER-OPS-OS.md) | Complete AI Customer Operations OS architecture |
| [PLAN-SUPPORT-OS-UNIFICATION.md](PLAN-SUPPORT-OS-UNIFICATION.md) | Support system unification plan |

---

## 🏢 Multi-Tenant SaaS Architecture

```
RTMN PLATFORM (Platform Provider - Sell to individual clients)
│
├── CLIENT 1 (HOJAI AI - Pay₹50,000/month)
│   ├── Project: Genie App (₹20K)
│   ├── Project: Merchant Portal (₹15K)
│   └── Project: Admin (₹15K)
│
├── CLIENT 2 (AdBazaar - Pay₹25,000/month)
│   ├── Project: DOOH Platform (₹15K)
│   └── Project: Brand Dashboard (₹10K)
│
├── CLIENT 3 (Local Restaurant - Pay₹2,999/month)
│   ├── Project: POS + App (₹2,999)
│
└── Each client has:
    ├── Own Customer Twin
    ├── Own Knowledge Base
    ├── Own Tickets
    ├── Own AI Agents
    ├── Own SLA Config
    └── Own Integrations
```

---

## 🧠 Customer Twin 2.0 - Every Customer, One View

Each customer has a **complete twin** that updates in real-time:

```
Customer Twin
├── Identity (email, phone, WhatsApp, device)
├── Orders (all 47 orders, ₹23,450 spent)
├── Payments (₹24,500 success, ₹2,100 refunded)
├── Support (8 tickets, 7 resolved, CSAT 4.5)
├── Engagement (234 sessions, daily user)
├── Preferences (spicy food, allergic to nuts)
├── AI Predictions
│   ├── Genuineness: 94/100 🟢
│   ├── Churn Risk: 12% (Low)
│   ├── CSAT: 91%
│   └── Lifetime Value: ₹1,20,000
└── Memory (remembers everything!)
```

---

## ⏰ Universal Timeline

Every interaction creates an event:

```
June 17: Chat "Track order #3847" → Bot responded
June 16: Order #3847 delivered
June 16: Phone call about late delivery → Resolved
June 16: WhatsApp feedback "Great service!"
June 15: Order #3847 placed
June 10: Ticket #2847 resolved (refund)
June 8: Return requested (wrong item)
May 25: Birthday! 🎂 Sent offer
```

---

## 🤖 AI Agent Swarm

```
Planner (Router)
│
├── Support AI → FAQs, Refunds, General
├── Billing AI → Payments, Invoices, Refunds
├── Order AI → Tracking, Returns, Status
├── Booking AI → Reservations, Scheduling
├── Product AI → Search, Recommendations
├── Sales AI → Upsell, Cross-sell, Convert
├── Marketing AI → Campaigns, Offers
├── Legal AI → Policies, T&Cs, Privacy
└── BPO AI → Escalate, Transfer, Callback
```

---

## 📊 Customer 360 View (for Agents)

When agent opens a ticket:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 👤 John Doe                              ⭐⭐⭐⭐⭐ VIP           │
│ 📧 john@example.com    📱 +91XXXXXXXX    🏢 TechCorp             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 📦 ORDERS (47)                     💳 PAYMENTS                     │
│ ├── 45 delivered (₹22,350)       ├── 45 success (₹24,500)        │
│ ├── 3 returned (₹2,100)          ├── 3 refunded (₹2,100)        │
│ └── 2 pending (₹1,200)           └── 0 chargebacks              │
│                                                                     │
│ 🎫 SUPPORT (8 tickets)             🤖 AI PREDICTIONS              │
│ ├── 7 resolved ✓ (avg 4.2h)      ├── Genuineness: 94/100 🟢     │
│ └── 1 open (urgent)               ├── CSAT Prediction: 91%       │
│                                     ├── Escalation Risk: 8%        │
│                                     └── Lifetime Value: ₹1,20,000   │
│                                                                     │
│ 💭 MEMORY                             📚 KNOWLEDGE                  │
│ ├── Prefers spicy food             ├── 8 articles viewed         │
│ ├── Allergic to nuts                ├── Recent: Refund policy     │
│ └── Birthday: June 25 🎂           └── Suggested: Delivery FAQ   │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────┐     │
│ │ 💡 NEXT BEST ACTION: Send birthday offer (25% off)        │     │
│ └─────────────────────────────────────────────────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔮 Predictive Intelligence (Built-in AI)

| Prediction | Example Output |
|------------|---------------|
| **Genuineness Score** | 94/100 - Low fraud risk |
| **Churn Risk** | 12% - Low risk |
| **CSAT Prediction** | 91% - Will be satisfied |
| **Escalation Risk** | 8% - Unlikely to escalate |
| **Refund Probability** | 15% - Below average |
| **Upsell Opportunity** | 45% - Good candidate |
| **Lifetime Value** | ₹1,20,000 predicted |
| **Next Best Action** | Send loyalty offer |

---

## Executive Summary

RTNM has customer support capabilities across **multiple companies**, now being unified into **ONE AI-Native Customer Operations OS** that can be sold to individual clients as SaaS.

### Systems Being Combined

| System | Source | Key Features |
|--------|--------|--------------|
| **HOJAI AI** | `hojai-ai/hojai-*` | Customer 360, AI Agents, KB, SLA, Workflow |
| **REZ-Consumer** | `REZ-Consumer/` | Care, Tickets, CSAT, Chat |
| **AdBazaar** | `AdBazaar/` | CRM, Help Desk, Chat Widget, Social Inbox |
| **Axomi BPO** | `AdBazaar/axomi-bpo/` | BPO Workers, Voice BPO |

### Unified Platform Services (18 total)

| Port | Service | Purpose | Status |
|------|---------|---------|--------|
| 4001 | API Gateway | Auth, Routing, Multi-tenant | ✅ |
| 4885 | Customer Intelligence CDP | Customer 360 | ✅ |
| 4881 | AI Intelligence | Intent, Sentiment, Fraud, CSAT | ✅ |
| 4888 | **CRM Engine** | Deals, Contacts, Pipeline | 🔨 NEW |
| 4891 | **BPO Manager** | Workers, Jobs, Voice BPO | 🔨 NEW |
| 4870 | **Unified Inbox** | All channels | 🔨 NEW |
| 4892 | **Live Chat Server** | WebSocket chat | 🔨 NEW |
| 4893 | **Social Hub** | Instagram, Telegram | 🔨 NEW |
| 4878 | **Smart Chatbot** | Customer-facing AI | 🔨 NEW |
| 4886 | Workflow Engine | Automation | ✅ |
| 4887 | Action Registry | Business Actions | ✅ |
| 4880 | Notification Service | Email, SMS | ✅ |
| 4890 | Integration Hub | Connectors | ✅ |
| 4895 | Agent Copilot | AI Tools | ✅ |
| 4871 | Knowledge Base | Articles, FAQs | ✅ |
| 4872 | Ticket Engine | Tickets | ✅ |
| 4873 | SLA Manager | SLA Tracking | ✅ |
| 4874 | Reports Dashboard | Analytics | ✅ |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RTMN CUSTOMER SUPPORT ECOSYSTEM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │        CUSTOMER OPERATIONS PLATFORM (Shared)                      │   │
│  │         companies/hojai-ai/ (14 services)                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │ Customer │ │   AI    │ │ Workflow │ │ Action  │       │   │
│  │  │ Intel.   │ │ Intelli.│ │ Engine  │ │Registry │       │   │
│  │  │ 4885    │ │  4881   │ │  4886   │ │  4887   │       │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│        ┌─────────────────────┼─────────────────────┐                    │
│        │                     │                     │                    │
│        ▼                     ▼                     ▼                    │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐          │
│  │    AdBazaar     │ │  REZ-Consumer   │ │  HOJAI AI      │          │
│  │  companies/     │ │  companies/     │ │  companies/     │          │
│  │  AdBazaar/      │ │  REZ-Consumer/  │ │  hojai-ai/     │          │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Customer Operations Platform (Central/Shared)

**Location:** `companies/hojai-ai/hojai-*` (14 services)  
**Purpose:** Unified support infrastructure for ALL clients

### 1.1 Customer Intelligence CDP (4885)
**Purpose:** Customer 360, Identity, Risk Scoring

| Feature | Description |
|---------|-------------|
| Customer Profiles | Name, email, phone, company, tier |
| Order History | All orders linked to customer |
| Ticket History | All past complaints/tickets |
| Knowledge Views | Articles customer viewed |
| Risk Score | Trust/genuineness 0-100 |
| Segments | VIP, Premium, At-Risk, etc. |
| Identity Resolution | Link across channels |

### 1.2 Hojai Intelligence (4881)
**Purpose:** AI Agents for support

| Agent | Purpose |
|-------|---------|
| Intent Agent | Detect customer intent |
| Sentiment Agent | Analyze tone (positive/negative/frustrated) |
| Fraud Agent | Detect high-risk customers |
| Summary Agent | Generate ticket summaries |
| Recommendation Agent | Suggest actions |
| Prediction Agent | CSAT, escalation, churn |

### 1.3 Workflow Engine (4886)
**Purpose:** Automation and approval chains

| Feature | Description |
|---------|-------------|
| BPMN Workflows | Visual automation |
| Approval Chains | Multi-level approvals |
| Conditional Logic | If/then/else |
| Timers/Delays | Scheduled actions |
| Webhook Calls | External integrations |

### 1.4 Action Registry (4887)
**Purpose:** Safe business actions with audit

| Action | Description |
|--------|-------------|
| Issue Refund | Process refunds with policy check |
| Cancel Order | Cancel with refund eligibility |
| Escalate Ticket | Route to higher tier |
| Send Notification | Email/SMS/Push |
| Update CRM | Sync to HubSpot/Zoho |
| Create Ticket | Auto-create support ticket |

### 1.5 Notification Service (4880)
**Purpose:** Multi-channel communications

| Channel | Integration |
|---------|-------------|
| Email | Resend, SMTP |
| SMS | Twilio |
| Push | FCM |
| WhatsApp | Twilio |
| Slack | Webhooks |

### 1.6 Integration Hub (4890)
**Purpose:** Connect client systems

| Connector | Purpose |
|-----------|---------|
| Shopify | Orders, customers |
| Stripe | Payments, refunds |
| HubSpot | CRM sync |
| Zoho | CRM sync |
| WooCommerce | E-commerce |
| Custom REST | Any API |

### 1.7 Agent Copilot (4895)
**Purpose:** AI tools for support agents

| Feature | Description |
|---------|-------------|
| Draft Reply | AI-generated responses |
| Summarize | Conversation summary |
| Predict CSAT | Satisfaction prediction |
| Suggest Macros | Canned response suggestions |
| Missing Info | Detect gaps |
| Translate | Multi-language |

### 1.8 Unified Inbox (4870)
**Purpose:** Multi-channel conversations

| Channel | Description |
|---------|-------------|
| WhatsApp | Business messaging |
| Email | Support emails |
| Chat | Live chat widget |
| Instagram | DM support |
| Telegram | Bot support |
| Phone | Voice integration |

### 1.9 Knowledge Base (4871)
**Purpose:** Self-service articles

| Feature | Description |
|---------|-------------|
| Articles | Rich content |
| FAQs | Question/answer |
| Categories | Organized by topic |
| Search | Full-text search |
| Ratings | Helpful/not helpful |
| Versions | Content history |

### 1.10 Ticket Service (4872)
**Purpose:** Support ticket lifecycle

| Feature | Description |
|---------|-------------|
| Create Ticket | From any channel |
| Assign | Route to agents |
| Status Flow | Open → Resolved → Closed |
| Priority | Critical/High/Medium/Low |
| History | Full audit trail |
| CSAT | Customer ratings |

### 1.11 SLA Service (4873)
**Purpose:** Response time tracking

| Feature | Description |
|---------|-------------|
| SLA Policies | Per priority |
| First Response | Track response time |
| Resolution Time | Track resolution |
| Breaches | Alert on breach |
| Reports | SLA compliance |

### 1.12 Support Analytics (4874)
**Purpose:** Reporting and dashboards

| Metric | Description |
|--------|-------------|
| Ticket Volume | Daily/weekly/monthly |
| Resolution Time | Average time to resolve |
| CSAT Score | Customer satisfaction |
| Agent Performance | Per agent metrics |
| Channel Breakdown | Email vs Chat vs Phone |

### 1.13 Supporter AI (4878)
**Purpose:** Customer-facing chatbot

| Feature | Description |
|---------|-------------|
| Auto Greeting | 24/7 first contact |
| FAQ Answers | Instant responses |
| Ticket Creation | Auto-create from chat |
| Escalation | Route to human |
| Knowledge Search | KB integration |

### 1.14 API Gateway (4001)
**Purpose:** Single entry point

| Feature | Description |
|---------|-------------|
| Auth | JWT validation |
| Rate Limiting | Per tenant/user |
| Routing | Service proxy |
| Tenant Isolation | Multi-client |
| Logging | Request tracing |

---

## Part 2: AdBazaar Support Features

**Location:** `companies/AdBazaar/`  
**Status:** ✅ Production Ready

### 2.1 REZ CRM Hub (4056)
**Purpose:** CRM for advertising clients

| Feature | Description |
|---------|-------------|
| Contact Management | Leads, prospects, customers |
| Deal Pipeline | Sales stages |
| HubSpot Sync | Bi-directional sync |
| Zoho Sync | Bi-directional sync |
| Activity Tracking | Calls, emails, notes |

### 2.2 Axomi Help Suite
**Location:** `companies/AdBazaar/axomi-help/`

| Service | Purpose |
|---------|---------|
| axomi-help | Main help desk |
| axomi-help-api-gateway | API routing |
| axomi-help-escalation | Escalation rules |
| axomi-help-knowledge | Knowledge base |
| axomi-help-brand-registry | Multi-brand support |

### 2.3 REZ Live Chat Widget
**Location:** `companies/AdBazaar/REZ-live-chat-widget/`
**Purpose:** Embedded chat for websites

### 2.4 REZ Feedback Service
**Location:** `companies/AdBazaar/REZ-feedback-service/`
**Purpose:** Collect customer feedback

### 2.5 Unified Social Inbox
**Location:** `companies/AdBazaar/unified-social-inbox/`
**Purpose:** All social DMs in one place

### 2.6 Rez Chatbot Builder UI
**Location:** `companies/AdBazaar/rez-chatbot-builder-ui/`
**Purpose:** No-code chatbot builder

### 2.7 Rez CRM UI
**Location:** `companies/AdBazaar/rez-crm-ui/`
**Purpose:** CRM dashboard UI

---

## Part 3: REZ-Consumer Support Features

**Location:** `companies/REZ-Consumer/`  
**Status:** ✅ Production Ready

### 3.1 Support App/Pages
| Page | Purpose |
|------|---------|
| app/support | Main support page |
| app/help | Help center |
| app/healthcare | Healthcare support |
| components/support/ | Support UI components |

### 3.2 Support Services
| Service | Purpose |
|---------|---------|
| supportApi.ts | Support API client |
| supportChatApi.ts | Chat API |
| useSupportChat.ts | Chat hook |
| useCare.ts | Customer care hook |

### 3.3 Healthcare Support
| Feature | Description |
|---------|-------------|
| app/healthcare | Healthcare support |
| Healthcare Service | Medical support flow |

---

## Part 4: CorpPerks Support Features

**Location:** `companies/CorpPerks/`  
**Status:** ✅ Production Ready

### 4.1 Support Portal
**Location:** `companies/CorpPerks/support-portal/`
**Purpose:** Employee support

### 4.2 Corp CRM Service
**Location:** `companies/CorpPerks/corp-crm-service/`
**Purpose:** HR CRM for employee relations

---

## Part 5: REZ-Merchant Support Features

**Location:** `companies/REZ-Merchant/`  
**Status:** ✅ Production Ready

### 5.1 Healthcare OS
| Service | Purpose |
|---------|---------|
| rez-healthcare-service | Healthcare support |
| rez-healthcare-admin-web | Admin dashboard |
| rez-mind-healthcare-service | Mental health support |

### 5.2 Salon CRM
**Location:** `companies/REZ-Merchant/industry-os/rez-salon-crm-service/`
**Purpose:** Salon business support

---

## Part 6: RisaCare Support Features

**Location:** `companies/RisaCare/`  
**Status:** ✅ Production Ready

| Feature | Description |
|---------|-------------|
| Telehealth | Virtual consultations |
| Health Records | Patient history |
| Appointment | Scheduling system |
| Pharmacy | Medication support |

---

## Part 7: Integration Summary

### All Support Services by Port

| Port | Service | Company | Purpose |
|------|---------|---------|---------|
| 4001 | API Gateway | HOJAI AI | Auth, routing |
| 4056 | REZ CRM Hub | AdBazaar | CRM |
| 4870 | Unified Inbox | HOJAI AI | Conversations |
| 4871 | Knowledge Base | HOJAI AI | Articles/FAQs |
| 4872 | Ticket Service | HOJAI AI | Tickets |
| 4873 | SLA Service | HOJAI AI | SLA tracking |
| 4874 | Support Analytics | HOJAI AI | Reports |
| 4878 | Supporter AI | HOJAI AI | Chatbot |
| 4880 | Notification | HOJAI AI | Email/SMS |
| 4881 | Hojai Intelligence | HOJAI AI | AI Agents |
| 4885 | Customer Intel. | HOJAI AI | Customer 360 |
| 4886 | Workflow Engine | HOJAI AI | Automation |
| 4887 | Action Registry | HOJAI AI | Business actions |
| 4890 | Integration Hub | HOJAI AI | Connectors |
| 4895 | Agent Copilot | HOJAI AI | Agent tools |

---

## Part 8: Customer View Across All Companies

### HOJAI AI (SaaS Platform)
```
Customer: John (SaaS User)
├── Projects: 3 (App, Portal, API)
├── Orders: Subscription payments
├── Tickets: Technical issues
├── KB: Product documentation
└── AI: Genie assistant
```

### AdBazaar (Advertising Platform)
```
Customer: Acme Corp (Advertiser)
├── Campaigns: 15 active ads
├── Budget: ₹5,00,000/month
├── Tickets: Campaign issues
├── KB: Ad creation guides
└── AI: Campaign optimizer
```

### REZ-Consumer (Delivery Platform)
```
Customer: Jane (Shopper)
├── Orders: 50+ orders
├── Returns: 3 returns
├── Complaints: Payment issue
├── KB: Delivery FAQs
└── AI: Order tracker
```

### CorpPerks (HR Platform)
```
Customer: Employee
├── Benefits: Health insurance
├── Claims: 2 pending
├── Tickets: HR queries
├── KB: Policy documents
└── AI: Benefits advisor
```

---

## Part 9: Recommended Integration

To make all support seamless:

```
1. All companies use HOJAI AI Customer Operations Platform
   └── Unified customer 360 view

2. Each company has:
   ├── Own Knowledge Base
   ├── Own Ticket workflows
   ├── Own SLA policies
   └── Own Integrations

3. Cross-company lookup:
   ├── Customer ID links across companies
   ├── Shared AI predictions
   └── Unified CSAT tracking
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [RTNM-CUSTOMER-OPS-PLATFORM.md](RTNM-CUSTOMER-OPS-PLATFORM.md) | Platform architecture |
| [RTNM-COMPANIES-AUDIT.md](RTNM-COMPANIES-AUDIT.md) | Company registry |
| [RTNM-PRODUCTS-FEATURES-AUDIT.md](RTNM-PRODUCTS-FEATURES-AUDIT.md) | Feature catalog |
| [companies/AdBazaar/CLAUDE.md](companies/AdBazaar/CLAUDE.md) | AdBazaar docs |
| [companies/hojai-ai/CLAUDE.md](companies/hojai-ai/CLAUDE.md) | HOJAI AI docs |

---

**Built with ❤️ by RTMN - Empowering AI-Native Customer Operations**
