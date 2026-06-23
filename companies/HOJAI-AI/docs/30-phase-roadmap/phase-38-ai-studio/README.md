# Phase 38: AI Studio (Visual Builder) — 8 weeks

> **The visual builder that lets anyone — not just engineers — create AI workflows, agents, twins, and knowledge bases.**
>
> **Status:** 📋 NEW — Not started
> **Duration:** 8 weeks (or 3 weeks for MVP)
> **Team:** 3 frontend engineers + 2 backend engineers + 1 designer
> **Priority:** P0 (critical path)
> **Depends on:** Phases 11-37 (everything!)
> **Blocks:** Customer adoption

---

## 🎯 Goal

Build **AI Studio** — a Figma + GitHub + Postman for AI systems. Visual drag-and-drop builders for workflows, agents, twins, knowledge bases, and RAG. Prompt playground. Evaluation dashboard. One-click deployment.

**Why this is critical:** Today you need an engineer to build an agent. AI Studio lets business users build their own. This 10x's the addressable market. Without it, HOJAI is for engineers; with it, HOJAI is for everyone.

---

## 📊 Current State

**Problem:** HOJAI has all the building blocks (LLM Gateway, RAG, Agents, Twins, Workflows). But:
- No visual builder (need to write code)
- No prompt playground (can't compare models side-by-side)
- No collaboration (no multi-user editing, no comments)
- No version control (no git-like history)
- No one-click deploy (need DevOps to deploy)
- Business users are locked out

**Reference:** Cursor, Replit, Vercel v0, Bubble, Retool, n8n, Zapier, Make.com, LangChain Hub, PromptLayer

---

## 🎁 Deliverables

### 38.1 Prompt Playground (Week 1-2) — MVP CRITICAL
- **Multi-model comparison:** Test prompt against 9 models side-by-side
- **System prompt editor:** Edit system prompt with syntax highlighting
- **Variable interpolation:** {{user.name}}, {{product.price}}
- **Message history:** View full conversation
- **Token counter:** Show token usage per message
- **Cost calculator:** Show cost per request
- **Latency display:** Show response time per model
- **Streaming:** Stream responses token-by-token
- **Save & share:** Save prompts, share via URL
- **Prompt library:** Browse community prompts
- **Version history:** Git-like version control for prompts
- **A/B testing:** Run same prompt, compare outputs

### 38.2 Workflow Builder (Week 2-4) — MVP CRITICAL
- **Drag-and-drop canvas:** Build workflows visually
- **Node types:** LLM, RAG, Code, HTTP, Conditional, Loop, Wait
- **Connect nodes:** Drag from output to input
- **Configure nodes:** Click to open config panel
- **Test inline:** Run workflow from canvas
- **Debug mode:** Step through, inspect state
- **Version history:** Git-like commits
- **Collaboration:** Multi-user editing, comments
- **Templates:** Start from template
- **Publish:** One-click to production
- **Schedule:** Cron-based scheduling
- **Event trigger:** Trigger on Event Platform events (Phase 37)

### 38.3 Agent Builder (Week 4-5) — MVP CRITICAL
- **Visual agent composition:** Drag skills, tools, knowledge onto agent
- **Skill picker:** Choose from 500+ skills (SkillOS)
- **Tool picker:** Choose from 300+ connectors (Universal Connectors)
- **Knowledge picker:** Choose from 1,000+ sources (Knowledge Registry)
- **Model picker:** Choose from 9 models (Model Registry)
- **Prompt editor:** Edit agent's system prompt
- **Test chat:** Test agent in chat UI
- **Deploy:** One-click to Agent OS (Phase 32)
- **Monitor:** Real-time metrics, logs
- **Version history:** Git-like commits
- **Collaboration:** Multi-user editing, comments

### 38.4 Twin Designer (Week 5-6)
- **Visual twin schema editor:** Drag fields, set types
- **JSON Schema editor:** Edit schema with validation
- **Sample data:** Generate sample twin instances
- **Test validation:** Validate against schema
- **Version control:** Schema versions
- **Publish to registry:** Push to Twin Registry (Phase 35)
- **Relationships:** Define relationships visually

### 38.5 RAG Configurator (Week 6)
- **Visual knowledge base setup:** Drag sources, configure chunking
- **Source picker:** Choose from registered sources (Knowledge Registry)
- **Chunking strategy:** Fixed, semantic, recursive
- **Embedding model picker:** Choose embedding model
- **Vector store picker:** Choose vector DB
- **Test retrieval:** Test "what would RAG retrieve for this query?"
- **Test generation:** Test full RAG pipeline
- **Deploy:** One-click to RAG Engine (Phase 12)

### 38.6 Evaluation Dashboard (Week 7)
- **Real-time quality scores:** See eval scores live
- **Model comparison:** Compare 9 models side-by-side
- **Regression alerts:** "Quality dropped 5% in last hour"
- **Custom metrics:** Define your own metrics
- **Human review queue:** Review AI outputs
- **Reports:** Weekly quality reports
- **A/B test results:** View A/B test outcomes

### 38.7 Deployment & DevOps (Week 7-8)
- **One-click deploy:** Deploy to production
- **Environments:** Dev, staging, production
- **Canary deploy:** Gradual rollout
- **Rollback:** Instant rollback
- **CI/CD:** Auto-deploy on commit
- **Secrets management:** API keys, encrypted
- **Environment variables:** Per-environment config

### 38.8 Collaboration (Week 8)
- **Multi-user editing:** Google Docs-style collaboration
- **Comments:** Comment on any node
- **Permissions:** RBAC (view, edit, admin)
- **Audit log:** Who changed what, when
- **Sharing:** Share via link, with permissions
- **Notifications:** Email/Slack notifications

### 38.9 Marketplace (Week 8)
- **Browse templates:** From Workflow Registry (Phase 34)
- **Browse agents:** From Agent Marketplace
- **Browse twins:** From Twin Registry (Phase 35)
- **Browse skills:** From SkillOS Marketplace
- **One-click install:** Install to your workspace
- **Rate & review:** 1-5 stars, written reviews
- **Publish:** Publish your own templates

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI STUDIO ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      AI STUDIO WEB (React)                    │  │
│  │  • Prompt Playground  • Workflow Builder  • Agent Builder    │  │
│  │  • Twin Designer  • RAG Configurator  • Eval Dashboard      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            │                                        │
│                            ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    API GATEWAY                                │  │
│  │  • Auth  • Rate limit  • Routing                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            │                                        │
│         ┌──────────────────┼──────────────────┐                    │
│         ▼                  ▼                  ▼                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  PROMPT      │  │  WORKFLOW    │  │  AGENT       │           │
│  │  SERVICE     │  │  SERVICE     │  │  SERVICE     │           │
│  │              │  │              │  │              │           │
│  │ • Playground │  │ • Builder    │  │ • Builder    │           │
│  │ • Library    │  │ • Templates  │  │ • Skills     │           │
│  │ • Versioning │  │ • Versioning │  │ • Tools      │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         │                  │                  │                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  TWIN        │  │  RAG         │  │  EVAL        │           │
│  │  DESIGNER    │  │  CONFIG      │  │  DASHBOARD   │           │
│  │  SERVICE     │  │  SERVICE     │  │  SERVICE     │           │
│  │              │  │              │  │              │           │
│  │ • Schema     │  │ • Sources    │  │ • Metrics    │           │
│  │ • Validation │  │ • Chunking   │  │ • Comparison │           │
│  │ • Registry   │  │ • Retrieval  │  │ • Alerts     │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         │                  │                  │                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  DEPLOY      │  │  COLLAB      │  │  MARKETPLACE │           │
│  │  SERVICE     │  │  SERVICE     │  │  SERVICE     │           │
│  │              │  │              │  │              │           │
│  │ • One-click  │  │ • Multi-user │  │ • Browse     │           │
│  │ • Canary     │  │ • Comments   │  │ • Install    │           │
│  │ • Rollback   │  │ • RBAC       │  │ • Rate       │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              STORAGE                                          │  │
│  │  • MongoDB (projects, metadata)  • S3 (artifacts)          │  │
│  │  • Redis (real-time collaboration)  • Git (versioning)     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              INTEGRATIONS                                     │  │
│  │  • LLM Gateway (Phase 11)  • RAG Engine (Phase 12)          │  │
│  │  • Agent OS (Phase 32)  • All Registries (Phases 33-36)     │  │
│  │  • Event Platform (Phase 37)  • Evaluation (Phase 31)       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

```
# Projects
POST   /api/studio/projects                  # Create project
GET    /api/studio/projects                  # List projects
GET    /api/studio/projects/:id              # Get project
PUT    /api/studio/projects/:id              # Update project
DELETE /api/studio/projects/:id              # Delete project

# Prompt Playground
POST   /api/studio/playground/execute        # Execute prompt
POST   /api/studio/playground/compare        # Compare models
POST   /api/studio/playground/save           # Save prompt
GET    /api/studio/playground/:id            # Get saved prompt

# Workflow Builder
POST   /api/studio/workflows                 # Create workflow
GET    /api/studio/workflows                 # List workflows
GET    /api/studio/workflows/:id             # Get workflow
PUT    /api/studio/workflows/:id             # Update workflow
POST   /api/studio/workflows/:id/test        # Test workflow
POST   /api/studio/workflows/:id/deploy      # Deploy workflow

# Agent Builder
POST   /api/studio/agents                    # Create agent
GET    /api/studio/agents                    # List agents
GET    /api/studio/agents/:id                # Get agent
PUT    /api/studio/agents/:id                # Update agent
POST   /api/studio/agents/:id/chat           # Test chat
POST   /api/studio/agents/:id/deploy         # Deploy agent

# Twin Designer
POST   /api/studio/twins                     # Design twin
GET    /api/studio/twins/:id                 # Get twin design
PUT    /api/studio/twins/:id                 # Update twin
POST   /api/studio/twins/:id/validate        # Validate schema
POST   /api/studio/twins/:id/publish         # Publish to registry

# RAG Configurator
POST   /api/studio/rag/configure             # Configure RAG
POST   /api/studio/rag/test                  # Test RAG
POST   /api/studio/rag/deploy                # Deploy RAG

# Evaluation Dashboard
GET    /api/studio/eval/metrics              # Get metrics
GET    /api/studio/eval/compare              # Compare models
GET    /api/studio/eval/alerts               # Get alerts

# Deployment
POST   /api/studio/deploy                    # Deploy to env
POST   /api/studio/rollback                  # Rollback
GET    /api/studio/deployments               # List deployments

# Collaboration
POST   /api/studio/projects/:id/share        # Share project
POST   /api/studio/projects/:id/comment      # Comment
GET    /api/studio/projects/:id/comments     # Get comments
```

---

## 🧪 Test Gates

- **Unit tests:** 80%+ coverage
- **Integration tests:** All endpoints + LLM Gateway integration
- **E2E tests:** Build prompt → Test → Save → Deploy (full flow)
- **UI tests:** Playwright E2E for visual builders
- **Performance test:** 1,000 concurrent users
- **Collaboration test:** Multi-user editing, no conflicts
- **Deployment test:** Deploy, rollback, canary all work

**Definition of Done:**
- [ ] All 9 deliverables complete (or MVP subset for 3-week version)
- [ ] All test gates pass
- [ ] Documentation: User guide, video tutorials
- [ ] AI Studio deployed at studio.hojai.ai
- [ ] 20 sample templates seeded
- [ ] 10 sample agents seeded
- [ ] Beta program with 10 customers

---

## 📊 Success Criteria

- **Adoption:** 10,000+ registered users in first 6 months
- **Engagement:** Avg 5+ projects per active user
- **Time to value:** "First AI agent deployed in <10 minutes"
- **Conversion:** 30% of free users become paid
- **NPS:** >50 (users love it)

---

## 🚀 MVP Strategy (3-Week MVP)

If 8 weeks is too long, here's a **3-week MVP** that ships the most critical 3 deliverables:

### Week 1: Prompt Playground
- Multi-model comparison (9 models)
- System prompt editor
- Token counter, cost calculator
- Save & share via URL

### Week 2: Workflow Builder
- Drag-and-drop canvas
- 5 node types (LLM, RAG, Code, HTTP, Conditional)
- Test inline
- One-click deploy

### Week 3: Agent Builder
- Visual agent composition
- Skill, tool, model pickers
- Test chat
- One-click deploy

The remaining 5 weeks add: Twin Designer, RAG Configurator, Evaluation Dashboard, Collaboration, Marketplace.

**Recommendation:** Start with 3-week MVP, ship to beta users, then build out remaining features based on feedback.

---

## 📚 Documentation Deliverables

- [ ] **User Guide** — How to use AI Studio
- [ ] **Prompt Guide** — How to write good prompts
- [ ] **Workflow Guide** — How to build workflows
- [ ] **Agent Guide** — How to build agents
- [ ] **Video Tutorials** — 50+ video tutorials
- [ ] **API Reference** — All endpoints
- [ ] **Best Practices** — Production-ready AI systems

---

## 🔗 Related Phases

- **Depends on:** Phases 11-37 (everything!)
- **Blocks:** Customer adoption
- **Related:** All other phases (AI Studio is the front door)

---

## 🌟 Why This Is Transformative

After Phase 38, HOJAI goes from "AI platform for engineers" to "AI platform for everyone." This unlocks:

1. **Business users can build their own AI:** Marketing manager builds email campaign agent without engineering
2. **10x faster prototyping:** Test AI ideas in minutes, not weeks
3. **Democratization:** AI is no longer gated by engineering capacity
4. **Viral growth:** Users share their AI projects, others clone and customize
5. **Stickiness:** Once you build 20 AI workflows in AI Studio, you never leave

**This is the front door of HOJAI AI.**

---

*Last Updated: June 22, 2026*
