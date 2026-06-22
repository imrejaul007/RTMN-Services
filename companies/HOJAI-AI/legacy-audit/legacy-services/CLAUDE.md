# CLAUDE.md - HOJAI AI

## Project Overview

**Name:** HOJAI AI
**Type:** AI Infrastructure Company
**Purpose:** Build AI Operating Systems for organizations and individuals
**GitHub:** github.com/imrejaul007/hojai-ai

HOJAI AI powers the entire RTNM ecosystem (16 companies, 615+ services) while also selling AI capabilities externally.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Language | TypeScript |
| Database | MongoDB |
| Cache | Redis |
| Container | Docker |
| Orchestration | Kubernetes |

## Project Structure

```
hojai-ai/
├── services/
│   ├── hojai-shared/             # Shared clients
│   ├── hojai-business-copilot/   # ✅ NEW - Unified Business Copilot (Port 4600)
│   ├── hojai-product-intelligence/ # ✅ NEW - Product Intelligence (Port 4755)
│   ├── hojai-competitive-intelligence/ # ✅ NEW - Competitive Intel (Port 4756)
│   ├── hojai-revenue-intelligence/  # ✅ NEW - Revenue Intel (Port 4757)
│   ├── hojai-founder-os/         # ✅ NEW - FounderOS (Port 4260)
│   ├── hojai-meeting-intelligence/ # ✅ NEW - Meeting Intel (Port 4700)
│   ├── hojai-goal-os/            # ✅ NEW - GoalOS (Port 4242)
│   ├── genie-project-service/    # Project & task execution
│   └── ...
├── hojai-sutar-os/
│   ├── services/
│   │   ├── sutar-flow-os/       # ✅ NEW - FlowOS (Port 4244)
│   │   └── ... (25 SUTAR services)
│   └── src/
│       └── integration-hub.ts
├── packages/
│   ├── hojai-board/             # AI C-Suite (CEO/CFO/COO/CMO/CTO/CHRO/CLO)
│   ├── hojai-twin/              # Digital Twins (Employee/Customer/Company/Merchant)
│   ├── hojai-workforce/         # AI Employee Marketplace
│   ├── hojai-graph/             # ✅ ENRICHED - Knowledge Graph (31 entities, 27 relationships)
│   └── ...
├── products/
│   └── hojai-command-center/    # ✅ NEW - Executive Dashboard (Port 4801, Next.js)
├── employees/                   # 200+ AI employees
├── industry-ai/                # 15 industry verticals
├── RAZO-Keyboard/
├── docs/
│   └── hojai-ai/
├── CLAUDE.md                    # This file
├── README.md
└── docker-compose.integration.yml
```

## Integration Points

### RABTUL Services (Core Infrastructure)

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Payment processing |
| RABTUL Wallet | 4004 | Balance management |
| RABTUL Notification | 4005 | Push/email/SMS notifications |

### REZ Services

| Service | Port | Integration |
|---------|------|-------------|
| REZ Identity Hub | 6000 | Pre-call research, 25 data sources |
| REZ Intelligence | 4200 | Intent prediction |
| REZ Consumer | - | Rider app |
| REZ Merchant | - | Merchant platform |

### HOJAI Services

| Service | Port | Integration |
|---------|------|-------------|
| SkillNet | 5120-5140 | Skill marketplace, execution |
| BrandPulse | 4770 | Brand intelligence |
| Genie Voice | 4760 | Voice AI |
| ExpertOS | 4550 | Agent runtime |

## HOJAI CoPilot - Business Intelligence Platform ✅ NEW!

**Tagline:** "Every Company Fully Understood."
**Status:** ALL 16 PRODUCT GROUPS BUILT | 21/21 SERVICES RUNNING | June 14, 2026 🎉

### Architecture

HOJAI CoPilot connects Memory, Twins, Knowledge Graphs, Agents, Workflows, and Executive Decision Intelligence into a unified business brain.

### 16 Product Groups

| # | Product Group | Service | Port | Status |
|---|--------------|---------|------|--------|
| 1 | Company Intelligence | hojai-graph | 4810 | ✅ |
| 2 | Executive AI Suite | hojai-board | 4870 | ✅ |
| 3 | Company Twin | hojai-twin | 4860 | ✅ |
| 4 | Decision Intelligence | hojai-board | 4870 | ✅ |
| 5 | GoalOS | hojai-goal-os | 4242 | ✅ NEW |
| 6 | Project Intelligence | genie-project-service | 4708 | ✅ |
| 7 | Meeting Intelligence | hojai-meeting-intelligence | 4700 | ✅ NEW |
| 8 | Workforce Intelligence | hojai-workforce | 4820 | ✅ |
| 9 | Customer Intelligence | hojai-customer-intelligence | 4752 | ✅ |
| 10 | Product Intelligence | hojai-product-intelligence | 4755 | ✅ NEW |
| 11 | Competitive Intelligence | hojai-competitive-intelligence | 4756 | ✅ NEW |
| 12 | Revenue Intelligence | hojai-revenue-intelligence | 4757 | ✅ NEW |
| 13 | FounderOS | hojai-founder-os | 4260 | ✅ NEW |
| 14 | Agent Workforce | hojai-agent-marketplace | 4580 | ✅ |
| 15 | Workflow Intelligence | sutar-flow-os | 4244 | ✅ NEW |
| 16 | Executive Command Center | hojai-command-center | 4801 | ✅ NEW |

### Business Copilot - Unified Gateway (Port 4600)

**hojai-business-copilot** provides 7 unified interfaces:

| Interface | Backing Service | Port | Routes |
|-----------|----------------|------|--------|
| Memory | hojai-memory | 4520 | Context, Search, Timeline |
| Twin | hojai-twin | 4860 | Employee/Customer/Company/Merchant Twin |
| Intelligence | hojai-graph + hojai-intelligence | 4810 + 4530 | Graph queries, Entity extraction, ML predictions |
| Agent | hojai-expert-os | 4550 | Agent invocation, Smart routing |
| Workflow | sutar-flow-os | 4244 | Flow execution, Triggers |
| Execution | genie-project-service | 4708 | Tasks, Projects, Dashboard, Audit |
| Simulation | sutar-simulation-os | 4241 | What-If, Monte Carlo, Forecasting, Risk, Compliance |

**Central Query Router:**
```
POST /api/query
Body: { query: "What is our biggest revenue risk?" }
→ Intent classification → Routes to appropriate interfaces → Synthesizes response
```

