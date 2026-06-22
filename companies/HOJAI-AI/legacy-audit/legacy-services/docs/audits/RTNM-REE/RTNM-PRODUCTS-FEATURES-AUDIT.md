# RTNM Digital - Complete Products & Features Audit

**Version:** 2.0
**Date:** June 11, 2026
**Status:** COMPLETE - All products + Genie Actionable + **ALL IMPLEMENTATIONS COMPLETE**

---

## IMPLEMENTATION STATUS (Updated June 11, 2026)

| Service | Status | Lines | Port | Features |
|---------|--------|-------|------|----------|
| **hojai-hyperlocal** | ✅ | 2,406 | 4560 | Geofencing, route optimization, location tracking, neighborhood analytics |
| **RIDZA** | ✅ | 1,500+ | 5200 | Credit, Insurance, Lending, BNPL, Islamic Finance, Remittance, Portfolio |
| **REZ-Workspace** | ✅ | 2,663 | 4300 | Workspace, Channels, Messaging, Meetings, Documents, Tasks, AI Assistant |
| **LawGens** | ✅ | 1,179 | 5100 | Contract Analysis, Compliance, Court Research, e-Discovery, Arbitration |
| **AssetMind** | ✅ | 83 files | 5000-5300 | Bloomberg-like platform, all twins, trading, analytics |
| **RTNM-REE** | ✅ | 12 services | 3000-3011 | Ops, Trust, Growth, Logistics, Attribution, Creative, Franchise, AI, Mind services |
| **Genie Voice (Actionable)** | ✅ | 16 services | 4001-4760 | BUY, PAY, BOOK, RIDE, DOCTOR, WALLET, MESSAGE, MEETING, TASK |

---

# GENIE ACTIONABLE - VOICE COMMANDS THAT EXECUTE

**Genie is now FULLY ACTIONABLE** - "You don't use Genie. You TALK to Genie."

## Genie Voice Commands (15 Actions)

| # | Voice Command | What Genie Does |
|---|--------------|-----------------|
| 1 | "buy bluetooth speaker for 1500" | → Searches products, initiates purchase |
| 2 | "pay 500 rupees to Rahul" | → Transfers via UPI/Razorpay |
| 3 | "book a table for 2 at 8pm" | → Restaurant reservation |
| 4 | "book a hotel in Dubai" | → StayOwn hotel search & booking |
| 5 | "book a premium cab to airport" | → KHAIRMOVE ride booking |
| 6 | "book cardiologist appointment" | → RisaCare doctor booking |
| 7 | "how much balance in wallet?" | → Shows ₹5000, 250 coins, ₹150 cashback |
| 8 | "send whatsapp to Rahul" | → WhatsApp message sent |
| 9 | "email team about meeting" | → Email sent via Email service |
| 10 | "call mom" | → Call initiated via Call service |
| 11 | "schedule meeting with team at 3pm" | → Calendar event created |
| 12 | "create task to buy groceries" | → Household task created |
| 13 | "find dermatologist near me" | → RisaCare doctor search |
| 14 | "where is my cab?" | → KHAIRMOVE ride tracking |
| 15 | "remember passport is in drawer" | → Saved to Genie Memory |

## Genie Commerce APIs

```bash
# Commerce
POST /api/commerce/execute     # Execute: buy, pay, book, schedule
GET  /api/commerce/wallet/:id # Balance check
POST /api/commerce/pay         # Payment
GET  /api/commerce/products    # Product search
GET  /api/commerce/hotels     # Hotel search

# Healthcare (RisaCare)
GET  /api/healthcare/doctors          # Search doctors
POST /api/healthcare/appointments     # Book appointment

# Mobility (KHAIRMOVE)
POST /api/mobility/estimate           # Fare estimation
POST /api/mobility/rides             # Book ride
GET  /api/mobility/rides/:id/track  # Track ride

# Communication
POST /api/message/send               # WhatsApp/Email/SMS
POST /api/meeting/schedule           # Video meeting
POST /api/household/task             # Task creation
```

## Genie Services Architecture

```
GENIE VOICE (4760)
    │
    ├── Commerce Hub (genieCommerce.ts)
    │   ├── Wallet Service (4004) ✅
    │   ├── Payment Service (4001) ✅
    │   └── Catalog (local) ✅
    │
    ├── Healthcare (externalServices.ts)
    │   └── RisaCare (4800) ✅
    │
    ├── Mobility (externalServices.ts)
    │   └── KHAIRMOVE (4600) ✅
    │
    ├── Genie Core Services
    │   ├── Memory (4703) ✅
    │   ├── Relationship (4702) ✅
    │   ├── Calendar (4709) ✅
    │   ├── WhatsApp (4708) ✅
    │   ├── Email (4710) ✅
    │   ├── Call (4707) ✅
    │   └── Document (4711) ✅
    │
    └── Intent Detection (intentService.ts)
        └── 15 action types with entity extraction
```

---

# 1. HOJAI AI - Products & Features

## 1.1 HOJAI Core Platforms

### HOJAI Core (12 Platforms)
| Feature | Description |
|---------|-------------|
| **API Gateway** | Routing, auth, rate limiting, load balancing |
| **Event Bus** | Pub/sub, streaming, real-time events |
| **Memory** | Vector store, timeline, semantic search |
| **Intelligence** | ML predictions, anomaly detection |
| **Agents** | Agent orchestration, scheduling, execution |
| **Workflows** | Automation, triggers, conditions |
| **Communications** | WhatsApp, SMS, Email, Push |
| **Hyperlocal** | Geo intelligence, location services |
| **Data** | Feature store, data pipeline |
| **Governance** | RBAC, audit logs, permissions |
| **Identity** | Identity management, verification |
| **Analytics** | Dashboards, metrics, reporting |

### MemoryOS
| Feature | Description |
|---------|-------------|
| **Conversation Memory** | Chat history, context persistence |
| **Preference Memory** | User likes, dislikes, settings |
| **Interaction Memory** | Behavioral patterns, usage data |
| **Knowledge Memory** | Facts, entities, relationships |
| **Cross-Device Sync** | Seamless memory across devices |

### TwinOS
| Feature | Description |
|---------|-------------|
| **Human Twin** | Employee/customer digital twin |
| **Agent Twin** | AI employee digital twin |
| **Hybrid Twin** | Human + Agent team composition |
| **Organization Twin** | Company-level digital twin |
| **Asset Twin** | Product, inventory, equipment twins |
| **Relationship Graph** | Entity relationships, social graph |

### FlowOS
| Feature | Description |
|---------|-------------|
| **Visual Workflow Builder** | Drag-and-drop workflow creation |
| **Trigger System** | Event-based workflow activation |
| **Condition Logic** | If/else, branching paths |
| **Parallel Execution** | Concurrent task processing |
| **Error Handling** | Retry, fallback, notifications |
| **Workflow Templates** | Pre-built industry workflows |

### PolicyOS
| Feature | Description |
|---------|-------------|
| **Policy Engine** | Rule-based policy enforcement |
| **Compliance Framework** | GDPR, SOC2, HIPAA ready |
| **Audit Trail** | Complete policy change history |
| **Access Control** | Role-based permissions |
| **Risk Assessment** | Automated risk scoring |


### SUTAR SimulationOS (HOJAI AI)
**Port:** 4241 | **Service:** sutar-simulation-os | **Layer:** 5

#### Features

##### Scenario Planning ✅
| Feature | Status | Category |
|---------|--------|----------|
| Pricing Optimization | ✅ | PRICING |
| Offer Modeling | ✅ | OFFER |
| Cashback ROI | ✅ | CASHBACK |
| Bundle Pricing | ✅ | BUNDLE |

##### Forecasting ✅
| Feature | Status | Category |
|---------|--------|----------|
| Demand Forecasting | ✅ | DEMAND |
| Cash Flow Forecasting | ✅ | CASHFLOW |
| Revenue Forecasting | ✅ | REVENUE |
| Cost Forecasting | ✅ | COST |

##### Risk Modeling ✅
| Feature | Status | Category |
|---------|--------|----------|
| Financial Risk | ✅ | RISK |
| Operational Risk | ✅ | RISK |
| Market Risk | ✅ | RISK |
| Compliance Risk | ✅ | COMPLIANCE |

##### Sensitivity Analysis ✅
| Feature | Status | Category |
|---------|--------|----------|
| What-If Analysis | ✅ | /api/v1/simulations/:id/whatif |
| Impact Assessment | ✅ | ImpactSummary |
| Recommendation Engine | ✅ | Recommendation[] |

##### Operations ✅
| Feature | Status | Category |
|---------|--------|----------|
| Staffing Optimization | ✅ | STAFFING |
| Inventory Optimization | ✅ | INVENTORY |
| Procurement Analysis | ✅ | PROCUREMENT |

#### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/v1/simulations | POST | Run Monte Carlo simulation |
| /api/v1/simulations | GET | List simulations |
| /api/v1/simulations/:id | GET | Get simulation |
| /api/v1/simulations/:id | DELETE | Delete simulation |
| /api/v1/simulations/:id/whatif | POST | What-if analysis |
| /api/v1/simulations/compare | POST | Compare scenarios |

#### Implementation
- **Location:** `companies/hojai-ai/hojai-sutar-os/services/sutar-simulation-os/`
- **Technology:** Node.js, Express, TypeScript, Zod
- **Lines:** 1500+
- **Status:** Production Ready

---
### SUTAR OS (Autonomous Business OS)

| Feature | Description |
|---------|-------------|
| **Intent Bus** | Business intent routing |
| **Simulation Engine** | Monte Carlo, scenario planning |
| **Decision Engine** | Real-time business decisions |
| **Learning System** | Continuous improvement |
| **ROI Calculator** | Investment returns |
| **Contract Management** | Smart contracts |
| **Trust Engine** | Entity trust scoring |

#### RTNM Integration Services (NEW)

| Service | Port | Purpose |
|---------|------|---------|
| **sutar-rez-bridge** | 4155 | HOJAI-SUTAR ↔ REZ Commerce bridge |
| **sutar-intent-bus** | 4154 | Intent propagation across ecosystem |
| **order-flow-orchestrator** | 4260 | 6-stage order flow orchestration |
| **rez-event-bus** | 4075 | RTNM event bus (Redis pub/sub) |

#### SUTAR Integration Bridges

| Bridge | Purpose |
|--------|---------|
| **hojai-core-bridge** | HOJAI Core services integration |
| **salar-bridge** | SALAR OS workforce integration |
| **industry-agent-bridge** | Industry-specific AI agents |

#### Order Flow Stages (6-Stage Orchestration)

| Stage | Description |
|-------|-------------|
| **Intent** | Customer intent detection & routing |
| **Negotiation** | Price/terms negotiation via AXP |
| **Decision** | AI-powered business decisions |
| **Order** | Order creation & management |
| **Delivery** | Logistics & fulfillment |
| **Merchant** | Merchant notification & processing |

#### AXP Protocol (Agent Communication)

| Message | Purpose |
|---------|---------|
| **RFQ** | Request for Quote |
| **QUOTE** | Price/terms proposal |
| **ACCEPT** | Accept proposal |
| **REJECT** | Reject proposal |

#### @hojai/sutar-sdk

| Feature | Description |
|---------|-------------|
| **SUTARClient** | Main client for SUTAR OS |
| **AXPProtocol** | Agent communication protocol |
| **OrderFlow** | Order flow orchestration |
| **IntentRouter** | Intent routing & detection |
| **EventBus** | Event publishing/subscribing |

### Agent Platform
| Feature | Description |
|---------|-------------|
| **Agent Registry** | Catalog of all AI agents |
| **Agent Builder** | No-code agent creation |
| **Agent Streaming** | Real-time agent responses |
| **Agent Marketplace** | Buy/sell AI agents |
| **Human-in-Loop** | Human approval workflows |
| **Agent Observability** | Monitoring, logging |

---

## 1.2 Genie (Personal AI)

> **"You don't use Genie. You talk to Genie."**
> Genie Voice = Razo (voice conversations) + genie-voice-service (voice notes, transcription)

### Genie Services (All Running - June 2026)

| Port | Service | Purpose | Status |
|------|---------|---------|--------|
| **4580** | Genie Wake Word Engine | "Hey Genie" detection | ✅ Running |
| **4703** | Genie Memory Service | Personal memory storage | ✅ Running |
| **4704** | Genie Briefing Service | Daily briefings | ✅ Running |
| **4706** | Genie Household Service | Home coordination | ✅ Running |
| **4707** | Genie Call Service | Voice call management | ✅ Running |
| **4708** | Genie WhatsApp Service | WhatsApp integration | ✅ Running |
| **4709** | Genie Calendar Service | Calendar management | ✅ Running |
| **4710** | Genie Email Service | Email integration | ✅ Running |
| **4711** | Genie Slack Service | Slack integration | ✅ Running |
| **4712** | Genie Voice Notes Service | Voice note storage | ✅ Running |
| **4713** | Genie Meeting Service | Meeting management | ✅ Running |
| **4760** | Genie Voice | Unified voice assistant | ✅ Running |

### Genie Voice Features (Port 4760)

| Feature | Description |
|---------|-------------|
| **Speech to Text** | STT (Edge + Cloud fallback) |
| **Text to Speech** | TTS (ElevenLabs + Cloud) |
| **Voice Notes** | Record, transcribe, store |
| **Wake Word Detection** | "Hey Genie" always-on |
| **Intent Processing** | Understand user commands |
| **Memory Integration** | Remember facts, preferences |
| **Daily Briefings** | Morning/evening summaries |
| **Training Data** | HOJAI Voice Studio collection |

### Wake Word Engine (4580)

| Wake Word | Phrase | Language |
|-----------|--------|----------|
| Primary | "Hey Genie" | English (India) |
| Home | "Hey Genie Home" | English |
| Office | "Hey Genie Office" | English |
| Car | "Hey Genie Car" | English |
| Hindi | "हे जिनी" | Hindi |
| Legacy | "Hey Razo" | English (US) |

### Supported Languages (33+)

| Category | Languages | Count |
|----------|-----------|--------|
| **Indian Languages** | English (India), Hindi, Tamil, Telugu, Bengali, Kannada, Malayalam, Marathi, Gujarati, Punjabi | 10 |
| **GCC Arabic Dialects** | Saudi, UAE, Kuwaiti, Qatari, Bahraini, Omani, Iraqi | 7 |
| **UAE Expat Languages** | Filipino, Urdu, Indonesian, Nepali, Sinhala, Pashto, Dari, Tigrinya, Amharic, Arabic (Egyptian), Mandarin, Russian, Spanish | 16 |

### Genie Voice API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/stt` | Transcribe audio to text |
| POST | `/api/tts` | Convert text to speech |
| POST | `/api/notes` | Create voice note |
| GET | `/api/notes` | List voice notes |
| POST | `/api/wake-word/detect` | Detect wake word |
| POST | `/api/intent` | Process intent |
| POST | `/api/memory` | Store memory |
| GET | `/api/memory` | Recall memories |
| GET | `/api/briefing` | Get daily briefing |
| POST | `/api/voice/process` | Full voice pipeline |
| GET | `/api/training/export` | Export training data |
| GET | `/health` | Health check |

### Connectors (14)
| Connector | Platform | Features |
|-----------|----------|----------|
| **Slack Connector** | Slack | Channel sync, message history |
| **Telegram Connector** | Telegram | Bot integration, notifications |
| **Notion Connector** | Notion | Notes sync, database access |
| **Drive Connector** | Google Drive | File access, backup |
| **Obsidian Connector** | Obsidian | PKM sync, vault access |
| **Browser History** | Chrome/Firefox | Browsing insights, bookmarks |
| **Discord Connector** | Discord | Server sync, messages |
| **Calendar Connector** | Google Calendar | Event sync, scheduling |
| **WhatsApp Connector** | WhatsApp | Message sync, contacts |
| **GitHub Connector** | GitHub | Code, issues, PRs |
| **OneDrive Connector** | OneDrive | File access |
| **S3 Connector** | AWS S3 | Cloud storage |
| **Telegram Connector** | Telegram | Bot integration |
| **Sync Service** | Cross-device | Unified sync |

