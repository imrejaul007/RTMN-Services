# HOJAI Platform Architecture v2 — Blueprint Engine, Company Compiler, Evolution Engine

> **Date:** 2026-06-22
>
> **Purpose:** Structural improvement to the HOJAI architecture — adding the Blueprint Engine, Company Compiler, Diff Engine, Evolution Engine, and full platform thinking.

---

## 0. The Core Insight

**The missing piece in the current architecture is a Blueprint Engine as the single source of truth.**

Today the architecture is:
```
Prompt → Generate Code
```

It should be:
```
Prompt → Company Blueprint → Everything else
```

The Blueprint is **the source code of the company**. Everything else is **the compiled output**. This is the same relationship as TypeScript → JavaScript.

---

## 1. The New Architecture (10 layers)

```
                    EXPERIENCE LAYER
┌─────────────────────────────────────────────────────────────┐
│   Studio (UI) | CLI | VS Code | Cursor | API | GitHub App  │
│              "Multiple front doors to the same backend"     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                    FOUNDRY ENGINE
┌─────────────────────────────────────────────────────────────┐
│   Prompt Engine → Blueprint Engine → Compiler → Generator   │
│   Validator → Optimizer → Migration Engine → Marketplace     │
│   Resolver → Upgrade Engine                                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                   COMPANY BLUEPRINT (Source of Truth)
┌─────────────────────────────────────────────────────────────┐
│   YAML: Mission, Business Model, Apps, Services, Agents,    │
│   Twins, Policies, Infrastructure, Commerce, Workflows       │
│   "The company is defined here — everything else is compiled"│
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                     COMPANY COMPILER
┌─────────────────────────────────────────────────────────────┐
│   Code Generator | SDK Generator | Agent Generator           │
│   Twin Generator | Workflow Generator | Infrastructure Gen  │
│   "Compiles Blueprint into production-ready company"        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                         REPOSITORY
┌─────────────────────────────────────────────────────────────┐
│   Git repo with: apps/, services/, agents/, twins/, etc.    │
│   "Versioned, branched, deployable artifact"                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                       HOJAI CLOUD
┌─────────────────────────────────────────────────────────────┐
│   Hosting | Database | Storage | Secrets | Monitoring       │
│   Billing | Vector DB | Backups                            │
│   "Managed infrastructure for AI-native companies"          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                      HOJAI RUNTIME
┌─────────────────────────────────────────────────────────────┐
│   MemoryOS | TwinOS | FlowOS | PolicyOS | GoalOS | TrustOS  │
│   EconomyOS | SUTAR                                        │
│   "The operating system that runs the company 24/7"          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                  CONTINUOUS EVOLUTION ENGINE
┌─────────────────────────────────────────────────────────────┐
│   Observe → Learn → Simulate → Recommend → Approve → Deploy│
│   "The company improves itself every week"                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. The 10 Subsystems (each is a major workstream)

### 2.1 Prompt Engine

**What:** Converts natural language to structured requirements.

**Inputs:** Free-text user prompts ("Build me a D2C fashion brand")
**Outputs:** Structured requirements (industry, region, business model, etc.)
**AI models:** Multi-model (Claude for reasoning, GPT for creativity)

```typescript
class PromptEngine {
  async parsePrompt(userInput: string): Promise<StructuredRequirements> {
    // 1. Identify business type
    const businessType = await this.identifyBusinessType(userInput);
    // "D2C fashion brand"
    
    // 2. Extract entities
    const entities = await this.extractEntities(userInput);
    // { industry: "fashion", region: "India", model: "D2C" }
    
    // 3. Infer requirements
    const requirements = await this.inferRequirements(entities);
    // { needsMobile: true, needsAI: true, needsCommerce: true }
    
    // 4. Ask clarifying questions (max 12)
    const questions = await this.generateClarifyingQuestions(entities, requirements);
    
    return { businessType, entities, requirements, questions };
  }
}
```

### 2.2 Blueprint Engine

**What:** The canonical YAML spec for every company. Source of truth.

**Schema (canonical example):**

```yaml
# company.blueprint.yaml
version: "1.0"
id: "blueprint-uuid-123"
created: "2026-06-22T10:00:00Z"
updated: "2026-06-22T14:30:00Z"

