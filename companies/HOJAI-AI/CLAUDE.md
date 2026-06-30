# HOJAI-AI — Complete AI Platform

> **Version:** 5.1
> **Updated:** June 30, 2026
> **Status:** ✅ **FULLY OPERATIONAL** — 500+ services, 47+ AI agents, 86+ digital twins, 80 tests passing

---

## 🚀 Quick Start

```bash
# Start full platform
cd /Users/rejaulkarim/Documents/RTMN
bash scripts/dev-stack.sh start

# Start individual services
cd companies/HOJAI-AI/platform/internet-os && npm start
cd companies/HOJAI-AI/platform/flow/loop-os && npm start
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     HOJAI AI PLATFORM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  FOUNDATION     │  │  INTELLIGENCE   │  │  WORKFORCE      │  │
│  │  CorpID (4702) │  │  AI Agents (47+) │  │  AI Employees   │  │
│  │  Memory (30+)   │  │  InternetOS     │  │  Departments    │  │
│  │  TwinOS (86+)   │  │  BrandPulse      │  │  Skills (100+) │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  SUTAR OS       │  │  INDUSTRY OS     │  │  STUDIO         │  │
│  │  Commerce (37)   │  │  50+ verticals  │  │  Workflows     │  │
│  │  Negotiation     │  │  Department OS   │  │  Templates (100+)│ │
│  │  Contracts      │  │  24 Industries  │  │  Visual Builder │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Platform Services

### Foundation (3 Core)

| Port | Service | Path | Purpose |
|------|---------|------|---------|
| 4702 | **CorpID** | `platform/identity/` | Universal identity |
| 4703 | **MemoryOS** | `platform/memory/` | AI memory (30+ services) |
| 4705 | **TwinOS Hub** | `platform/twins/` | Digital twins (86+) |

### Intelligence (4 Core)

| Port | Service | Path | Purpose |
|------|---------|------|---------|
| 4595 | **InternetOS** | `platform/internet-os/` | Web scraping, actors |
| 4770 | **BrandPulse** | `products/brandpulse/` | Brand intelligence |
| 4786 | **KnowledgeOS** | `platform/memory/` | Knowledge graphs |
| 4880 | **Voice Gateway** | `products/voice-os/` | STT/TTS routing |

---

## 🌐 InternetOS — Web Intelligence (Apify Equivalent) ✅

**The "eyes and ears" of the AI workforce. Scrapes and monitors the internet.**

### Architecture

```
InternetOS
├── actor-runtime/      (6,561 LOC) — Actor execution framework
├── watcher-runtime/    (8,071 LOC) — Continuous monitoring
└── actors/            (7 actors)
    ├── google-maps-actor/     — Business discovery
    ├── zomato-actor/         — Restaurant data
    ├── airbnb-actor/         — Hospitality data
    ├── linkedin-actor/       — Professional network
    ├── news-actor/            — News extraction
    ├── company-intel-actor/   — Company research
    └── justdial-actor/        — Local business
```

### Actor Runtime Features

```typescript
import { ActorRuntime, ActorRegistry } from './actor-runtime';

const runtime = new ActorRuntime();

// Execute single actor
const result = await runtime.execute({
  actor: 'google_maps',
  action: 'scrape',
  params: { query: 'restaurants in Bangalore', limit: 10 }
});

// Batch execution
const results = await runtime.executeBatchParallel(inputs, 5);
```

### Watcher Runtime Features

```typescript
import { WatcherRuntime, PriceWatcher } from './watcher-runtime';

const watcher = new WatcherRuntime();

// Price monitoring
const priceWatcher = new PriceWatcher(watcher);
priceWatcher.create('competitor-1', 'https://example.com', '.price', 3600000);

// Review monitoring
const reviewWatcher = new ReviewWatcher(watcher);
reviewWatcher.create('my-brand', 'https://google.com/maps/...', '.rating', 86400000);

// Start continuous monitoring
watcher.start();
```

### Quick Start

```bash
cd platform/internet-os/actor-runtime
npm install && npm run build