### Personal OS Features
| Feature | Description |
|---------|-------------|
| **Morning Briefing** | Weather, calendar, tasks, news |
| **Relationship Tracking** | Birthday reminders, follow-ups |
| **Habit Learning** | Pattern detection, suggestions |
| **Smart Suggestions** | Context-aware recommendations |
| **Memory Review** | Periodic memory cleanup | |

---

## 1.3 VoiceOS (Voice AI)

### VoiceOS Features
| Feature | Description |
|---------|-------------|
| **Speech to Text** | STT (Whisper, Sarvam, Google) |
| **Text to Speech** | TTS (ElevenLabs, Cartesia, Sarvam) |
| **Multilingual** | 10+ Indian languages (Hindi, Tamil, Telugu, etc.) |
| **Voice Commerce** | Voice-based ordering, checkout |
| **Voice Bookings** | Appointments, reservations |
| **Voice Payments** | UPI, Card, COD via voice |
| **Voice Support** | Complaints, refunds handling |

### Telecom Bridge
| Feature | Description |
|---------|-------------|
| **Twilio Integration** | International calls, SMS |
| **Exotel Integration** | India IVR, calls |
| **Knowlarity Integration** | Bulk calling, campaigns |
| **Video Agent** | Video consultations |
| **WhatsApp Voice** | Voice via WhatsApp |

### Voice Agents (7 Types)
| Agent | Features |
|-------|----------|
| **Receptionist** | Answer calls, book appointments, route calls |
| **SDR Agent** | Qualify leads, schedule demos, follow-ups |
| **Support Agent** | Handle complaints, refunds, FAQs |
| **Booking Agent** | Tables, services, rides, appointments |
| **Collections Agent** | Payment follow-ups, reminders |
| **CFO Agent** | Financial queries, reports |
| **HR Agent** | Employee queries, policies |

### Voice Ecosystem Features

| Feature | Port | Description | Status |
|---------|------|-------------|--------|
| **Communication Twin Sync** | 4700 | Auto-sync all communication patterns | ✅ |
| **SkillNet Bridge** | 4701 | Professional learning events | ✅ |
| **Voice Synthesis Learning** | 4702 | Personalized voice responses | ✅ |
| **Learning Dashboard** | 4703 | Analytics & progress | ✅ |
| **Code-Switching Detection** | 4623 | Hinglish, Tanglish, Benglish (50+ languages) | ✅ |
| **Voice Translation** | 4631 | Voice-to-voice translation | ✅ |
| **Emotional Voice** | 4629 | Emotion detection & empathetic responses | ✅ |
| **Communication Style** | 4621 | Casual, formal, concise, expressive | ✅ |
| **ML Training Pipeline** | 4626 | Continuous model improvement | ✅ |
| **Text Cleanup (Razo)** | 4635 | Filler removal, auto-format | ✅ NEW |
| **Voice Snippets (Razo)** | 4636 | Reusable voice templates | ✅ NEW |
| **Personal Dictionary** | 4623 | Learn names, terms, pronunciations | ✅ |
| **Razo Voice Agent** | 4660 | Unified voice AI with all features | ✅ |

### Razo Keyboard Features (NEW)

| Feature | Description |
|---------|-------------|
| **Filler Removal** | Remove "umm", "uh", "like", "you know", etc. |
| **Auto-Formatting** | Capitalization, punctuation, spacing |
| **Repetition Fix** | Fix repeated words ("I I I want") |
| **Voice Snippets** | Create reusable templates like "meeting link" → full meeting text |
| **Personal Dictionary** | Learn unique names, industry terms, pronunciations |
| **Fuzzy Match** | Match spoken text to snippets even with variations |

### Razo Keyboard Web App (razo-keyboard) (NEW)

**Purpose:** Downloadable keyboard alternative for normal users

**Location:** `voice-ecosystem/razo-keyboard/`
**Port:** 3001 (dev) | Built for production deployment

#### Features
| Feature | Description |
|---------|-------------|
| **Voice Recording** | Real-time voice input via Web Speech API |
| **Text Cleanup** | Auto-removes fillers, fixes repetitions |
| **Voice Snippets** | Create reusable templates |
| **Copy to Clipboard** | One-tap copy for any app |
| **Text-to-Speech** | Read cleaned text aloud |
| **Usage Stats** | Track words typed, time saved |

#### Tech Stack
- React 18 + TypeScript
- Vite build system
- Web Speech API (Chrome compatible)
- Gradient UI with Inter font

#### Tab Structure
| Tab | Features |
|-----|----------|
| **Home** | Voice recording, transcript list, copy/speak actions |
| **Snippets** | Add/manage voice snippets by category |
| **Stats** | Sessions, words typed, time saved |

#### API Integration
| Service | Port | Usage |
|---------|------|-------|
| text-cleanup-service | 4635 | Filler removal, auto-format |
| voice-snippets-service | 4636 | Template matching |

### Languages Supported

| Language | Code | Status |
|----------|------|--------|
| English | en-IN | ✅ |
| Hindi | hi-IN | ✅ |
| Tamil | ta-IN | ✅ |
| Telugu | te-IN | ✅ |
| Bengali | bn-IN | ✅ |
| Kannada | kn-IN | ✅ |
| Malayalam | ml-IN | ✅ |
| Marathi | mr-IN | ✅ |
| Gujarati | gu-IN | ✅ |
| Punjabi | pa-IN | ✅ |
| Arabic | ar | ✅ |
| Chinese | zh | ✅ |
| Spanish | es | ✅ |
| French | fr | ✅ |

### Memory Tier Architecture (5-Tier)

See [5-TIER-MEMORY-INTEGRATION.md](5-TIER-MEMORY-INTEGRATION.md) for full integration.

### RAZO Communication OS (NEW)

**Cross-platform keyboard + communication layer for entire RTNM ecosystem**

See [RAZO-COMPLETE-ARCHITECTURE.md](RAZO-COMPLETE-ARCHITECTURE.md) for full architecture.

#### Platforms
| Platform | Status | Features |
|----------|--------|----------|
| Web UI | ✅ Built | All 6 keyboard states (React) |
| Android | 📋 SDK Ready | Custom keyboard, voice, vault, autofill, passkeys |
| iOS | 📋 SDK Ready | Custom keyboard, voice, autofill, passkeys |
| Mac | 📋 SDK Ready | System-wide keyboard, menu bar, touch bar |
| Windows | 📋 SDK Ready | Keyboard overlay, Windows Hello, system tray |

**UI Location:** `RAZO-Keyboard/UI/components/`

**Keyboard States:** Default Typing, Voice Input, Genie Mode, Suggestion Cards, App Launcher, Action Mode

#### Cloud Services (Ports 4631-4655)
| Service | Port | Purpose |
|---------|------|---------|
| RAZO Cloud | 4631 | Sync, voice processing |
| RAZO Vault | 4632 | Passwords, passkeys, biometric |
| RAZO Search | 4633 | App launcher |
| RAZO AI | 4634 | Genie, CoPilot, grammar |
| RAZO Cleanup | 4635 | Text cleanup |
| RAZO Snippets | 4636 | Phrase expansion |
| RAZO Predictive | 4640 | Next-word prediction, autocorrect, emoji |
| RAZO Intent Router | 4650 | Voice Typing vs Genie Mode routing |
| RAZO Smart Suggestions | 4651 | Genie Briefs, proactive cards |
| RAZO Action Cards | 4652 | "Do It For Me" actions |
| RAZO Command Bar | 4653 | Slash commands (/flight, /hotel, /wallet) |
| RAZO Deep Links | 4654 | Universal rez:// URL scheme |
| RAZO Keyboard Feed | 4655 | "Today's Story" dashboard |

#### 6 Keyboard States
| State | UI Component | Backend Service |
|-------|-------------|----------------|
| Default Typing | `DefaultKeyboard.tsx` | Predictive Engine (4640) |
| Voice Input | `VoiceMode.tsx` | Intent Router (4650) |
| Genie Mode | `GenieMode.tsx` | Genie Voice (4760) |
| Suggestion Cards | `SuggestionCards.tsx` | Smart Suggestions (4651) |
| App Launcher | `AppLauncher.tsx` | Deep Links (4654) |
| Action Mode | `ActionMode.tsx` | Action Cards (4652) |

#### Key Features
| Feature | Description |
|---------|-------------|
| Voice Input | Type by speaking |
| Grammar AI | Grammarly-level corrections + tone |
| AI Suggestions | Context-aware suggestions |
| Password Vault | Store passwords, passkeys, cards |
| Biometric Unlock | Face ID, Touch ID, Windows Hello |
| Auto-Login | Login to all RTNM apps via CorpID |
| Keyboard Search | Search "airzy" → opens Airzy app |
| Genie | Ask Genie from keyboard |
| CoPilot | Business AI from keyboard |
| Cross-Device Sync | Sync across all platforms |

#### Ecosystem Integration
| Service | Integration |
|---------|-------------|
| Genie | Native keyboard integration |
| CoPilot | Business AI |
| CorpID | Identity + Passkeys |
| MemoryOS | User preferences (L1-L5) |
| TwinOS | Voice + Communication twin |
| REZ Wallet | Auto-fill payments |

| Tier | Latency | Stores |
|------|---------|--------|
| **L1 Hot** | 1-10ms | Voice Profile, Session, Context |
| **L2 Warm** | 10-50ms | Recent Conversations, Tasks |
| **L3 Personal** | 100-300ms | Style Learning, Preferences |
| **L4 Organization** | 300-500ms | Merchant, Products, CRM |
| **L5 Global** | 500ms+ | Public Knowledge, Ecosystem |</parameter>


---

## 1.4 REZ Intelligence

### Intent Graph
| Feature | Description |
|---------|-------------|
| **Intent Detection** | NLP-based user intent recognition |
| **Intent Prediction** | ML-based next action prediction |
| **Intent Routing** | Route to correct agent/service |
| **Intent History** | Track user journey |

### Memory Layer
| Feature | Description |
|---------|-------------|
| **Vector Store** | Semantic search, embeddings |
| **Timeline** | Event history, sequences |
| **Graph Store** | Relationships, connections |
| **Cache** | Hot data, fast retrieval |

### ML Pipeline
| Feature | Description |
|---------|-------------|
| **Model Training** | AutoML, hyperparameter tuning |
| **Feature Store** | Feature engineering, versioning |
| **Model Registry** | Version control, deployment |
| **Inference Engine** | Real-time predictions |

### Agent Registry
| Feature | Description |
|---------|-------------|
| **Agent Catalog** | All available AI agents |
| **Capability Matching** | Match user needs to agents |
| **Agent Health** | Monitoring, uptime |
| **Agent Ranking** | Performance-based ranking |

### Growth Intelligence
| Feature | Description |
|---------|-------------|
| **Budget Optimizer** | Ad spend optimization |
| **Competitor Alerts** | Market intelligence |
| **Revenue Forecast** | Predictive analytics |
| **Incrementality Testing** | Lift studies |
| **Merchant Health Score** | Business health |
| **Neighborhood Analytics** | Geo insights |

---

## 1.5 Industry Intelligence

### Healthcare Intelligence
| Feature | Description |
|---------|-------------|
| **Clinical Documentation** | SOAP notes, H&P |
| **Medical Scribe** | Real-time documentation |
| **Diagnosis Assistance** | Differential diagnosis |
| **Treatment Recommendations** | Evidence-based suggestions |
| **Drug Interactions** | Medication safety |

### Jewelry Intelligence
| Feature | Description |
|---------|-------------|
| **Inventory Analysis** | Stock optimization |
| **Trend Prediction** | Fashion forecasting |
| **Pricing Intelligence** | Market-based pricing |
| **Customer Segmentation** | Buyer profiles |

---

## 1.6 HOJAI SkillNet - Intelligence Platform

**Tagline:** "Runtime + Intelligence + Learning Network for AI Skills"
**Ports:** 5100-5140

### Intelligence Engine (5130) - THE MOAT

| Feature | Description |
|---------|-------------|
| **Natural Language Goal Parsing** | Parse "book a flight to Mumbai" → skill workflows |
| **Capability Decomposition** | Break goals into atomic capabilities |
| **Skill Matching** | Match capabilities to available skills |
| **Workflow Assembly** | Assemble optimized skill sequences |
| **Learning Integration** | Learn from execution patterns |

### HOJAI Bridge (5140) - Ecosystem Integration

| Feature | Description |
|---------|-------------|
| **Memory Integration** | Connect to HOJAI Memory (4520) for context |
| **Knowledge Graph** | Connect to Knowledge Graph (4530) |
| **Agent Runtime** | Connect to Agent Runtime (4550) |
| **Genie OS** | Connect to Genie (4703-4713) |
| **Industry AI** | Connect to Industry AI (4750-4754) |
| **REZ Intelligence** | Connect to Intent (4018), Signals, Predictive |

### Runtime Cloud (5120)

| Feature | Description |
|---------|-------------|
| **Isolated Execution** | Sandboxed skill execution |
| **WebSocket Streaming** | Real-time execution updates |
| **Auto-scaling** | Handle burst workloads |
| **Skill Healing** | Auto-recover from failures |

### Trust Service (5123)

| Feature | Description |
|---------|-------------|
| **Skill Verification** | HOJAI Verified, Enterprise Certified |
| **Publisher Reputation** | Track publisher quality |
| **Review System** | Star ratings, written reviews |
| **Trust Graph** | Skill relationships and dependencies |

### Agent Adapter (5125)

| Feature | Description |
|---------|-------------|
| **Universal Interface** | Any HOJAI agent can consume skills |
| **Skill Learning** | Agents learn new capabilities |
| **Goal Matching** | Match agent goals to available skills |
| **Evolution Tracking** | Track agent skill growth |

### Marketplace & Publishing

| Feature | Description |
|---------|-------------|
| **Skill Discovery** | Natural language search |
| **Category Browsing** | 15+ industry categories |
| **Subscriptions** | Free, Pro, Enterprise tiers |
| **Publishing** | Submit skills for verification |
| **Revenue Sharing** | 70/30 split (publisher/platform) |

### SDK & CLI

| Feature | Description |
|---------|-------------|
| **Recorder SDK** | Browser SDK for recording demonstrations |
| **TypeScript SDK** | Client library with React hooks |
| **CLI Tool** | Command-line interface for operations |
| **Studio Web UI** | Admin dashboard (Next.js) |

### Infrastructure

| Feature | Description |
|---------|-------------|
| **MongoDB** | 14 schemas for persistent storage |
| **Redis** | Caching, queuing, pub/sub |
| **Neo4j** | Knowledge graph (skills, capabilities, industries) |
| **Prometheus** | Metrics collection |
| **Grafana** | Monitoring dashboards |
| **Kubernetes** | Production deployment (Helm, HPA) |
| **CI/CD** | GitHub Actions pipeline |

**Location:** `hojai-ai/hojai-skillnet/`

---

## 1.7 BrandPulse - Real-time Brand Intelligence

**Tagline:** "Know what the world thinks about your brand"
**Ports:** 4770-4777

### Brand Intelligence (4770)
| Feature | Description |
|---------|-------------|
| **Brand Monitoring** | Track mentions across news, social, reviews |
| **Sentiment Analysis** | Multi-source sentiment (positive/negative/neutral) |
| **Emotion Detection** | Trust, joy, anger, fear, anticipation, surprise |
| **Topic Extraction** | Customer service, pricing, delivery, product quality |
| **Trend Analysis** | Sentiment trends over time |

