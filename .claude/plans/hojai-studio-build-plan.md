# HOJAI Studio — Build Plan

> **Date:** 2026-06-25
> **Goal:** Build the HOJAI Studio UI (the "Founder Path" to `npx hojai create`)
> **Status:** Design phase — pending approval

---

## 0. What Exists vs What's Missing

### ✅ Already Built (foundations are solid)
- `npx hojai create` CLI — tokenized starter templates, 9 templates, `render.js` + `manifest.js` engine
- `npx hojai deploy` — local + preview + remote (to hojai-cloud:4380)
- `npx hojai add` — agent + integration appending
- 9 starter kits (marketplace, b2b, company, hotel, restaurant, logistics, crm, erp, pos)
- BaseAgent runtime wired into every starter
- 23 SDKs (`@hojai/foundation`, `@hojai/sutar`, etc.)
- AI Studio backend (10 services, ports 4900-4909)
- HOJAI Cloud deployment service (port 4380)
- Company Builder Suite (port 4268) — entity formation + compliance
- Founder OS (port 4266) — OKRs, journal, check-ins
- Startup Studio (port 4267) — cohorts, mentors, programs
- RTMN root frontend pattern (Next.js 14 App Router, `frontend/`)

### ❌ Missing — The 4 Critical Gaps

| Gap | Description | Why it matters |
|-----|-------------|--------------|
| **G1: Studio UI** | Next.js web app at `hojai.ai/studio` — landing + wizard + dashboard | Without this, founders have no UI path |
| **G2: AI Architect** | Service that interviews founders (12 questions) → generates `company.blueprint.yaml` | This is the "30-minute wizard" experience |
| **G3: Blueprint Compiler** | Service that converts `company.blueprint.yaml` → generated project (calls `create-hojai` engine) | The magic moment — company generated in seconds |
| **G4: Studio → Cloud wiring** | Studio UI → Blueprint Engine → Compiler → HOJAI Cloud deploy | End-to-end flow must work as one |

### 🟡 Nice to Have (lower priority)
- Landing page design (can start simple)
- Auth (can use CorpID existing flow)
- Marketplace UI (can reuse AI Studio API existing endpoints)
- Post-create dashboard (simple project list first)

---

## 1. Architecture

```
Founder Browser
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  HOJAI Studio UI (Next.js 14) — port TBD                       │
│  └── Pages: / (landing), /wizard, /dashboard, /projects/:id     │
└────────────────────────────┬────────────────────────────────────┘
                           │ REST/HTTP
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌──────────────────────────┐
│ AI Architect    │ │ Blueprint       │ │ HOJAI Cloud               │
│ Service         │ │ Compiler        │ │ (:4380)                   │
│ (NEW — port     │ │ (NEW — port     │ │ (existing)                │
│  4390)          │ │  4391)          │ │                            │
│                 │ │                 │ │ POST /api/v1/deploy        │
│ 1. Receives     │ │ 1. Receives     │ │ GET /api/v1/deployments   │
│    company idea  │ │    blueprint     │ │ DELETE /api/v1/deployments│
│ 2. Asks 12 Qs   │ │ 2. Maps to      │ └──────────────────────────┘
│ 3. Generates    │ │    template +    │
│    blueprint    │ │    agents +      │
│                 │ │    config       │
│                 │ │ 3. Calls        │
│                 │ │    create-hojai │
│                 │ │    render engine│
│                 │ │ 4. Collects     │
│                 │ │    generated    │
│                 │ │    files        │
│                 │ │ 5. Returns file │
│                 │ │    map          │
│                 │ │ 6. Triggers    │
│                 │ │    deploy      │
└─────────────────┘ └─────────────────┘
```

**Existing pieces wired in:**
- AI Studio API (port 4900) — templates, marketplace, projects, workflows
- Company Builder Suite (port 4268) — entity formation post-creation
- CorpID (port 4702) — auth (reused from RTMN)
- RTMN Hub (port 4399) — can proxy Studio services

---

## 2. HOJAI Studio UI — Next.js App

### Location
`companies/HOJAI-AI/products/ai-studio-ui/`

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page — "Build your AI-native company in 30 minutes" |
| `/wizard` | AI Architect wizard — interview → blueprint → generate → deploy |
| `/dashboard` | Founder dashboard — list of their companies/projects |
| `/projects/[id]` | Project detail — open in Cursor, view agents, manage |
| `/marketplace` | Browse + install templates (uses AI Studio API :4900) |
| `/auth/login` | Login (CorpID JWT) |
| `/auth/register` | Register (CorpID) |

