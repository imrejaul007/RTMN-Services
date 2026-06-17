# RTNM Customer Operations Platform - AI-Powered Support System

**Version:** 1.0  
**Last Updated:** June 17, 2026  
**Status:** ✅ DEPLOYMENT READY - 14 Services Built

---

## Overview

The RTMN Customer Operations Platform is an **AI-native Customer Operations Platform** built for multi-tenant, multi-client support operations. Each company (client) gets their own projects with seamless access to customer data, order history, knowledge base, complaint history, and AI-powered genuineness prediction.

---

## Architecture

```
RTMN PLATFORM (Platform Provider)
│
├── CLIENTS (Companies using the platform)
│   │
│   ├── HOJAI AI
│   │   ├── Projects:
│   │   │   ├── Customer App (Genie)
│   │   │   ├── Merchant Portal
│   │   │   └── Admin Dashboard
│   │   └── Customer Support Flow: ✅
│   │
│   ├── REZ-Consumer
│   │   ├── Projects:
│   │   │   ├── Consumer App
│   │   │   ├── Driver App
│   │   │   └── Admin Portal
│   │   └── Customer Support Flow: ✅
│   │
│   ├── AdBazaar
│   │   ├── Projects:
│   │   │   ├── Brand Dashboard
│   │   │   ├── Advertiser Portal
│   │   │   └── Support Center
│   │   └── Customer Support Flow: ✅
│   │
│   └── (Add more clients as needed)
│
└── SUPPORT PLATFORM (Shared Infrastructure)
    │
    ├── API Gateway (4001)
    ├── Customer Intelligence CDP (4885)
    ├── Hojai Intelligence (4881)
    ├── Workflow Engine (4886)
    ├── Action Registry (4887)
    ├── Notification Service (4880)
    ├── Integration Hub (4890)
    └── Agent Copilot (4895)
```

---

## Customer 360 View

When a customer contacts support, the agent sees a unified view:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CUSTOMER 360 VIEW                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  👤 John Doe                    ⭐⭐⭐⭐⭐ VIP                        │
│  📧 john@example.com           📱 +91XXXXXXXX                      │
│  🏢 Customer Since: Jan 2022   🌐 Language: English                 │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📦 ORDERS (12)                                                     │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ #28472 - Delivered - ₹2,499 - June 15, 2026              │     │
│  │ #28418 - Returned - ₹899 - June 10, 2026                   │     │
│  │ #28411 - Processing - ₹1,299 - June 16, 2026              │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🎫 SUPPORT HISTORY (5 tickets)                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ TKT-2606-0042 - Payment failed - Resolved ✓              │     │
│  │ TKT-2606-0038 - Refund delay - Resolved ✓                │     │
│  │ TKT-2606-0015 - Wrong size - Resolved ✓                  │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📚 KNOWLEDGE BASE (Recently Viewed)                                 │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ 📄 How to track my order                                  │     │
│  │ 📄 Refund policy & process                                │     │
│  │ 📄 Return/exchange guidelines                              │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🤖 AI PREDICTIONS                                                 │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ 🟢 GENUINENESS SCORE: 92/100                              │     │
│  │    Factors: 15 orders, 2 refunds, good history           │     │
│  │                                                          │     │
│  │ 📊 CSAT Probability: 89%                                  │     │
│  │ ⚠️  Escalation Risk: 12%                                 │     │
│  │ 🔒 Fraud Risk: Low (8%)                                   │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## AI-Powered Genuineness Prediction

### Trust Score Components

| Factor | Weight | Description |
|--------|--------|-------------|
| Order History | 25% | Number and value of successful orders |
| Refund Rate | 20% | Ratio of refunds to orders |
| Payment History | 15% | Successful payments, failures |
| Account Age | 10% | How long the account has been active |
| Device Consistency | 10% | Consistent device/IP usage |
| Support History | 10% | Previous tickets and resolutions |
| Social Verification | 5% | Linked social accounts |
| Chargeback History | 5% | Previous chargebacks |

### Risk Levels

| Level | Score Range | Color | Action |
|-------|-------------|-------|--------|
| **Low Risk** | 80-100 | 🟢 Green | Proceed normally |
| **Medium Risk** | 50-79 | 🟡 Yellow | Require additional verification |
| **High Risk** | 0-49 | 🔴 Red | Manual review required |

---

## Support Services (14 Services)

| Service | Port | Purpose | Client Access |
|---------|------|---------|---------------|
| **API Gateway** | 4001 | Auth, Rate Limit, Routing | All |
| **Customer Intelligence CDP** | 4885 | Customer 360, Identity, Risk | All |
| **Hojai Intelligence** | 4881 | AI Agents, Memory, Policy | All |
| **Workflow Engine** | 4886 | BPMN Automation | All |
| **Action Registry** | 4887 | Business Actions | All |
| **Notification Service** | 4880 | Email, SMS, Push | All |
| **Integration Hub** | 4890 | External Connectors | All |
| **Agent Copilot** | 4895 | AI Agent Tools | All |
| **Unified Inbox** | 4870 | Multi-channel Conversations | All |
| **Knowledge Base** | 4871 | Articles, FAQs | All |
| **Ticket Service** | 4872 | Ticket Lifecycle | All |
| **SLA Service** | 4873 | SLA Tracking | All |
| **Support Analytics** | 4874 | Reports | All |
| **Supporter AI** | 4878 | Customer Chatbot | Customer-facing |