### Command Center Dashboard (Port 4801)

Next.js dashboard with 12 pages:
- `/` Executive Command Center
- `/revenue` Revenue Intelligence
- `/customers` Customer 360
- `/products` Product Hub
- `/projects` Project Hub
- `/team` Workforce Dashboard
- `/goals` GoalOS
- `/meetings` Meeting Hub
- `/competitors` Competitive Intelligence
- `/decisions` Decision Center
- `/agents` Agent Workforce
- `/workflows` Workflow Hub

### Pre-built What-If Scenarios (15)

| Category | Scenarios |
|----------|-----------|
| Revenue Drop | -10%, -20%, -30% |
| Revenue Growth | +10%, +20%, +50% |
| Hiring | 10, 50, 100 people |
| CAC Increase | +10%, +25%, +50% |
| Market Expansion | Dubai, UK, US |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 3000 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing |
| REDIS_URL | No | localhost:6379 | Redis |
| RABTUL_AUTH_URL | Yes | localhost:4002 | RABTUL Auth |
| RABTUL_PAYMENT_URL | Yes | localhost:4001 | RABTUL Payment |
| RABTUL_WALLET_URL | Yes | localhost:4004 | RABTUL Wallet |
| RABTUL_NOTIFICATION_URL | Yes | localhost:4005 | RABTUL Notification |
| REZ_IDENTITY_URL | Yes | localhost:6000 | REZ Identity Hub |
| SKILLNET_URL | Yes | localhost:5130 | SkillNet |
| INTELLIGENCE_URL | Yes | localhost:5130 | Intelligence Engine |
| RUNTIME_URL | Yes | localhost:5120 | Runtime Cloud |
| BRANDPULSE_URL | No | localhost:4770 | BrandPulse |
| GENIE_VOICE_URL | No | localhost:4760 | Genie Voice |

### CoPilot Backing Services (for Business Copilot Gateway)

| Variable | Default | Description |
|----------|---------|-------------|
| MEMORY_SERVICE_URL | localhost:4520 | hojai-memory |
| TWIN_SERVICE_URL | localhost:4860 | hojai-twin |
| GRAPH_SERVICE_URL | localhost:4810 | hojai-graph |
| INTELLIGENCE_SERVICE_URL | localhost:4530 | hojai-intelligence |
| EXPERT_OS_URL | localhost:4550 | hojai-expert-os |
| FLOW_OS_URL | localhost:4244 | sutar-flow-os |
| PROJECT_SERVICE_URL | localhost:4708 | genie-project-service |
| SIMULATION_OS_URL | localhost:4241 | sutar-simulation-os |

### Industry AI URLs

| Variable | Default | Description |
|----------|---------|-------------|
| INDUSTRY_HEALTHCARE_URL | localhost:3001 | Healthcare AI |
| INDUSTRY_LEGAL_URL | localhost:3002 | Legal AI |
| INDUSTRY_FINANCE_URL | localhost:3003 | Finance AI |
| INDUSTRY_RE_URL | localhost:3004 | Real Estate AI |
| INDUSTRY_HOSPITALITY_URL | localhost:3005 | Hospitality AI |
| INDUSTRY_RESTAURANT_URL | localhost:3006 | Restaurant AI |
| INDUSTRY_FLEET_URL | localhost:3007 | Fleet AI |
| INDUSTRY_EDUCATION_URL | localhost:3008 | Education AI |

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run tests |
| `docker-compose -f docker-compose.integration.yml up -d` | Start all services |

### CoPilot Quick Start

```bash
# Business Copilot Gateway (Port 4600)
cd services/hojai-business-copilot && npm install && npm run dev

# Command Center Dashboard (Port 4801)
cd products/hojai-command-center && npm install && npm run dev

# Individual CoPilot Services
cd services/hojai-product-intelligence && npm run dev
cd services/hojai-competitive-intelligence && npm run dev
cd services/hojai-goal-os && npm run dev
cd services/hojai-meeting-intelligence && npm run dev
cd services/hojai-revenue-intelligence && npm run dev
cd services/hojai-founder-os && npm run dev
cd hojai-sutar-os/services/sutar-flow-os && npm run dev
```

## Architecture

### SUTAR OS - 26 Services (100,000+ Lines)

**Status:** ✅ 10/10 COMPLETE

| Layer | Service | Port | Lines | Features |
|-------|---------|------|-------|----------|
| 3 | GoalOS | 4242 | 3,402 | Decomposition, OKR, milestones |
| 4 | Decision Engine | 4240 | 1,946 | Policy, risk, PROCEED/HOLD/REJECT |
| 5 | SimulationOS | 4241 | 2,933 | Monte Carlo, 14 types |
| 6 | Agent Network | 4155 | 6,778 | Registry, matching, teams |
| 7 | Negotiation | 4191 | 523 | RFQ, quotes, counter |
| 8 | Trust Engine | 4180 | 1,977 | Scoring, KYC, credit |
| 9 | Contract OS | 4190 | 5,913 | Contracts, signatures |
| 10 | Economy OS | 4251 | 7,618 | Karma, transactions |
| 11 | Marketplace | 4250 | 6,478 | Catalog, orders |
| 12 | Learning | 4243 | 6,719 | Patterns, recommendations |
| - | Intent Bus | 4154 | 6,838 | Capture, routing |
| - | Gateway | 4140 | 6,790 | Routing, auth |
| - | Memory Bridge | 4143 | 4,321 | Vector storage |
| - | Identity OS | 4147 | 2,349 | KYC, credentials |
| - | Agent ID | 4146 | 6,028 | Registration, verification |
| - | Discovery | 4256 | 1,642 | Search, matching |
| - | Exploration | 4255 | 3,798 | Market scanning |
| - | Policy OS | 4254 | 1,259 | Policy enforcement |
| - | Twin OS | 4142 | 1,226 | Digital twins |
| - | Monitoring | 3100 | 1,293 | Health, metrics |
| - | Usage Tracker | 4253 | 1,289 | Usage, quotas |
| - | ROI Calculator | - | 2,766 | ROI, cost-benefit |
| - | Reputation | - | 2,784 | Reviews, sentiment |
| - | Multi-Agent | - | 2,935 | Evaluation, consensus |
| - | Flow OS | 4244 | 3,521 | Workflow orchestration |