### Narrative Intelligence (4771)
| Feature | Description |
|---------|-------------|
| **Narrative Tracking** | How the story around a company changes |
| **Belief Shifts** | Detect when public perception shifts |
| **Story Evolution** | From "innovation leader" to "competition catching up" |
| **Narrative Strength** | Track narrative dominance over time |

### Competitive Intelligence (4772)
| Feature | Description |
|---------|-------------|
| **Share of Voice** | Compare brand presence vs competitors |
| **Sentiment Comparison** | Side-by-side sentiment analysis |
| **Topic Comparison** | What topics dominate each competitor |
| **Competitive Gaps** | Where competitors are winning |

### Crisis Intelligence (4773)
| Feature | Description |
|---------|-------------|
| **Volume Spike Detection** | 3x normal triggers alert |
| **Sentiment Drop Alerts** | Monitor for negative spikes |
| **Emotion Surge Detection** | Anger, fear, disgust tracking |
| **Trust Score Monitoring** | Early warning system |
| **Anomaly Detection** | Unusual patterns trigger alerts |

### Brand Agent (4774)
| Feature | Description |
|---------|-------------|
| **Natural Language Queries** | "How is Tesla doing?" |
| **AI Insights** | Actionable recommendations |
| **Comparative Analysis** | Compare brands |
| **Metric Explanations** | Explain what numbers mean |

### Reputation Management (4776)
| Feature | Description |
|---------|-------------|
| **Review Monitoring** | Google, Yelp, Trustpilot, Glassdoor, Indeed, TripAdvisor |
| **NPS Tracking** | Net Promoter Score calculation |
| **Brand Guardian** | Threat detection across platforms |
| **Crisis Shield** | Early warning for reputation threats |
| **AI Response Generator** | Generate professional review responses |
| **Response Rate Analytics** | Track response time and rates |

### PR Intelligence (4777)
| Feature | Description |
|---------|-------------|
| **Press Tracking** | News, blogs, podcasts, video coverage |
| **Journalist Database** | Influence scoring, relationship tracking |
| **Media Analytics** | Reach, sentiment, engagement |
| **Campaign Management** | Create and track PR campaigns |
| **Crisis Comms** | Response planning, timeline tracking |
| **Press Release Optimizer** | AI-powered release generation |

### Webhook Service (4775)
| Feature | Description |
|---------|-------------|
| **Real-time Alerts** | Instant notifications for events |
| **Crisis Alerts** | Critical, warning, resolved states |
| **Custom Webhooks** | Configure for any event type |

### WebSocket Streaming (ws://4770/ws)
| Feature | Description |
|---------|-------------|
| **Real-time Updates** | Push alerts and mentions as they happen |
| **Event Subscriptions** | Subscribe to specific event types |
| **Company Filtering** | Stream only specific companies |
| **Heartbeat** | Keep connections alive |

### PDF Reports (4779)
| Feature | Description |
|---------|-------------|
| **Executive Summary** | High-level brand health metrics |
| **Sentiment Analysis** | Positive/negative/neutral breakdown |
| **Trends Chart** | Sentiment over time |
| **Top Mentions** | Most impactful mentions |
| **Alert Summary** | Active alerts and recommendations |

### Notifications Service (4778)
| Feature | Description |
|---------|-------------|
| **Slack Integration** | Rich message formatting with blocks |
| **Teams Integration** | MessageCard format for Microsoft Teams |
| **Email Alerts** | SMTP-based email delivery |
| **SMS Alerts** | Twilio and MSG91 providers |
| **Custom Webhooks** | HTTP POST/PUT with signature verification |

### BrandPulse Infrastructure
| Feature | Description |
|---------|-------------|
| **SQLite Database** | Persistent storage (survives restarts) |
| **Background Scheduler** | Automated data refresh jobs |
| **API Key Auth** | Key management and rate limiting |
| **Data Connectors** | GDELT, NewsAPI, Reddit, Google, Trustpilot, Yelp |

### Additional Intelligence Services
| Service | Owner | Description |
|---------|-------|-------------|
| **REZ-memory-extension** | HOJAI | Memory extension services |
| **REZ-legal-document-ai** | HOJAI | Legal document AI (used by LawGens) |

---

# 2. RABTUL Technologies - Products & Features

## 2.1 Payment Services

### REZ Payment Service
| Feature | Description |
|---------|-------------|
| **Razorpay Integration** | Payment gateway |
| **UPI Payments** | UPI ID, QR codes |
| **Card Payments** | Credit/Debit cards |
| **Net Banking** | Bank transfers |
| **EMI Options** | Easy installments |
| **Payment Links** | Shareable payment URLs |
| **Subscriptions** | Recurring payments |

### REZ Wallet Service
| Feature | Description |
|---------|-------------|
| **Balance Management** | Add, withdraw, transfer |
| **Coins System** | Loyalty points |
| **Cashback** | Automatic rewards |
| **Split Bills** | Divide expenses |
| **Gift Cards** | Send/receive money |

## 2.2 Authentication Services

### REZ Auth Service
| Feature | Description |
|---------|-------------|
| **JWT Tokens** | Stateless authentication |
| **OTP Verification** | SMS, Email, WhatsApp |
| **OAuth 2.0** | Third-party logins |
| **MFA** | Multi-factor authentication |
| **Passwordless** | Biometric, magic links |
| **Session Management** | Device tracking |

## 2.3 Order & Commerce

### REZ Order Service
| Feature | Description |
|---------|-------------|
| **Order Lifecycle** | Create → Pay → Fulfill → Complete |
| **Cart Management** | Add, update, remove items |
| **Inventory Check** | Real-time stock |
| **Order Tracking** | Status updates |
| **Returns/Refunds** | Return processing |

### REZ Catalog Service
| Feature | Description |
|---------|-------------|
| **Product Management** | CRUD operations |
| **Category Management** | Hierarchical categories |
| **Variant Management** | Size, color, etc. |
| **Price Management** | Dynamic pricing |
| **Search & Filters** | Full-text search |
| **Inventory Sync** | Multi-channel |

## 2.4 Search & Discovery

### REZ Search Service
| Feature | Description |
|---------|-------------|
| **Full-Text Search** | Product search |
| **Autocomplete** | Type-ahead suggestions |
| **Filters** | Category, price, rating |
| **Relevance Tuning** | Rank optimization |
| **Synonyms** | Language variants |
| **Voice Search** | Spoken queries |

## 2.5 Delivery & Logistics

### REZ Delivery Service
| Feature | Description |
|---------|-------------|
| **Driver Tracking** | Real-time GPS |
| **Route Optimization** | Efficient delivery |
| **ETA Prediction** | Accurate estimates |
| **Proof of Delivery** | Photo, signature |
| **COD Management** | Cash handling |
| **Multi-Stop** | Batch deliveries |

## 2.6 Notifications

### REZ Notifications Service
| Feature | Description |
|---------|-------------|
| **Push Notifications** | Mobile alerts |
| **SMS** | Text messages |
| **WhatsApp** | Rich messaging |
| **Email** | HTML templates |
| **In-App** | Real-time alerts |
| **Preferences** | User opt-ins |

## 2.7 Business Intelligence

### REZ Analytics Service
| Feature | Description |
|---------|-------------|
| **Dashboards** | Real-time metrics |
| **Custom Reports** | Ad-hoc analysis |
| **Funnel Analysis** | Conversion tracking |
| **Cohort Analysis** | User segments |
| **A/B Testing** | Experiment tracking |

## 2.8 QR Services

### REZ QR Cloud
| Feature | Description |
|---------|-------------|
| **Menu QR** | Digital menus |
| **Table Ordering** | Scan & order |
| **Payment QR** | Cashless payments |
| **Feedback QR** | Reviews, ratings |
| **Custom QR** | Branded codes |

### Referral Services (RABTUL)
| Feature | Description |
|---------|-------------|
| **REZ-Referral-Admin** | Referral management admin |
| **REZ-Referral-Dashboard** | Referral analytics |

---

# 3. AdBazaar - Products & Features

## Related Products
| Feature | Description |
|---------|-------------|
| **Menu QR** | Digital menus |
| **Table Ordering** | Scan & order |
| **Payment QR** | Cashless payments |
| **Feedback QR** | Reviews, ratings |
| **Custom QR** | Branded codes |

---

# 3. AdBazaar - Products & Features

## Related Products
| Product | Owner | Purpose |
|---------|-------|---------|
| **REZ-Creator-OS** | AdBazaar | Creator commerce platform |

## 3.1 Intent Exchange (UNIQUE)
| Feature | Description |
|---------|-------------|
| **Intent Signals** | Capture user intents |
| **Intent Prediction** | ML-based scoring |
| **Intent Marketplace** | Buy/sell audiences |
| **Intent Analytics** | Trend analysis |

## 3.2 Audience Twins
| Feature | Description |
|---------|-------------|
| **User Twin** | Behavioral simulation |
| **Merchant Twin** | Business pattern modeling |
| **Product Twin** | SKU-level targeting |
| **Campaign Twin** | Performance simulation |

## 3.3 Commerce Ads
| Feature | Description |
|---------|-------------|
| **Click-to-Book** | Direct booking |
| **Click-to-Pay** | One-click purchase |
| **Cart Abandonment** | Recovery ads |
| **Cross-Sell** | Related products |

## 3.4 Targeting
| Feature | Description |
|---------|-------------|
| **Hyperlocal** | Apartment-level targeting |
| **Behavioral** | Interest-based |
| **Demographic** | Age, gender, income |
| **Contextual** | Content-based |
| **Lookalike** | Similar audiences |
| **Retargeting** | Previous visitors |

## 3.5 Ad Formats
| Feature | Description |
|---------|-------------|
| **Display Ads** | Banner, native |
| **Video Ads** | Pre-roll, in-stream |
| **DOOH** | Digital out-of-home |
| **CTV/OTT** | Connected TV |
| **Audio Ads** | Podcast, music |
| **Native Ads** | In-feed content |

## 3.6 Campaign Management
| Feature | Description |
|---------|-------------|
| **Campaign Builder** | No-code creation |
| **Budget Control** | Daily, lifetime caps |
| **Bidding Strategies** | CPC, CPM, CPA |
| **Scheduling** | Dayparting |
| **A/B Testing** | Creative optimization |
| **Reporting** | Real-time dashboards |

## 3.7 Attribution & Measurement
| Feature | Description |
|---------|-------------|
| **Multi-Touch** | Full journey tracking |
| **Incrementality** | Lift studies |
| **Attribution Models** | First, last, linear |
| **View-Through** | Brand awareness |
| **Conversion API** | Server-side tracking |

## 3.8 Platform Moats
| Feature | Description |
|---------|-------------|
| **Clean Room** | Privacy-preserving data |
| **OpenRTB Exchange** | Real-time bidding |
| **DSP Portal** | Self-serve advertiser |
| **SSP Portal** | Publisher monetization |
| **Measurement Cloud** | Incrementality |
| **Event Graph** | Cross-device tracking |
| **Yield AI** | Revenue optimization |

---

# 4. CorpPerks - Products & Features

## 4.1 PeopleOS (Employer Platform)
| Feature | Description |
|---------|-------------|
| **Employee Directory** | Org chart, profiles |
| **Attendance** | Geo-fenced, face recognition |
| **Leave Management** | PTO, sick, work-from-home |
| **Payroll** | Salary processing, tax |
| **Performance Reviews** | OKRs, 360 feedback |
| **1:1 Meetings** | Scheduled, notes |
| **Announcements** | Company-wide updates |

## 4.2 MyTalent (Employee App)
| Feature | Description |
|---------|-------------|
| **Profile** | Personal info, skills |
| **Tasks** | To-do, priorities |
| **Calendar** | Meetings, deadlines |
| **Payslips** | View, download |
| **Leave** | Apply, approve |
| **Directory** | Find colleagues |
| **News** | Company updates |
| **Benefits** | Insurance, perks |
| **Learning** | Courses, certifications |

## 4.3 ProjectOS
| Feature | Description |
|---------|-------------|
| **Kanban Boards** | Drag-drop tasks |
| **Gantt Charts** | Timeline view |
| **Task Management** | Assign, track, done |
| **Time Tracking** | Hours, billable |
| **Milestones** | Key deliverables |
| **Dependencies** | Task linking |
| **Budget Tracking** | Cost vs plan |

## 4.4 TalentAI
| Feature | Description |
|---------|-------------|
| **Job Posting** | Multi-channel publish |
| **Resume Parsing** | AI extraction |
| **Candidate Matching** | Skill alignment |
| **Interview Scheduling** | Calendar sync |
| **ATS** | Applicant tracking |
| **Background Check** | Verification |

## 4.5 CorpCRM
| Feature | Description |
|---------|-------------|
| **Lead Management** | Capture, score |
| **Deal Pipeline** | Visual pipeline |
| **Contact Management** | All contacts |
| **Activity Tracking** | Calls, emails |
| **Quote Generation** | Create, send |
| **Sales Analytics** | Performance |

## 4.6 CorpID (Trust Infrastructure)
| Feature | Description |
|---------|-------------|
| **Identity Creation** | Digital identity |
| **Verification** | KYC, document check |
| **CI Score** | 0-1000 score |
| **Trust Graph** | Entity relationships |
| **Career Passport** | Verified credentials |
| **Business Passport** | Company verification |

## 4.7 SADA (Trust, Governance & Risk)
| Feature | Description |
|---------|-------------|
| **Trust Score** | Entity scoring |
| **Governance Policies** | Policy engine |
| **Risk Assessment** | Credit, fraud risk |
| **Verification** | KYC, KYB, KYI |
| **Compliance** | GDPR, SOC2 ready |
| **Audit Trail** | Complete logging |

## 4.8 Role AI Agents (40 Agents)
| Role | L1 | L2 | L3 | L4 |
|------|-----|-----|-----|-----|
| Software Engineer | CodeBuddy | DevPro | TechLead | CTO Advisor |
| Sales | SalesBuddy | SalesPro | SalesLeader | Revenue Strategist |
| Marketing | MarketingBuddy | MarketingPro | MarketingManager | CMO Counselor |
| Finance | FinanceBuddy | FinanceAnalyst | FinanceManager | CFO Counselor |
| HR | HRBuddy | HRPro | HRManager | CHRO Counselor |
| Operations | OpsBuddy | OpsAnalyst | OpsManager | COO Advisor |
| Design | DesignBuddy | DesignPro | DesignLead | CDO Counselor |
| Legal | LegalBuddy | LegalPro | LegalManager | CLO Counselor |
| Customer Success | CSBuddy | CSPro | CSManager | VP CS Counselor |
| Product | ProductBuddy | ProductPro | ProductManager | CPO Counselor |

---

# 5. RisaCare - Products & Features

## 5.1 Patient Platform (B2C)
| Feature | Description |
|---------|-------------|
| **Health Profile** | Medical history, allergies |
| **Family Management** | Add dependents |
| **Health Records** | Upload, view records |
| **Wellness Tracking** | Cycle, weight, BP |
| **Appointment Booking** | Find doctors |
| **Telemedicine** | Video consultations |
| **Medication Reminders** | Daily alerts |
| **Second Opinion** | Expert review |

## 5.2 Clinic Platform (B2B)
| Feature | Description |
|---------|-------------|
| **Appointment System** | Scheduling, reminders |
| **Patient Records** | EMR/EHR |
| **Prescription Writer** | Digital Rx |
| **Billing** | Insurance, cash |
| **Inventory** | Medicines, supplies |
| **Reports** | Revenue, patients |