# Business Identity
company:
  name: "Maya Collective"
  mission: "Connect Indian women with premium fashion"
  vision: "Become India's most-loved D2C fashion brand"
  industry: "fashion"
  region: "India, UAE, UK"
  businessModel: "D2C Storefront"
  stage: "growth"  # idea, mvp, growth, scale, mature

# Apps (front-end surfaces)
apps:
  - id: "buyer-portal"
    type: "web"
    framework: "nextjs"
    purpose: "Customer-facing shopping experience"
    
  - id: "admin-dashboard"
    type: "web"
    framework: "nextjs"
    purpose: "Internal team operations"
    
  - id: "mobile-app"
    type: "mobile"
    framework: "flutter"
    platforms: ["ios", "android"]
    purpose: "Native mobile shopping"

# Services (backend)
services:
  - id: "identity"
    purpose: "User authentication and authorization"
    runtime: "node-express-typescript"
    dependencies: ["@hojai/foundation"]
    
  - id: "catalog"
    purpose: "Product catalog and inventory"
    runtime: "node-express-typescript"
    dependencies: ["@hojai/foundation", "@hojai/commerce"]
    
  - id: "orders"
    purpose: "Order management and fulfillment"
    runtime: "node-express-typescript"
    dependencies: ["@hojai/foundation", "@hojai/commerce", "@hojai/payment"]
    
  - id: "payments"
    purpose: "Payment processing and reconciliation"
    runtime: "node-express-typescript"
    dependencies: ["@hojai/foundation", "@hojai/payment"]
    
  # ... 8+ more services

# AI Workforce (SUTAR agents)
agents:
  - id: "ceo-agent"
    role: "CEO"
    purpose: "Orchestrate other agents, strategic decisions"
    capabilities: ["orchestration", "planning", "reporting"]
    tools: ["@hojai/sutar", "@hojai/foundation"]
    
  - id: "sales-agent"
    role: "Sales"
    purpose: "Handle RFQs, generate quotes, follow-up"
    capabilities: ["quotation", "negotiation", "crm"]
    tools: ["@hojai/sutar", "@hojai/commerce"]
    
  # ... 4+ more agents

# Workflows (FlowOS)
workflows:
  - id: "onboard-customer"
    trigger: "user.signup"
    steps:
      - agent: "sales-agent"
        task: "send-welcome-email"
      - agent: "sales-agent"
        task: "schedule-follow-up"
        
  - id: "process-order"
    trigger: "order.created"
    steps:
      - agent: "fulfillment-agent"
        task: "allocate-inventory"
      - agent: "logistics-agent"
        task: "arrange-shipping"
      - agent: "support-agent"
        task: "send-tracking"

# Digital Twins (TwinOS)
twins:
  - id: "customer-twin"
    entityType: "customer"
    fields: ["name", "email", "preferences", "purchaseHistory", "loyaltyTier"]
    
  - id: "product-twin"
    entityType: "product"
    fields: ["name", "price", "inventory", "supplier", "rating"]
    
  # ... more twins

# Memory Schema (MemoryOS)
memory:
  types:
    - "user-preferences"
    - "purchase-history"
    - "conversation-history"
    - "operational-events"
    - "agent-learnings"

# Policies (PolicyOS)
policies:
  - id: "data-privacy"
    rules: ["GDPR", "India-DPDP", "UAE-data-protection"]
  - id: "payment-policy"
    rules: ["PCI-DSS", "refund-window-30-days"]
  - id: "agent-boundaries"
    rules: ["no-purchase-over-1000-without-approval"]

# Trust & Reputation (SADA)
trust:
  initialACI: 40
  bootstrapStage: 1
  verificationRequired: ["kyb", "tax-id"]

# Commerce
commerce:
  type: "storefront"
  payments: ["stripe", "rez-wallet", "upi", "cod"]
  shipping: ["delhivery", "bluedart", "dhl"]
  taxes: ["GST", "VAT"]

# Network & Federation
network:
  nexhaEnabled: true
  federationTier: "basic"  # basic, verified, premium, industry, government
  capabilityDeclaration: ".hojai/capability.json"

# Infrastructure
infrastructure:
  cloud: "hojai"
  region: "ap-south-1"
  database: "postgres"
  cache: "redis"
  search: "elasticsearch"
  vectorDB: "pinecone"
  storage: "s3"

# Compliance
compliance:
  frameworks: ["GDPR", "India-DPDP"]
  dataResidency: ["IN"]
  encryption: "AES-256"
  certifications: ["SOC2-Type-II"]  # year 2