**SimulationOS Types:** DEMAND, CASHFLOW, REVENUE, COST, PRICING, OFFER, CASHBACK, BUNDLE, RISK, COMPLIANCE, STAFFING, INVENTORY, PROCUREMENT, CUSTOM

**Decision Types:** OFFER, CASHBACK, PERSONALIZATION, ROUTING, FRAUD, PRICING, NEXT_ACTION, RETENTION, APPROVAL, RISK

### SUTAR OS Integration Hub

Central hub connecting all RTNM services:

```typescript
import { sutarHub } from './integration-hub';

// Get complete user context
const context = await sutarHub.prepareContext(userId, query);

// Process with industry expertise
const result = await sutarHub.processWithIndustryExpertise(
  userId, 
  query, 
  'healthcare'
);

// Execute with payment
const payment = await sutarHub.executeWithPayment(userId, 'action', 100);
```

### Genie Integration

Personal AI with industry expertise:

```typescript
import { genieIntegration } from './genie-integration';

// Process voice command
const result = await genieIntegration.processCommand(
  "Hey Genie, help with legal contract",
  userId
);
```

### CoPilot Integration

Keyboard AI with Genie:

```typescript
import { copilotIntegration } from './copilot-integration';

// Process keyboard input
const result = await copilotIntegration.processKeyboardInput(
  "Hey Genie, draft email to client",
  userId
);
```

### Business Copilot Integration

Unified business intelligence gateway:

```typescript
// Access all 7 interfaces from one service
import fetch from 'node-fetch';

// Memory
const memory = await fetch('http://localhost:4600/api/memory/context?entityType=company&entityId=xxx');

// Twin
const twin = await fetch('http://localhost:4600/api/twin/company/xxx');

// Intelligence
const intel = await fetch('http://localhost:4600/api/intelligence/query', {
  method: 'POST',
  body: JSON.stringify({ query: 'What is our biggest risk?' })
});

// Agent
const agent = await fetch('http://localhost:4600/api/agent/list');

// Workflow
const workflow = await fetch('http://localhost:4600/api/workflow/list');

// Simulation (What-If)
const simulation = await fetch('http://localhost:4600/api/simulate/scenarios/revenue-drop-20');

// Natural Language Query
const result = await fetch('http://localhost:4600/api/query', {
  method: 'POST',
  body: JSON.stringify({ query: 'Show me our Q3 revenue performance' })
});
```

## Shared Clients

All services use shared clients from `hojai-shared`:

```typescript
import { rabtul, rezIdentity, skillnet, industryAI } from './clients';

// RABTUL
await rabtul.verifyToken(token);
await rabtul.processPayment(data);
await rabtul.getBalance(userId);
await rabtul.sendNotification(data);

// REZ Identity
await rezIdentity.getUserProfile(userId);
await rezIdentity.getPreCallResearch(userId);
await rezIdentity.get360View(userId);

// SkillNet
await skillnet.getSkills();
await skillnet.executeGoal(goal, context);
await skillnet.runSkill(skillId, input);

// Industry AI
await industryAI.analyze('healthcare', data);
await industryAI.getIndustryContext('legal');
```

## Health Endpoints

All services implement:

| Endpoint | Purpose |
|----------|---------|
| GET /health | Full health check |
| GET /health/live | Kubernetes liveness |
| GET /health/ready | Kubernetes readiness |

## Security

- [x] JWT authentication required
- [x] CORS whitelist configured
- [x] Rate limiting enabled
- [x] Request body size limits
- [x] Helmet security headers
- [x] No hardcoded secrets
- [x] Tenant isolation on all schemas
- [x] Input validation (Zod)
- [x] Graceful shutdown handlers

## Deployment

### Docker Compose

```bash
docker-compose -f docker-compose.integration.yml up -d
```

### Kubernetes

```bash
kubectl apply -f k8s/
```

### Cloud

| Platform | Status |
|----------|--------|
| GCP Cloud Run | ✅ Ready |
| AWS ECS | ✅ Ready |
| Azure | ✅ Ready |

## Port Registry

| Range | Service |
|-------|---------|
| 3000-3099 | RABTUL Core |
| 4000-4099 | RABTUL Extended |
| 4100-4199 | SUTAR OS |
| 4180-4185 | HOJAI Compliance |
| 4500-4610 | HOJAI Core |
| 3053 | hib-code-intelligence |
| 3054 | hib-soar |
| 4241 | sutar-simulation-os |
| 4242 | hojai-goal-os |
| 4244 | sutar-flow-os |
| 4260 | hojai-founder-os |
| 4520 | hojai-memory |
| 4530 | hojai-skillnet (combined) |
| 4580 | hojai-agent-marketplace |
| 4600 | hojai-business-copilot | Business Copilot (Unified Gateway) |
| 4700 | hojai-meeting-intelligence |
| 4707 | genie-sync-service |
| 4708 | genie-project-service |
| 4752 | hojai-customer-intelligence |
| 4755 | hojai-product-intelligence |
| 4756 | hojai-competitive-intelligence |
| 4757 | hojai-revenue-intelligence |
| 4801 | hojai-command-center |
| 4810 | hojai-graph |
| 4820 | hojai-workforce |
| 4860 | hojai-twin |
| 4870 | hojai-board |
| 4700-4799 | GENIE / RisaCare |
| 4750-4754 | HOJAI Intelligence |
| 4850-4899 | HOJAI VoiceOS |

## Unit Tests (333+ passing)

| Service | Tests | Status |
|---------|-------|--------|
| hojai-expert-os | 30 | ✅ |
| hib-code-intelligence | 40+ | ✅ |
| hib-soar | 15 | ✅ |
| genie-sync-service | 10 | ✅ |
| hojai-industry | 30 | ✅ |
| fitness-ai | 33 | ✅ |
| legal-ai | 24 | ✅ |
| crm | 18 | ✅ |
| **hojai-skillnet** | **133** | ✅ |
| **Total** | **333+** | ✅ |

### HOJAI SkillNet Unit Tests (133 passing)

| Test File | Tests | Status |
|-----------|-------|--------|
| auth.test.ts | 13 | ✅ JWT authentication |
| config.test.ts | 14 | ✅ Environment validation |
| sanitize.test.ts | 19 | ✅ Input sanitization |
| tenant.test.ts | 13 | ✅ Tenant middleware |
| shutdown.test.ts | 6 | ✅ Graceful shutdown |
| cache.test.ts | 17 | ✅ Redis caching |
| validation.test.ts | 22 | ✅ Input validation |
| entity.test.ts | 13 | ✅ Entity types |
| error.test.ts | 22 | ✅ Error handling |
| response.test.ts | 20 | ✅ Response format |