# Run a specific actor
cd ../actors/google-maps-actor
npm start
```

### Related Services

| Service | Port | Integration |
|---------|------|-------------|
| BrandPulse | 4770 | Uses actors for brand monitoring |
| REZ-SalesMind | 5170 | Uses actors for lead discovery |

---

## 🤖 AI Agents (47+ Total)

### Sales OS — 22 Agents (Port 5055)

| Agent | Purpose | Accuracy |
|-------|---------|----------|
| Lead Scoring Agent | Lead qualification | 94.5% |
| Opportunity Intelligence | Deal insights | 91.2% |
| Churn Prediction Agent | Customer churn | 89.7% |
| Pricing Optimizer | Dynamic pricing | 87.3% |
| Contract Analyzer | Contract review | 92.1% |
| Commission Calculator | Commission calc | 99.1% |
| Sales Coach Agent | Sales training | 88.4% |
| Next Best Action | Next action rec | 88.9% |
| Auto Follow-up Agent | Automated followups | 95.2% |
| Renewal Predictor | Renewal scoring | 90.3% |
| Competitor Intel | Market intel | 84.5% |
| Sentiment Analyzer | Conversation analysis | 91.7% |
| Engagement Predictor | Engagement scoring | 90.8% |
| Territory Optimizer | Territory planning | 85.6% |
| + 8 more | Various | 89.4% avg |

### Marketing OS — 15 Agents (Port 5500)

| Agent | Purpose |
|-------|---------|
| Brand Voice Agent | Consistent messaging |
| Campaign Strategist | Campaign recommendations |
| Journey Optimizer | Journey improvement |
| Content Generator | Content creation |
| Audience Analyzer | Customer segmentation |
| SEO Advisor | Keyword recommendations |
| Budget Allocator | Budget optimization |
| Competitive Intel | Competitor monitoring |
| A/B Test Analyzer | Statistical analysis |
| ROI Calculator | Marketing ROI |
| Sentiment Monitor | Brand tracking |
| Social Scheduler | Optimal posting |
| Lead Qualifier | BANT scoring |
| Email Optimizer | Subject optimization |
| Influencer Advisor | Influencer selection |

### Workforce OS — 10 Agents (Port 5077)

| Agent | Purpose |
|-------|---------|
| Resume Screening Agent | Candidate analysis |
| Interview Scheduling Agent | Slot finding |
| Leave Approval Agent | Auto-approve/route |
| Payroll Processing Agent | Salary calculation |
| Performance Analyzer | Review insights |
| Skill Gap Analyzer | Training needs |
| Compliance Checker | Policy adherence |
| Attrition Predictor | Risk flagging |
| Org Chart Optimizer | Structure suggestions |
| Benefits Advisor | Package recommendations |

### Platform Agents (7)

| Agent | Port | Purpose |
|-------|------|--------|
| AI SDR Agent | - | Lead qualification |
| AI Support Agent | - | Ticket resolution |
| Founder Briefing Agent | - | Daily briefings |
| Invoice Automation Agent | - | Invoice processing |
| WhatsApp Commerce Agent | - | Commerce automation |
| Browser Agent | - | Web research |
| Desktop Agent | - | Desktop automation |

---

## 📊 Intelligence Services

### BrandPulse (Port 4770)

**Brand intelligence and sentiment analysis.**

| Feature | Description |
|--------|-------------|
| Sentiment Analysis | AFINN + GPT-powered |
| Review Management | Google, Yelp, TripAdvisor, Facebook |
| Brand Analytics | Health metrics, trends |
| Alert System | negative_review, low_rating, spike |
| WebSocket | Real-time updates |

```bash
cd products/brandpulse
npm install && npm run dev
# API: http://localhost:4770
```

### REZ-SalesMind (Port 5170)

**AI-powered sales intelligence platform.**

| Feature | Description |
|--------|-------------|
| AI Copilot | Next action, scripts, coaching |
| Lead Management | CRUD, enrichment |
| Pipeline Dashboard | Stats, pipeline view |
| Multi-channel | Email, SMS, WhatsApp |
| Integration Hub | 8 connected services |

```bash
cd services/REZ-SalesMind
node src/index.js
# API: http://localhost:5170
```

### Revenue Intelligence OS (Port 5400)

**Revenue analytics and forecasting.**

| Module | Description |
|--------|-------------|
| Revenue Hub | Revenue aggregation |
| Demand Intelligence | Forecasting |
| Pricing Intelligence | Dynamic pricing |
| Promotion Management | Campaign ROI |
| Cohort Analysis | LTV prediction |
| Revenue Digital Twin | Scenario simulation |

### Experimentation OS (Port 5277)

**A/B testing and feature flags.**

| Feature | Description |
|--------|-------------|
| Feature Flags | Toggle, rollouts |
| A/B Testing | Multi-variant |
| Canary Deployments | Gradual rollouts |
| AI Experiment Design | Hypothesis creation |

---

## 🎨 HOJAI Studio

### Services

| Service | Path | Purpose |
|---------|------|---------|
| AI Studio API | `platform/ai-studio/ai-studio-api/` | Backend API |
| Studio Projects | `platform/ai-studio/studio-projects/` | Project management |
| Studio RAG | `platform/ai-studio/studio-rag/` | Knowledge retrieval |
| Studio Playground | `platform/ai-studio/studio-playground/` | LLM testing |
| Studio Workflow | `platform/ai-studio/studio-workflow/` | Workflow design |
| Studio Twin | `platform/ai-studio/studio-twin/` | Twin integration |

### Visual Builder (Port 4600) ✅ COMPLETE

**Drag-drop workflow canvas with React UI.**

```bash
# Start API server
cd foundry/services/visual-builder
npm start

