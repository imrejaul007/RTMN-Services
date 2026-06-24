# RESUME INSTRUCTIONS - How to Continue the RTMN Autonomous Economy Plan

> **Purpose:** Quick-start guide for continuing work in a new chat session.
> **Created:** 2026-06-23
> **Status:** Planning complete. Execution in progress.

---

## The Plan (One Sentence)

**HOJAI is the Operating System for AI-Native Companies. Global Nexha is the Internet for Autonomous Businesses. BAM is the App Store. REZ is the economic layer. AgentFin is the financial OS. Together they form the infrastructure for the autonomous economy.**

## Files to Read FIRST (in priority order)

1. **`.claude/plans/40-phase-vs-6-phase-reconciliation.md`** - THE MASTER ROADMAP (7 phases, full mapping)
2. `.claude/plans/global-nexha-development-plan.md` - 18-month Phase D-I roadmap
3. `.claude/plans/hojai-platform-architecture-v2.md` - Blueprint + Compiler + Diff + Evolution
4. `.claude/plans/duplicate-prevention-audit.md` - 200+ services already built, do not duplicate
5. `.claude/plans/built-vs-needed-audit.md` - 75% built, 15-20% gap (the real work)
6. `.claude/plans/bam-complete-spec.md` - 35+ BAM categories
7. `.claude/plans/hojai-widget-spec.md` - Billion-dollar distribution channel

## All 22 Strategic Planning Docs (by tier)

### Tier 1: Core Roadmap (5 files)
- `40-phase-vs-6-phase-reconciliation.md` - THE MASTER ROADMAP
- `global-nexha-development-plan.md` - 18-month Phase D-I
- `global-nexha-addendum.md` - All spec gaps
- `hojai-platform-architecture-v2.md` - Blueprint + Compiler
- `hojai-platform-as-an-economy-5year-plan.md` - 5-year vision

### Tier 2: Component Specs (10 files)
- `hojai-developer-platform-spec.md` - 7 SDKs + CLI
- `hojai-widget-spec.md` - HOJAI Widget
- `developer-platform-gaps.md` - 12 developer platform pieces
- `bam-complete-spec.md` - 35+ BAM categories
- `phase3-startup-developer-plan.md` - HOJAI Studio for founders
- `rez-intelligence-local-economy.md` - REZ Intel + Local Nexha
- `blr-ai-marketplace-role.md` - BAM's role
- `skillos-usage.md` - SkillOS
- `strategic-moat-acp-positioning.md` - 5-layer moat + ACP
- `sample-marketplace-hojai-ai.md` - Sample hojai.ai.md

### Tier 3: Business + Audit (5 files)
- `d2c-agentic-commerce-model.md` - DO + REZ + ACS
- `agentic-marketing-playbook.md` - Marketing channels
- `built-vs-needed-audit.md` - 75% built, 15-20% gap
- `duplicate-prevention-audit.md` - What NOT to build
- `blr-marketplace-agent-inventory.md` - 1200+ items

### Tier 4: Investor + Samples (2 files)
- `hojai-investor-pitch-deck.md` - HOJAI pitch ($28M)
- `nexha-investor-pitch-deck.md` - Nexha pitch ($50M)

## The 7 Phases (Master Roadmap)

```
Phase 0: Internal Foundation (15 weeks, parallel with D) - HOJAI AI production-ready
Phase D: Network Foundation (M1-3)
Phase E: Reputation Flywheel (M4-6)
Phase F: Opportunity Engine (M7-9)
Phase G: Federation at Scale (M10-12)
Phase H: AIO Industry (M13-15)
Phase I: Autonomous Economy (M16-18)
```

See `40-phase-vs-6-phase-reconciliation.md` for the complete task-to-phase mapping.

## State of Work (as of last commit)

**Last commit:** `9aa20878d` - "feat: wire REZ Intelligence into merchant-agents"

