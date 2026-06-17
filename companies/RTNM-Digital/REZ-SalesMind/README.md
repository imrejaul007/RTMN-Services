# REZ SalesMind

**AI-powered sales intelligence platform** for the RTMN ecosystem. Combines data from HOJAI AI, AdBazaar, REZ CRM Hub, and other services to deliver real-time sales signals, lead scoring, forecasting, and automated outreach.

**v2.3.0** · Port 5170 · Node.js 18+ · 26 Services · 48+ Endpoints

---

## Quick Start

```bash
npm install
npm run build
npm start
```

---

## Features Overview

| Category | Features |
|----------|----------|
| **Account Intelligence** | Company research, tech stack, funding, news, growth signals |
| **Decision Makers** | Org charts, buying committee, influence mapping |
| **Intent Signals** | Hiring, funding, leadership, tech adoption triggers |
| **Lead Intelligence** | AI scoring, enrichment, scoring |
| **Sales AI** | Email generation, proposals, forecasting |
| **Meeting Prep** | Auto agendas, briefings, battle cards |
| **Battle Cards** | Competitor intel, win themes, positioning |
| **Objection Handler** | 11 pre-built responses |
| **AI SDR Agent** | Autonomous prospecting, outreach |
| **Revenue Intelligence** | Pipeline health, forecasting |
| **Sales Assets** | Value props, pitches, proposals |

---

## API Reference (48+ Endpoints)

### Account Intelligence
```
GET /api/ecosystem/account/:company      Company research & summary
```

### Decision Makers
```
GET /api/ecosystem/decision-makers/:company   Org chart & buying committee
```

### Intent Signals
```
GET /api/ecosystem/intent-signals/:company    Buying triggers & signals
```

### Battle Cards
```
GET /api/ecosystem/battle-cards/:competitor  Competitive intelligence
```

### Objection Handler
```
GET /api/ai/objections/pricing          Pricing objection response
GET /api/ai/objections/competitor       Competitor objection response
GET /api/ai/objections/budget          Budget objection response
GET /api/ai/objections/all              All objection types
```

### Meeting Intelligence
```
GET /api/sales/meeting-prep/:leadId    Meeting preparation brief
POST /api/sales/meeting-prep/generate   Generate meeting brief
```

### AI SDR Agent
```
POST /api/ecosystem/sdr/find-prospects    Find prospects by criteria
POST /api/ecosystem/sdr/run              Run SDR workflow
```

### Sales Assets
```
POST /api/ai/sales-assets/generate        Generate sales materials
Types: value-proposition, elevator-pitch, executive-summary, discovery-questions
```

### Revenue Intelligence
```
GET /api/insights/revenue              Revenue analytics
GET /api/insights/pipeline-health     Pipeline health scores
```

---

## Example API Calls

```bash
# Account Intelligence
curl -H "X-Internal-Token: your-token" \
  "http://localhost:5170/api/ecosystem/account/Acme%20Corp"

# Decision Makers
curl -H "X-Internal-Token: your-token" \
  "http://localhost:5170/api/ecosystem/decision-makers/Acme"

# Intent Signals
curl -H "X-Internal-Token: your-token" \
  "http://localhost:5170/api/ecosystem/intent-signals/Acme"

# Battle Cards
curl -H "X-Internal-Token: your-token" \
  "http://localhost:5170/api/ecosystem/battle-cards/Salesforce"

# Objection Handler
curl -H "X-Internal-Token: your-token" \
  "http://localhost:5170/api/ai/objections/pricing"

# Meeting Prep
curl -H "X-Internal-Token: your-token" \
  "http://localhost:5170/api/sales/meeting-prep/acme-001"

# AI SDR - Find Prospects
curl -X POST -H "X-Internal-Token: your-token" \
  -H "Content-Type: application/json" \
  -d '{"criteria":"tech companies in Dubai","limit":10}' \
  "http://localhost:5170/api/ecosystem/sdr/find-prospects"

# Generate Sales Assets
curl -X POST -H "X-Internal-Token: your-token" \
  -H "Content-Type: application/json" \
  -d '{"type":"value-proposition","context":{"company":"Acme"}}' \
  "http://localhost:5170/api/ai/sales-assets/generate"
```

