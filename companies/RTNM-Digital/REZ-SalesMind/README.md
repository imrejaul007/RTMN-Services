# REZ SalesMind

**AI-Powered Autonomous Sales Platform** — v2.4.0

Complete Lead → Sale → Customer Success lifecycle with AI agents, multi-channel campaigns, social media, and Customer Operations integration.

---

## 🚀 Quick Start

```bash
# Backend (Port 5170)
cd companies/RTNM-Digital/REZ-SalesMind
npm install && npm run build
npm start

# Frontend (Next.js)
cd frontend
npm install && npm run build
npm start
```

---

## 🎯 Features (30+)

### 🤖 AI Copilot
- Next Best Action | Sales Scripts | Call Prep | Objection Handling | Deal Prediction | Coaching

### 📱 Social Media (6 platforms)
WhatsApp | Instagram | LinkedIn | Twitter/X | Facebook | TikTok

### 📧 Multi-Channel Follow-Up
Email | SMS | WhatsApp | Call | LinkedIn | Instagram | Facebook | Twitter

### 💬 Unified Communications
Single inbox | Auto-select channel | Conversation history | Unified messaging

### 🎯 SUTAR OS Integration
Goals & Karma | Autonomous Agents | Decision Engine | Workflow Automation

### 👥 Customer Operations Integration
CRM Engine | Live Chat | BPO Manager | Social Hub | Voice Twin | Org Chart | Analytics

### 📞 Voice AI
Call Transcription | Voicemail Detection | Meeting Scheduling

### 💾 CRM Integration
HubSpot Write-back | Lead Sync | Activity Logging | Deal Tracking

---

## 📡 API Endpoints (100+)

| Category | Prefix | Endpoints |
|----------|--------|-----------|
| AI Copilot | `/api/copilot/*` | 15 |
| Social Media | `/api/social/*` | 20+ |
| Multi-Channel | `/api/followup/*` | 15+ |
| Comms | `/api/comms/*` | 25+ |
| SUTAR OS | `/api/sutar/*` | 20+ |
| Customer Ops | `/api/customer-ops/*` | 30+ |
| AI Tools | `/api/ai/*` | 10+ |
| Sales | `/api/sales/*` | 15+ |
| Ecosystem | `/api/ecosystem/*` | 14+ |

---

## 🔌 Customer Operations Integration

| Service | Port | Status |
|---------|------|--------|
| CRM Engine | 4888 | ✅ |
| Live Chat | 4892 | ✅ |
| BPO Manager | 4891 | ✅ |
| Social Hub | 4893 | ✅ |
| Voice Twin | 4876 | ✅ |
| Organization Twin | 4888 | ✅ |
| Product Twin | 4889 | ✅ |
| Executive Dashboard | 4896 | ✅ |

---

## 🛠️ Examples

```bash
# AI Copilot
curl -X POST http://localhost:5170/api/copilot/next-action \
  -H "X-Internal-Token: token" \
  -d '{"leadId":"lead_123","context":{"dealValue":50000}}'

# WhatsApp
curl -X POST http://localhost:5170/api/social/whatsapp/send \
  -H "X-Internal-Token: token" \
  -d '{"to":"+971501234567","message":"Hello!"}'

# Multi-Channel Follow-Up
curl -X POST http://localhost:5170/api/followup/sequence/create \
  -H "X-Internal-Token: token" \
  -d '{"Name":"Nurture","channels":["email","whatsapp"],"steps":[]}'

# SUTAR Goals
curl http://localhost:5170/api/sutar/goals -H "X-Internal-Token: token"

# Customer 360
curl http://localhost:5170/api/customer-ops/customer360/contact_001 \
  -H "X-Internal-Token: token"

# CRM Sync
curl -X POST http://localhost:5170/api/customer-ops/crm/sync-lead \
  -H "X-Internal-Token: token" \
  -d '{"leadData":{"name":"John","email":"john@acme.com"}}'
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REZ SALESMIND (5170)                         │
├─────────────────────────────────────────────────────────────────┤
│  AI Copilot │ Social Hub │ Multi-Channel │ SUTAR OS │ Comms   │
├─────────────────────────────────────────────────────────────────┤
│                    CUSTOMER OPERATIONS                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │   CRM   │ │   Live  │ │   BPO   │ │ Social  │ │  Voice  ││
│  │ Engine  │ │  Chat   │ │ Manager │ │   Hub   │ │  Twin   ││
│  │  4888   │ │  4892   │ │  4891   │ │  4893   │ │  4876   ││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
├─────────────────────────────────────────────────────────────────┤
│                    ECOSYSTEM SERVICES                            │
│  HOJAI AI │ REZ CRM │ CorpID │ Genie Voice │ AssetMind      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Authentication

```bash
curl -H "X-Internal-Token: your-token" http://localhost:5170/api/leads
```

---

## 🚀 Deploy

**Backend → Render**
```bash
render blueprint create --spec render.yaml
```

**Frontend → Vercel**
```bash
cd frontend && vercel --prod
```

---

## 📁 Services

| Service | Port | Purpose |
|---------|------|---------|
| REZ SalesMind | 5170 | Main platform |
| REZ CRM Hub | 4056 | CRM Hub |
| HOJAI Web Intel | 4595 | Market signals |
| HOJAI Merchant Intel | 4751 | Business intel |
| HOJAI Lead Service | 4752 | Lead scoring |
| HOJAI Knowledge Graph | 4786 | Entity relationships |
| HOJAI TwinOS | 4521 | Digital twins |
| Genie Voice | 4760 | Communication |
| CorpID | 4702 | Identity |
| AssetMind | 5200 | Forecasting |

---

**v2.4.0** · 100+ Endpoints · 30+ Features · 10 Connected Services