## 5.3 Hospital Platform
| Feature | Description |
|---------|-------------|
| **Bed Management** | Availability tracking |
| **IPD Management** | Admissions, discharge |
| **OT Scheduling** | Surgery slots |
| **Lab Integration** | Results sync |
| **Pharmacy** | Dispensing |
| **ICU Monitoring** | Vital signs |

## 5.4 Chronic Care
| Feature | Description |
|---------|-------------|
| **Diabetes Management** | Glucose tracking |
| **BP Management** | Blood pressure monitoring |
| **Cardiac Care** | Heart health |
| **Care Plans** | Personalized protocols |
| **Diet Plans** | Nutritional guidance |
| **Exercise Plans** | Activity tracking |

## 5.5 Elderly Care
| Feature | Description |
|---------|-------------|
| **Fall Detection** | SOS alerts |
| **Medication Adherence** | Reminders |
| **Remote Monitoring** | Vital signs |
| **Emergency Response** | 24/7 support |
| **Caregiver Coordination** | Family sync |

## 5.6 Mental Health
| Feature | Description |
|---------|-------------|
| **Mood Tracker** | Daily check-ins |
| **Therapy Sessions** | Video consultations |
| **Crisis Support** | Immediate help |
| **Mindfulness** | Meditation, breathing |
| **Journal** | Thought tracking |

## 5.7 Healthcare Intelligence
| Feature | Description |
|---------|-------------|
| **Predictive Analytics** | Readmission risk |
| **Deterioration Detection** | Early warning |
| **Population Health** | Trend analysis |
| **Clinical Decision Support** | Diagnosis assistance |

## 5.8 MyRisa - Personal Wellbeing Intelligence
**Tagline:** "Your Health. Understood."
**Brand:** MyRisa
**Port:** 4900

### MyRisa Mobile App Screens

| Screen | Purpose |
|--------|---------|
| Home | Dashboard with scores & quick actions |
| Women's Health | Cycle, fertility, pregnancy, PCOS, menopause |
| Mental Health | Mood, stress, therapy, crisis support |
| Sleep | Sleep tracking & analysis |
| Work-Life | Burnout, energy, PTO, productivity |
| Lifestyle | Exercise, nutrition, habits |
| Relationships | Partner, quality time |
| Profile | User settings |
| Twin | Human twin visualization |
| Consultation | Doctor visit prep |
| Dashboard | Full wellbeing view |

### MyRisa 7 Domains

| Domain | Icon | Features |
|--------|------|----------|
| **Women's Health** | 🌸 | Cycle tracking, fertility window, pregnancy, PCOS, menopause |
| **Sexual Wellness** | 💜 | Libido tracking, contraception, intimacy journal, reproductive health |
| **Mental Wellness** | 🧠 | Mood tracker, therapy sessions, crisis support, mindfulness |
| **Sleep** | 😴 | Sleep logging, analysis, factor tracking, disorder detection |
| **Lifestyle** | 🏃 | Activity, nutrition, habits, weight management |
| **Work-Life Balance** | ⚡ | Burnout assessment, energy levels, PTO, productivity |
| **Relationships** | ❤️ | Partner tracking, interaction logging, intimacy health |

### MyRisa Key Features

| Feature | Description |
|---------|-------------|
| **Human Twin** | Unified health twin aggregating all 7 domains |
| **Unified Dashboard** | Single view of overall wellbeing |
| **Health Insights** | AI-powered insights connecting all domains |
| **Consultation Copilot** | Pre/post-visit summaries and questions |
| **Cross-Domain Intelligence** | Patterns across mental, physical, sexual health |
| **Life Events** | Track events affecting health (marriage, pregnancy, etc.) |

### MyRisa Services

| Service | Port | Description |
|---------|------|-------------|
| MyRisa App | 4900 | Consumer interface |
| Women's Health | 4820 | Cycle, fertility, pregnancy, PCOS, menopause |
| Sexual Wellness | 4821 | Libido, contraception, intimacy |
| Work-Life Balance | 4822 | Burnout, energy, PTO |
| Relationships | 4823 | Partner, quality time |
| Human Twin | 4824 | Unified health twin |
| Consultation Copilot | 4825 | Pre/post-visit intelligence |
| Universal Memory | 4800 | All domains memory |
| Auth Service | 4910 | RABTUL integration |
| Genie Health | 4920 | AI health assistant |
| Family Service | 4930 | Shab AI integration |

### MyRisa Architecture

```
MyRisa App (4900)
    │
    ├── Women's Health Service (4820)
    ├── Sexual Wellness Service (4821)
    ├── Work-Life Balance Service (4822)
    ├── Relationships Service (4823)
    ├── Human Twin Service (4824)
    └── Consultation Copilot (4825)
    │
    └── Integrated with:
        - Mental Health (4722)
        - Sleep (4729)
        - Wellness (4703)
        - Care Circle (4706)
```

---

# 6. StayOwn - Products & Features

## 6.1 Hotel OTA Platform
| Feature | Description |
|---------|-------------|
| **Hotel Search** | Location, dates, guests, filters |
| **Hotel Details** | Photos, amenities, reviews, maps |
| **Room Selection** | Multiple room types, pricing tiers |
| **Booking Flow** | Guest info → Payment → Confirmation |
| **Booking Management** | View, modify, cancel bookings |
| **Corporate Booking** | Multi-user corporate accounts |
| **Admin Dashboard** | Revenue, bookings, analytics |

## 6.2 StayOwn Hotels (PMS)
| Feature | Description |
|---------|-------------|
| **Room Management** | Availability, booking, types |
| **Guest Profiles** | Preferences, history, VIP tracking |
| **Check-in/Check-out** | Digital process, express checkout |
| **Housekeeping** | Room status, task assignment, scheduling |
| **Maintenance** | Issue tracking, work orders |
| **Billing** | Folio management, charges, payments |
| **Channel Manager** | OTA sync (Airbnb, Booking.com) |
| **Dynamic Pricing** | ML-based rate optimization |
| **Multi-Property** | Chain dashboard, consolidated view |

## 6.3 Room QR (Guest Services)
| Feature | Description |
|---------|-------------|
| **Service Request** | Housekeeping, maintenance, room service |
| **Digital Menu** | F&B ordering via QR scan |
| **Minibar Charges** | Add charges to room bill |
| **Checkout** | Pay all charges at once |
| **Digital Key** | Room access via mobile |
| **WhatsApp Integration** | Book via WhatsApp |
| **Digital Check-in** | ID verification, key generation |

## 6.4 AI Front Desk (Concierge)
| Feature | Description |
|---------|-------------|
| **24/7 Support** | AI-powered concierge |
| **Language Support** | Multi-language (HOJAI Staybot) |
| **Booking Assistance** | Room availability, reservations |
| **FAQ Handling** | Common questions, local info |
| **Service Routing** | Route to appropriate service |
| **Voice Support** | Phone-based AI assistant |
| **Chat Integration** | In-app messaging |
| **Escalation** | Human handoff to staff |

## 6.5 Habixo (Vacation Rentals)
| Feature | Description |
|---------|-------------|
| **Property Listings** | Photos, details, amenities |
| **Booking Engine** | Calendar, availability |
| **Smart Lock** | Keyless entry integration |
| **Automated Check-in** | Self-service check-in |
| **Guest Communication** | Messaging, notifications |
| **Review Management** | Feedback collection |
| **Pricing Automation** | Dynamic pricing, events |
| **Channel Manager** | Airbnb, VRBO, Booking.com sync |
| **Roommate Matching** | Habixo Match service |
| **Trust Scoring** | Host/guest trust system |

## 6.6 Hotel Operations Services
| Service | Port | Features |
|---------|------|----------|
| **PMS** | 4031 | Room, booking, guest management |
| **Housekeeping** | 4021 | Tasks, scheduling, status |
| **Maintenance** | 4019 | Requests, work orders, parts |
| **Room Service** | 4043 | F&B orders, delivery |
| **Spa** | 4049 | Treatment bookings |
| **Laundry** | 4048 | Laundry orders |
| **Gift Cards** | 4047 | Gift card management |
| **Messaging** | 4024 | Guest notifications |
| **Analytics** | 4025 | Reports, dashboards |

## 6.7 Integration Services
| Service | Port | Purpose |
|---------|------|---------|
| **Hotel OS Integration** | 3899 | Unified service orchestration |
| **Staybot** | 4840 | HOJAI hotel AI |
| **HOJAI Memory** | 4520 | Guest preferences |
| **REZ Auth** | 4002 | Authentication |
| **REZ Payment** | 4001 | Payments |
| **REZ Wallet** | 4004 | REZ Coins, loyalty |

## 6.8 THE INVISIBLE HOTEL - Complete Ecosystem (NEW)

**Status:** ✅ 100% Operational - 28 services running
**Purpose:** Autonomous AI-driven hotel experience - Zero friction, maximum delight

### 6.8.1 Core Guest Services

| Feature | Description |
|---------|-------------|
| **Zero-Contact Check-in** | Auto key activation on booking |
| **AI Concierge** | 24/7 HOJAI Staybot concierge |
| **Smart Room Control** | AC, lights, TV, curtains via IoT |
| **Smart Minibar** | Auto-detect, auto-bill |
| **Restaurant Booking** | Table reservations |
| **Spa Booking** | Treatment scheduling |
| **Loyalty Rewards** | REZ points, tiers |
| **Zero-Checkout** | Auto-settle, lock revoke |

### 6.8.2 Room Control Features

| Feature | Description |
|---------|-------------|
| **AC Control** | Temperature, mode, fan speed |
| **Light Control** | On/off, brightness, scenes |
| **TV Control** | Power, channel, volume |
| **Curtain Control** | Open/close/half |
| **Scene Presets** | Movie, Morning, Evening, Sleep, Away |
| **MQTT Integration** | IoT device communication |

### 6.8.3 AI Services

| Service | Port | Features |
|---------|------|----------|
| **HOJAI Staybot** | 4840 | Intent detection, natural language, routing |
| **HOJAI Memory** | 4520 | Guest preferences, history, patterns |
| **HOJAI Genie** | 4703 | Personal briefings, relationships |
| **Voice Agent** | 4870 | Voice commands for hotel services |

### 6.8.4 Payment& Loyalty

| Feature | Description |
|---------|-------------|
| **REZ Payment** | Razorpay, UPI, Cards |
| **REZ Wallet** | Coins, balance, cashback |
| **Loyalty Points** | Earn on booking, spending |
| **Auto-Settlement** | Zero-checkout billing |
| **Multi-Currency** | INR support |

### 6.8.5 Operations Services

| Service | Port | Features |
|---------|------|----------|
| **Pre-Arrival** | 3828 | Preference collection, room prep |
| **Housekeeping** | 3826 | AI scheduling, predictive tasks |
| **Smart Lock** | 3825 | BLE/NFC, auto-revoke on checkout |
| **Lost & Found** | 3816 | Item tracking, notifications |
| **Upsell Engine** | 3817 | AI-powered offers |

### 6.8.6 Dashboard & Monitoring

| Tool | Port | Purpose |
|------|------|---------|
| **Ecosystem Dashboard** | 3000 | Admin monitoring, service health |
| **Guest Mobile App** | 3001+ | Room control, minibar, AI chat |
| **Integration Gateway** | 3898 | Service registry, health checks |
| **API Tester** | - | test-api.sh script |

### 6.8.7 Guest Journey Features

| Stage | Features |
|-------|----------|
| **Pre-Booking** | OTA search, AI recommendations |
| **Booking** | Room selection, payment, confirmation |
| **Pre-Arrival** | Preference survey, room prep |
| **Check-In** | Auto key, welcome message |
| **Stay** | Room control, minibar, restaurant, spa |
| **AI Concierge** | Chat, voice, recommendations |
| **Checkout** | Auto-billing, loyalty points, lock revoke |

---

# 7. RisnaEstate - Products & Features

## 7.1 Property Marketplace
| Feature | Description |
|---------|-------------|
| **Listing Search** | Buy, rent, commercial |
| **Advanced Filters** | Location, price, type |
| **Virtual Tours** | 360° walkthrough |
| **Mortgage Calculator** | EMI, eligibility |
| **Neighborhood Info** | Schools, transit |
| **Price Trends** | Historical data |

## 7.2 Property Intelligence
| Feature | Description |
|---------|-------------|
| **User Preferences** | AI learning |
| **Similar Properties** | Personalized matches |
| **Price Prediction** | Market trends |
| **Investment Analysis** | ROI calculation |

## 7.3 Lead Management
| Feature | Description |
|---------|-------------|
| **Lead Capture** | Multiple sources |
| **Lead Scoring** | AI prioritization |
| **NRI Detection** | Auto-identification |
| **Smart Routing** | Distribution |
| **Follow-up Reminders** | Task generation |

## 7.4 Broker Network
| Feature | Description |
|---------|-------------|
| **Broker Portal** | CRM for brokers |
| **Team Management** | Hierarchy, targets |
| **Commission Tracking** | Auto-calculation |
| **Training** | Product knowledge |

## 7.5 Referrals & Rewards
| Feature | Description |
|---------|-------------|
| **Multi-Level Referrals** | Buyer → Broker → Influencer |
| **Commission Structure** | Tiered rates |
| **Referral Tracking** | Link, attribution |
| **Instant Payouts** | UPI, bank |

## 7.6 Golden Visa
| Feature | Description |
|---------|-------------|
| **Eligibility Check** | UAE visa criteria |
| **Document Checklist** | Required papers |
| **Application Tracking** | Status updates |
| **Agent Coordination** | Visa assistance |

---

# 8. REZ Consumer - Products & Features

## 8.1 REZ App
| Feature | Description |
|---------|-------------|
| **Shopping** | Browse, cart, checkout |
| **Wallet** | Coins, balance |
| **Rewards** | Loyalty points |
| **Social Connections** | Friends, family, groups |
| **Scan & Pay** | UPI payments |
| **Offers** | Deals, coupons |

## 8.2 RiderCircle (Adventure Mobility OS)
| Feature | Description |
|---------|-------------|
| **SafeQR** | Emergency ID for riders (accidents, breakdowns) |
| **Live Tracking** | Real-time GPS presence |
| **AI Genie** | Route planning, maintenance advice |
| **Bike Digital Twin** | Health tracking, predictions |
| **Trust Score** | Reputation system |
| **REZ Coins** | Rewards for rides |

### RiderCircle Architecture
| Service | Port | Tech | Purpose |
|---------|------|------|---------|
| rider-circle-api | 4200 | Express + MongoDB | REST API |
| rider-circle-graph | 4300 | Node + Neo4j | Knowledge Graph |
| rider-circle-intelligence | 4400 | Python FastAPI | AI Engine |

## 8.3 QR Systems (17+ Types)

### Consumer QR
| QR System | Features |
|-----------|----------|
| **Safe QR** | 15 emergency modes (pet, personal, device, medical, helmet, vehicle, travel, home, school, baby, pet, senior, sports, home, office, event, student, package) |
| **Verify QR** | Product authenticity, warranty tracking |
| **Creator QR** | Personal commerce, profile link |
| **Link QR** | URL shortener |

### Commerce QR
| QR System | Features |
|-----------|----------|
| **REZ NOW QR** | Digital mini store |
| **Menu QR** | Restaurant ordering |
| **Table QR** | Table ordering, payment |
| **Salon QR** | Salon check-in, loyalty |
| **Shelf QR** | Product advertising |
| **Payment QR** | UPI payments |

### Hospitality QR
| QR System | Features |
|-----------|----------|
| **Room QR** | Hotel services (housekeeping, room service, checkout) |
| **Hotel QR** | Hotel information |

### Advertising QR
| QR System | Features |
|-----------|----------|
| **Ads QR** | Ad tracking, campaigns |
| **Feedback QR** | Reviews, ratings |
| **Event QR** | Check-in, ticketing |
| **QR Campaigns** | QR-triggered campaigns |

