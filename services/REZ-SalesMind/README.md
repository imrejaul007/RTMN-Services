# REZ SalesMind - AI-Powered Sales Intelligence Platform

**Version:** 2.4.0  
**Port:** 5170  
**Company:** AdBazaar (RTMN Ecosystem)  
**Status:** ✅ Running

---

## Overview

REZ SalesMind is an AI-powered sales intelligence platform that combines lead discovery, enrichment, scoring, qualification, outreach automation, and AI copilot capabilities into a unified system.

```
┌─────────────────────────────────────────────────────────────────┐
│                     REZ SALESMIND                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🤖 AI Copilot        │ 📊 Analytics      │ 🎯 Scoring         │
│  📱 Social Hub        │ 💬 Outreach       │ 📧 Email           │
│  💾 CRM Integration    │ 🎯 SUTAR OS      │ 📞 Voice AI        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# Start service
cd companies/AdBazaar/REZ-SalesMind
node src/index.js

# Or with custom port
PORT=5170 node src/index.js
```

---

## API Endpoints

### Health & Info

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/health` | Service health check |
| GET | `/api/copilot/next-action` | Get AI recommendation |

### Leads

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/api/leads` | List all leads |
| POST | `/api/leads` | Create lead |
| GET | `/api/leads/:id` | Get lead by ID |
| PATCH | `/api/leads/:id` | Update lead |
| DELETE | `/api/leads/:id` | Delete lead |

### AI Copilot

| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/api/copilot/next-action` | Next best action |
| POST | `/api/copilot/script` | Generate script |
| POST | `/api/copilot/objection` | Objection handler |
| POST | `/api/copilot/coach` | Sales coaching |

### Dashboard

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/api/dashboard/stats` | Dashboard metrics |
| GET | `/api/dashboard/pipeline` | Pipeline view |

### Ecosystem

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/api/ecosystem/status` | Integration status |
| GET | `/api/ecosystem/health` | Service health |

---

## Environment Variables

```bash
PORT=5170
INTERNAL_SERVICE_TOKEN=salesmind123
ALLOWED_ORIGINS=http://localhost:3000

# HOJAI AI Services
HOJAI_WEB_INTEL=http://localhost:4595
HOJAI_MERCHANT_INTEL=http://localhost:4751
HOJAI_LEAD_SERVICE=http://localhost:4752
HOJAI_KG=http://localhost:4786
HOJAI_TWIN_OS=http://localhost:4521

# Communication
GENIE_VOICE=http://localhost:4760

# CRM & Identity
REZ_IDENTITY_HUB=http://localhost:4702
REZ_CRM_HUB=http://localhost:4056
```

---

## Services Connected

| Service | Port | Purpose |
|---------|------|---------|
| Lead Twin | 4894 | Lead database |
| CRM Engine | 4888 | Deals & Contacts |
| Journey Intel | 4954 | Funnel analytics |
| HOJAI Lead | 4752 | Lead scoring |
| Knowledge Graph | 4786 | Entity relationships |
| HOJAI Web Intel | 4595 | Market signals |

---

## Architecture

```
REZ SalesMind (5170)
     │
     ├── AI Copilot      → Anthropic Claude
     ├── Social Hub       → WhatsApp, LinkedIn, Twitter
     ├── Outreach        → Email, SMS, Calls
     ├── Dashboard       → Analytics & Stats
     │
     └── Integrations
              │
              ├── Lead Twin (4894)
              ├── CRM Engine (4888)
              ├── Journey Intel (4954)
              ├── HOJAI Services (4595, 4751, 4752, 4786)
              └── REZ CRM Hub (4056)
```

---

## Features

- [x] AI Copilot with Claude
- [x] Multi-channel outreach
- [x] Lead management
- [x] Pipeline dashboard
- [x] Integration status
- [x] WebSocket support
- [x] Rate limiting
- [x] CORS enabled
- [x] Health checks
- [ ] Real AI integrations (mock data)
- [ ] HubSpot sync

---

## Testing

```bash
# Health check
curl http://localhost:5170/health

# Copilot recommendation
curl http://localhost:5170/api/copilot/next-action

# Dashboard stats
curl http://localhost:5170/api/dashboard/stats
```

---

## Files

```
REZ-SalesMind/
├── src/
│   ├── index.js           # Main app
│   ├── models/           # Data models
│   ├── routes/           # API routes
│   └── services/         # Business logic
├── dist/                 # Compiled JS
├── frontend/             # Dashboard UI
├── render.yaml           # Deploy config
└── README.md
```

---

**Part of AdBazaar → RTMN Ecosystem**