### Tech Stack
- **Next.js 14** (App Router) — same as `frontend/` pattern
- **TypeScript** throughout
- **Tailwind CSS** + **shadcn/ui** components
- **API client** — typed fetch helpers following `frontend/lib/api.ts` pattern
- **Zustand** for wizard state (multi-step form)
- **React Hook Form** + **Zod** for form validation

### Key Components

```
src/
├── app/
│   ├── page.tsx                    # Landing
│   ├── wizard/
│   │   └── page.tsx                # Multi-step wizard
│   ├── dashboard/
│   │   └── page.tsx                # Project list
│   ├── projects/[id]/
│   │   └── page.tsx                # Project detail
│   ├── marketplace/
│   │   └── page.tsx                # Template browser
│   └── layout.tsx                  # Root layout with nav
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── landing/                     # Landing page sections
│   ├── wizard/
│   │   ├── StepIdea.tsx            # Step 1: Company idea input
│   │   ├── StepQuestions.tsx       # Step 2: AI Architect interview
│   │   ├── StepBlueprint.tsx       # Step 3: Blueprint review/approve
│   │   ├── StepGenerating.tsx      # Step 4: Generation progress
│   │   └── StepSuccess.tsx         # Step 5: Done + launch
│   ├── dashboard/
│   │   ├── ProjectCard.tsx
│   │   └── ProjectList.tsx
│   └── shared/
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── LoadingSpinner.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts               # Typed fetch client
│   │   ├── architect.ts            # AI Architect API client
│   │   ├── compiler.ts             # Blueprint Compiler API client
│   │   └── cloud.ts                # HOJAI Cloud API client
│   ├── auth.ts                     # CorpID JWT helpers
│   └── store.ts                    # Zustand wizard store
└── types/
    ├── blueprint.ts                 # Blueprint schema
    ├── wizard.ts                   # Wizard state types
    └── api.ts                      # Shared API types
```

---

## 3. AI Architect Service

### Location
`companies/HOJAI-AI/services/ai-architect/`
**Port: 4390**

### What it does
Acts as the "world-class CTO" that interviews founders. Takes a company idea → asks 12 structured questions → generates a `company.blueprint.yaml`.

### API Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/interview/start` | Start interview — `{ idea: string }` → returns `{ interviewId: string, firstQuestion: Question }` |
| `POST` | `/api/v1/interview/:id/answer` | Submit answer → `{ questionId, answer }` → returns `{ nextQuestion?, isComplete: bool, partialBlueprint? }` |
| `GET` | `/api/v1/interview/:id` | Get interview state + all answers |
| `POST` | `/api/v1/interview/:id/complete` | Finalize → returns `{ blueprint: CompanyBlueprint }` |
| `GET` | `/api/v1/blueprint/:id` | Get saved blueprint |

### Data Model

```typescript
// Company Blueprint (generated output)
interface CompanyBlueprint {
  id: string;
  createdAt: string;
  status: 'draft' | 'approved' | 'compiled' | 'deployed';
  idea: string;                    // Original founder idea
  config: {
    name: string;                  // e.g. "Maya Collective"
    type: 'marketplace' | 'b2b' | 'company' | 'hotel' | 'restaurant' | 'logistics' | 'crm' | 'erp' | 'pos';
    region: string[];              // ['me', 'ap-south']
    languages: string[];          // ['en', 'ar', 'hi']
    currency: string;             // 'INR'
    industries: string[];
    mobile: 'ios' | 'android' | 'both' | 'web-only';
    workforce: WorkforceConfig;
    compliance: string[];         // ['gdpr', 'pci', 'india-dpdp']
    commerce: boolean;
    federation: boolean;
  };
  apps: {
    buyerPortal: boolean;
    sellerPortal: boolean;
    adminDashboard: boolean;
    mobileApp: boolean;
  };
  agents: AgentConfig[];           // [{ name: 'Sales', type: 'merchant', ... }]
  integrations: string[];          // ['corp-id', 'memory-os', 'twin-os', ...]
  nextSteps: string[];
}
```

### The 12 Questions

| # | Question | Field | Options |
|---|---------|-------|---------|
| 1 | What's your brand or company name? | `name` | text |
| 2 | What type of business? | `type` | dropdown (9 types) |
| 3 | Which industries does it serve? | `industries` | multi-select |
| 4 | Which regions will you operate in? | `region` | multi-select (6 regions) |
| 5 | What languages do you need? | `languages` | multi-select (9 languages) |
| 6 | What currency is your primary? | `currency` | dropdown |
| 7 | How big is your target market? | `marketSize` | small/medium/large |
| 8 | What AI workforce do you want? | `workforce` | multi-select (9 presets) |
| 9 | What compliance do you need? | `compliance` | multi-select |
| 10 | Do you need commerce + payments? | `commerce` | yes/no |
| 11 | Do you want a mobile app? | `mobile` | ios/android/both/web-only |
| 12 | Do you want to join Global Nexha? | `federation` | yes/no |