### Running Tests

```bash
# Run all tests
npm test

# Run specific service tests
cd hojai-industry && npx vitest run
cd industry-ai/fitness-ai && npx vitest run
cd industry-ai/legal-ai && npx vitest run
cd industry-ai/crm && npx vitest run

# Run HOJAI SkillNet tests
cd hojai-skillnet && npm test
```

---

## HOJAI Core Packages (14 Built - June 2026)

| Package | Port | Purpose |
|---------|------|---------|
| hojai-api-gateway | 4500 | Service registry, routing |
| hojai-event | 4510 | Event bus, pub/sub |
| hojai-memory | 4511 | Personal memory |
| hojai-communications | 4520 | Multi-channel messaging |
| hojai-agents | 4550 | Agent runtime |
| hojai-intelligence | 4580 | ML predictions |
| hojai-hyperlocal | 4590 | Geo intelligence |
| hojai-identity | 4610 | Identity management |
| hojai-governance | 4620 | Audit, policies |
| hojai-workflow | 4810 | Workflow engine |
| hojai-industry | 4700 | Industry patterns |
| hojai-analytics | 4750 | Metrics, reporting |
| hojai-data | 4755 | Datasets |
| hojai-ml | 4760 | ML pipeline |

## Genie Ecosystem (11 Built - June 2026)

| Service | Port | Purpose |
|---------|------|---------|
| genie-personal-os-gateway | 4702 | Unified API |
| genie-memory-service | 4703 | Personal memory |
| genie-relationship-service | 4704 | Relationships |
| genie-briefing-service | 4706 | Daily briefings |
| genie-sync-service | 4707 | Cross-device sync |
| genie-project-service | 4712 | Projects |
| genie-memory-review-service | 4710 | Memory review |
| genie-browser-history-service | 4715 | Browsing patterns |
| genie-household-service | 4720 | Households |
| genie-privacy-service | 4716 | Privacy controls |
| genie-business-intelligence | 4725 | Business insights |

## HIB Services

| Service | Port | Features |
|---------|------|----------|
| hib-code-intelligence | 3053 | Code analysis, bug detection, security scanning |
| hib-soar | 3054 | Security playbooks, incident management |

## Main Services

| Service | Port | Features |
|---------|------|----------|
| hojai-expert-os | 4550 | Agent runtime, skills, expert twins |
| workflow-bridge | 4800 | Agent<->Workflow bidirectional bridge |
| hojai-clinic-ai | 3000 | Healthcare AI, patient management |
| hojai-voice-platform | 4850 | Voice AI, STT/TTS |
| brandpulse | 4770 | Brand intelligence, sentiment |

## Deployment

```bash
# Deploy all services
cd companies/hojai-ai
docker-compose up -d

# Individual service
cd <service> && npm start
```

*Updated: June 14, 2026*


## Industry AI Services

### HOJAI Industry Intelligence (Port 4700)

Privacy-preserving industry intelligence platform with 3-layer architecture:
- Layer 1: Tenant Learning (Private)
- Layer 2: Industry Learning (Anonymous)
- Layer 3: Global Learning (Platform)

**Supported Industries:** Jewellery, Healthcare, Hospitality, Retail, Education, Finance, Real Estate

### Industry AI Vertical Templates (35 services)

| Service | Industry | Status | Tests | Lines |
|---------|----------|--------|-------|-------|
| **fitness-ai** | Fitness | ✅ **10/10 COMPLETE** | 53 | 700+ |
| legal-ai | Legal | ⚠️ Template | 24 | 56 |
| crm | CRM | ⚠️ Partial | 18 | 727 |
| salon-ai | Commerce | ⚠️ Template | 0 | - |
| retail-ai | Commerce | ⚠️ Template | 0 | - |
| pharmacy-ai | Healthcare | ⚠️ Template | 0 | - |
| carecode | Healthcare | ⚠️ Template | 0 | - |
| + 30 more | Various | ⚠️ Templates | - | - |

### GlamAI - Salon Intelligence OS (Port 3000) - **10/10 COMPLETE**

**Location:** `industry-ai/glamai/`
**Tagline:** "The brain that makes the salon know you better than you know yourself."
**Status:** ✅ **10/10 PRODUCTION READY**
**Tests:** ✅ **168 tests passing**
**Lines:** ✅ **3,300+ lines of code**

GlamAI is the unified AI orchestration layer for salon operations:

#### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GLAMAI (Port 3000)                              │
│                         Salon Intelligence OS                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        SERVICES LAYER                                │   │
│  │  BeautyMemory │ ServicePlan │ Stylist │ Customer │ Inventory        │   │
│  │  Recommendation │ BeautyGenie │ TrainingAcademy                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        BRIDGES LAYER                                 │   │
│  │  SalonBridge │ MindSalon │ Genie │ Nexha │ Twin │ Notification      │   │
│  │  Sutar │ AssetMind                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Services Built

| Service | Purpose |
|---------|---------|
| **BeautyMemoryService** | Beauty-specific memory (hair color, notes, reactions) |
| **ServicePlanService** | AI service plan generation |
| **CustomerService** | Unified customer intelligence |
| **StylistService** | Stylist-facing APIs |
| **InventoryService** | Inventory intelligence |
| **RecommendationService** | Personalized recommendations |
| **BeautyGenieService** | Beauty-specific Genie |
| **TrainingAcademyService** | Stylist certification |

#### Bridges

| Bridge | Connects To | Purpose |
|--------|-------------|---------|
| **SalonBridge** | REZ Salon CRM (4903), Booking (4201), POS (4902), Inventory (4906) | Data sync |
| **MindSalonBridge** | REZ Mind Salon AI (4010) | AI recommendations |
| **GenieBridge** | Genie Memory (4703), Genie Briefing (4704) | Personal AI |
| **NexhaBridge** | Nexha (5000) | Supplier/procurement |
| **TwinBridge** | TwinOS Hub (4142), CorpID (4702) | Digital twins |
| **NotificationBridge** | RABTUL Notification, WhatsApp | Follow-ups |
| **SutarBridge** | SUTAR GoalOS (4242) | Expansion goals |
| **AssetMindBridge** | AssetMind (5001) | Wealth analytics |