**Done:**
- 22 strategic planning docs in `.claude/plans/` (all committed, all pushed to origin)
- REZ Intelligence Integration service (port 5370) - BUILT
- merchant-agents (port 4737) - WIRES to REZ Intelligence with 6 new endpoints, 10 tests passing
- Phase 0 planned (LLM billing, observability, eval pipeline - 40-phase #1-10)
- Master 40-phase vs 6-phase reconciliation complete

**Not yet done (priority order):**
1. Wire REZ Intelligence into OTHER SUTAR agents (sales, support, procurement, finance)
2. Build @hojai/foundation SDK v1 (2-3 weeks) - the foundation
3. Build the 30-minute killer demo (4-6 weeks) - the single most leveraged thing
4. Build HOJAI Widget MVP (8-12 weeks) - billion-dollar distribution
5. Build nexha-autonomous-logistics (8 weeks) - fills KHAIRMOVE gap
6. Build the 16 AI Employees (6 weeks) - the killer BAM category

## Quick Status Check Commands

```bash
# Branch and recent commits
git branch --show-current && git log --oneline -5

# Uncommitted changes
git status --short

# REZ Intel service (port 5370)
curl -s http://localhost:5370/api/v1/health

# merchant-agents (port 4737)
curl -s http://localhost:4737/info

# Run tests
cd companies/HOJAI-AI/sutar-os/agents/merchant-agents
node --test src/__tests__/rez-intel-client.test.js
```

## How to Resume Work in a New Chat

### Option A: Quick Status Check

Use this prompt to get a status report:

```
Read these files and give me a status report:
- .claude/plans/40-phase-vs-6-phase-reconciliation.md
- .claude/plans/RESUME-INSTRUCTIONS.md
- Run: git log --oneline -10
- Run: git status
- Run: curl -s http://localhost:5370/api/v1/health
- Run: curl -s http://localhost:4737/info

Tell me:
1. What branch and last commit
2. What has been built vs what has not
3. Highest-leverage next step
4. Any blockers
```

### Option B: Continue Specific Work

Use this prompt:

```
I am working on the RTMN Autonomous Economy Plan. Planning is complete.

FIRST: Read these files in order:
1. .claude/plans/40-phase-vs-6-phase-reconciliation.md (master roadmap)
2. .claude/plans/built-vs-needed-audit.md (what is built)
3. .claude/plans/duplicate-prevention-audit.md (what NOT to build)

CURRENT STATE:
- Branch: feat/skill-os-app-store-parent
- Last commit: 9aa20878d (REZ Intel wired into merchant-agents)
- REZ Intelligence Integration service: BUILT at port 5370
- merchant-agents: WIRED with 10 tests passing

WHAT I WANT TO DO NOW:
[YOUR TASK HERE]

RULES:
- Do not re-plan, the plan is complete
- Read relevant docs before building
- Verify against duplicate-prevention audit
- Use Blueprint Engine + HOJAI Foundation SDK patterns
- Commit to git after each step
```

### Option C: Start a New Phase

```
I am starting Phase [D/E/F/G/H/I] of the RTMN Autonomous Economy Plan.

FIRST: Read these files in order:
1. .claude/plans/40-phase-vs-6-phase-reconciliation.md (master roadmap)
2. .claude/plans/built-vs-needed-audit.md

THEN: Start with [SPECIFIC TASK] in Phase [X].
```

## Code Locations (where things actually live)

| Path | What | Status |
|---|---|---|
| `companies/HOJAI-AI/` | HOJAI AI products (17+ products, 200+ services) | Built |
| `companies/Nexha/services/` | Nexha network services (19 services) | Built |
| `companies/RABTUL-Technologies/` | 200+ REZ services + AgentFin (15 services) | Built |
| `companies/HOJAI-AI/blr-ai-marketplace/` | BAM (8 backend services, 1200+ items) | Built |
| `companies/RABTUL-Technologies/rez-intelligence-integration/` | REZ Intel Integration (port 5370) | Built |
| `companies/HOJAI-AI/sutar-os/agents/merchant-agents/` | First REZ-Intelligence-wired SUTAR agent | Built |

## The Master Tagline

> HOJAI is the Operating System for AI-Native Companies. Global Nexha is the Internet for Autonomous Businesses. BAM is the App Store. REZ is the economic layer. AgentFin is the financial OS. Together they form the infrastructure for the autonomous economy.

## Common Pitfalls to Avoid

1. **Do not re-plan** - The plan is complete in the docs. Just execute.
2. **Do not build what is already built** - 200+ services exist. Read the duplicate-prevention audit.
3. **Do not skip tests** - Every new service needs tests from day 1.
4. **Do not commit half-done work** - Commit at logical milestones.
5. **Do not lose context** - Read the relevant planning doc before starting a task.
