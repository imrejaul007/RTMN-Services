# RTMN - Complete Platform Documentation

**Version:** 1.0  
**Date:** June 18, 2026  
**Status:** ✅ **FULLY DOCUMENTED**

---

## TABLE OF CONTENTS

1. [Platform Overview](#1-platform-overview)
2. [SALES OS](#2-sales-os)
3. [Customer Operations OS](#3-customer-operations-os)
4. [All Services Registry](#4-all-services-registry)
5. [Port Map](#5-port-map)
6. [Integration Architecture](#6-integration-architecture)
7. [Company Ecosystem](#7-company-ecosystem)

---

## 1. PLATFORM OVERVIEW

### Vision

```
RTMN = Real-Time Multi-Industry Network

The complete business operations platform that connects:
• Sales (Lead to Cash)
• Customer Operations (Support to Loyalty)
• Industry Verticals (24 industries)
• AI Intelligence (Predictions & Automation)
```

### Platform Stack

| Layer | Components |
|-------|------------|
| **Frontend** | 10+ Apps (Agent, Executive, Admin, CRM, Chat) |
| **Orchestration** | Sales Hub, Workflow Engine |
| **Intelligence** | AI Engines, Twins, Copilots |
| **Operations** | Customer Ops, Sales OS, Industry OS |
| **Foundation** | CorpID, Memory OS, SUTAR OS |
| **Ecosystem** | 17 Companies, 80+ Services |

---

## 2. SALES OS

### What is SALES OS?

```
SALES OS = The Complete Unified Sales Intelligence Platform

Combines:
• REZ SalesMind (CRM + Leads + Deals)
• REZ Atlas (Analytics + Forecasting)
• BrandPulse (Social Intelligence)
• SUTAR OS (Goals + Karma)
• Customer Operations (Trust + Journey + AI)
• Sales Hub (Orchestration)

Stats:
• 178+ Routes
• 24 Industry Bridges
• 7 Integrations
• Port: 5055
```

### SALES OS Components

#### 2.1 REZ SalesMind (Port 5175)

Core CRM and Sales Management

| Module | Features |
|--------|----------|
| Lead Management | Capture, score, qualify, assign, convert |
| Account/Contact | CRUD, relationships, hierarchy |
| Opportunities | Pipeline, stages, quotes, discounting |
| Activities | Calls, meetings, tasks, notes |
| Copilot | AI suggestions, next actions |
| Autonomous SDR | Auto email, auto outreach |
| Campaigns | Campaign management |
| Transcription | Call recording, voicemail |

#### 2.2 REZ Atlas (Port 5190)

Sales Analytics and Intelligence

| Module | Features |
|--------|----------|
| Analytics Overview | Dashboard, KPIs |
| Pipeline Health | Stage analysis, bottlenecks |
| Conversion Funnel | Lead to cash analysis |
| Revenue Forecasting | AI predictions, scenarios |
| Rep Performance | Leaderboards, metrics |
| AI Insights | Lead scoring, deal prediction |
| Reports | Custom dashboards, exports |

#### 2.3 BrandPulse (Port 4974)

Social Intelligence for Sales

| Module | Features |
|--------|----------|
| Social Monitoring | Twitter, FB, Instagram, LinkedIn |
| Sentiment Analysis | Brand perception tracking |
| Campaign Attribution | ROI tracking, source analysis |
| Crisis Detection | Alert system |
| Trends | Industry trends analysis |

#### 2.4 SUTAR Karma (Port 4251)

Rep Reputation and Gamification

| Module | Features |
|--------|----------|
| Karma System | Reputation scores |
| Goals | Sales targets, quotas |
| Achievements | Badges, rewards |
| Leaderboards | Team rankings |
| Commission | Auto calculation |

#### 2.5 Customer Operations Integration

Trust and Journey Intelligence

| Twin/Engine | Features |
|-------------|----------|
| Customer Twin | 360° view |
| Trust Intelligence | Customer reliability |
| Journey Intelligence | All touchpoints |
| AI Intelligence | Predictions |

#### 2.6 Sales Hub (Port 5180)

Central Orchestration

| Module | Features |
|--------|----------|
| Lead Enrichment | From all sources |
| Smart Routing | Territory, rep |
| Customer Conversion | Lead → Customer |
| Recommendations | Next best action |

### SALES OS Features

| Category | Count | Examples |
|----------|-------|----------|
| Core CRM | 45 | Leads, Accounts, Contacts, Opportunities |
| Analytics | 25 | Dashboard, Forecasting, Pipeline |
| AI & Intel | 20 | Copilot, Scoring, Churn |
| Commission | 15 | Plans, Payouts, Calculations |
| Contracts | 15 | Quotes, Bundles, Pricing |
| Territory | 10 | Routing, Distribution |
| Goals | 12 | KPIs, Leaderboards |
| Content | 10 | Battle Cards, Certs |
| Communication | 15 | Calls, Activities |
| Automation | 11 | Rules, Workflows |

### SALES OS Routes (178 Total)

```
/api/leads/*
/api/accounts/*
/api/contacts/*
/api/opportunities/*
/api/quotes/*
/api/contracts/*
/api/commissions/*
/api/goals/*
/api/territories/*
/api/routing/*
/api/activities/*
/api/calls/*
/api/campaigns/*
/api/content/*
/api/battle-cards/*
/api/certifications/*
/api/automation-rules/*
/api/workflows/*
/api/analytics/*
/api/forecasts/*
/api/dashboard/*
/api/health-scores/*
/api/churn-risks/*
/api/next-best-actions/*
/api/copilot/*
```

### 24 Industry Bridges

```
agriculture, automotive, beauty, construction, education,
entertainment, fashion, fitness, gaming, government,
healthcare, home_services, hotel, legal, manufacturing,
media, nonprofit, professional, realestate, restaurant,
retail, sports, travel, transport
```

### SALES OS Integrations

| Integration | File | Port |
|-------------|------|------|
| REZ Atlas | `rez-atlas.js` | 5190 |
| BrandPulse | `brandpulse.js` | 4974 |
| SUTAR Karma | `sutar-karma.js` | 4251 |
| Customer Ops | `customer-ops.js` | 4000+ |
| Sales Hub | `sales-hub.js` | 5180 |
| REZ SalesMind | `rez-salesmind.js` | 5175 |
| RTMN Ecosystem | `rtmn-ecosystem.js` | - |

---

## 3. CUSTOMER OPERATIONS OS

### What is CUSTOMER OPERATIONS OS?

```
CUSTOMER OPERATIONS OS = The Complete Customer Lifecycle Platform

Combines:
• 15 Digital Twins (Customer, Order, Payment, etc.)
• 7 AI Engines (Intent, Sentiment, Trust, etc.)
• 5 Copilots (Support, Sales, Marketing, Finance, Executive)
• 4 Refund/Resolution Engines
• 2 Voice AI Services
• 6 Fraud/Compliance Services

Stats:
• 70+ Services
• All customer touchpoints
• Auto-refund, Auto-resolve
• Port Range: 4000-4990
```

### CUSTOMER OPERATIONS Components

#### 3.1 Digital Twins (15)

| Twin | Port | Features |
|------|------|----------|
| Customer Twin | 4885 | Customer 360, profiles, AI predictions |
| Order Twin | 4900 | Orders, items, tracking |
| Payment Twin | 4901 | Payments, refunds, wallets |
| Subscription Twin | 4902 | Recurring billing |
| Shipment Twin | 4903 | Delivery tracking |
| Invoice Twin | 4904 | Billing, GST |
| Warranty Twin | 4905 | Warranty claims |
| Lead Twin | 4908 | Lead scoring |
| Campaign Twin | 4909 | Marketing campaigns |
| Asset Twin | 4890 | Properties, equipment |
| Employee Twin | 4891 | Staff profiles |
| Partner Twin | 4892 | Vendors, suppliers |
| Organization Twin | 4888 | Company data |
| Product Twin | 4889 | Products, inventory |
| Industry Twin | 4893 | Industry verticals |

#### 3.2 AI Engines (7)

| Engine | Port | Features |
|--------|------|----------|
| AI Intelligence | 4881 | Intent, sentiment, NLP |
| Decision Engine | 4951 | Auto decisions |
| Root Cause Engine | 4950 | Issue analysis |
| Simulation Engine | 4952 | What-if scenarios |
| Trust Intelligence | 4953 | Trust scoring |
| Journey Intelligence | 4954 | Touchpoints |
| Crowd Intelligence | 4983 | Pattern detection |

#### 3.3 Copilots (5)

| Copilot | Port | Features |
|---------|------|----------|
| Support Copilot | 4895 | Agent assistance |
| Sales Copilot | 4928 | Sales enablement |
| Marketing Copilot | 4929 | Campaign AI |
| Finance Copilot | 4930 | Financial AI |
| Executive Copilot | 4933 | Executive insights |

#### 3.4 Refund & Resolution (4)

| Engine | Port | Features |
|--------|------|----------|
| Refund Engine | 4980 | Auto refunds |
| Resolution Engine | 4981 | Auto resolve |
| Auto-Approve Engine | 4982 | Trust-based approvals |
| Decision Engine | 4951 | Policy decisions |

#### 3.5 Voice AI (2)

| Service | Port | Features |
|---------|------|----------|
| Voice Twin | 4876 | Call data, transcription |
| Voice AI Runtime | 4877 | Real-time voice, IVR |

#### 3.6 Fraud & Compliance (6)

| Service | Port | Features |
|---------|------|----------|
| Fraud Detection | 4985 | Fraud prevention |
| Compliance Engine | 4986 | GDPR, KYC, AML |
| Webhook Manager | 4987 | Webhooks |
| Analytics Dashboard | 4988 | Custom analytics |
| A/B Testing | 4989 | Experiments |
| Feature Flags | 4990 | Feature toggles |

#### 3.7 Operations (8)

| Service | Port | Features |
|---------|------|----------|
| Ticket Engine | 4872 | Support tickets |
| Workflow Engine | 4886 | Automation |
| Action Registry | 4887 | Safe actions |
| SLA Engine | 4888 | SLA tracking |
| Knowledge Base | 4871 | Articles, policies |
| Reports Engine | 4889 | Analytics |
| Notification Hub | 4890 | Multi-channel |
| Live Chat | 4875 | Real-time chat |

---

## 4. ALL SERVICES REGISTRY

### Services by Port

| Port | Service | Category |
|------|---------|----------|
| 10000 | pilot-onboarding | Gateway |
| 4000+ | Customer Operations | Twins, Engines, Copilots |
| 4300 | CorpID | Identity |
| 4703 | Memory OS | Foundation |
| 4870 | Unified Inbox | Operations |
| 4871 | Knowledge Base | Operations |
| 4872 | Ticket Engine | Operations |
| 4875 | Live Chat | Operations |
| 4876 | Voice Twin | Voice AI |
| 4877 | Voice AI Runtime | Voice AI |
| 4881 | AI Intelligence | AI Engine |
| 4885 | Customer Twin | Twin |
| 4886 | Workflow Engine | Operations |
| 4887 | Action Registry | Operations |
| 4888 | Organization Twin | Twin |
| 4889 | Product Twin | Twin |
| 4890 | Asset Twin | Twin |
| 4891 | Employee Twin | Twin |
| 4892 | Partner Twin | Twin |
| 4893 | Industry Twin | Twin |
| 4895 | Support Copilot | Copilot |
| 4900 | Order Twin | Twin |
| 4901 | Payment Twin | Twin |
| 4902 | Subscription Twin | Twin |
| 4903 | Shipment Twin | Twin |
| 4904 | Invoice Twin | Twin |
| 4905 | Warranty Twin | Twin |
| 4908 | Lead Twin | Twin |
| 4909 | Campaign Twin | Twin |
| 4928 | Sales Copilot | Copilot |
| 4929 | Marketing Copilot | Copilot |
| 4930 | Finance Copilot | Copilot |
| 4933 | Executive Copilot | Copilot |
| 4937 | Universal Graph | Intelligence |
| 4938 | Workflow Marketplace | Marketplace |
| 4939 | Knowledge Marketplace | Marketplace |
| 4950 | Root Cause Engine | AI Engine |
| 4951 | Decision Engine | AI Engine |
| 4952 | Simulation Engine | AI Engine |
| 4953 | Trust Intelligence | AI Engine |
| 4954 | Journey Intelligence | AI Engine |
| 4955 | Outcome Intelligence | Intelligence |
| 4974 | BrandPulse | Brand Intel |
| 4980 | Refund Engine | Refund |
| 4981 | Resolution Engine | Resolution |
| 4983 | Crowd Intelligence | AI Engine |
| 4985 | Fraud Detection | Fraud |
| 4986 | Compliance Engine | Compliance |
| 4987 | Webhook Manager | Integration |
| 4988 | Analytics Dashboard | Analytics |
| 4989 | A/B Testing | Testing |
| 4990 | Feature Flags | Feature |
| 5055 | Sales OS | Sales |
| 5175 | REZ SalesMind | Sales |
| 5180 | Sales Hub | Sales |
| 5181 | Sales Intelligence | Sales |
| 5182 | Sales Sync | Sales |
| 5183 | Sales Automation | Sales |
| 5190 | REZ Atlas | Analytics |

---

## 5. PORT MAP

```
10000   ───────► Pilot Onboarding (Gateway)
4000-4099  ───► Reserved
4100-4199  ───► SUTAR OS
4200-4299  ───► SUTAR OS
4300-4399  ───► CorpID
4400-4499  ───► Reserved
4500-4599  ───► RTMN Foundation
4600-4699  ───► HOJAI AI
4700-4799  ───► Memory OS, Agent OS
4800-4899  ───► Customer Operations (Twins, AI)
4900-4999  ───► Twins, Engines, Copilots
5000-5099  ───► Industry OS
5100-5199  ───► REZ Services
5200-5299  ───► Reserved
```

---

## 6. INTEGRATION ARCHITECTURE

### Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              RTMN PLATFORM                                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐               │
│  │   SALES OS     │◄──►│   SALES HUB    │◄──►│ CUSTOMER OPS   │               │
│  │   (5055)       │    │   (5180)       │    │   (4000+)      │               │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘               │
│           │                        │                        │                       │
│           │                        │                        │                       │
│  ┌────────┴────────┐    ┌────────┴────────┐    ┌────────┴────────┐           │
│  │  REZ Atlas      │    │  BrandPulse      │    │  AI Engines     │           │
│  │  (5190)        │    │  (4974)         │    │  (4881, 4950+)  │           │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘           │
│                                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐               │
│  │  SUTAR OS       │◄──►│  CorpID         │◄──►│  Memory OS      │               │
│  │  (4140+)       │    │  (4300)        │    │  (4703)        │               │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘               │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                            17 COMPANIES                                        │   │
│  │                                                                               │   │
│  │  HOJAI AI │ REZ │ AdBazaar │ RABTUL │ Nexha │ KHAIRMOVE │ CorpPerks     │   │
│  │  RisaCare │ AssetMind │ StayOwn │ LawGens │ RisnaEstate │ RidZa │ Axom   │   │
│  │                                                                               │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Examples

#### Lead to Customer Flow

```
1. Lead Created (Sales OS)
        │
        ▼
2. Sales Hub Enriches
   ├── Trust Score (Trust Intel)
   ├── AI Prediction (AI Intel)
   ├── Social Sentiment (BrandPulse)
   └── Karma Score (SUTAR)
        │
        ▼
3. Deal Won
   └── Customer Created (Customer Ops)
        │
        ▼
4. Customer Twin Updated
        │
        ▼
5. Support Available
        │
        ▼
6. Journey Tracked
        │
        ▼
7. Outcome Measured
```

---

## 7. COMPANY ECOSYSTEM

### 17 Companies in RTMN

| Company | Products | Integration |
|---------|----------|-------------|
| **HOJAI AI** | Genie, Copilot, SUTAR | AI Intelligence |
| **REZ-Commerce** | App, Delivery, Mall | Order Twin |
| **REZ-Merchant** | POS, Restaurant, Hotel | Order Twin |
| **AdBazaar** | CRM, Lead Intel, DOOH | Lead Twin |
| **RABTUL** | Auth, Wallet, Payment | Trust Twin |
| **Nexha** | Procurement, Distribution | Order Twin |
| **KHAIRMOVE** | Ride, Delivery, Fleet | Shipment Twin |
| **CorpPerks** | HR, Payroll, Benefits | Employee Twin |
| **RisaCare** | Healthcare, HealthTwin | Industry Twin |
| **AssetMind** | Wealth Management | Industry Twin |
| **StayOwn** | PMS, Booking, IoT | Asset Twin |
| **LawGens** | Legal OS, Contracts | Knowledge Twin |
| **RisnaEstate** | RealEstate OS | Asset Twin |
| **RidZa** | Finance, Remittance | Payment Twin |
| **Axom** | BuzzLocal, Community | Journey Twin |
| **BrandPulse** | Brand Monitoring | Campaign Twin |
| **SUTAR OS** | Goals, Karma, Auto-SDR | Sales Hub |

---

## DEPLOYMENT

### render.yaml Services

| Category | Count |
|----------|-------|
| Customer Operations | 40+ |
| Sales OS | 5 |
| Industry OS | 20+ |
| Foundation | 10+ |
| **Total** | **80+** |

### Quick Deploy

```bash
# Deploy all
render blueprint apply render.yaml

# Deploy frontend
cd frontend && vercel --prod
```

---

## SUMMARY

| Metric | Count |
|--------|-------|
| Total Companies | 17 |
| Total Services | 80+ |
| SALES OS Routes | 178+ |
| Industry Bridges | 24 |
| Digital Twins | 15 |
| AI Engines | 7 |
| Copilots | 5 |
| Ports Used | 50+ |

---

**Documentation Version 1.0 - June 18, 2026**

**RTMN - Real-Time Multi-Industry Network**