#### Integration Flow - Story Moments

| Time | Story | Integration |
|------|-------|-------------|
| 7:00 AM | Beauty Twin predictions | TwinBridge → TwinOS Hub |
| 8:00 AM | Genie briefing | GenieBridge → Genie Memory |
| 10:00 AM | Sarah books | SalonBridge → Booking |
| 11:00 AM | QR check-in | REZ Salon Bridge → GlamAI |
| 11:05 AM | Stylist sees profile | SalonBridge → GlamAI |
| 11:15 AM | AI service plan | MindSalonBridge → REZ Mind Salon |
| 12:00 PM | Inventory alert | InventoryBridge → Nexha |
| 3:00 PM | Memory stores color | BeautyMemoryService → GenieBridge |
| 4:00 PM | Genie follows up | NotificationBridge → WhatsApp |
| 6:00 PM | Expansion | SutarBridge → SUTAR GoalOS |
| 8:00 PM | Wealth tracking | AssetMindBridge → AssetMind |

#### Service Features

**BeautyMemoryService:**
- Hair color formulas (color, brand, developer, processing time)
- Stylist notes (treatment, preference, allergy, concern, general)
- Product reactions (loved, liked, neutral, disliked, allergic)
- Allergy and sensitivity tracking

**ServicePlanService:**
- Overdue service detection (haircut >28 days, color >21 days)
- Seasonal recommendations (wedding, monsoon, festive)
- Beauty profile-based recommendations

**CustomerService:**
- Unified customer intelligence
- Customer tier (new, regular, vip, at-risk, churned)
- Churn risk assessment
- Lifetime value prediction

**TrainingAcademyService:**
- 7 courses (Hair Cutting, Hair Color, Skincare, etc.)
- Certification management
- Skill profiling

#### Salon AI Agents

| Agent | Port | Status |
|-------|------|--------|
| **Treatment Advisor** | 4813 | ✅ Built - Bundle suggestions, upsells |
| **Inventory Alert Agent** | 4814 | ✅ Built - Low stock alerts |
| Beauty Advisor | 4810 | ✅ Implemented |
| Appointment Manager | 4810 | ✅ Implemented |
| Campaign Manager | 4810 | ✅ Implemented |
| Retention Manager | 4810 | ✅ Implemented |

#### GlamAI Stylist Tablet App

**Location:** `industry-ai/glamai-stylist-app/`

React tablet app for stylists:
- Dashboard with today's appointments
- Customer view with beauty profile
- Add notes, record colors, track reactions

#### REZ Salon GlamAI Bridge (Port 4905)

**Location:** `REZ-Merchant/industry-os/salon-os/integrations/glamai-bridge/`

Bridge connecting REZ Salon ecosystem to GlamAI:
- Appointment sync
- Customer profile sync
- QR check-in sync
- Inventory alerts
- Hair color sync
- Beauty follow-ups

#### Running GlamAI

```bash
# 1. Start REZ Salon Services
cd REZ-Merchant/industry-os/salon-os/integrations/glamai-bridge
npm install && npm run dev  # Port 4905

# 2. Start GlamAI
cd industry-ai/glamai && npm install && npm run dev  # Port 3000

# 3. Start Treatment Advisor
cd industry-ai/salon-ai/employees/treatment-advisor && npm start  # Port 4813

# 4. Start Inventory Alert Agent
cd industry-ai/salon-ai/employees/inventory-alert-agent && npm start  # Port 4814

# 5. Start Stylist Tablet App
cd industry-ai/glamai-stylist-app && npm install && npm run dev
```

### REZ-Merchant Industry OS (2,474 files)

Full implementation covering:
- Restaurant OS (48 files)
- Hotel OS (47 files)
- Salon OS (35 files)
- Healthcare OS (45 files)
- Retail OS (13 files)
- Fitness OS (26 files)

## Status

- [x] Codebase exists
- [x] Documentation complete
- [x] Integration clients added
- [x] Production Dockerfiles
- [x] Health endpoints
- [x] Security fixes applied
- [x] 100% documentation coverage
- [x] 100% Docker support
- [x] All services connected
- [x] **CoPilot: All 16 Product Groups Built**
- [x] **CoPilot: Business Copilot Gateway (Port 4600)**
- [x] **CoPilot: Command Center Dashboard (Port 4801)**
- [x] **CoPilot: All Intelligence Services Built**
- [x] **HOJAI Industry AI Built (Port 4700)**
- [x] **HIB Code Intelligence Built (Port 3053)**
- [x] **HIB SOAR Built (Port 3054)**
- [x] **Genie Sync Service Built (Port 4707)**
- [x] **Industry AI Vertical Templates (35 services)**
- [x] **HOJAI SkillNet: 10/10 Production Ready**
- [x] **Unit Tests: 333+ passing**
- [x] **21/21 Services Running** (June 14, 2026) 🎉
- [x] **End-to-End Flow Verified**
- [x] **Business Copilot Gateway Operational (Port 4600)**
- [x] **Command Center Dashboard Live (Port 4801)**
- [x] **All Intelligence Services Operational**

## HOJAI SkillNet - 10/10 Production Ready

**Location:** `hojai-skillnet/`
**Build Status:** ✅ TypeScript compiled successfully
**Test Status:** ✅ 133 tests passing

### Build & Run

```bash
cd hojai-skillnet
npm install
npm run build    # TypeScript compilation
npm run dev      # Development mode
npm start        # Production
npm test         # Run tests
```

### HOJAI SkillNet Features

| Feature | Description | Status |
|---------|-------------|--------|
| ML Predictions | Churn, LTV, Intent Detection | ✅ |
| Recommendations | Product, Content, Action | ✅ |
| Event Bus | Pub/Sub, Subscriptions, Streams | ✅ |
| Insights | Segments, Trends, Anomalies | ✅ |
| Tenant Management | CRUD operations | ✅ |
| API Keys | Create, revoke | ✅ |
| MongoDB Persistence | All data persisted | ✅ |
| Graceful Shutdown | SIGTERM/SIGINT | ✅ |
| JWT Authentication | Bearer token auth | ✅ |
| XSS Sanitization | Input validation | ✅ |

### HOJAI SkillNet Environment Variables