### Implementation
- Express.js service
- Stores interview state in memory (can add MongoDB later)
- Each question is a state machine transition
- On complete: generates the `CompanyBlueprint` object
- Calls Blueprint Compiler to generate the actual project (optional — can be triggered separately)

---

## 4. Blueprint Compiler Service

### Location
`companies/HOJAI-AI/services/blueprint-compiler/`
**Port: 4391**

### What it does
Takes a `CompanyBlueprint` → uses the `create-hojai` render engine to scaffold a project → returns the generated file map → optionally triggers deploy to HOJAI Cloud.

### API Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/compile` | Compile blueprint → `{ blueprint: CompanyBlueprint }` → `{ projectFiles: Record<path, content>, projectId: string }` |
| `GET` | `/api/v1/compile/:id` | Get compile result |
| `POST` | `/api/v1/compile/:id/deploy` | Deploy compiled project to HOJAI Cloud |
| `GET` | `/api/v1/compile/:id/status` | Poll compile + deploy status |

### Implementation
```typescript
// compile flow
async function compile(blueprint: CompanyBlueprint) {
  // 1. Determine template from blueprint.type
  const templateDir = path.join(FOUNDRY_ROOT, 'starters', blueprint.type, 'template');

  // 2. Map workforce to agents
  const agentPreset = workforceToAgents(blueprint.workforce);

  // 3. Build render vars
  const vars = {
    PROJECT_NAME: slugify(blueprint.config.name),
    PROJECT_TITLE: titleCase(blueprint.config.name),
    TEMPLATE: blueprint.type,
    REGION: blueprint.config.region[0],
    LANGUAGES_JSON: JSON.stringify(blueprint.config.languages),
    AGENTS_JSON: JSON.stringify(blueprint.agents.map(a => a.name)),
    PRIMARY_LANGUAGE: blueprint.config.languages[0],
    CREATED_AT: new Date().toISOString().split('T')[0],
    HOJAI_VERSION: '1.0.0',
  };

  // 4. Render template (reuse foundry/packages/create-hojai/src/render.js logic)
  const files = await renderTemplate(templateDir, vars);

  // 5. Write manifest
  files['.hojai/manifest.json'] = JSON.stringify(buildManifest(blueprint), null, 2);
  files['.hojai/capability.json'] = JSON.stringify(buildCapability(blueprint), null, 2);

  // 6. Write company.blueprint.yaml
  files['company.blueprint.yaml'] = dumpYaml(blueprint);

  // 7. Write hojai.ai.md
  files['hojai.ai.md'] = generateHojaiAiMd(blueprint);

  return { projectFiles: files, projectId: uuid() };
}
```

### Key file outputs (per generated project)
```
<project>/
├── company.blueprint.yaml     # The canonical blueprint
├── hojai.ai.md                # AI-native spec (Claude Code reads this)
├── .hojai/
│   ├── manifest.json         # Project metadata + SDK deps
│   └── capability.json       # CapabilityOS declaration
├── apps/backend/src/index.js  # Express backend
├── apps/frontend/...         # Static frontend
├── scripts/dev.js            # Dev launcher
└── package.json
```

---

## 5. Landing Page

**Route:** `/`

**Sections:**
1. **Hero** — "Build your AI-native company in 30 minutes" + CTA button "Start Building"
2. **What you get** — Cards: AI Workforce, Memory + Twins, Commerce Built-in, Global Network
3. **Demo video placeholder** — Screenshot of the wizard flow
4. **Templates** — Grid of 9 starter templates with icons
5. **Pricing** — Free / Starter / Growth / Enterprise tiers
6. **Testimonials** — "I built X in 30 minutes" stories
7. **FAQ**
8. **CTA Footer**

**Design:** Clean, professional. Dark theme matching RTMN aesthetic. Mobile responsive.

---

## 6. Wizard Flow (the core experience)

**5 steps, state managed with Zustand:**