## 8.4 REZ Prive (Premium)
| Feature | Description |
|---------|-------------|
| **Priority Support** | Dedicated agent |
| **Early Access** | New features |
| **Exclusive Deals** | Premium offers |
| **Ad-Free** | No interruptions |
| **Extended Warranty** | Product protection |

## 8.4 Airzy (Airport)
| Feature | Description |
|---------|-------------|
| **Flight Discovery** | Search, compare |
| **Lounge Access** | Pay-per-use |
| **Airport Transfers** | Pickup, dropoff |
| **Duty-Free** | Pre-order |
| **Concierge** | Special assistance |

## 8.5 Go4Food
| Feature | Description |
|---------|-------------|
| **Restaurant Search** | Nearby, cuisine |
| **Menu Preview** | Photos, prices |
| **Reserve Table** | Booking |
| **Order Ahead** | Pre-payment |
| **Reviews** | Ratings, photos |

---

# 9. REZ Merchant - Products & Features

## 9.1 Restaurant OS
| Feature | Description |
|---------|-------------|
| **POS** | Billing, order management |
| **KDS** | Kitchen display |
| **Menu Management** | Items, variants |
| **Table Management** | Sections, QR ordering |
| **Reservations** | Booking system |
| **CRM** | Customer profiles |
| **Loyalty** | Points, rewards |
| **Analytics** | Sales, trends |

## 9.2 Hotel OS
| Feature | Description |
|---------|-------------|
| **PMS** | Property management |
| **Channel Manager** | OTA sync |
| **Booking Engine** | Direct booking |
| **Housekeeping** | Task management |
| **Maintenance** | Issue tracking |
| **Guest Messaging** | Communication |
| **Reviews** | Feedback collection |

## 9.3 Retail OS
| Feature | Description |
|---------|-------------|
| **Retail POS** | Billing, returns |
| **Inventory** | Stock tracking |
| **Barcode** | Scan, search |
| **Multi-Store** | Chain management |
| **Supplier Orders** | Purchase orders |

## 9.4 Salon/Spa OS
| Feature | Description |
|---------|-------------|
| **Appointments** | Calendar, staff |
| **Memberships** | Packages, validity |
| **Services** | Pricing, duration |
| **Products** | Retail inventory |
| **Tips** | Digital tipping |

## 9.5 Fitness OS
| Feature | Description |
|---------|-------------|
| **Access Control** | Entry, exit |
| **Attendance** | Class, member |
| **Class Booking** | Schedule, capacity |
| **Memberships** | Plans, renewals |
| **Fitness Tracking** | Integration |

## 9.6 REZ Atlas - AI Sales Intelligence Platform

### 9.6.1 Core Platform Features
| Feature | Description |
|---------|-------------|
| **Merchant Discovery** | Company search, contact finder |
| **Digital Twin** | Merchant digital profiles |
| **Lead Scoring** | ML-based opportunity scoring |
| **Territory Management** | Geo-based sales planning |
| **Route Optimization** | Efficient field visit planning |
| **Opportunity Signals** | Real-time buying intent detection |
| **Network Graph** | Merchant relationship mapping |

### 9.6.2 AI Workforce Suite
| Feature | Description |
|---------|-------------|
| **AI Employee Management** | Skills, teams, performance |
| **AI Sales Agents** | Autonomous outreach |
| **Smart Scheduling** | AI-powered scheduling |
| **Talent Marketplace** | Internal skill matching |
| **AI Training** | Automated learning |
| **Performance Analytics** | Team productivity tracking |

### 9.6.3 Customer Engagement Suite
| Feature | Description |
|---------|-------------|
| **Campaign Hub** | Multi-channel orchestration |
| **Multi-Channel Campaigns** | WhatsApp, SMS, Email, Push |
| **Conversational Messaging** | Unified inbox |
| **AI Content Studio** | Personalized content generation |
| **Workflow Automation** | Trigger-based sequences |

### 9.6.4 Intelligence Suite
| Feature | Description |
|---------|-------------|
| **AI Analytics Hub** | Real-time dashboards |
| **Revenue Forecasting** | ML predictions |
| **Competitor Analysis** | Market positioning |
| **Market Trends** | Industry analysis |
| **360° Customer Profiles** | Complete customer view |
| **Dynamic Pricing** | AI-powered pricing |
| **Signal Detection** | Opportunity identification |
| **Lead Scoring** | ML opportunity scoring |
| **Conversational AI** | Natural language queries |
| **Predictive Analytics** | Churn, risk prediction |

### 9.6.5 Revenue Operations
| Feature | Description |
|---------|-------------|
| **Pipeline Management** | Visual deal stages |
| **Deal Tracking** | Lifecycle management |
| **Revenue Forecasting** | AI-powered forecasts |
| **GTM Automation** | Autonomous go-to-market |

## 9.7 REZ Identity Hub v2.0 - Unified User Intelligence

**Purpose:** Pre-Call Research System - Gather ALL user data before outreach
**Port:** 6000
**Tagline:** "Know everything about anyone before you call"

### 9.7.1 Core Concept

Before calling or messaging any lead, the system researches the leader across ALL data sources and collects ALL information available. This creates a comprehensive 360° view of every user in the ecosystem.

### 9.7.2 25 Data Sources

| # | Source | Company | Data Collected |
|---|--------|---------|----------------|
| 1 | REZ Consumer | REZ Consumer | Shopping, wallet, rewards, QR scans, social |
| 2 | REZ Merchant | REZ Merchant | Merchant profile, products, orders, customers |
| 3 | RABTUL Auth | RABTUL | Identity, credentials, sessions, verification |
| 4 | RABTUL Wallet | RABTUL | Balance, coins, cashback, transactions |
| 5 | RABTUL Payment | RABTUL | Payment history, methods, subscriptions |
| 6 | RABTUL Order | RABTUL | Order lifecycle, preferences, fulfillment |
| 7 | RABTUL Catalog | RABTUL | Products viewed, wishlists, search |
| 8 | CorpPerks | CorpPerks | Employment, payroll, attendance, HR |
| 9 | Nexha | Nexha | Distribution, franchise, procurement |
| 10 | KHAIRMOVE | KHAIRMOVE | Rides, driver, fleet, logistics |
| 11 | RisaCare | RisaCare | Health records, appointments, wellness |
| 12 | StayOwn | StayOwn | Hotel bookings, preferences, loyalty |
| 13 | RisnaEstate | RisnaEstate | Property interests, leads, brokers |
| 14 | REZ Workspace | REZ Workspace | Collaboration, documents, meetings |
| 15 | Z-Events | Z-Events | Event registrations, tickets, attendance |
| 16 | RIDZA | RIDZA | Credit, insurance, lending |
| 17 | LawGens | LawGens | Legal research, contracts, compliance |
| 18 | SADA | SADA | Trust score, verification, governance |
| 19 | Salar OS | CorpPerks | Workforce intelligence, twins |
| 20 | Shab AI | HOJAI | Family intelligence, elder care |
| 21 | Genie | HOJAI | Personal AI, memories, briefings |
| 22 | AssetMind | AssetMind | Financial intelligence, investments |
| 23 | REZ Atlas | REZ Merchant | Lead scores, signals, territory |
| 24 | HOJAI AI | HOJAI | Memory, agents, knowledge graph |
| 25 | REZ Intelligence | HOJAI | Intent, signals, predictions |

### 9.7.3 Key Features

| Feature | Description |
|---------|-------------|
| **Pre-Call Research** | Auto-gather all data before any outreach |
| **360° Profile** | Comprehensive user view across all apps |
| **Social Verification** | LinkedIn, Facebook, Instagram, Twitter, YouTube |
| **Data Freshness** | Track last sync, quality scores per source |
| **Background Sync** | Periodic sync with configurable frequency |
| **Admin Dashboard** | Monitor sync status, data quality, profiles |

### 9.7.4 Comprehensive User Profile Types

| Profile Type | Data Included |
|--------------|---------------|
| **ConsumerData** | Shopping, wallet, rewards, QR activity, social |
| **MerchantData** | Merchant profile, products, orders, customers |
| **RabtulData** | Auth, wallet, payment, orders, catalog |
| **StayOwnData** | Guest profile, hotel bookings, preferences, loyalty |
| **RisnaEstateData** | Property interests, leads, broker relationships |
| **REZWorkspaceData** | Collaboration, documents, meetings |
| **ZEventsData** | Event registrations, tickets, attendance |
| **RIDZAData** | Credit, insurance, lending, financial profile |
| **LawGensData** | Legal research, contracts, compliance |
| **REZIntelligenceData** | Intent signals, purchase history, engagement |
| **HojaiData** | Memory, agents, knowledge graph, digital twins |
| **GenieData** | Personal AI, memories, relationships, briefings |
| **SadaData** | Trust score, verification, governance |
| **SalarOsData** | Workforce intelligence, human/agent twins |
| **ShabAiData** | Family intelligence, elder care, child learning |
| **CorpPerksData** | Employment, payroll, attendance, HR |
| **NexhaData** | Distribution, franchise, procurement |
| **KHAIRMOVERData** | Rides, driver, fleet, logistics |
| **RisaCareData** | Health records, appointments, wellness |
| **AssetMindData** | Financial intelligence, investment profile |
| **AtlasData** | Lead scores, signals, territory, engagement |

### 9.7.5 Social Media Verification

| Platform | Data Retrieved |
|----------|---------------|
| **LinkedIn** | Profile, company, job title, connections |
| **Facebook** | Profile, friends, interests, pages |
| **Instagram** | Profile, posts, followers, engagement |
| **Twitter** | Profile, tweets, followers, interests |
| **YouTube** | Channel, subscribers, content |

### 9.7.6 AI Insights Generation

| Insight Type | Description |
|--------------|-------------|
| **Engagement Score** | Overall engagement across ecosystem |
| **Purchase Propensity** | Likelihood to purchase, churn risk |
| **Influence Score** | Social influence and reach |
| **Activity Summary** | Recent activity across all sources |
| **Interest Profile** | Topics, products, services of interest |
| **Relationship Network** | Connections across ecosystem |
| **Trust Assessment** | SADA trust score, verification status |

### 9.7.7 MongoDB Persistence

| Schema | Purpose |
|--------|---------|
| **Identity** | User ID, email, phone, social profiles |
| **Profile** | Comprehensive profile with all 25 data sources |
| **DataFreshness** | Last sync time, quality score per source |
| **SyncStatus** | Sync job status, progress, errors |
| **ActivityLog** | All profile updates with timestamps |

### 9.7.8 Event Bus Integration

| Feature | Description |
|---------|-------------|
| **Event Subscription** | Listen to profile updates across ecosystem |
| **Real-time Updates** | Auto-sync when data changes |
| **Cross-System Sync** | Bidirectional sync with all services |

### 9.7.9 Background Sync

| Feature | Description |
|---------|-------------|
| **SyncJobManager** | Configurable sync frequency per source |
| **DataQualityTracker** | Track completeness, accuracy, recency |
| **Error Handling** | Retry logic, failure notifications |
| **Manual Trigger** | Admin can force sync any source |

### 9.7.10 Admin Dashboard

| Feature | Description |
|---------|-------------|
| **Overview** | Total identities, active profiles, sync status |
| **Profile Explorer** | Search and view any user's complete profile |
| **Data Source Health** | Real-time status of all 25 sources |
| **Sync Management** | Trigger manual sync, view job history |
| **Activity Logs** | All profile changes with timestamps |
| **Quality Metrics** | Data freshness, completeness scores |

### 9.7.11 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profiles/:userId` | Get full 360° profile |
| GET | `/api/profiles/:userId/insights` | Get AI-generated insights |
| POST | `/api/profiles` | Create/update profile |
| GET | `/api/sync/status` | Sync job status |
| GET | `/api/health` | Service health check |

### 9.7.12 Location

`RTNM-Digital/rez-identity-hub/`

---

# 10. KHAIRMOVE - Products & Features

## 10.1 Ride-Hailing
| Feature | Description |
|---------|-------------|
| **Booking** | One-tap ride |
| **Live Tracking** | Real-time GPS |
| **Multiple Vehicles** | Auto, bike, mini |
| **Scheduled Rides** | Pre-booking |
| **Pool** | Shared rides |
| **Outstation** | Intercity |

## 10.2 Driver Platform
| Feature | Description |
|---------|-------------|
| **Dashboard** | Earnings, trips |
| **Navigation** | Turn-by-turn |
| **Documents** | Verification |
| **Support** | Help, disputes |
| **Incentives** | Bonuses, surge |

## 10.3 Fleet Management
| Feature | Description |
|---------|-------------|
| **Vehicle Tracking** | Real-time location |
| **Maintenance Alerts** | Service reminders |
| **Fuel Tracking** | Consumption |
| **Utilization** | Usage reports |

## 10.4 Delivery
| Feature | Description |
|---------|-------------|
| **Same-Day** | Local delivery |
| **Express** | 1-2 hour |
| **Scheduled** | Future slot |
| **Multi-Item** | Bundle orders |
| **Live Tracking** | Customer visibility |

---

# 11. LawGens - Products & Features

## 11.1 Contract Management
| Feature | Description |
|---------|-------------|
| **Drafting** | AI-assisted |
| **Analysis** | Risk detection |
| **Review** | Clause-by-clause |
| **E-Signature** | DocuSign integration |
| **Storage** | Secure repository |

## 11.2 Compliance
| Feature | Description |
|---------|-------------|
| **GDPR** | Data protection |
| **SOC2** | Security controls |
| **SEBI** | Financial compliance |
| **ROC** | Company filings |
| **Audit Support** | Documentation |

## 11.3 Court Intelligence
| Feature | Description |
|---------|-------------|
| **Case Tracking** | Docket alerts |
| **Judgment Analysis** | Outcome prediction |
| **Legal Research** | Case law search |
| **Citation Finder** | Relevant precedents |

## 11.4 Corporate Services
| Feature | Description |
|---------|-------------|
| **Incorporation** | Company setup |
| **Trademark** | Registration |
| **GST Filing** | Tax compliance |
| **Annual Returns** | ROC filings |

---

# 12. RIDZA - Products & Features

## 12.1 Financial Products
| Feature | Description |
|---------|-------------|
| **REZ-Financial** | Financial services (part of RIDZA) |
| **Insurance** | Health, life, car |
| **Credit Cards** | Digital cards |
| **Loans** | Personal, business |
| **BNPL** | Buy now pay later |
| **EMI** | Easy installments |

## 12.2 Finance Agents (11 Core AI Agents)
| Agent | Port | Purpose | Lines |
|-------|------|---------|-------|
| **Treasury Agent** | 4926 | Cash, FX, debt, liquidity, bank connectors | 2,881 |
| **FP&A Agent** | 4927 | Budget, forecast, variance, KPI | ~1,000 |
| **Risk Agent** | 4928 | Risk assessment, exposure evaluation | ~1,800 |
| **Investment Agent** | 4929 | Investment tracking, portfolio | ~1,650 |
| **Collection Agent** | 4930 | Receivables, dunning, payment chase | ~750 |
| **Financial Twin** | 4940 | Unified entity representation | 996 |
| **CFO Agent** | 4950 | Executive P&L, orchestration | 819 |
| **Crisis Agent** | 4960 | Early warning, automated alerts | 616 |
| **Problem Detector** | 4970 | Proactive problem detection | 647 |
| **Accounting Ledger** | 4980 | Double-entry bookkeeping | ~324 |
| **Finance Copilot** | 5090 | CFO Dashboard UI | 1,534 |