| Variable | Required | Default |
|----------|----------|---------|
| PORT | No | 4530 |
| MONGODB_URI | Yes | mongodb://localhost:27017/hojai-skillnet |
| JWT_SECRET | Yes | (min 32 chars) |
| CORS_ORIGINS | No | - |
| NODE_ENV | No | development |

## Related Files

| File | Description |
|------|-------------|
| README.md | Quick start |
| COMPANIES-AUDIT.md | Complete companies audit |
| PRODUCTS-FEATURES-AUDIT.md | Products & features |
| INTEGRATION-AUDIT.md | Integration audit |
| DEPLOYMENT-GUIDE.md | Deployment instructions |
| MASTER-PRODUCTION-REPORT.md | Production status |
| HOJAI-HOLISTIC-ARCHITECTURE.md | Holistic architecture |

## CoPilot Documentation

| Document | Location |
|----------|----------|
| Business Copilot Gateway | services/hojai-business-copilot/CLAUDE.md |
| Product Intelligence | services/hojai-product-intelligence/CLAUDE.md |
| Competitive Intelligence | services/hojai-competitive-intelligence/CLAUDE.md |
| GoalOS | services/hojai-goal-os/CLAUDE.md |
| SimulationOS | hojai-sutar-os/services/sutar-simulation-os/CLAUDE.md |
| Meeting Intelligence | services/hojai-meeting-intelligence/CLAUDE.md |
| Revenue Intelligence | services/hojai-revenue-intelligence/CLAUDE.md |
| FounderOS | services/hojai-founder-os/CLAUDE.md |
| FlowOS | hojai-sutar-os/services/sutar-flow-os/CLAUDE.md |
| Command Center | products/hojai-command-center/CLAUDE.md |
| Knowledge Graph | packages/hojai-graph/CLAUDE.md |

---

**Last Updated:** June 14, 2026
**Version:** 2.1 (Industry AI + External Services)

---

# External Services - Connected Ecosystem

## LawGens - Legal AI Platform

**Location:** `companies/LawGens/`
**Status:** ✅ BUILT | **June 14, 2026**

### LawGens Services

| Service | Port | Description |
|---------|------|-------------|
| LawGens Services | 5100 | API Gateway |
| Contract OS | 4190 | Contract Lifecycle Engine |
| LawGens Web | 3001 | Next.js 14 Web App |
| RTMZ Forensic OS | 3000-5100 | Enterprise Intelligence |

### LawGens Core Features

| Category | Features |
|----------|----------|
| **Contract Analysis** | AI-powered contract review, clause extraction, risk identification |
| **Legal Research** | Case law search, precedent analysis, citation checking |
| **Compliance Management** | Auto compliance check, regulatory updates, audit trails |
| **Court Case Tracking** | Case management, deadlines, document management |
| **RTMZ Forensic OS** | Enterprise intelligence, forensic capabilities |

### LawGens Products

| Product | Purpose |
|---------|---------|
| LawGens Web | Consumer legal services |
| LawGens Biz | Business legal services |
| LawGens Pro | Professional legal tools |
| Contract OS | Contract lifecycle management |
| RTMZ Enterprise | Enterprise intelligence |

---

## REZ CRM - Retail CRM Service

**Location:** `companies/REZ-Merchant/rez-retail-crm-service/`
**Status:** ✅ BUILT

### REZ CRM Features

| Feature | Description |
|---------|-------------|
| Customer Management | CRUD operations, customer profiles |
| Interactions | Track all customer touchpoints |
| MongoDB Integration | Persistent storage |
| Health Endpoints | Service monitoring |

### Connected to Business Copilot

The REZ CRM is connected via the Business Copilot gateway (Port 4600) for unified access.

---

# HOJAI Genie AI - Personal Intelligence OS (ADDED June 13, 2026)

## Overview

**Tagline:** "You don't use Genie. You talk to Genie."

Genie is HOJAI AI's Personal Intelligence OS - 21 microservices for personal memory, relationships, briefings, messaging, and business insights.

## All Genie Services (21 Built)

### Core Services (6)

| Service | Port | Purpose |
|---------|------|---------|
| genie-personal-os-gateway | 4702 | API Orchestrator |
| genie-memory-service | 4703 | Personal memory |
| genie-relationship-service | 4704 | Relationships |
| genie-briefing-service | 4706 | Daily briefings |
| genie-meeting-service | 4713 | Meeting intelligence |
| genie-sync-service | 4707 | Cross-service sync |

### Communication Services (3)

| Service | Port | Purpose |
|---------|------|---------|
| genie-calendar-service | 4709 | Calendar aggregation |
| genie-email-service | 4710 | Email management |
| genie-voice-service | - | Voice (uses HOJAI-VOICE-PLATFORM) |

### Messaging Services (4)

| Service | Port | Purpose |
|---------|------|---------|
| genie-slack-service | 4711 | Slack integration |
| genie-telegram-service | 4712 | Telegram bot |
| genie-discord-service | 4716 | Discord integration |
| genie-whatsapp-service | 4717 | WhatsApp integration |

### Notetaking Services (2)

| Service | Port | Purpose |
|---------|------|---------|
| genie-obsidian-service | 4708 | Obsidian vault sync |
| genie-notion-service | 4719 | Notion integration |

### Intelligence Services (4)

| Service | Port | Purpose |
|---------|------|---------|
| genie-privacy-service | 4720 | Privacy controls |
| genie-project-service | 4721 | Project management |
| genie-household-service | 4722 | Household context |
| genie-memory-review-service | 4723 | Memory consolidation |

### Integration Services (2)

| Service | Port | Purpose |
|---------|------|---------|
| genie-browser-history-service | 4724 | Browser context |
| genie-drive-connector | 4726 | Google Drive |

### Business Intelligence (1)

| Service | Port | Purpose |
|---------|------|---------|
| genie-business-intelligence | 4725 | Business insights & NL queries |

## Key Features

### Memory Features
- Remember/Recall memories
- Preferences (food, cuisine, dietary)
- "Usual" order detection
- Booking patterns
- Timeline view
- Importance tiers (Critical→Low)

### Business Intelligence
- Natural language queries
- Sales analytics
- Customer insights
- Top items analysis
- Peak hours
- Report generation

### Voice (via HOJAI-VOICE-PLATFORM)
- STT/TTS via 4033
- Wake words: "Hey Genie" + Hindi
- 33+ languages

## Documentation