# Monitoring
monitoring:
  logLevel: "info"
  metrics: ["api-latency", "agent-performance", "revenue", "errors"]
  alerts: ["revenue-drop", "agent-failure", "customer-churn"]

# Cost Configuration
costs:
  monthlyBudget: 2000  # USD
  costCenters: ["agents", "database", "compute", "bandwidth"]
  costAlerts: ["monthly-budget-80-percent"]

# Marketplace
marketplace:
  installedAgents: []
  installedSkills: ["negotiation", "translation", "compliance-check"]
  installedWorkflows: ["onboarding", "returns"]
  installedThemes: ["luxury", "modern", "minimal"]
```

### 2.3 Company Compiler

**What:** Compiles the Blueprint into a production-ready company.

```bash
hojai compile maya-collective.blueprint.yaml

✓ Compiling Blueprint v1.0
✓ Generating 4 apps (Next.js + Flutter)
✓ Generating 12 services (Node.js + TypeScript)
✓ Generating 6 SUTAR agents
✓ Generating 8 workflows
✓ Generating 11 digital twins
✓ Installing 7 HOJAI SDKs
✓ Setting up MemoryOS schema
✓ Setting up PolicyOS rules
✓ Connecting SADA reputation
✓ Configuring Nexha federation
✓ Provisioning HOJAI Cloud resources
✓ Setting up CI/CD
✓ Configuring monitoring + alerts
✓ Building Docker images
✓ Running tests (50+ tests pass)
✓ Optimizing for production
✓ Validating security
✓ Deploying to production

Done! Company is live at https://maya-collective.hojai.app
Time: 45 seconds
```

**The compiler is the "magic"** — it takes the Blueprint (declarative spec) and produces a running company (imperative implementation).

### 2.4 Diff Engine (the secret weapon)

**What:** When the Blueprint changes, only regenerate the affected pieces. NOT the entire project.

```bash
Founder says: "Add a loyalty program."

HOJAI:
✓ Diffing Blueprint
  - New: workflow "loyalty-rewards"
  - New: agent "loyalty-agent"
  - Changed: service "wallet" (added points)
  - Changed: app "buyer-portal" (added loyalty UI)
  - Unchanged: services "catalog", "orders", etc.

✓ Regenerating only changed parts:
  - Generated: agents/loyalty-agent.ts
  - Updated: services/wallet/
  - Updated: apps/buyer-portal/components/LoyaltyWidget.tsx
  - Updated: database/migrations/2026-07-15_add-loyalty-points.sql
  - Updated: workflows/loyalty-rewards.ts

✓ Preserved: 47 other files (untouched)

✓ Running incremental tests
✓ Deploying changed services only

Done! 8 files changed, 47 preserved.
Time: 30 seconds
```

**This is what nobody else does.** Replit and Emergent regenerate from scratch. HOJAI does surgical updates.

### 2.5 Validator

**What:** Validates the generated company for correctness, security, compliance.

```bash
hojai validate maya-collective

✓ Schema validation (Blueprint matches spec)
✓ Security scan (no secrets, no vulnerable deps)
✓ Compliance check (GDPR + India-DPDP)
✓ Cost estimate (within budget)
✓ Performance check (load tested to 1K req/s)
✓ Best practices (uses HOJAI SDKs, follows conventions)

All checks passed! Ready to deploy.
```

### 2.6 Optimizer

**What:** Optimizes the generated code for cost, performance, security.

```bash
hojai optimize maya-collective

✓ Optimizations applied:
  - Reduced database queries by 40% (added indexes)
  - Reduced bundle size by 30% (tree-shaking)
  - Reduced AI agent calls by 50% (caching)
  - Reduced costs by 25% (right-sized resources)

Estimated savings: $400/month
```

### 2.7 Migration Engine

**What:** Handles Blueprint changes, version upgrades, breaking changes.

```bash
hojai migrate --from=v1.0 --to=v2.0

✓ Detected changes in Blueprint schema v2.0
✓ Generated migration plan:
  - Add field "twins[].verified" (was implicit, now explicit)
  - Rename "services" → "modules" (breaking change)
  - Update agents to include "memory_policy"

✓ Applying migration...
✓ All data preserved
✓ All services redeployed

