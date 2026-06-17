# REZ SalesMind

**AI-Powered Autonomous Sales Platform** for the RTMN ecosystem. Features autonomous SDR agents, multi-channel campaigns, social media integration, and AI copilot.

**v2.4.0** · Port 5170 · 100+ API Endpoints · 15 Features

---

## 🚀 Features

### 🤖 AI Copilot
- Next Best Action recommendations
- Sales Script generation
- Call preparation briefs
- Objection handling
- Deal prediction
- Competitive analysis
- Sales coaching

### 📱 Social Media Integration
| Platform | Send | Templates | Status |
|----------|------|----------|--------|
| WhatsApp | ✅ | ✅ | Connected |
| Instagram | ✅ | - | Connected |
| LinkedIn | ✅ | - | Connected |
| Twitter/X | ✅ | - | Connected |
| Facebook | ✅ | ✅ | Connected |
| TikTok | ✅ | - | Connected |

### 📧 Multi-Channel Follow-Up
- Email, SMS, WhatsApp, Call, Social
- A/B testing
- Timezone-aware scheduling
- Conditional branching
- Auto-pause on reply

### 💬 Unified Communications
- Single inbox for all channels
- Auto-select best channel
- Conversation history
- Unified messaging API

### 🎯 SUTAR OS Integration
- Goals & Karma system
- Autonomous Agents
- Decision engine
- Workflow automation

### 📞 Voice AI
- Call transcription
- Voicemail detection
- Meeting scheduling

### 💾 CRM Integration
- HubSpot write-back
- Lead sync
- Activity logging
- Deal tracking

---

## 🛠️ Quick Start

```bash
# Install & build
npm install
npm run build

# Run
npm start
```

Environment variables:
```bash
cp .env.example .env
```

---

## 📡 API Endpoints (100+)

```
/api/copilot/*       AI Copilot (15 endpoints)
/api/social/*        Social Media (20 endpoints)
/api/followup/*      Multi-Channel Follow-Up (15 endpoints)
/api/comms/*        Unified Communications (25 endpoints)
/api/sutar/*        SUTAR OS (20 endpoints)
/api/sales/*        Sales Intelligence
/api/ai/*           AI Tools
/api/ecosystem/*     Ecosystem
/api/transcription/* Voice AI
/api/voicemail/*    Voicemail
/api/campaign/*     Campaigns
/api/sdr/*          Autonomous SDR
/api/crm/*          CRM Write-back
```

---

## 🔑 Authentication

```bash
curl -H "X-Internal-Token: your-token" http://localhost:5170/api/leads
```

---

## 🧪 Examples

```bash
# WhatsApp Message
curl -X POST http://localhost:5170/api/social/whatsapp/send \
  -H "X-Internal-Token: token" \
  -d '{"to":"+971501234567","message":"Hello!"}'

# Multi-Channel Follow-Up
curl -X POST http://localhost:5170/api/followup/sequence/create \
  -H "X-Internal-Token: token" \
  -d '{"name":"Nurture","channels":["email","whatsapp"],"steps":[]}'

# AI Copilot
curl -X POST http://localhost:5170/api/copilot/next-action \
  -H "X-Internal-Token: token" \
  -d '{"leadId":"lead_123","context":{"dealValue":50000}}'

# SUTAR Goals
curl http://localhost:5170/api/sutar/goals \
  -H "X-Internal-Token: token"
```

---

## 🏗️ Architecture

```
REZ SalesMind (5170)
├── AI Copilot        → Claude, GPT-4 integration
├── Social Hub        → WhatsApp, LinkedIn, Twitter, Instagram, FB, TikTok
├── Multi-Channel     → Email, SMS, Call, Social sequences
├── Comms Hub         → Unified inbox & messaging
├── SUTAR OS          → Goals, Agents, Karma, Decisions
├── Voice AI          → Transcription, Voicemail, Meetings
├── CRM               → HubSpot sync
└── Ecosystem         → 9 connected services
```

---

## 📦 Services Connected

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

## 🚀 Deploy

See [DEPLOY.md](../DEPLOY.md) for full deployment instructions.

```bash
# Backend → Render
render blueprint create --spec render.yaml

# Frontend → Vercel
cd frontend && vercel --prod
```

---

## 🧰 Tech Stack

- Node.js 18+
- Express.js
- TypeScript
- Claude AI (Anthropic)
- React/Next.js
- Tailwind CSS

---

## 📄 License

MIT · RTNM Digital
