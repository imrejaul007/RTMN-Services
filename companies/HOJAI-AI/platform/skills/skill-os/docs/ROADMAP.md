# SkillOS — Roadmap

**Date:** 2026-06-23
**Current phase:** 1 (✅ shipped)
**Next:** Phase 2

---

## What Phase 1 shipped (June 23, 2026)

A real "App Store for AI" foundation with 53 routes, 140 tests, and a complete data model for the vision. The 4 advertised features that were stubs are now real. The 3 structural gaps (Hub route, event-bus, persistence story) are closed. The new layers (multi-asset, install, certification, billing, governance) are in place as the foundation for everything Phase 2+.

**What was honestly NOT shipped:**
- Real money (no Stripe, no REZ Wallet)
- Real certification queue (data is real, workflow is stub)
- Per-tenant isolation enforcement (tenantId field exists, read/write filtering is Phase 2)
- Cross-tenant federation
- Public web UI
- TS / Python / curl SDKs
- Semantic vector search / recommendations
- Federation / public marketplace
- Per-tenant usage metering
- 4 of 10 asset types (model-adapter, automation-pack, industry-pack, enterprise-pack) need their first-class entities

---

## Phase 2 — Multi-week (next session)

Estimated: 2-3 weeks of focused work.

### 1. Real certification queue (1 week)
- New service: `certification-queue` (port 4744)
- Reviewer UI: web form, escalation, audit trail
- Replace the `POST /api/assets/:id/certify` stub with a real workflow
- Levels: community → verified → enterprise → government → hojai-certified
- Each level has different evidence requirements (code review, security scan, deployment history)

### 2. Real payment integration (1 week)
- Stripe checkout for one-time purchases
- REZ Wallet (port 4004) for in-app credit spending
- Replace `POST /api/billing/charge` stub with real payment
- Developer payout calculation
- Failed-payment handling, refunds, dispute flow

### 3. CLI: `hojai skill ...` (3 days)
- Node CLI: `hojai skill publish`, `hojai skill install`, `hojai skill search`, `hojai skill test`
- Uses the existing API
- Reads OpenAPI spec for command structure
- Ship via npm: `npm install -g @hojai/cli`

### 4. TypeScript SDK (2 days)
- Auto-generated from `/openapi.json`
- `npm install @hojai/skills-sdk`
- Typed client for all 53 routes

### 5. Semantic search (3 days)
- Embed skill descriptions via ai-intelligence (4881)
- Store in a vector index (pgvector or in-memory)
- "You might need…" recommendations
- Search by intent, not just keywords

### 6. Per-tenant isolation (2 days)
- Wire `req.tenant.companyId` into all read/write paths
- Filter installs, transactions, audit by tenant
- Add `?tenantId=` filter to all list endpoints
- Per-tenant rate limits

### 7. Cross-tenant sharing (2 days)
- Org-level visibility: `visibility: 'org-only'`
- "Share with franchisees" flow
- Federation hooks: `origin` field on every asset

### 8. Pin version semantics (1 day)
- `installed.version` vs `latestVersion`
- Automatic update opt-in
- Rollback endpoint: `POST /api/installed/:id/rollback`

---

## Phase 3 — Multi-month

Estimated: 2-3 months.

### 1. All 10 asset types wired
Add first-class entities for the 4 missing: `model-adapter`, `automation-pack`, `industry-pack`, `enterprise-pack`. Each gets a dedicated install flow.

### 2. Federation
- Cross-org skill sharing
- Public marketplace as a separate service that aggregates from N private SkillOS instances
- Standards body: draft a v1 Skill Interchange Format (SIF) for portability across HOJAI + third-party registries

### 3. Compliance certification
- Real GDPR/SOC2/HIPAA per-asset attestations
- Scan pipelines (static analysis, dependency check, secret detection)
- Compliance dashboard: which assets are certified for which frameworks

### 4. AI Credits economy
- Credits-as-currency (1 credit = 1¢)
- Dev earnings dashboard, payouts
- Free credits for new users, paid top-ups
- Enterprise credit pools

### 5. Public API + rate limits per tier
- Free: 1k req/day
- Pro: 100k req/day
- Enterprise: custom
- HOJAI-certified: unlimited (with quota)

### 6. Skill creation from natural language
- "Build me a skill that does X" → ai-intelligence generates a draft skill
- Calls `/api/skill-templates` + `/api/skills` to publish
- Auto-validates against the certification queue

### 7. Public marketplace as a separate service
- `marketplace-public` aggregates from internal SkillOS instances
- Has its own ratings/reviews/discovery surface
- Different from the internal Hub route

### 8. Usage metering
- Counter for pay-per-execution, billed monthly
- Sent to REZ Wallet for settlement
- Per-tenant usage dashboards

---

## Phase 4 — Strategic (12+ months)

These come from the [5-year HOJAI plan](../../../.claude/plans/hojai-platform-as-an-economy-5year-plan.md):

### 1. Skill Economy revenue model
Revenue share with publishers, AI credits as a real currency, billing integration with HOJAI Cloud.

### 2. Skill-as-IP marketplace
Developers treat skills as portfolio assets, transfer/sell ownership, royalties.

### 3. Government / regulated industries
Separate compliance flow, audit-grade logging, FedRAMP-style controls.

### 4. Skill exchange
Devs swap skills, peer-review process, "skill of the month" program.

### 5. AI skill composition AI
Meta-skill that composes other skills, AI-orchestrated skill selection at runtime. The killer feature: an AI that picks the right skill for the moment, the same way a senior dev picks the right library.

---

## Open questions for product / strategy

These need product input before they're scoped:

1. **Pricing tiers** — Free / Pro / Enterprise — what do they include?
2. **Certification SLAs** — How long does it take to get from community to hojai-certified?
3. **Refund policy** — When can a buyer get refunded? Who eats the fee?
4. **Data residency** — Does a "tenant" mean a company, a workspace, or a region?
5. **Sandbox safety** — Is the VM sandbox safe enough for untrusted code? (Real answer: probably not — Phase 3 needs an isolate/wasm runtime.)
6. **Federation identity** — If SkillOS federates across N orgs, is the identity per-org or global (CorpID)?

---

*This roadmap will be updated as Phase 2 starts. Phase 1 acceptance criteria: 140/140 tests pass, all 4 stubs are real, multi-asset registry works, install flow works, billing transactions record, certification is settable, audit is persistent, OpenAPI is generated.*