# Start React UI
cd ui && npm install && npm run dev
# Opens: http://localhost:5173
```

**Features:**
- 12 node types (Trigger, Memory, Twin, AI Agent, Intelligence, SUTAR, Condition, Action, Human, Integration, Notification, CRM)
- Undo/redo with 50-state history
- Zoom/pan controls
- Node palette + properties panel
- Export workflows as JSON templates
- 54 vitest tests passing

**SDK:** `@hojai/visual-builder-sdk`

---

## 📚 Workflow Templates (100+)

**Located at `platform/hojai-templates/`**

| Category | Count | Examples |
|----------|-------|----------|
| Sales | 15 | Lead qualification, proposal gen |
| Marketing | 12 | Content calendar, SEO automation |
| Support | 6 | Ticket classifier, AI response |
| HR | 10 | Onboarding, resume screening |
| Finance | 4 | Invoice processing |
| Founder | 10 | Daily briefing, decision journal |
| Restaurant | 10 | Order-to-kitchen, loyalty |
| Healthcare | 5 | Appointment reminders |
| Real Estate | 5 | Lead capture, site visits |
| Commerce | 10 | Purchase requests, supplier discovery |

### Template Schema

```json
{
  "id": "sales-lead-qualification",
  "name": "Lead Qualification Pipeline",
  "category": "sales",
  "triggers": [{ "type": "webhook", "event": "lead.created" }],
  "nodes": [
    { "type": "trigger", "name": "Lead Created" },
    { "type": "enrichment", "name": "Enrich Data" },
    { "type": "ai_agent", "agent": "sdr_agent" },
    { "type": "condition", "name": "Score Check" },
    { "type": "action", "name": "Route to SDR" },
    { "type": "crm", "name": "Update CRM" }
  ],
  "agents": ["sdr_agent"],
  "twins": ["lead_twin"],
  "memory": ["lead_history"]
}
```

---

## 🔧 Skill System (Port 4806)

**Atomic skills that compose into employees.**

```typescript
// Skill Library at platform/agent-os/skill-library/
import { SkillLibrary } from './index';

const library = new SkillLibrary();

// Create skill
const skill = library.createSkill({
  name: 'qualify_lead',
  tools: ['crm', 'enrichment_api'],
  skills: [],
  input: { customer_data: { type: 'object', required: true } },
  output: { score: { type: 'number' }, grade: { type: 'string' } }
});

// List skills
const skills = library.listSkills({ category: 'sales' });
```

---

## 🏢 Department Packs

**Complete AI departments at `platform/company-os/department-packs/`**

| Department | Services | Agents |
|------------|----------|--------|
| Sales | 15 | 22 |
| Marketing | 13 | 15 |
| HR | 11 | 10 |
| Finance | 6 | 1 |
| Operations | 20 | 23 |
| Support | 8 | 6 |

---

## 💰 Creator Economy (Port 4514) ✅ NEW

**Partner ecosystem with revenue sharing.**

```bash
cd platform/company-os/creator-economy
npm start
# Opens: http://localhost:4514
```

**Features:**
- Partner tiers (Bronze → Platinum)
- Revenue sharing (20% company creation, 10% subscription, 2% transaction)
- Payout requests with validation
- Bank transfer & UPI support
- Webhook notifications
- 26 vitest tests passing

**SDK:** `@hojai/creator-economy-sdk`

---

## 🌐 Connectors (35+)

**At `platform/connectors/`**

| Category | Connectors |
|----------|-----------|
| CRM | Salesforce, HubSpot, Zoho, Freshdesk |
| Commerce | Shopify, Stripe |
| Communication | Gmail, Slack, Teams, WhatsApp, Twilio |
| Productivity | Notion, Jira, Linear, Asana |
| ERP | SAP, Oracle, QuickBooks, Workday |
| DevOps | GitHub |

---

## 📦 SDKs (38+)

**At `sdk/`**

| SDK | Purpose |
|-----|---------|
| `@hojai/cli` | CLI tool |
| `@hojai/core-sdk` | Core runtime |
| `@hojai/memory-sdk` | Memory services |
| `@hojai/agentos` | Agent management |
| `@hojai/twin` | Digital twins |
| `@hojai/sutar` | SUTAR commerce |
| `@hojai/skills` | Skills library |
| `@hojai/skillos` | Skill orchestration |
| `@hojai/visual-builder-sdk` | Workflow builder |
| `@hojai/creator-economy-sdk` | Partner ecosystem |

---

## 🛠️ Developer Tools

### CLI

```bash
# Install
npm install -g @hojai/cli