---

## Architecture

```
REZ SalesMind (5170)
├── Account Intelligence      → Company research, tech stack
├── Decision Maker Mapping    → Org charts, buying committee
├── Intent Signal Engine     → Hiring, funding, tech triggers
├── Lead Intelligence        → Scoring, enrichment
├── AI Tools                 → Email, proposals, forecasting
├── Meeting Intelligence     → Prep, agendas, battle cards
├── Battle Cards             → Competitive intel
├── Objection Handler        → Pre-built responses
├── AI SDR Agent             → Autonomous prospecting
├── Revenue Intelligence    → Pipeline, forecasting
├── Sales Assets Generator   → Value props, pitches
└── External Integrations
    ├── HOJAI AI (6 services)
    ├── REZ CRM Hub
    ├── REZ Identity
    ├── Genie Voice
    └── AssetMind
```

---

## Services (26 files)

| Service | Purpose |
|---------|---------|
| `accountIntelligence.ts` | Company research |
| `decisionMakerMapping.ts` | Org charts |
| `intentSignals.ts` | Buying triggers |
| `battleCards.ts` | Competitor intel |
| `objectionHandler.ts` | Response templates |
| `meetingIntelligence.ts` | Meeting prep |
| `aiSDRAgent.ts` | Autonomous prospecting |
| `salesAssets.ts` | Sales materials |
| `revenueIntelligence.ts` | Revenue analytics |
| `intelligenceEngine.ts` | Core AI engine |
| `signalAggregator.ts` | Signal processing |
| `twinService.ts` | Prospect twins |
| `hojaiClient.ts` | HOJAI AI |
| `rezCRMClient.ts` | CRM integration |
| `ecosystemConnector.ts` | All services |
| `emailWriter.ts` | Email generation |
| `proposalGenerator.ts` | Proposals |
| `salesForecasting.ts` | Forecasting |
| `followUpEngine.ts` | Sequences |
| `slackClient.ts` | Slack |
| `linkedinClient.ts` | LinkedIn |
| `gmailClient.ts` | Gmail |
| `zoomClient.ts` | Zoom |
| `websocketHandler.ts` | Real-time |
| `pipelineDashboard.ts` | Analytics |
| `adbazaarClient.ts` | AdBazaar |

---

## External Integrations

| Service | Port | Status |
|---------|------|--------|
| REZ CRM Hub | 4056 | ✅ |
| HOJAI Web Intel | 4595 | ✅ |
| HOJAI Merchant Intel | 4751 | ✅ |
| HOJAI Lead Service | 4752 | ✅ |
| HOJAI Knowledge Graph | 4786 | ✅ |
| HOJAI TwinOS | 4521 | ✅ |
| Genie Voice | 4760 | ✅ |
| REZ Identity Hub | 4702 | ✅ |
| AssetMind | 5200 | ✅ |

---

## Security

- ✅ `crypto.timingSafeEqual` for auth
- ✅ Rate limiting (100/min general, 20/min writes)
- ✅ Input validation & XSS protection
- ✅ Request body size limits
- ✅ Graceful shutdown

---

## Changelog

### v2.3.0 (June 17, 2026)
- Added Account Intelligence
- Added Decision Maker Mapping
- Added Intent Signal Engine
- Added Battle Cards
- Added Objection Handler (11 types)
- Added Meeting Intelligence
- Added AI SDR Agent
- Added Sales Assets Generator
- Added Revenue Intelligence
- **48+ endpoints total**

### v2.2.0 (June 17, 2026)
- 50+ security fixes
- Full TypeScript source restored
- HOJAI services integrated

---

## License

MIT · RTNM Digital