Migration complete. Zero downtime.
```

### 2.8 Marketplace Resolver

**What:** Pulls the right agents, skills, workflows from the HOJAI Marketplace.

```bash
hojai install loyalty-agent --from=marketplace

✓ Searching HOJAI Marketplace...
✓ Found: loyalty-agent v2.1 (by HOJAI Inc)
  - 1,240 installs
  - Rating: 4.8/5
  - Compatible with your Blueprint

✓ Resolving dependencies...
  - Requires: skill "rewards-calculation" (auto-install)
  - Requires: twin schema "loyalty-account" (auto-add)

✓ Installing...

Done! loyalty-agent is now part of your company.
```

### 2.9 Upgrade Engine

**What:** Automatically upgrades the company when new HOJAI versions are released.

```bash
HOJAI Cloud notification:
"New version available: v2.5 (includes improved Payment Agent)"

Founder approves: Yes, upgrade.

✓ Upgrading Maya Collective from v2.4 to v2.5
✓ Backward compatible (no breaking changes)
✓ All services redeployed
✓ All data preserved

Done! Your company is now on v2.5.
```

### 2.10 Continuous Evolution Engine (the future differentiator)

**What:** The company improves itself over time, automatically.

```bash
Week 12 report (auto-generated):

OBSERVATIONS:
  • Cart abandonment rate increased 12% week-over-week
  • Mobile checkout takes 8 steps (industry average: 5)
  • Support tickets about "shipping cost" up 30%

LEARNED:
  • Users drop off at step 6 of checkout (payment selection)
  • Mobile users on slow networks struggle with image-heavy checkout

RECOMMENDATIONS:
  1. Reduce checkout from 8 steps to 5 steps
  2. Show shipping cost earlier (in cart, not checkout)
  3. Optimize images for mobile (WebP, lazy load)

SIMULATIONS RUN:
  - Recommendation 1: Tested with 10K virtual customers
    → Predicted +18% conversion, +$8K monthly revenue
  
  - Recommendation 2: Tested with 10K virtual customers
    → Predicted +12% conversion, +$5K monthly revenue

APPROVAL NEEDED:
  Founder can approve, reject, or modify each.

After approval:
  → Blueprint updated
  → Diff Engine regenerates affected parts
  → New version deployed
  → Company keeps improving
```

**This is the ultimate differentiator.** No other platform does this.

---

## 3. The Experience Layer (multiple front doors)

All powered by the same Foundry API. Users choose their preferred interface.

| Interface | User | Use case |
|---|---|---|
| **HOJAI Studio** (web UI) | Non-technical founder | "Build me a company" (no code) |
| **HOJAI CLI** | Technical founder | `npx hojai create` (terminal) |
| **VS Code extension** | Developer | Edit companies in IDE |
| **Cursor plugin** | Developer using Cursor | AI-assisted editing |
| **Claude Code extension** | Developer using Claude Code | AI edits the company |
| **GitHub App** | Team | PR-based company changes |
| **REST API** | Enterprise | Programmatic access |
| **GitHub Codespaces / Gitpod** | Cloud developer | Full dev env in browser |

### The Foundry API (single backend)

```typescript
// Studio calls this
const blueprint = await foundry.generateBlueprint(prompt, requirements);

// CLI calls this
const blueprint = await foundry.generateBlueprint(prompt, requirements);

// Cursor calls this
const blueprint = await foundry.generateBlueprint(prompt, requirements);

// Same API, same result.
```

**All UIs are thin clients. The Foundry API does the work.**

---

## 4. The Company Graph (the future)

Today, a company is a **folder of files**:
```
repository/
├── apps/
├── services/
├── agents/
└── ...
```

Tomorrow, a company is a **graph**:
```
Company Graph
├── Nodes: customers, orders, products, suppliers, agents, workflows
├── Edges: relationships, dependencies, interactions
└── Properties: state, history, predictions
```

**The Company Graph powers:**
- MemoryOS (the graph is the memory)
- TwinOS (each node is a twin)
- DiscoveryOS (find nodes by capability)
- ReputationOS (score nodes by performance)
- Evolution Engine (understand the system as a whole)

```typescript
class CompanyGraph {
  nodes: Map<NodeId, CompanyNode>;
  edges: Map<NodeId, Edge[]>;
  
  // Query the entire company as a graph
  async findBottlenecks(): Promise<Bottleneck[]> {
    // AI analyzes the graph to find bottlenecks
  }
  