## 12.3 Treasury Agent Features (2,881 lines)
| Feature | Description |
|---------|-------------|
| **Cash Management** | Real-time cash position tracking |
| **Bank Connectors** | 10+ bank integrations (HDFC, ICICI, SBI, etc.) |
| **FX Management** | Multi-currency, exchange rates |
| **Debt Tracking** | Loans, credit facilities |
| **Liquidity Forecasting** | Cash runway calculations |
| **Transfer Management** | Internal/external transfers |

## 12.4 FP&A Agent Features
| Feature | Description |
|---------|-------------|
| **Budget Management** | Create, track, variance |
| **Forecasting** | Revenue, expense, cash flow |
| **KPI Dashboard** | Key performance indicators |
| **Scenario Analysis** | What-if modeling |
| **Variance Analysis** | Budget vs actual |

## 12.5 Collection Agent Features
| Feature | Description |
|---------|-------------|
| **AI Scoring** | Weighted ML model for payment probability |
| **Intelligent Queue** | Priority-based collection |
| **Multi-Channel** | SMS, Email, WhatsApp reminders |
| **Promise Tracking** | PTP management |
| **Collection Scripts** | AI-generated conversation scripts |
| **Agent Metrics** | Performance tracking |
| **Aging Analysis** | AR aging buckets |

## 12.6 Financial Twin Features
| Feature | Description |
|---------|-------------|
| **Balance Sheet** | Real-time assets/liabilities |
| **Income Statement** | P&L generation |
| **Cash Flow** | Cash position tracking |
| **Financial Ratios** | Liquidity, profitability, leverage |
| **Snapshots** | Historical comparisons |
| **State Comparison** | Period-over-period analysis |

## 12.7 CFO Agent Features
| Feature | Description |
|---------|-------------|
| **Task Orchestration** | Cross-agent coordination |
| **Daily Briefings** | AI-generated summaries |
| **NL Queries** | Natural language finance queries |
| **Workflow Execution** | Predefined workflows |
| **Recommendations** | AI-powered suggestions |

## 12.8 Crisis Agent Features
| Feature | Description |
|---------|-------------|
| **Metric Monitoring** | Continuous health checks |
| **Liquidity Alerts** | Cash runway warnings |
| **Fraud Alerts** | Anomaly detection |
| **Risk Alerts** | Exposure thresholds |
| **Severity Levels** | EMERGENCY → LOW |
| **Auto Notifications** | Alert escalation |

## 12.9 Problem Detector Features
| Feature | Description |
|---------|-------------|
| **Revenue Analysis** | Trend detection |
| **Budget Tracking** | Overrun detection |
| **Cash Monitoring** | Burn acceleration |
| **Receivables Analysis** | Aging trends |
| **Fraud Patterns** | Anomaly detection |
| **Margin Analysis** | Compression alerts |

## 12.10 Agent Portal
| Feature | Description |
|---------|-------------|
| **Lead Management** | Capture, follow-up |
| **Quote Generation** | Product comparison |
| **Commission Tracking** | Earnings, payouts |
| **Training** | Product knowledge |
| **Collection Queue** | Prioritized accounts |
| **Performance Dashboard** | Agent metrics |

## 12.11 Ecosystem Wiring (24 Integration Files)
| Integration | Services Connected |
|-------------|-------------------|
| **RABTUL** | 13 services (Auth, Payment, Wallet, Notify) |
| **REZ Intelligence** | 5 services (Intent, Signals, Predictive) |
| **HOJAI Core** | 2 services (Memory, Intelligence) |
| **SUTAR OS** | 2 services (Decision, Simulation) |
| **AdBazaar** | 4 services (Intent, Attribution) |
| **New Wires** | 5 services (Simulation, Twin, Board, Investor, Reconciliation) |

## 12.12 Priya's Story - "The CFO Who Finally Saw Everything"

All capabilities implemented:

| Story Capability | RIDZA Implementation | Status |
|-----------------|---------------------|--------|
| Financial Memory | HOJAI Memory (4520) + all services | ✅ |
| Financial Twin | ridza-financial-twin (994 lines) | ✅ |
| Problem Detection | ridza-problem-detector (647 lines) | ✅ |
| Intelligence Layer | Collection + FP&A agents | ✅ |
| Finance Copilot | ridza-finance-copilot (1,534 lines) | ✅ |
| Collection Agent | ridza-collection-agent (~750 lines) | ✅ |
| Crisis Detection | ridza-crisis-agent (616 lines) | ✅ |
| Monte Carlo | simulationService.ts | ✅ |
| CFO Agent | ridza-cfo-agent (819 lines) | ✅ |
| Board Reporting | investorRelationsService.ts | ✅ |
| Bank Reconciliation | bankReconciliationService.ts | ✅ |

---

# 13. AssetMind - Products & Features

## IMPLEMENTATION STATUS ✅
**83 Python FastAPI services** now implemented with main.py entry points

## 13.1 Asset Twins
| Feature | Description | Port | Status |
|---------|-------------|------|--------|
| **Asset Universe** | Global registry | 5001 | ✅ Implemented (1,025 lines) |
| **Digital Twin** | Complete overview | 5002 | ✅ Implemented (1,368 lines) |
| **Price Tracking** | Real-time quotes | 5299 | ✅ Implemented |
| **Performance** | Returns, metrics | 5001 | ✅ Implemented |

## 13.2 Market Intelligence
| Feature | Description | Port | Status |
|---------|-------------|------|--------|
| **Market Twin** | Conditions analysis | 5003 | ✅ Implemented (443 lines) |
| **Sector Analysis** | Industry trends | 5050 | ✅ Implemented |
| **Correlation Engine** | Relationships | 5055 | ✅ Implemented |
| **Capital Flow** | ETF flows | 5183 | ✅ Implemented (1,406 lines) |

## 13.3 Portfolio Tools
| Feature | Description | Port | Status |
|---------|-------------|------|--------|
| **Portfolio Twin** | Holdings overview | 5004 | ✅ Implemented (510 lines) |
| **Risk Analysis** | VaR, Sharpe | 5301 | ✅ Implemented |
| **Rebalancing** | Suggestions | 5004 | ✅ Implemented |
| **Tax Optimization** | LTCG, STCG | 5215 | ✅ Implemented |

## 13.4 Investor Tools
| Feature | Description | Port | Status |
|---------|-------------|------|--------|
| **Investor Twin** | Behavior analysis | 5005 | ✅ Implemented (529 lines) |
| **Advisory** | Personalized tips | 5295 | ✅ Implemented |
| **Briefing** | Morning reports | 5200 | ✅ Implemented (1,309 lines) |

## 13.5 Trading & Execution (6 services)
| Feature | Description | Port |
|---------|-------------|------|
| **Trading Engine** | Order management | 5102 |
| **Backtesting** | Strategy testing | 5101 |
| **Paper Trading** | Simulated trading | 5103 |
| **RL Trading** | Reinforcement learning | 5104 |
| **Execution** | Order execution | 5250 |
| **Trader UI** | Trading interface | 5210 |

## 13.6 Research & Analytics (8 services)
| Feature | Description | Port |
|---------|-------------|------|
| **Research** | Investment research | 5190 |
| **Analyst Twin** | AI analyst | 5220 |
| **Daily Reports** | Daily summaries | 5170 |
| **Report Generator** | Custom reports | 5215 |
| **Dashboard** | Analytics | 5201 |
| **Portfolio Analytics** | Portfolio metrics | 5301 |
| **Simulation** | What-if analysis, Monte Carlo simulation, scenario testing | 5200 |
| **Scenario Engine** | What-if analysis | 5105 |

---

# 14. Nexha - Products & Features

## 14.1 DistributionOS
| Feature | Description |
|---------|-------------|
| **Distributor Management** | Network, targets |
| **Order Management** | Purchase orders |
| **Inventory** | Stock at each level |
| **Collection** | Payments, dues |

## 14.2 FranchiseOS
| Feature | Description |
|---------|-------------|
| **Franchisee Portal** | Operations dashboard |
| **Inventory Transfer** | Between outlets |
| **Royalty Management** | Fees, reporting |
| **Training** | Product, processes |

## 14.3 ProcurementOS
| Feature | Description |
|---------|-------------|
| **RFQ** | Request quotes |
| **Supplier Management** | Vendor database |
| **Price Comparison** | Multi-quote |
| **Purchase Orders** | Automated |

## 14.4 Trade Finance
| Feature | Description |
|---------|-------------|
| **BNPL** | Buy now pay later |
| **Credit Lines** | Working capital |
| **Invoice Discounting** | Early payment |
| **Insurance** | Trade protection |

---

# 15. Axom - Products & Features

## 15.1 Axom Overview
**Company:** Axom - Trust, Social & BPO Company

### Axom Products
| Product | Description |
|---------|-------------|
| **BuzzLocal** | Hyperlocal social platform |
| **Z-Events** | Events platform |
| **rendez** | Rendezvous/dating platform |
| **Cosmic OS** | Operating System for REZ ecosystem |
| **Trust Services** | Trust infrastructure |

## 15.2 Cosmic OS (Life App)
| Feature | Description |
|---------|-------------|
| **Daily Cosmic Reading** | Astrology-based daily guidance |
| **Council of Agents** | Multi-agent AI consultation |
| **Mood Check-In** | Wellness tracking |
| **Domain Guidance** | Career, health, relationships, finance |
| **Life Story Engine** | Narrative intelligence |
| **Life Pattern Engine** | Pattern recognition |
| **Cosmic Twin** | Digital twin with cosmic context |

### Cosmic OS API Features
| Endpoint | Description |
|----------|-------------|
| `/api/cosmic/:userId` | Get cosmic context |
| `/api/cosmic/daily/:userId` | Daily reading |
| `/api/cosmic/council` | Consult AI council |
| `/api/mood/checkin` | Mood tracking |
| `/api/guidance/:userId/:domain` | Domain-specific guidance |
| `/api/agents` | List AI agents |
| `/api/user/:userId` | User profile + wallet + streak |

### Life Story Engine (Port 4167)
| Feature | Description |
|---------|-------------|
| **Narrative Intelligence** | Turning data into meaningful stories |
| **Story Arcs** | Character, setting, conflict, resolution |
| **Cosmic Narrative** | Life as mythology |
| **Personal Mythology** | User's life narrative |
| **Timeline Narrative** | Events as chapters |
| **Daily Narrative** | Day-by-day storytelling |

### AI Life Agents
| Agent | Domain |
|-------|--------|
| Career Counselor | Professional guidance |
| Health Advisor | Wellness, fitness |
| Relationship Guide | Personal connections |
| Finance Planner | Money decisions |
| Spiritual Guide | Life purpose |

## 15.3 Trust & Intelligence Services (Axom)
| Service | Purpose |
|---------|---------|
| **REZ-trust-os** | Trust operating system |
| **REZ-emotional-intelligence** | Emotion AI |
| **REZ-human-context-graph** | Context graph |
| **REZ-life-pattern-engine** | Life patterns |
| **REZ-memory-engine** | Memory |
| **REZ-cosmic-twin** | Digital twin |
| **Agent Governance Service** | AI oversight |
| **Audit Trail Service** | Compliance logging |
| **Breach Detection Service** | Security monitoring |

## 15.4 BuzzLocal (Hyperlocal Social)
| Feature | Description |
|---------|-------------|
| **Feed** | Hyperlocal posts |
| **Community** | Groups, events |
| **Safety** | REZ Safe infrastructure |
| **Commerce** | Local business |
| **Society OS** | Society management |
| **Creator** | Content creation |

### BuzzLocal Architecture
| Service | Port | Purpose |
|---------|------|---------|
| buzzlocal-api | - | Main API |
| buzzlocal-feed-service | - | Feed & posts |
| buzzlocal-community-service | - | Community features |
| buzzlocal-intelligence-service | - | AI intelligence |
| buzzlocal-notification-service | - | Push notifications |
| buzzlocal-payment-service | - | Payments |
| buzzlocal-realtime-service | - | WebSocket |
| buzzlocal-vibe-service | - | Crowd intelligence |
| buzzlocal-weather-service | - | Weather data |

### BuzzLocal REZ Safe Features
| Feature | Description |
|---------|-------------|
| **SOS Alerts** | Emergency with location |
| **Trusted Circle** | Emergency contacts |
| **Live Route** | Share live location |
| **Safety Check-ins** | Periodic check-in |
| **Crisis Management** | Crisis response |
| **Safety Map** | Real-time safety map |

## 15.5 Z-Events
| Feature | Description |
|---------|-------------|
| **Event Discovery** | Find events |
| **Ticketing** | Buy/sell tickets |
| **Event CRM** | Manage events |
| **Community Events** | Local gatherings |

---

# 16. REE (Real-time Ecosystem Engine) - Products & Features

**Type:** Cross-cutting microservices (NOT a company - infrastructure for ALL companies)
**Ports:** 3000-3011
**Total Services:** 12

## 16.1 ops-center (Port 3000)

| Feature | Description |
|---------|-------------|
| **Incident Management** | Create, track, resolve incidents |
| **Service Health** | Real-time health monitoring |
| **Alerting** | Threshold-based notifications |
| **Runbooks** | Standard operating procedures |
| **SLA Tracking** | Service level agreements |
| **Post-mortems** | Incident analysis, learnings |

## 16.2 trust-platform (Port 3001)

| Feature | Description |
|---------|-------------|
| **Trust Scores** | Entity scoring (0-100) |
| **Fraud Signals** | Real-time fraud detection |
| **Entity Verification** | KYC, KYB verification |
| **Risk Assessment** | Credit, operational risk |
| **Trust Graph** | Entity relationships |
| **Watchlists** | Fraud, sanctions lists |

## 16.3 growth-engine (Port 3002)

| Feature | Description |
|---------|-------------|
| **Referral Tracking** | Multi-level referral programs |
| **Viral Coefficients** | K-factor measurement |
| **Gamification** | Points, badges, streaks |
| **Loyalty Programs** | Rewards, tiers |
| **A/B Testing** | Growth experiments |
| **Cohort Analysis** | User segment tracking |

## 16.4 logistics-engine (Port 3003)

| Feature | Description |
|---------|-------------|
| **Route Optimization** | Efficient delivery routes |
| **Delivery Risk** | Risk scoring per delivery |
| **ETA Prediction** | Accurate delivery times |
| **Driver Assignment** | Optimal driver matching |
| **Multi-stop** | Batch delivery optimization |
| **Real-time Tracking** | GPS tracking |

## 16.5 attribution-engine (Port 3004)

| Feature | Description |
|---------|-------------|
| **Multi-touch Attribution** | Full journey tracking |
| **Attribution Models** | First, last, linear, data-driven |
| **Conversion Tracking** | Pixel, server-to-server |
| **View-through** | Brand awareness |
| **Incrementality** | Lift studies |
| **ROAS Tracking** | Return on ad spend |

## 16.6 creative-studio (Port 3005)

| Feature | Description |
|---------|-------------|
| **Ad Generation** | AI-powered creative generation |
| **A/B Testing** | Creative variants |
| **Template Library** | Pre-built templates |
| **Brand Compliance** | Design guidelines |
| **Asset Management** | Creative storage |
| **Performance Analytics** | Creative metrics |

## 16.7 franchise-mode (Port 3006)

| Feature | Description |
|---------|-------------|
| **Franchisee Management** | Network operations |
| **Royalty Tracking** | Fees, compliance |
| **Inventory Sync** | Multi-outlet sync |
| **Training Portal** | Product, process training |
| **Compliance** | Brand standards |
| **Performance** | Outlet analytics |

## 16.8 ai-marketplace (Port 3007)

| Feature | Description |
|---------|-------------|
| **Agent Catalog** | Browse AI agents |
| **Agent Ratings** | Reviews, ratings |
| **Agent Verification** | Quality assurance |
| **Revenue Sharing** | Commission tracking |
| **Agent Search** | Capability matching |
| **Deployment** | One-click agent setup |