| Document | Location |
|----------|----------|
| Genie Status | `GENIE-SERVICES-STATUS.md` |
| Full Documentation | `GENIE-COMPLETE-DOCUMENTATION.md` |
| Features | `FEATURES.md` |
| Docker Compose | `docker/docker-compose.genie.yml` |

## Quick Start

```bash
# Start all Genie services
cd docker
docker-compose -f docker-compose.genie.yml up -d

# Start individual service
cd genie-memory-service
npm install
npm run dev
```

## Environment Variables

```bash
GENIE_MEMORY=http://localhost:4703
GENIE_RELATIONSHIP=http://localhost:4704
GENIE_BRIEFING=http://localhost:4706
GENIE_MEETING=http://localhost:4713
GENIE_GATEWAY=http://localhost:4702
GENIE_BUSINESS=http://localhost:4725
```

---

## RTMN Foundation Services Integration

**Location:** `services/` (root)  
**Status:** ✅ CONNECTED TO HOJAI AI

### Foundation Services Connected to HOJAI AI

| Foundation Service | Port | HOJAI Integration |
|--------------------|------|-------------------|
| **CorpID Service** | 4702 | User identity, trust scores, agent registration |
| **MemoryOS** | 4703 | Personal memory, context, preferences |
| **GoalOS** | 4242 | Business goals, targets |
| **Decision Engine** | 4240 | Authorization, risk assessment |
| **Agent Economy** | 4251 | Karma rewards, agent payments |

### HOJAI AI Services Using Foundation

| HOJAI Service | Foundation Service | Purpose |
|---------------|-------------------|---------|
| **Business Copilot** | MemoryOS | User context, conversation memory |
| **BOA Dashboard** | CorpID | User identity, trust scores |
| **SkillNet** | Agent Economy | Agent marketplace, karma |
| **BrandPulse** | Decision Engine | Brand authorization |
| **Genie** | MemoryOS | Personal AI memory |

### Foundation Services Summary

| Service | Port | Key Features |
|---------|------|--------------|
| **CorpID** | 4702 | 9 entity types, trust scores, relationships |
| **MemoryOS** | 4703 | 4 memory types, context, preferences |
| **GoalOS** | 4242 | Decomposition, progress propagation |
| **Decision Engine** | 4240 | Policy engine, holds, appeals |
| **Agent Economy** | 4251 | Karma, SLB, escrow, leaderboard |

### Running Foundation Services

```bash
# Start CorpID Service
cd services/corpid-service && npm install && npm start

# Start MemoryOS
cd services/memory-os && npm install && npm start

# Start GoalOS
cd services/goal-os && npm install && npm start

# Start Decision Engine
cd services/decision-engine && npm install && npm start

# Start Agent Economy
cd services/agent-economy && npm install && npm start
```

### HOJAI AI + Foundation Integration Examples

```javascript
// User trust check for AI assistant
const trustRes = await fetch('http://localhost:4702/api/trust/score/{userCorpId}');

// Store user preference
await fetch('http://localhost:4703/api/context/preferences', {
  method: 'POST',
  body: JSON.stringify({ corpId: userCorpId, key: 'theme', value: 'dark' })
});

// Create business goal
await fetch('http://localhost:4242/api/goals', {
  method: 'POST',
  body: JSON.stringify({ title: 'Increase sales 20%', ownerCorpId: businessCorpId, priority: 2 })
});

// Decision on agent action
const decision = await fetch('http://localhost:4240/api/decisions/decide', {
  method: 'POST',
  body: JSON.stringify({ corpId: agentCorpId, action: 'execute_trade', amount: 100000 })
});

// Award karma for good agent performance
await fetch('http://localhost:4251/api/economy/karma/award', {
  method: 'POST',
  body: JSON.stringify({ corpId: agentCorpId, amount: 100, reason: 'Excellent customer service' })
});
```

---

*Foundation Services: `services/corpid-service/`, `services/memory-os/`, `services/goal-os/`, `services/decision-engine/`, `services/agent-economy/`*

*Last Updated: June 14, 2026*

---

## AI Employees (Updated June 14, 2026)

HOJAI AI Employees are specialized AI agents that work as employees in various industries.

### Recently Connected Employees

| Port | Employee | Category | Connected To | Status |
|------|-----------|----------|--------------|--------|
| 5600 | ai-waiter | Hospitality | REZ Menu/POS/KDS + Memory | ✅ Connected |
| 4849 | maintenance-agent | Hospitality | REZ Maintenance + Predictive Engine | ✅ Connected |
| 4786 | procurement-agent | L3 | Nexha Procurement OS | ✅ Connected |

### ai-waiter (Port 5600)

**Location:** `employees/ai-waiter/`

AI Waiter is an AI employee that handles restaurant customer interactions via WhatsApp and voice.

**Services:**
- `src/services/menu-service.ts` - Menu Service client (REZ Menu 4030)
- `src/services/order-service.ts` - Order Service client (REZ POS 4081)
- `src/services/reservation-service.ts` - Reservation Service client (REZ Table 4070)
- `src/services/memory-service.ts` - Memory Service client (HOJAI Memory 4520)

**Start:** `npm run dev`

### maintenance-agent (Port 4849)

**Location:** `employees/maintenance-agent/`

Intelligent maintenance management with predictive capabilities.

**Features:**
- Work order creation and tracking
- Predictive maintenance engine (AC, elevator, plumbing, electrical, kitchen)
- Equipment health monitoring
- Vendor management
- Proactive parts ordering via Nexha Procurement

**Start:** `npm start`

### procurement-agent (Port 4786)

**Location:** `employees/procurement-agent/`

Intelligent procurement with supplier matching and negotiation.

**Features:**
- RFQ creation and management
- Supplier matching by category (AC, plumbing, electrical, linen, food, general)
- Negotiation strategies (standard 10%, aggressive 20%, friendly 5%)
- Contract generation
- Trust score evaluation

**Start:** `npm start`

---

*Last Updated: June 14, 2026*

### supplier-agent (Port 4850)

**Location:** `employees/supplier-agent/`

Autonomous RFQ response agent that handles supplier side of procurement.

**Features:**
- RFQ receive and parse
- Auto quote generation with volume discounts
- Negotiation handling (multi-round)
- Contract generation
- SUTAR trust validation

**Supplier Categories:**
- AC/HVAC: CoolAir Solutions, Climate Pro, Metro Cooling
- Plumbing: AquaFix Services, PipeMaster Pro
- Electrical: Spark Electric, PowerSafe Solutions
- Linen: SoftLinens Hotel Supply, Hotel Essentials
- Food: FreshFarm Foods, Quality Meats & More