  async simulateChange(change: BlueprintChange): Promise<SimulationResult> {
    // Simulate how a change affects the whole system
  }
  
  async optimize(): Promise<Optimization[]> {
    // Find optimizations across the company
  }
}
```

---

## 5. Versioning + Branching (Git for companies)

Every company is **versioned** and **branchable**, like Git.

### Versioning

```
Maya Collective v1.0.0 (initial)
    ↓
Maya Collective v1.1.0 (added loyalty)
    ↓
Maya Collective v1.2.0 (added wedding collection)
    ↓
Maya Collective v2.0.0 (subscription model — breaking change)
```

**Each version has a Blueprint + compiled output + changelog.**

### Branching

```
main (stable production)
    ↓
feature/subscription-model (experimental)
    ↓ simulation
    ↓ results show +5% revenue
    ↓ merge to main
```

**Founders can experiment safely.** Try a new business model in a branch, simulate it, then merge if it works.

### Rollback

```
v1.2.0 (current production) — works
    ↓
v1.3.0 deployed — has bug
    ↓
Founders hits "Rollback"
    ↓
Back to v1.2.0 (zero downtime)
```

---

## 6. Simulation Engine (the preview before launch)

**Before deployment, simulate the entire company with 10,000 virtual customers.**

```bash
hojai simulate maya-collective --users=10000 --duration=30days

✓ Creating 10,000 virtual customers
✓ Assigning personas (age, location, preferences)
✓ Running 30 days of operations
✓ AI Workforce handling 50,000 events
✓ Tracking: purchases, support, returns, churn
✓ Finding: bottlenecks, failures, opportunities

RESULTS:
✓ Conversion rate: 3.2% (industry average: 2.8%)
✓ Cart abandonment: 28% (industry average: 35%)
✓ Customer satisfaction: 4.6/5
✓ Agent efficiency: 87% of tasks handled without human

BOTTLENECKS DETECTED:
✗ Checkout takes 8 steps (recommend 5)
✗ Mobile image load slow (recommend WebP)
✗ Loyalty rewards confusing (recommend UI redesign)

RECOMMENDATIONS:
- Implement before launch
- Estimated +15% conversion rate
- Estimated +$10K monthly revenue

Ready to launch? [Y/n]
```

**This is a massive differentiator.** Test your company before you build it.

---

## 7. Continuous Evolution (the 4th phase nobody else has)

After the company is live, it keeps improving.

### The loop (every week)

```
1. OBSERVE
   Runtime collects metrics:
   - Conversion rate
   - Cart abandonment
   - Customer satisfaction
   - Agent performance
   - Revenue
   - Costs

2. LEARN
   AI analyzes:
   - What changed week-over-week?
   - What patterns emerge?
   - What's working, what's not?

3. RECOMMEND
   AI suggests:
   "Cart abandonment is up 12%. Checkout is too long.
    Recommend: reduce to 5 steps."
   
4. SIMULATE
   Before deploying:
   - Test the change with 10K virtual customers
   - Predict: +18% conversion, +$8K/month

5. APPROVE
   Founder reviews:
   - "Yes, deploy" / "Modify first" / "No, skip"

6. DEPLOY
   If approved:
   - Update Blueprint
   - Diff Engine regenerates
   - New version deployed
   - Zero downtime

7. MEASURE
   Next week:
   - Did it work? Compare to prediction
   - Update AI models
   - Learn from outcome
```

**Every week, the company gets better. Automatically. With founder approval.**

---

## 8. Marketplace (much bigger than templates)

The Marketplace is **everything installable** for AI-native companies.

### Categories

| Category | Examples | Pricing |
|---|---|---|
| **Apps** | Mobile App template, Admin Dashboard | Free / paid |
| **Agents** | Loyalty Agent, Master Negotiator, Customs Agent | Subscription |
| **Departments** | Full Marketing Department, Full HR Department | Subscription |
| **Workflows** | Onboarding Flow, Returns Flow, Renewal Flow | Free / paid |
| **Policies** | GDPR Pack, India-DPDP Pack, HIPAA Pack | One-time |
| **Industries** | Restaurant Industry Pack, Healthcare Industry Pack | One-time |
| **Compliance** | SOC2 Compliance Pack, ISO 27001 Pack | One-time |
| **Commerce** | Stripe Connector, Razorpay Connector, Square POS | Free |
| **ERP** | SAP Connector, Oracle Connector, NetSuite Connector | Free / paid |
| **CRM** | Salesforce Sync, HubSpot Sync | Free |
| **Payment** | Crypto Payment Pack, BNPL Pack, Escrow Pack | One-time |
| **Themes** | Luxury Theme, Minimal Theme, Playful Theme | One-time |
| **UI Blocks** | Dashboard Kit, Analytics Kit, Form Kit | One-time |
| **Analytics** | Mixpanel Pack, Amplitude Pack, Segment Pack | Free |
| **Simulation** | Load Test Pack, Failure Mode Pack | Subscription |

**By Year 5, 100,000+ packages in the marketplace.**

---

## 9. Studio, Foundry, Runtime — Three Products, One Mission

```
Studio (UI Builder) — for founders
    ↓ uses