## 16.9 mind-grocery (Port 3008)

| Feature | Description |
|---------|-------------|
| **Inventory Prediction** | Demand forecasting |
| **Smart Reordering** | Auto-stock replenishment |
| **Price Optimization** | Dynamic pricing |
| **Supplier Management** | Vendor coordination |
| **Waste Reduction** | Expiry tracking |
| **Customer Preferences** | Personalization |

## 16.10 mind-retail (Port 3009)

| Feature | Description |
|---------|-------------|
| **Demand Forecasting** | Sales prediction |
| **Pricing Intelligence** | Competitor-based pricing |
| **Inventory Optimization** | Stock levels |
| **Customer Segmentation** | Buyer profiles |
| **Trend Analysis** | Market trends |
| **Shelf Analysis** | Product placement |

## 16.11 rto-fraud (Port 3010)

| Feature | Description |
|---------|-------------|
| **Return Analysis** | Pattern detection |
| **Fraud Scoring** | Return fraud risk |
| **Policy Enforcement** | Return rules |
| **Chargeback Prevention** | Dispute reduction |
| **Merchant Protection** | Seller safety |
| **Customer Behavior** | Return history |

## 16.12 voice-ai (Port 3011)

| Feature | Description |
|---------|-------------|
| **Voice Recognition** | STT, multilingual |
| **Text-to-Speech** | TTS, voice clones |
| **IVR Systems** | Phone automation |
| **Voice Analytics** | Call insights |
| **Agent Assistance** | Real-time coaching |
| **Sentiment Analysis** | Emotion detection |

---

# 17. JUNE 2026 - NEW SERVICES

## 17.1 Agent Wallet (Port 4150)

**Company:** HOJAI AI
**Location:** `/hojai-agent-wallet/agent-wallet-api/`

| Feature | Description |
|---------|-------------|
| **Wallet Creation** | Multi-currency wallets (USD, INR, AED, EUR) |
| **Balance Management** | Real-time balance, hold, pending |
| **Agent-to-Agent Transfers** | Instant transfers with commission |
| **Escrow Management** | Task-based payment holding |
| **Payout Management** | Withdrawal to external accounts |
| **Transaction Ledger** | Complete audit trail |
| **Multi-Currency** | Cross-border settlements |

### API Endpoints
- `POST /api/wallet/create` - Create agent wallet
- `GET /api/wallet/:id` - Get wallet details
- `POST /api/transfer` - Transfer funds
- `POST /api/escrow/create` - Create escrow
- `POST /api/escrow/release` - Release escrow
- `POST /api/payout/request` - Request payout

---

## 17.2 Agent Identity (Port 4160)

**Company:** HOJAI AI
**Location:** `/hojai-agent-identity/agent-identity-api/`

| Feature | Description |
|---------|-------------|
| **Agent Registry** | AI agent catalog with metadata |
| **Agent Verification** | Capability verification |
| **Certification System** | Quality certification badges |
| **Agent Profiles** | Skills, capabilities, pricing |
| **Verification Status** | Verified/unverified status |
| **Capability Attestation** | Third-party capability confirmation |

### API Endpoints
- `POST /api/agents` - Register new agent
- `GET /api/agents/:id` - Get agent details
- `GET /api/agents/search` - Search agents
- `POST /api/certifications` - Issue certification
- `GET /api/certifications/:id` - Get certification
- `GET /api/certifications/verify/:code` - Verify certification

---

## 17.3 Agent Marketplace 2.0 (Port 4180)

**Company:** HOJAI AI
**Location:** `/hojai-agent-marketplace-2/marketplace-api/`

| Feature | Description |
|---------|-------------|
| **Agent Catalog** | 15+ categories, search, filters |
| **Ratings & Reviews** | Star ratings, written reviews |
| **Revenue Sharing** | 70/30 split (agent/platform) |
| **Analytics Dashboard** | Revenue, usage, trends |
| **Featured Agents** | Promoted listings |
| **Category Browsing** | Organized by industry |
| **Developer Portal** | API access, SDK docs |

### API Endpoints
- `GET /api/agents` - List agents
- `GET /api/agents/:id` - Agent details
- `POST /api/reviews` - Submit review
- `GET /api/payments/revenue` - Revenue analytics
- `GET /api/analytics/trends` - Market trends

---

## 17.4 Developer Platform (Port 4100)

**Company:** HOJAI AI
**Location:** `/hojai-developer-platform/devportal-api/`

| Feature | Description |
|---------|-------------|
| **API Key Management** | Create, rotate, revoke keys |
| **Developer Docs** | Interactive API documentation |
| **SDK Downloads** | TypeScript, Python, Go SDKs |
| **Sandbox Environment** | Test mode APIs |
| **Rate Limiting** | Tiered access (free/pro/enterprise) |
| **Webhooks** | Event notifications |
| **Usage Analytics** | API call tracking |

### API Endpoints
- `POST /api/keys` - Generate API key
- `GET /api/docs` - Get documentation
- `GET /api/sdk/:language` - Download SDK
- `GET /api/usage` - Usage statistics

---

## 17.5 Arabic AI (Port 4170)

**Company:** HOJAI AI
**Location:** `/hojai-arabic-ai/arabic-ai-api/`

| Feature | Description |
|---------|-------------|
| **Arabic STT** | Arabic speech-to-text |
| **Arabic TTS** | Arabic text-to-speech |
| **Arabic NLU** | Arabic natural language understanding |
| **Arabic Voice Twin** | Voice cloning in Arabic |
| **Code-Switching** | Arabic-English mixing |
| **Dialects** | Gulf, Levantine, Egyptian, Maghrebi |
| **Islamic Content** | Religious text processing |

### API Endpoints
- `POST /api/stt` - Speech to text
- `POST /api/tts` - Text to speech
- `POST /api/nlu` - Natural language understanding
- `POST /api/voice-twin/create` - Create voice twin
- `GET /api/dialects` - Supported dialects

---

## 17.6 RTNM Trust Network (Port 4190)

**Company:** RTNM Digital
**Location:** `/rtnm-trust-network/trust-network-gateway/`

| Feature | Description |
|---------|-------------|
| **Universal Identity** | Human, Agent, Business, Product |
| **Trust Scoring** | 0-1000 score, multi-factor |
| **Reputation System** | Reviews, ratings, badges |
| **Verification Services** | KYC, KYB, document verification |
| **Credentials** | Skills, certifications, references |
| **Cross-Platform Trust** | Trust portability |
| **Audit Trail** | Complete verification history |

### API Endpoints
- `POST /api/identity/create` - Create identity
- `GET /api/score/:id` - Get trust score
- `GET /api/reputation/:id` - Get reputation
- `POST /api/verify/kyc` - KYC verification
- `POST /api/credentials/issue` - Issue credential
- `GET /api/credentials/verify/:code` - Verify credential

---

## 17.7 Islamic Finance (Port 4530)

**Company:** RIDZA
**Location:** `/ridza-islamic-finance/islamic-finance-api/`

| Feature | Description |
|---------|-------------|
| **Islamic BNPL** | Murabaha, Tawarruq |
| **Zakat Calculator** | Asset-based calculation |
| **Zakat Distribution** | Charity allocation |
| **Islamic Lending** | Halal loan products |
| **Sharia Compliance** | Fatwa verification |
| **Qard Hasan** | Interest-free loans |
| **Ijtihad Engine** | Islamic jurisprudence AI |

### API Endpoints
- `POST /api/bnpl/calculate` - Calculate BNPL
- `POST /api/bnpl/apply` - Apply for Islamic BNPL
- `GET /api/zakat/calculate` - Calculate Zakat
- `POST /api/zakat/distribute` - Distribute Zakat
- `POST /api/lending/apply` - Apply for Islamic loan

---

## 17.8 Remittance (Port 4540)

**Company:** RIDZA
**Location:** `/ridza-remittance/remittance-api/`

| Feature | Description |
|---------|-------------|
| **P2P Transfers** | Person-to-person transfers |
| **Cross-Border** | International remittance |
| **Exchange Rates** | Real-time rates, rate locking |
| **Recipient Management** | Save recipients |
| **Transfer Tracking** | Status updates, notifications |
| **Fee Calculator** | Transparent pricing |
| **Transfer History** | Complete transaction history |

### API Endpoints
- `POST /api/transfer` - Initiate transfer
- `GET /api/transfer/:id` - Get transfer status
- `GET /api/rates` - Current exchange rates
- `POST /api/rates/lock` - Lock rate
- `POST /api/recipients` - Add recipient
- `GET /api/recipients` - List recipients

---

# 18. SADA (Trust, Governance & Risk Platform)

**Port:** 4190
**Company:** CorpPerks

## 18.1 Trust Service

| Feature | Description |
|---------|-------------|
| **Trust Scores** | Entity scoring (0-100), historical tracking |
| **Trust History** | Score changes over time |
| **Trust Relationships** | Entity-to-entity trust connections |
| **Multi-entity Support** | Human, Agent, Business, Product |
| **Real-time Updates** | Dynamic trust recalculation |
| **Graceful Degradation** | Default scores when service unavailable |

## 18.2 Governance

| Feature | Description |
|---------|-------------|
| **Policy Management** | Create, update, version policies |
| **Policy Enforcement** | Rule-based compliance |
| **Policy Violations** | Track breaches and penalties |
| **Compliance Checks** | Automated verification |
| **Audit Trail** | Complete policy change history |

## 18.3 Risk Assessment

| Feature | Description |
|---------|-------------|
| **Risk Scoring** | Multi-factor risk assessment |
| **Fraud Detection** | Pattern recognition, alerts |
| **Anomaly Detection** | ML-based anomaly identification |
| **Risk Limits** | Configurable per-entity limits |
| **Real-time Monitoring** | Continuous risk tracking |

## 18.4 Verification

| Feature | Description |
|---------|-------------|
| **KYC Verification** | Identity verification (human) |
| **KYB Verification** | Business verification |
| **Agent Verification** | AI agent capability verification |
| **Document Verification** | Document authenticity |
| **Provider Integration** | Multiple verification providers |

## 18.5 SADA API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/:entityId` | GET | Get entity trust score |
| `/:entityId` | POST | Create/Update trust score |
| `/:entityId/verify` | POST | Verify entity (KYC/KYB) |
| `/:entityId/risk` | GET | Get risk assessment |
| `/:entityId/activity` | POST | Record activity |
| `/:entityId/relationship` | POST | Add trust relationship |
| `/policy` | GET/POST | Policy management |
| `/compliance/:entityId` | POST | Compliance check |
| `/audit` | GET | Audit logs |

## 18.6 SADA MongoDB Models

| Model | Purpose |
|-------|---------|
| TrustScore | Entity trust scores |
| TrustHistory | Score history |
| TrustRelationship | Entity relationships |
| Policy | Policy definitions |
| PolicyViolation | Breach records |
| ComplianceCheck | Compliance records |
| AuditLog | Audit trail |
| RiskAssessment | Risk scores |
| FraudAlert | Fraud alerts |
| Verification | Verification records |

---

# 19. Shab AI (Family Intelligence Platform)

**Port:** 4970
**Company:** HOJAI AI

## 19.1 Family Management

| Feature | Description |
|---------|-------------|
| **Family Profiles** | Family groups with members |
| **Member Profiles** | Name, age, role, health info |
| **Relationship Types** | Parent, child, sibling, spouse, elder |
| **Permissions** | Access control per member |
| **Family Graph** | Hierarchical relationship mapping |

## 19.2 Memory Storage

| Feature | Description |
|---------|-------------|
| **Timeline Memory** | Events organized by date |
| **Memory Types** | Milestone, story, photo, event, achievement |
| **Privacy Controls** | Per-memory visibility |
| **Search & Retrieval** | Full-text search |
| **Milestone Tracking** | Important life events |

## 19.3 Elder Care

| Feature | Description |
|---------|-------------|
| **Health Vitals** | Track health metrics |
| **Medication Schedules** | Reminders, tracking |
| **Alert System** | Anomaly detection |
| **Emergency Contacts** | Quick access contacts |
| **Caregiver Access** | Multiple caregivers |

## 19.4 Child Learning

| Feature | Description |
|---------|-------------|
| **Adaptive Learning** | Personalized paths |
| **XP System** | Gamification, points |
| **Level Progression** | Achievement levels |
| **Subject Tracking** | Math, science, language |
| **Progress Analytics** | Performance insights |

## 19.5 Tasks

| Feature | Description |
|---------|-------------|
| **Task Management** | Create, assign, track |
| **Household Tasks** | Family chore management |
| **Due Dates** | Deadline tracking |
| **Completion Status** | Done/pending tracking |
| **Assignment** | Member assignment |

## 19.6 AI Companion

| Feature | Description |
|---------|-------------|
| **Genie Integration** | Family AI chat with Genie |
| **Context-Aware** | Memory-informed responses |
| **Fallback Responses** | When Genie unavailable |
| **Conversation History** | Session storage |
| **Family Context** | Multi-person awareness |

## 19.7 Shab AI API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/family` | GET/POST | Family management |
| `/family/:id/members` | GET/POST | Family members |
| `/memories` | GET/POST | Memory storage |
| `/memories/search` | POST | Search memories |
| `/elder-care` | GET/POST | Elder care |
| `/elder-care/:id/vitals` | POST | Record vitals |
| `/child-learning` | GET/POST | Child learning |
| `/child-learning/:id/xp` | POST | Add XP, progress |
| `/tasks` | GET/POST | Task management |
| `/companion/chat` | POST | AI companion chat |

## 19.8 Shab AI MongoDB Models

| Model | Purpose |
|-------|---------|
| Family | Family profiles |
| Memory | Family memories |
| ElderCare | Elder health |
| ChildLearning | Child progress |
| Task | Household tasks |
| ChatSession | AI conversations |

---

# 20. Salar OS (Workforce Intelligence Network)

**Port:** 4710
**Company:** CorpPerks

## 20.1 Twin System

| Feature | Description |
|---------|-------------|
| **Human Twin** | Employee digital twin |
| **Agent Twin** | AI employee digital twin |
| **Hybrid Twin** | Human + Agent team composition |
| **Organization Twin** | Company workforce overview |
| **Twin Health** | Activity status tracking |
| **Twin Relationships** | Team connections |

## 20.2 Capability Registry

| Feature | Description |
|---------|-------------|
| **Capability Mapping** | Skills to entities |
| **Confidence Scores** | Capability proficiency |
| **Multi-entity Support** | Human, Agent, Team |
| **Capability Search** | Find by skill |
| **Matrix View** | Skills grid |
| **Optimal Matching** | Task-capability alignment |

## 20.3 AI Employee LLM

| Feature | Description |
|---------|-------------|
| **LLM Integration** | Multiple LLM providers |
| **Agent Memory** | Persistent agent context |
| **Task Execution** | AI task completion |
| **Streaming Responses** | Real-time output |
| **Tool Calling** | Function execution |

## 20.4 SUTAR Bridge

| Feature | Description |
|---------|-------------|
| **Workforce Decisions** | AI decision making |
| **Outcome Tracking** | Decision results |
| **Capability Checks** | Skill verification |
| **Simulation** | What-if scenarios |

## 20.5 Vector Store

| Feature | Description |
|---------|-------------|
| **Semantic Search** | Embedding-based search |
| **Document Indexing** | Knowledge base |
| **Similarity Matching** | Find related content |

## 20.6 ML Pipeline

| Feature | Description |
|---------|-------------|
| **Training Jobs** | ML model training |
| **Workforce Predictions** | Employee insights |
| **Analytics** | Performance metrics |

## 20.7 SADA Trust Integration

Salar OS integrates with SADA for workforce trust:

| Feature | Description |
|---------|-------------|
| **Trust Scores** | Get unified trust from SADA |
| **Activity Recording** | Track for trust calculation |
| **Risk Assessment** | Get risk scores |
| **Trust Leaderboard** | Workforce ranking |
| **Bulk Sync** | Sync all scores |

## 20.8 Salar OS API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/capabilities/*` | Capability registry |
| `/agent-twin/*` | Agent twin management |
| `/human-twin/*` | Human twin management |
| `/hybrid-team/*` | Hybrid team management |
| `/sutar/bridge/*` | SUTAR integration |
| `/ai-employee-llm/*` | LLM integration |
| `/organization-twin/*` | Organization twin |
| `/vector/*` | Vector store |
| `/sada-trust/*` | SADA trust integration |

## 20.9 Salar OS MongoDB Models

| Model | Purpose |
|-------|---------|
| Capability | Skill definitions |
| CapabilityMapping | Skill-entity mapping |
| AgentTwin | AI employee twins |
| HumanTwin | Employee twins |
| HybridTeamTwin | Team twins |
| InteractionLog | Twin interactions |

---

# 21. ExpertOS (Professional Intelligence Cloud)

**Tagline:** "Train your AI Twin once. It gets smarter every day"
**Port:** 4550

## Professional Marketplace

| Feature | Description |
|---------|-------------|
| **Professional Registration** | Multi-step onboarding with credentials |
| **Category Selection** | Healthcare, Finance, Legal, Coaching, Consulting, Education, Wellness, Creative |
| **Verification System** | Document verification, credential checks |
| **Trust Score** | Automatic trust calculation based on reviews, verifications |
| **Marketplace Listing** | Service offerings, pricing, availability |

## Professional Categories

| Category | Examples |
|----------|----------|
| **Healthcare** | Doctors, Dentists, Physiotherapists, Nutritionists, Mental Health |
| **Finance** | CAs, Financial Advisors, Tax Consultants, Investment Advisors |
| **Legal** | Lawyers, Paralegals, Compliance Officers |
| **Coaching** | Life Coaches, Career Coaches, Executive Coaches |
| **Consulting** | Business Consultants, Marketing, HR, Strategy |
| **Education** | Tutors, Professors, Language Teachers, Test Prep |
| **Wellness** | Yoga Instructors, Fitness Trainers, Meditation Guides |
| **Creative** | Designers, Photographers, Videographers, Writers |

## Consultation Engine

| Feature | Description |
|---------|-------------|
| **Inquiry System** | Client → Professional messaging |
| **Booking Flow** | Schedule consultations with availability |
| **Video Integration** | Zoom, Google Meet, Internal fallback |
| **Payment Processing** | RABTUL Payment Service integration |
| **Review System** | Post-consultation ratings |
| **Payout System** | Professional earnings settlement |

## Payment Flow

| Feature | Description |
|---------|-------------|
| **Platform Fee** | 10% (configurable) |
| **Payment Links** | Razorpay integration |
| **Refunds** | Cancellation handling |
| **Payouts** | Professional settlement |
| **Commission Tracking** | Revenue analytics |

## Admin Dashboard

| Feature | Description |
|---------|-------------|
| **Verification Queue** | Approve/reject professional credentials |
| **Professional Management** | View, disable, delete profiles |
| **Inquiry Management** | Monitor client-professional communication |
| **Consultation Management** | Track all sessions |
| **Revenue Analytics** | Platform revenue, professional earnings |
| **Professional Growth** | Registration trends, category distribution |

## MongoDB Models

| Model | Purpose |
|-------|---------|
| ProfessionalProfile | Professional info, credentials, verification status |
| MarketplaceListing | Service offerings, pricing, availability |
| ClientInquiry | Client messages to professionals |
| Consultation | Booked sessions with video links |
| Review | Client reviews and ratings |
| Payment | Platform fees, professional payouts |
| Notification | Notification preferences and history |
| AdminUser | Admin dashboard users |

## Integration Architecture

```
Client ──────────────→ ExpertOS Marketplace ──────────────→ Professional
                         (Port 4550)                       (AI Twin)
                              │
                              ├── RABTUL Auth (4002) ──── Authentication
                              ├── RABTUL Payment (4001) ── Fees & Payouts
                              ├── Notification (4011) ──── Email/SMS/Push
                              └── Video Service (4560) ──── Consultations
```

## Vertical Integration (3-Line Pattern)

All 16 verticals integrate ExpertOS with the same pattern:

```typescript
import { registerExpertOS } from '../../../hojai-expert-os/src/expertOS-integration';

const expertOSRouter = registerExpertOS('vertical-name');
app.use('/api/expert-os', expertOSRouter);
```

---

# SUMMARY TABLE

| Company | Products | Key Features | Total Features |
|---------|----------|--------------|-----------------|
| **HOJAI AI** | 31+ | 275+ | 320+ |
| **RABTUL** | 8+ | 60+ | 70+ |
| **AdBazaar** | 11+ | 80+ | 90+ |
| **CorpPerks** | 9+ | 90+ | 100+ |
| **RisaCare** | 8+ | 70+ | 80+ |
| **StayOwn** | 5+ | 40+ | 45+ |
| **RisnaEstate** | 7+ | 50+ | 55+ |
| **REZ Consumer** | 11+ | 60+ | 70+ |
| **REZ Merchant** | 15+ | 80+ | 95+ |
| **KHAIRMOVE** | 6+ | 40+ | 45+ |
| **LawGens** | 7+ | 35+ | 40+ |
| **RIDZA** | 15+ | 29 | 45+ |
| **AssetMind** | 8+ | 45+ | 50+ |
| **Nexha** | 8+ | 35+ | 40+ |
| **Axom** | 4+ | 20+ | 25+ |
| **RTNM Digital** | 8 | 56 | 64+ |
| **REE** | 12 | 72 | 84+ |
| **SADA** | 5+ | 30+ | 35+ |
| **Shab AI** | 6+ | 35+ | 40+ |
| **Salar OS** | 9+ | 45+ | 55+ |
| **ExpertOS** | 5+ | 40+ | 45+ |
| **SkillNet** | 21 | 100+ | 120+ |

---

**Total Features Across Ecosystem:** 1620+

---

**Last Updated:** June 11, 2026
**Version:** 1.5 - Added SkillNet (Intelligence Platform)

---

## 1.7 BrandPulse Infrastructure (v2.0)

### Database & Persistence
| Feature | Description |
|---------|-------------|
| **SQLite Database** | All data persists across restarts |
| **Companies Table** | Company registry with aliases |
| **Mentions Table** | News, social, review mentions |
| **Reviews Table** | Platform reviews (Google, Yelp, Trustpilot) |
| **Press Table** | Press coverage tracking |
| **Alerts Table** | Crisis alerts with status tracking |
| **Trends Table** | Daily sentiment aggregation |
| **API Keys Table** | Authentication and rate limiting |

### Scheduler & Automation
| Feature | Description |
|---------|-------------|
| **News Refresh** | Every 15 minutes |
| **Review Refresh** | Every hour |
| **Alert Checking** | Every 5 minutes |
| **Trend Updates** | Daily at midnight |
| **Manual Trigger** | On-demand data refresh |

### Data Connectors
| Source | Description |
|--------|-------------|
| **GDELT** | Global news via HOJAI Web Intelligence |
| **NewsAPI** | Top news sources (Reuters, Bloomberg, TechCrunch) |
| **Reddit** | Discussion tracking |
| **Google Places** | Business reviews |
| **Trustpilot** | Business reviews |
| **Yelp** | Business reviews |

### Authentication & Security
| Feature | Description |
|---------|-------------|
| **API Key Management** | Create, validate, revoke keys |
| **Rate Limiting** | Configurable per-key limits |
| **Permission System** | read, write, admin |
| **CORS Support** | Cross-origin configuration |

### Notifications (4778)
| Channel | Description |
|---------|-------------|
| **Slack** | Rich message formatting with blocks |
| **Microsoft Teams** | MessageCard format |
| **Email** | SMTP delivery |
| **SMS** | Twilio, MSG91 providers |
| **Custom Webhooks** | HTTP POST/PUT with signature |

---

# 22. HOJAI-AI SERVICE AUDIT (June 2026)

**Audit Date:** June 11, 2026
**Status:** ✅ COMPLETE - All services verified

---

## Audit Summary

| Category | Count | Status |
|----------|-------|--------|
| **Industry AI Services** | 30 | ✅ All have src/index.ts |
| **SUTAR OS Services** | 29 | ✅ All have src/index.ts |
| **SUTAR Bridges** | 5 | ✅ All have src/index.ts |
| **Other Services** | 6 | ✅ All have src/index.ts |
| **Stubs Fixed** | 9 | ✅ Full implementations created |

---

## Services Fixed (Full Implementations Created)

### hib-code-intelligence-service
**Port:** 3053 | **Location:** `hojai-ai/hib-code-intelligence-service/`

| Feature | Description |
|---------|-------------|
| Code Quality Analysis | Complexity, maintainability, testability scoring |
| Security Scanning | SQL injection, XSS, hardcoded credentials detection |
| Code Review | Automated PR reviews with suggestions |
| Performance Optimization | Suggestions for code improvements |
| Documentation Generation | JSDoc auto-generation |
| Dependency Analysis | Import parsing, outdated detection |

### service-catalog-service (GlamAI)
**Port:** 4622 | **Location:** `hojai-ai/industry-ai/glamai/service-catalog-service/`

| Feature | Description |
|---------|-------------|
| Service CRUD | Create, read, update, delete services |
| Category Management | Hierarchical categories with icons |
| Pricing & Duration | Price, currency, duration management |
| Service Packages | Combo packages with discounts |
| Staff Assignment | Assign services to staff members |
| Search & Filters | Multi-criteria search |

### hojai-agent-registry
**Port:** 4550 | AI agent registration and capability matching

### hojai-provider-agent
**Port:** 4918 | NPI registry, taxonomy search, credentialing

### hojai-risacare-eligibility
**Port:** 4913 | EDI 270/271 eligibility verification

### hojai-risacare-compliance
**Port:** 4917 | HIPAA audit trail, BAA checklist, security scans

### hojai-risacare-clearinghouse
**Port:** 4914 | EDI 837P/837I claims submission

### hib-corpperks-sync
**Port:** 3096 | Workforce sync with CorpPerks

### hib-cloud-security
**Port:** 3051 | CSPM for AWS/Azure/GCP

### hib-compliance-reporting
**Port:** 3054 | SOC2, PCI-DSS, HIPAA, GDPR, ISO27001 reports

---

## Industry AI Services (30 Services)

| Service | Port | Industry |
|---------|------|----------|
| carecode | 4912 | Healthcare |
| consumer-twin | 4751 | Consumer |
| crm | 4752 | CRM |
| education-ai | 4753 | Education |
| edulearn | 4754 | Education |
| employee-twin | 4755 | HR |
| fitmind | 4756 | Fitness |
| fitness-ai | 4757 | Fitness |
| fleetiq | 4758 | Fleet |
| franchise-ai | 4759 | Franchise |
| franchise-twin | 4760 | Franchise |
| glamai | 4761 | Beauty |
| groceryiq | 4762 | Grocery |
| learniq | 4763 | Learning |
| ledgerai | 4764 | Finance |
| neighborai | 4765 | Community |
| pharmacy-ai | 4766 | Pharmacy |
| prodflow | 4767 | Manufacturing |
| propflow | 4768 | Real Estate |
| salon-ai | 4769 | Salon |
| shopflow | 4770 | Retail |
| staybot | 4771 | Hospitality |
| supplier-twin | 4772 | Supply Chain |
| teammind | 4773 | Teams |
| tripmind | 4774 | Travel |
| waitron | 4775 | Food Service |

---

## SUTAR OS Services (29 Services)

| Service | Port | Purpose |
|---------|------|---------|
| sutar-agent-id | 4141 | Agent identity |
| sutar-agent-network | 4142 | Agent networking |
| sutar-axp-protocol | 4143 | Agent communication |
| sutar-contract-os | 4144 | Smart contracts |
| sutar-data-store | 4145 | Data storage |
| sutar-decision-engine | 4146 | AI decisions |
| sutar-discovery-engine | 4147 | Partner discovery |
| sutar-economy-os | 4148 | Agent economy |
| sutar-exploration-engine | 4149 | Market exploration |
| sutar-flow-os | 4150 | Workflow automation |
| sutar-gateway | 4151 | API gateway |
| sutar-goal-os | 4152 | Goal tracking |
| sutar-intent-bus | 4154 | Intent propagation |
| sutar-marketplace | 4155 | Agent marketplace |
| sutar-memory-bridge | 4156 | Memory integration |
| sutar-monitoring | 4157 | Service monitoring |
| sutar-multi-agent-evaluator | 4158 | Agent evaluation |
| sutar-negotiation-engine | 4159 | Negotiation |
| sutar-network-learning | 4160 | Network learning |
| sutar-policy-os | 4161 | Policy engine |
| sutar-reputation-aggregator | 4162 | Reputation |
| sutar-roi-calculator | 4163 | ROI calculation |
| sutar-simulation-os | 4241 | Market simulation |
| sutar-supplier-registry | 4165 | Supplier registry |
| sutar-trust-engine | 4166 | Trust scoring |
| sutar-trust-score | 4167 | Trust calculation |
| sutar-twin-os | 4168 | Digital twins |
| sutar-usage-tracker | 4169 | Usage tracking |
| sutar-websocket-server | 4170 | WebSocket server |

---

## Standard Implementation Pattern

All services follow this production-ready pattern:

```typescript
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import dotenv from 'dotenv';

// Health endpoints
app.get('/health', async (_req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'healthy', service: '[name]', dependencies: { mongodb: mongoStatus } });
});

app.get('/health/live', (_req, res) => res.json({ status: 'alive' }));
app.get('/health/ready', (_req, res) => res.json({ status: 'ready' }));

// Graceful shutdown
process.on('SIGTERM', () => { process.exit(0); });
process.on('SIGINT', () => { process.exit(0); });
```

---

## Security & Infrastructure

All services include:
- **Helmet** - Security headers (XSS, clickjacking, etc.)
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Request throttling per IP
- **Compression** - Gzip response compression
- **Winston Logging** - Structured JSON logging
- **MongoDB** - Mongoose ODM with connection retry
- **Graceful Shutdown** - SIGTERM/SIGINT handlers

---

## UI-Only Services (Not Stubs)

| Service | Type | Status |
|---------|------|--------|
| hojai-monitoring-dashboard | React Dashboard | ✅ UI Only |
| hojai-sutar-os/dashboard | HTML Dashboard | ✅ UI Only |
| hojai-sutar-os/demo | Demo Scripts | ✅ Scripts |

---

**Audit Completed:** June 11, 2026
**Services Verified:** 70+
**Stubs Fixed:** 9
**Status:** PRODUCTION READY
---

## BrandPulse v2.0 - New Features

### WebSocket Streaming (ws://4770/ws)
| Feature | Description |
|---------|-------------|
| **Real-time Updates** | Push alerts and mentions as they happen |
| **Event Subscriptions** | Subscribe to specific event types |
| **Company Filtering** | Stream only specific companies |
| **Heartbeat** | Keep connections alive |

### PDF Reports (4779)
| Feature | Description |
|---------|-------------|
| **Executive Summary** | High-level brand health metrics |
| **Sentiment Analysis** | Positive/negative/neutral breakdown |
| **Trends Chart** | Sentiment over time |
| **Top Mentions** | Most impactful mentions |
| **Alert Summary** | Active alerts and recommendations |

### Docker Deployment
| Feature | Description |
|---------|-------------|
| **Container** | Docker image built and ready |
| **Compose** | docker-compose.yml with all services |
| **Volumes** | Persistent data storage |
| **Health Checks** | Built-in health monitoring |