```
Step 1: Idea
  "What do you want to build?"
  → Free text input
  → POST /api/v1/interview/start
  → Returns interviewId + first question

Step 2: Questions (12 questions)
  → POST /api/v1/interview/:id/answer (per question)
  → Progress bar (1/12 → 12/12)
  → Skip option for advanced users

Step 3: Blueprint Review
  → GET /api/v1/interview/:id
  → Shows generated CompanyBlueprint
  → Editable fields + [Approve & Generate] button
  → POST /api/v1/compile

Step 4: Generating
  → POST /api/v1/compile/:id/deploy
  → Polling /status endpoint
  → Progress: "Creating your company..." → "Deploying..."

Step 5: Success
  → Shows: project URL, agents, capabilities
  → CTAs: "Open in Cursor" / "View Dashboard" / "Share"
  → Project saved to dashboard
```

---

## 7. Dashboard

**Route:** `/dashboard`

**Features:**
- List all projects (from HOJAI Cloud `GET /api/v1/deployments`)
- Project cards: name, template, status, URL, created date
- Actions: Open, Delete, Re-deploy
- Stats: total projects, active deployments

---

## 8. Implementation Order

### Phase 1: Foundation (Day 1-2)
1. Create Next.js project structure at `products/ai-studio-ui/`
2. Set up Tailwind + shadcn/ui + TypeScript
3. Create typed API client library
4. Create shared components (Header, Footer, LoadingSpinner)

### Phase 2: AI Architect (Day 3-4)
1. Build `ai-architect` service (port 4390)
2. Implement 12-question state machine
3. Wire to wizard UI (Step 1 + 2)
4. Test with curl + browser

### Phase 3: Blueprint Compiler (Day 5-6)
1. Build `blueprint-compiler` service (port 4391)
2. Port `render.js` logic into the service
3. Add `company.blueprint.yaml` generation
4. Add `hojai.ai.md` generation
5. Wire to wizard UI (Step 3)

### Phase 4: Wizard UI + Deploy (Day 7-8)
1. Complete wizard UI (all 5 steps)
2. Wire wizard → Blueprint Compiler
3. Wire Compiler → HOJAI Cloud deploy
4. Add polling for deploy status

### Phase 5: Landing + Dashboard (Day 9-10)
1. Build landing page
2. Build dashboard (list projects from HOJAI Cloud)
3. Build project detail page
4. Add auth (CorpID login/register)

### Phase 6: Testing + Polish (Day 11-12)
1. End-to-end test of full flow
2. Fix any edge cases
3. Add error handling
4. Responsive design pass

---

## 9. File Inventory

### New Services (2)
| Service | Path | Port |
|---------|------|------|
| AI Architect | `companies/HOJAI-AI/services/ai-architect/` | 4390 |
| Blueprint Compiler | `companies/HOJAI-AI/services/blueprint-compiler/` | 4391 |

### New UI App (1)
| App | Path |
|-----|------|
| AI Studio UI | `companies/HOJAI-AI/products/ai-studio-ui/` |

### Modified Files
| File | Change |
|------|--------|
| `RTMN/CLAUDE.md` | Add AI Studio UI to service registry |
| `RTMN/services/unified-os-hub/src/routes/` | Add routes for AI Architect + Blueprint Compiler |
| `CANONICAL-PORT-REGISTRY.md` | Register ports 4390, 4391 |

---

## 10. Testing Plan

```bash
# Phase 1-2: AI Architect
curl -X POST http://localhost:4390/api/v1/interview/start \
  -H 'Content-Type: application/json' \
  -d '{"idea":"Build me a D2C fashion brand for Indian women"}'

# Phase 3: Blueprint Compiler
curl -X POST http://localhost:4391/api/v1/compile \
  -H 'Content-Type: application/json' \
  -d @blueprint.json

# Phase 4: Deploy
curl -X POST http://localhost:4391/api/v1/compile/:id/deploy

# End-to-end: Browser
# Open http://localhost:3000 (Studio UI)
# Type: "Build me a D2C fashion brand for Indian women"
# Answer 12 questions
# See generated company at hojai.app
```

---

## 11. Effort Estimate

| Phase | Time | Deliverable |
|-------|------|-------------|
| Phase 1: Foundation | 2 days | Next.js scaffold, API client, shared components |
| Phase 2: AI Architect | 2 days | Interview service + 12 questions |
| Phase 3: Blueprint Compiler | 2 days | Compile service + file generation |
| Phase 4: Wizard UI + Deploy | 2 days | Full wizard flow + deploy wiring |
| Phase 5: Landing + Dashboard | 2 days | Marketing pages + project management |
| Phase 6: Testing + Polish | 2 days | E2E test + bug fixes |
| **Total** | **12 days** | **Production-ready HOJAI Studio** |

---

*Last updated: 2026-06-25*