Foundry (CLI Engine) — for developers
    ↓ powered by
Runtime (24/7 Operator) — for companies
    ↓ that runs on
Cloud (Infrastructure) — for everyone
    ↓ with help from
Marketplace (Network) — for the ecosystem
    ↓ and gets better via
Evolution Engine (Continuous) — for the long term
```

**6 products, one mission: Build, run, and evolve AI-native companies.**

---

## 10. The Strategic Positioning (now correct)

| Platform | Builds |
|---|---|
| GitHub | Code |
| Vercel | Applications |
| Replit | AI-built Applications |
| Emergent | Autonomous Applications |
| Shopify | Commerce Businesses |
| Salesforce | Customer Operations |
| **HOJAI** | **AI-Native Companies** |

**The unit of creation isn't an application. It's an entire operating company with software, AI workforce, memory, workflows, governance, commerce, and continuous evolution built in from day one.**

**This is a new category.** No competitor exists in it. The closest comparisons (Replit, Emergent) only do the first 1-2 of 4 lifecycle stages.

---

## 11. The Build Plan (updated)

### Phase 1: Foundry Core (Months 1-6)

| Component | Effort | New or Extend |
|---|---|---|
| Blueprint Engine (YAML schema + parser) | 8 weeks | NEW |
| Prompt Engine | 4 weeks | NEW |
| Company Compiler (basic) | 8 weeks | NEW |
| Validator | 2 weeks | NEW |
| `@hojai/cli` (CLI entry point) | 4 weeks | NEW |
| 7 Core SDKs | 8 weeks (parallel) | NEW |
| 9 starter kits | 12 weeks (parallel) | NEW |
| 24 industry templates | 12 weeks (parallel) | NEW |
| Diff Engine (basic) | 6 weeks | NEW |
| **Total Phase 1** | **~20 weeks (parallel)** | **Foundation** |

### Phase 2: Studio + Cloud (Months 7-12)

| Component | Effort | New or Extend |
|---|---|---|
| HOJAI Studio (web UI) | 12 weeks | NEW |
| HOJAI Cloud (managed infrastructure) | 12 weeks | NEW |
| Company Graph (the meta-layer) | 8 weeks | NEW |
| Versioning + Branching | 4 weeks | NEW |
| HOJAI Runtime (basic) | 12 weeks | NEW |
| **Total Phase 2** | **~20 weeks (parallel)** | **Product** |

### Phase 3: Evolution + Marketplace (Months 13-24)

| Component | Effort | New or Extend |
|---|---|---|
| Continuous Evolution Engine | 16 weeks | NEW |
| Simulation Engine | 12 weeks | NEW |
| HOJAI Marketplace v1 | 12 weeks | NEW |
| Optimizer + Migration Engine | 8 weeks | NEW |
| **Total Phase 3** | **~16 weeks (parallel)** | **Intelligence** |

### Phase 4: Scale (Months 25-36)

- 1M Nexhas, 5M platforms
- All 14 layers of HOJAI Foundry
- International expansion
- ACP Foundation mature

---

## 12. The Single Sentence

> **HOJAI is the platform that compiles Company Blueprints into living AI-native companies — where Studio is the UI, Foundry is the engine, Runtime is the operator, and the Evolution Engine makes companies smarter every week.**

---

*This v2 architecture replaces the previous 4-product model with a 10-layer architecture centered on the Blueprint Engine. The unit of creation is no longer "an app" but "an entire AI-native company."*

*Last updated: 2026-06-22*