# Commands
hojai init                    # Create project
hojai config set --api-key xxx  # Configure
hojai whoami                  # Verify
hojai listings search         # Search marketplace
hojai memory capture         # Capture memory
hojai deploy                  # Deploy
```

---

## 📂 Directory Structure

```
companies/HOJAI-AI/
├── platform/
│   ├── agent-os/           # Agent lifecycle (12 services)
│   ├── agents/             # AI agents (7 agents)
│   ├── ai-studio/          # Studio services (8)
│   ├── company-os/          # Company OS (18 services)
│   │   ├── department-packs/   # 6 departments
│   │   ├── learning-os/       # Collective intel
│   │   ├── governance-os/      # Policies
│   │   └── creator-economy/   # Creator hub
│   ├── flow/               # Flow engine (15 services)
│   │   ├── flow-orchestrator/
│   │   ├── simulation-os/      # What-if scenarios
│   │   ├── decision-engine/
│   │   └── loop-os/            # 22 services
│   ├── internet-os/        # 🌐 Web intelligence
│   │   ├── actor-runtime/      # 6,561 LOC
│   │   ├── watcher-runtime/   # 8,071 LOC
│   │   └── actors/             # 7 actors
│   ├── memory/            # Memory (10 services)
│   ├── twins/             # Digital twins (86+)
│   ├── trust/             # TrustOS (10 services)
│   ├── voice/             # VoiceOS (10 services)
│   ├── behavior/          # BehaviorOS
│   ├── compliance-os/     # Compliance
│   ├── connectors/         # 35+ connectors
│   └── observability/     # Observability
├── products/
│   ├── brandpulse/        # Brand intelligence
│   ├── genie/              # Genie AI (14 services)
│   ├── voice-os/          # VoiceOS
│   ├── copilots/          # AI copilots
│   └── [50+ more products]
├── foundry/
│   ├── services/           # 70+ foundry services
│   │   ├── template-marketplace/
│   │   ├── workflow-builder/
│   │   ├── visual-builder/    # ✅ Complete (React UI)
│   │   └── connector-os/
│   └── starters/          # 15 industry starters
├── sdk/                    # 38+ SDK packages
├── blr-ai-marketplace/    # 1,200+ catalog items
└── divisions/             # 12 divisions
```

---

## 🔗 External Integrations

### RTMN Hub (Port 4399)

All services wired through the unified hub:

```bash
curl http://localhost:4399/api/services
curl http://localhost:4399/health
```

### Connected Ecosystems

| Ecosystem | Services | Purpose |
|-----------|----------|---------|
| RTMN Hub | 4399 | Unified gateway |
| Nexha | 14 services | Autonomous network |
| SUTAR OS | 37 services | Commerce layer |
| Industry OS | 50+ | Vertical solutions |

---

## 📊 Statistics

| Metric | Count |
|--------|-------|
| Total Services | 500+ |
| AI Agents | 47+ |
| Digital Twins | 86+ |
| Memory Services | 30+ |
| SUTAR Services | 37 |
| Connectors | 35+ |
| Workflow Templates | 100+ |
| SDK Packages | 38+ |
| Web Actors | 7 |

---

## 🚀 Startup Commands

```bash
# Full dev stack
bash scripts/dev-stack.sh start

# Individual starts
cd platform/internet-os/actor-runtime && npm start
cd products/brandpulse && npm start
cd services/REZ-SalesMind && node src/index.js

# All ports
# 4399 - RTMN Hub
# 4595 - InternetOS
# 4770 - BrandPulse
# 4806 - Skill Library
# 5055 - Sales OS
# 5077 - Workforce OS
# 5170 - REZ-SalesMind
# 5400 - Revenue Intelligence
# 5500 - Marketing OS
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| CLAUDE.md | This file |
| docs/MEMORY-LAYER.md | MemoryOS (30+ services) |
| docs/TWINOS.md | TwinOS (86+ twins) |
| docs/SUTAR-OS.md | SUTAR commerce |
| docs/INTERNETOS.md | Web intelligence |
| docs/BLACKPULSE.md | Brand intelligence |

---

## 🔄 Git Workflow

```bash
# Always use main branch
git checkout main
git add -A
git commit -m "feat: Add feature"
git push origin main

# Update RTMN submodule
cd ../RTMN
git add companies/HOJAI-AI
git commit -m "chore: Update HOJAI-AI"
git push origin main
```

---

*Last Updated: June 30, 2026*