---

## Client Support Flow

### 1. Customer Initiates Contact
```
Customer → Web Chat / WhatsApp / Email / Phone
              ↓
        Supporter AI (4878)
              ↓
        Intent Detection
              ↓
        [FAQ Match?] → Yes → Auto-reply with KB article
              ↓ No
        [Simple Query?] → Yes → AI generates response
              ↓ No
        Create Ticket → Route to Agent
```

### 2. Agent Receives Ticket
```
Agent Dashboard
    ↓
Customer 360 View loads:
    ├── Order History ✅
    ├── Past Complaints ✅
    ├── Knowledge Base Access ✅
    ├── AI Predictions ✅
    └── Suggested Actions ✅
    ↓
Agent responds with AI copilot assistance
    ↓
Resolution / Escalation
    ↓
Customer Feedback (CSAT)
    ↓
AI learns from outcome
```

### 3. AI Predictions & Suggestions
```
On ticket open:
    ├── Genuineness Score calculated
    ├── CSAT Prediction shown
    ├── Escalation Risk flagged
    ├── Suggested KB articles
    ├── Suggested actions
    └── Similar past tickets shown

On response:
    ├── AI draft reply suggested
    ├── Tone adjusted to customer sentiment
    ├── Policy compliance checked
    └── SLA impact predicted
```

---

## Multi-Client Tenant Isolation

### Data Separation

```
Tenant A (HOJAI AI)          Tenant B (AdBazaar)
├── Customers: 10,000        ├── Customers: 50,000
├── Orders: 50,000          ├── Orders: 200,000
├── Tickets: 5,000          ├── Tickets: 15,000
├── Knowledge Base: 200      ├── Knowledge Base: 500
└── Agents: 25              └── Agents: 100

All data is tenant-isolated via:
• tenantId in every document
• API Gateway validates tenant
• Each client sees ONLY their data
```

---

## Knowledge Base Per Client

Each client has their own knowledge base:

| Client | KB Articles | Categories | Languages |
|--------|-------------|------------|-----------|
| HOJAI AI | 200+ | Product, Billing, Technical | EN, HI |
| REZ-Consumer | 500+ | Orders, Delivery, Refunds | EN, HI, BN |
| AdBazaar | 150+ | Campaigns, Billing, Technical | EN |

---

## Integrations (Per Client)

Each client connects their own systems:

```
Client: REZ-Consumer
├── Shopify Store API → Orders sync
├── Stripe → Payments
├── HubSpot → CRM
├── Internal WMS → Inventory
└── Custom APIs → Logistics

Client: HOJAI AI
├── Genie Backend → User data
├── Memory Service → Preferences
├── Payment Gateway → Subscriptions
└── Analytics → Usage data
```

---

## SLA Configuration (Per Client)

| Client | Critical | High | Medium | Low |
|--------|----------|------|--------|-----|
| HOJAI AI | 15 min | 1 hr | 4 hr | 8 hr |
| REZ-Consumer | 30 min | 2 hr | 8 hr | 24 hr |
| AdBazaar | 1 hr | 4 hr | 12 hr | 48 hr |

---

## API Endpoints

### Customer Context
```
GET /api/customers/:id
GET /api/customers/:id/orders
GET /api/customers/:id/tickets
GET /api/customers/:id/context (full 360 view)
```

### AI Predictions
```
POST /api/analyze
  - intent detection
  - sentiment analysis
  - genuineness score
  - CSAT prediction
  - escalation risk
```

### Support Flow
```
POST /api/tickets
GET /api/tickets/:id
PUT /api/tickets/:id/assign
POST /api/tickets/:id/resolve
POST /api/tickets/:id/rate
```

---

## Quick Start

### Deploy All Support Services
```bash
render blueprint apply render.yaml
```

### Health Checks
```bash
curl http://localhost:4001/health    # API Gateway
curl http://localhost:4885/health    # Customer Intelligence
curl http://localhost:4881/health   # Hojai Intelligence
curl http://localhost:4872/health   # Ticket Service
```

### Create Client Tenant
```bash
# Via API Gateway
curl -X POST http://localhost:4001/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "HOJAI AI", "slug": "hojai"}'
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](CLAUDE.md) | Main platform documentation |
| [RTNM-COMPANIES-AUDIT.md](RTNM-COMPANIES-AUDIT.md) | Company registry |
| [RTNM-PRODUCTS-FEATURES-AUDIT.md](RTNM-PRODUCTS-FEATURES-AUDIT.md) | Product catalog |
| [PLAN-CUSTOMER-OPS-PLATFORM.md](PLAN-CUSTOMER-OPS-PLATFORM.md) | Architecture plan |

---

**Built with ❤️ by RTMN - Empowering AI-Native Customer Operations**