**Start:** `npm run dev`

---

## NEW SERVICES - June 14, 2026

### AI Waiter (Port 5600)
- WhatsApp/Chat order taking
- Menu browsing with dietary filtering
- Table reservations
- Kitchen display notification
- Connected to: REZ Menu (4030), POS (4081), KDS (4080), Table (4070), Memory (4520)

### Maintenance Agent (Port 4849)
- Work order creation and tracking
- Predictive maintenance engine
- Equipment health monitoring
- Vendor management
- Connected to: REZ Maintenance (4831), Nexha (4320)

### Procurement Agent (Port 4786)
- RFQ creation and management
- Supplier matching by category
- Negotiation strategies
- Contract generation
- Connected to: Nexha Procurement OS (4320)

### Supplier Agent (Port 4850)
- Autonomous RFQ response
- Auto quote generation
- Volume discounts (5%, 10%, 15%)
- Negotiation handling
- Connected to: Procurement Agent (4786), SUTAR (4518)

---

*Last Updated: June 14, 2026*

---

# HOJAI Genie Dashboard - Vellum-like Interface (Added June 14, 2026)

**Port:** 4701

The Genie Dashboard is the Vellum competitor - a simple unified interface for all Genie services.

**Tagline:** "Your Personal Intelligence, Simplified"

## Features

| Feature | Description |
|---------|-------------|
| Unified Dashboard | All services in one view |
| Quick Actions | One-tap access |
| Unified Search | Search across all services |
| AI Insights | Personalized suggestions |
| Sections | Memory, Calendar, Email, Tasks, Briefing |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /api/dashboard | Complete dashboard |
| GET /api/search?q= | Unified search |
| GET /api/quick-actions | Quick actions |
| POST /api/quick-actions/execute | Execute action |
| GET /api/summary | Summary numbers |

## Compared to Vellum

| Vellum Feature | Genie Dashboard |
|----------------|-----------------|
| Memory | ✅ All Genie memory types |
| Personal Identity | ✅ CorpID + Twins |
| Skills | ✅ 235+ AI Employees |
| Multi-Channel | ✅ WhatsApp, Slack, Email |
| Agent Builder | ✅ Agent Marketplace |
| Dashboard | ✅ This service! |

## Service Location

`companies/hojai-ai/genie-dashboard-service/`

## Documentation

`companies/hojai-ai/genie-dashboard-service/README.md`

---

# HOJAI Dental AI - SmileCraft Integration (Added June 14, 2026)

## New Dental Services

| Service | Port | Purpose | Location |
|---------|------|---------|----------|
| Dental Imaging AI | 4501 | X-ray analysis, cavity detection | `HOJAI-CLINIC-AI/src/routes/dental.routes.ts` |
| Dental Expansion Agent | 4555 | Multi-agent for "Open 20 clinics" | `services/hojai-dental-expansion-agent/` |
| Genie Dental Health | 4708 | Dental reminders, risk assessment | `genie-dental-health-service/` |

## Dental Imaging AI Module

**File:** `HOJAI-CLINIC-AI/src/routes/dental.routes.ts` (350+ lines)

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/ai/dental/analyze` | POST | Analyze dental X-ray |
| `/api/v1/ai/dental/compare` | POST | Compare X-rays |
| `/api/v1/ai/dental/cavity-detect` | POST | Early cavity detection |
| `/api/v1/ai/dental/treatment-plan` | POST | Generate treatment plan |
| `/api/v1/ai/dental/gum-health` | POST | Gum health analysis |

### Dental Findings

| Finding | Code | Severity |
|---------|------|----------|
| Caries | `caries` | mild/moderate/severe |
| Bone Loss | `bone_loss` | mild/moderate/severe |
| Crack | `crack` | mild/severe |
| Fracture | `fracture` | mild/moderate/severe |
| Abscess | `abscess` | moderate/severe |
| Normal | `normal` | none |

## Dental Expansion Agent

**File:** `services/hojai-dental-expansion-agent/src/index.js` (500+ lines)

### Goal: Open 20 Clinics

```bash
# Create goal
curl -X POST http://localhost:4555/api/expansion/goal \
  -H "Content-Type: application/json" \
  -d '{"owner": "dr_meera", "targetCount": 20}'

# Execute
curl -X POST http://localhost:4555/api/expansion/execute/:goalId

# Get report
curl http://localhost:4555/api/expansion/:goalId/report
```

### Coordinated Agents

| Agent | Role | Output |
|-------|------|--------|
| RisnaEstate | Location | 1500 sqft, ₹80K/mo |
| CorpPerks | Staffing | 9 staff, ₹2.95L/mo |
| Nexha | Equipment | ₹13.5L |
| AdBazaar | Marketing | ₹1.3L campaign |
| RIDZA | Finance | ₹50L investment |

## Genie Dental Health Service

**File:** `genie-dental-health-service/src/index.js` (320+ lines)

### Dental Reminders

```bash
# Calculate risk
curl http://localhost:4708/api/risk/:corpId

# Send reminder
curl -X POST http://localhost:4708/api/reminder \
  -d '{"corpId": "xxx", "patientName": "Karim", "lastVisitMonths": 14}'
```

### Risk Messages

| Risk | Message |
|------|---------|
| High (24+ mo) | "It's been {X} months. Gum inflammation risk is increasing." |
| Medium (14 mo) | "You skipped your last dental checkup. It's been {X} months." |

## Story Flow - Services

| Time | Event | Service | Status |
|------|-------|---------|--------|
| 11:40 AM | Digital scan | Dental Imaging AI | ✅ |
| 7:00 PM | "Open 20 clinics" | Expansion Agent | ✅ |
| 7:00 AM | Reminder | Genie Dental Health | ✅ |

## Quick Start

```bash
# Dental Imaging AI
cd companies/hojai-ai/HOJAI-CLINIC-AI
npm run dev  # Port 4501

# Dental Expansion Agent
cd companies/hojai-ai/services/hojai-dental-expansion-agent
npm install && npm start  # Port 4555

# Genie Dental Health
cd companies/hojai-ai/genie-dental-health-service
npm install && npm start  # Port 4708
```

---

*Last Updated: June 14, 2026*
*SmileCraft Dental Clinic - All Services Integrated*
