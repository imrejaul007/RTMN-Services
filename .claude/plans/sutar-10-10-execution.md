# SUTAR OS — Master Plan: 0/10 → 10/10

**Goal:** Take SUTAR OS from its current (broken) state to genuine production-grade, with proper architectural refactor and the Agent Teaming differentiator.

**Date:** 2026-06-21
**Scope:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/sutar-os/` (26 services)
**External dependencies:** MongoDB (planned), `companies/HOJAI-AI/shared/` (existing)
**External consumers:** RTMN Hub (4399), REZ, Genie, Do-App, Nexha, twin-os

---

## 📍 Starting State — Audited Reality

After three rounds of audit and code reading, here's what's actually true:

| # | Claim from previous audits | Reality |
|---|---|---|
| 1 | 0/143 auth-protected | ❌ Wrong. 141/143 are auth-protected in **source** via `require('@rtmn/shared/auth')` |
| 2 | All services start cleanly | ❌ Wrong. **25 CJS services crash on startup** with `Cannot find module '@rtmn/shared/lib/env'` |
| 3 | agent-economy has 0% auth | ⚠️ Half-right. Service defines `requireAuth` but **never applies it** to the router routes in `routes/economy.js` and `routes/payments.js` — so the 7 money-mutation routes are public |
| 4 | 0 services use rate limiting | ✅ True (1/26 = `agent-twin` only) |
| 5 | 11/26 services have helmet+CORS | ✅ True (all `core/` + a few others) |
| 6 | 0 services have input validation | ✅ True (no `joi`/`zod`/`validateInput`) |
| 7 | 0 services persist state | ✅ True (all use `new Map()`) |
| 8 | Wallet limits unenforced | ✅ True (defined but never checked) |
| 9 | Port 4155 has 2 services | ✅ True (agentNetwork + rezBridge) |
| 10 | Status `live` is hardcoded | ✅ True |
| 11 | No Agent Teaming capability | ✅ True (only 6 orchestration patterns, no team formation) |
| 12 | SUTAR owns wallets, karma, reputation | ✅ True (scope violation per the refactor plan) |

**Starting score: 4-5/10** (good design, no execution)

---

## 🏁 Plan Overview

8 phases. Each phase is independently shippable. Earlier phases unblock later ones.

```
Phase 0  → Library resolves (unblock everything else)
Phase 1  → Security hardening (auth + rate limit + validation)
Phase 2  → Persistence (MongoDB)
Phase 3  → Enforce wallet limits
Phase 4  → Gateway correctness
Phase 5  → Architectural refactor (move scope-violating services)
Phase 6  → Agent Teaming (the 10/10 differentiator)
Phase 7  → Polish, docs, public ACP spec
Phase 8  → Automation hardening (the scripts that automate this)
```

**Total effort:** ~50-65 hours. With 3 engineers in parallel, **~1-2 weeks**.

---

## Phase 0 — Library Resolution (BLOCKER, 1-2 hrs)

**The #1 problem:** 25 CJS services import `@rtmn/shared/*` but the package isn't in their `package.json` and isn't linked. Result: every service crashes on startup.

### Step 0.1 — Create a workspace root for SUTAR

Create `companies/HOJAI-AI/sutar-os/package.json`:
```json
{
  "name": "@rtmn/sutar-os",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "agents/*",
    "contracts/*",
    "core/*",
    "economy/*"
  ]
}
```

### Step 0.2 — Add `@rtmn/shared` as a file: dependency to all 25 CJS service package.json files

For each service's `package.json`, add:
```json
"dependencies": {
  "express": "^5.2.1",
  "uuid": "^14.0.0",
  "@rtmn/shared": "file:../../shared",
  "helmet": "^7.1.0",
  "cors": "^2.8.5",
  "express-rate-limit": "^7.1.5"
}
```

Path arithmetic:
- `agents/agent-wallets/package.json` → `../../shared` (up to `sutar-os`, up to `HOJAI-AI`, into `shared`)
- `core/sutar-gateway/package.json` → `../../shared` (same)
- `economy/trust-network/package.json` → `../../shared` (same)

All 25 services are 3 levels deep from the HOJAI-AI root.

### Step 0.3 — Add `@rtmn/shared` to `agent-economy` (ESM)

It already imports `@rtmn/shared/lib/env` and `@rtmn/shared/auth` via ESM `import` statements. Add to its `package.json`:
```json
"@rtmn/shared": "file:../../shared"
```

### Step 0.4 — Run `npm install` at sutar-os root

Verify with a smoke loop:
```bash
for svc in agents/agent-wallets core/sutar-gateway economy/trust-network; do
  (cd "$svc" && node -e "require('@rtmn/shared/auth'); require('@rtmn/shared/lib/env'); console.log('OK: $svc')")
done
```

### Step 0.5 — Add `helmet` + `cors` deps preemptively to all services

We'll need them in Phase 1. Adding now means one `npm install` not 25.

**Acceptance:**
- All 26 services start without `Cannot find module` errors
- `require('@rtmn/shared/auth')` works from every service
- No service references any path that doesn't resolve

---

## Phase 1 — Security Hardening (4-6 hrs)

### Step 1.1 — Fix `agent-economy`'s dead `requireAuth` (real bug)

File: `agents/agent-economy/src/index.js`

The service defines `requireAuth` (line 186) but never mounts it on the router routes. Fix:

```js
// Add at line 94 (after the routers are mounted)
app.use('/api/economy', requireAuth, economyRoutes);
app.use('/api/payments', requireAuth, paymentRoutes);
```

But this would break the internal auth endpoints. Better:
- Apply `requireAuth` selectively to the karma/payment routes, not the whole router
- OR: add auth middleware inside the route files themselves

Preferred: add per-route in `routes/economy.js` and `routes/payments.js`:
```js
router.post('/karma/award', requireAuth, async (req, res) => { ... });
router.post('/karma/burn', requireAuth, async (req, res) => { ... });
router.post('/slb/stake', requireAuth, async (req, res) => { ... });
router.post('/slb/slash', requireAuth, async (req, res) => { ... });
// (and similar for payments.js)
```

The local `requireAuth` works for `agent-economy` — keep using it (don't replace with `@rtmn/shared` — different token format).

### Step 1.2 — Add `helmet` + `cors` to the 14 services missing them

Services missing: `agent-contracts`, `agent-learning`, `agent-marketplace`, `agent-orchestration`, `agent-reputation`, `agent-wallets`, `merchant-agents`, `acp-protocol`, `acn-network`, `acn-hub`, `acn-integration`, `agent-analytics`, `dispute-resolution`, `negotiation-ai`

Pattern:
```js
const helmet = require('helmet');
const cors = require('cors');
app.use(helmet());
app.use(cors());
```

### Step 1.3 — Add rate limiting to all 25 services

Pattern:
```js
const rateLimit = require('express-rate-limit');
const defaultLimiter = rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true });
const strictLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true });
app.use(defaultLimiter);
// For money paths:
app.use('/api/wallets', strictLimiter);
```

Apply `defaultLimiter` globally, `strictLimiter` on money-mutation prefixes:
- `/api/wallets/*`, `/api/escrow/*`
- `/api/economy/payments/*`, `/api/economy/karma/*`, `/api/economy/slb/*`
- `/api/contracts/*`
- `/api/disputes/*`
- `/api/negotiations/*/accept`, `/api/negotiations/*/order`
- `/api/reputation/*/verify`, `/api/reputation/*/block`

### Step 1.4 — Add input validation to all mutations

Two options:
- (A) Use the built-in `validateInput` from `@rtmn/twinos-shared` (already exists)
- (B) Add `joi` schemas per service

**Recommend (A) — already a HOJAI library, no new dep.**

But `@rtmn/twinos-shared` is ESM. CJS services would need `await import('@rtmn/twinos-shared')` or use a CJS wrapper. Simpler:

Create a thin CJS wrapper in `@rtmn/shared/lib/validation.js` that mirrors `twinos-shared`'s `validateInput` (it already has the same name and signature). Then add to `@rtmn/shared/package.json` exports.

Priority validations (most critical first):

1. **Money paths** — `agent-wallets`:
   - `deposit`: `{ amount: { type: 'number', min: 0.01 }, currency: { type: 'enum', values: ['USD','EUR','GBP','INR','AED','SGD'] } }`
   - `withdraw`: same
   - `pay`: same + `toAgentId: { type: 'string', required: true, min: 1, max: 100 }`
   - `escrow`: same
   - `release`: `releaseToAgentId: required string`
   - `refund`: `reason: optional string max 500`

2. **Karma/SLB paths** — `agent-economy`:
   - `karma/award`: `amount: number min 1`, `corpId: required string`
   - `karma/burn`: same
   - `slb/stake`: `amount: number min 1`, `corpId: required`
   - `slb/slash`: same + `reason: required string`

3. **ACP message validation** — `acp-protocol`:
   - `POST /api/negotiations`: `buyerAgent, sellerAgent: required strings`
   - `POST /api/negotiations/:id/quote`: validate against `MESSAGE_TYPES.QUOTE.required`
   - `POST /api/negotiations/:id/counter`: validate against `MESSAGE_TYPES.COUNTER.required`
   - etc. for all 8 message types

4. **Reputation paths** — `agent-reputation`:
   - `verify`: `agentId` must be string, `verifiedBy: optional string`
   - `block`: `reason: optional string max 500`

5. **Marketplace** — `agent-marketplace`:
   - `listings`: `name, description: required strings`, `price: number min 0`

6. **Contracts** — `agent-contracts`, `sutar-contracts`:
   - `contracts`: `parties: array of strings min length 2`, `terms: object`

7. **Disputes** — `dispute-resolution`:
   - `disputes`: `transactionId, complainant, respondent: required strings`
   - State transitions: validate `currentState` allows the transition (state machine)

### Step 1.5 — Apply `defaultLimiter` to the gateway

`core/sutar-gateway` should rate-limit `/api/sutar/*` traffic, even though individual services do too. Defense in depth.

### Step 1.6 — Fix the broken `scripts/audit-auth.js`

The script has an ESM/CJS bug. Fix it: either rename to `audit-auth.mjs` OR convert to CJS OR add `"type": "module"` to a `scripts/package.json`.

**Acceptance:**
- Every service starts and accepts requests
- Every mutation returns 401 without auth
- Money paths return 429 after 20 req/min
- Invalid input returns 400 with clear errors
- `node scripts/audit-auth.js` exits 0

---

## Phase 2 — Persistence (MongoDB via Mongoose, 6-8 hrs)

### Step 2.1 — Add Mongoose models for each service

**Pattern (per service):**

Create `models/Wallet.js`, `models/Transaction.js`, etc. in each service. Use `@rtmn/shared/lib/database` for connection.

**Order (by criticality):**

1. **agent-wallets** — financial state, money loss on restart
   - `Wallet` { walletId, agentId, balances: Map, limits, status, frozen, frozenReason, stats, createdAt, updatedAt }
   - `Transaction` { txId, walletId, type, amount, currency, counterparty, status, createdAt }
   - `Escrow` { escrowId, walletId, amount, currency, contractId, status, heldAt, releasedAt, releasedTo }

2. **agent-reputation** — trust wipe on restart
   - `Reputation` { agentId, overall, factors, stats, badges, level, verified, blocked, riskFlags }
   - `TransactionRecord` { recordId, agentId, type, success, amount, createdAt }
   - `DisputeRecord` { disputeId, agentId, status, reason, evidence, resolution }

3. **agent-economy** — karma wipe
   - `KarmaAccount` { corpId, balance, lifetime, level }
   - `SLB` { corpId, staked, slashed, atStake }
   - `Transaction` { txId, corpId, type, amount, balanceBefore, balanceAfter, createdAt }

4. **agent-contracts** — active contract state
   - `Contract` { contractId, parties, terms, signatures, status, escrowRef }

5. **dispute-resolution** — in-flight disputes
   - `Dispute` { disputeId, complainant, respondent, transactionId, reason, evidence, status, mediator, resolution }

6. **acp-protocol** — in-flight negotiations
   - `Negotiation` { negotiationId, buyerAgent, sellerAgent, state, messages, offer, createdAt }

7. **agent-orchestration, agent-learning, negotiation-ai** — workflow state
8. **Everything else** — defer to incremental migration

### Step 2.2 — Backward compatibility (in-memory fallback)

If `MONGODB_URI` not set, fall back to `new Map()`. This matches the existing pattern in `agent-twin` and `agent-economy`. Don't break local dev.

### Step 2.3 — Env configuration

Create `sutar-os/.env.example`:
```
MONGODB_URI=mongodb://localhost:27017/rtmn_sutar
JWT_SECRET=<32+ chars>
SERVICE_NAME=...
```

### Step 2.4 — Connect on startup

Every service:
```js
const { connectDB } = require('@rtmn/shared/lib/database');
connectDB().then(() => app.listen(PORT, ...));
```

**Acceptance:**
- `MONGODB_URI` not set → service starts in in-memory mode (backward compat)
- `MONGODB_URI` set → state persists across `kill -9` + restart
- Models have indexes on lookup fields (agentId, walletId, corpId, etc.)

---

## Phase 3 — Enforce Wallet Limits (1-2 hrs)

### Step 3.1 — Add limit checks to `deposit` and `withdraw`

File: `agents/agent-wallets/src/index.js`, in `deposit()` and `withdraw()`:

```js
function checkLimits(wallet, amount) {
  if (amount > wallet.limits.perTransactionLimit) {
    throw new ForbiddenError(`Exceeds per-transaction limit of ${wallet.limits.perTransactionLimit}`);
  }
  if (wallet.limits.dailyUsed + amount > wallet.limits.dailyLimit) {
    throw new ForbiddenError(`Exceeds daily limit of ${wallet.limits.dailyLimit}`);
  }
  if (wallet.limits.monthlyUsed + amount > wallet.limits.monthlyLimit) {
    throw new ForbiddenError(`Exceeds monthly limit of ${wallet.limits.monthlyLimit}`);
  }
}
```

### Step 3.2 — Add daily/monthly reset

On each deposit/withdraw, check if the date has changed since `dailyResetAt` / `monthlyResetAt`. If so, reset `dailyUsed` / `monthlyUsed`.

### Step 3.3 — Apply to escrow operations

Same checks for `holdEscrow`, `releaseEscrow`, `refundEscrow`.

### Step 3.4 — Expose `GET /api/wallets/:id/limits`

Returns current usage and remaining capacity.

**Acceptance:**
- Depositing above `perTransactionLimit` returns 403
- Sequential deposits that exceed `dailyLimit` return 403 after threshold
- `dailyUsed` resets at midnight UTC

---

## Phase 4 — Gateway Correctness (2-3 hrs)

### Step 4.1 — Fix port 4155 collision

`sutar-gateway/src/index.js` line 55-56:
- `agentNetwork`: 4155 (real)
- `rezBridge`: 4155 (ghost, no service exists)

**Fix:** Remove `rezBridge` from the `SERVICES` map. If a REZ bridge is needed later, give it a real port and a real service.

### Step 4.2 — Make `status: 'live'` dynamic

Currently hardcoded. Refactor:
- `status` field removed from static `SERVICES` map
- `/api/sutar/status` runs health probes, returns live/offline/error per service
- Cache probe results for 30s
- The aggregated `live` count comes from real probe results

### Step 4.3 — Add auth to the gateway

The gateway is the front door. Add:
- `INTERNAL_API_KEY` env var
- All `/api/sutar/*` mutations require `X-Internal-API-Key: <key>` header
- Health, status, services, layers (read-only) stay public
- Update internal callers (monitoring, other services) to send the key

### Step 4.4 — Improve error reporting

`app.all('/api/sutar/:service/:path(*)')` currently swallows content-type errors. Add:
- 415 Unsupported Media Type for non-JSON bodies
- Pass through `Content-Type` header from caller to downstream
- Use `req.pipe(downstreamReq)` for streaming bodies (optional, nice-to-have)

**Acceptance:**
- `/api/sutar/status` reflects real health (live count matches `curl localhost:<port>/health` on each)
- `rezBridge` entry is gone
- POST to gateway without `X-Internal-API-Key` returns 401
- Sending non-JSON body to a JSON-only downstream returns 415

---

## Phase 5 — Architectural Refactor (8-12 hrs)

This is the scope-cleanup the design doc called for. Three services move out of SUTAR into their proper homes.

### Step 5.1 — Move `agent-wallets` → `economy/wallet-service`

**From:** `sutar-os/agents/agent-wallets/`
**To:** `platform/economy/wallet-service/`
**Port:** 4840 (unchanged) or reassign to 4253 to fit economy layer
**Renames:** `@rtmn/agent-wallets` → `@hojai/wallet-service`
**No internal cross-service require()** — verified, services talk via HTTP. So only HTTP URLs need updating.

**Files to update:**
- `sutar-os/core/sutar-gateway/src/index.js`: update SERVICES entry
- `sutar-os/contracts/dispute-resolution/src/index.js`: `AGENT_WALLETS_URL` → `WALLET_SERVICE_URL`
- `sutar-os/agents/merchant-agents/src/index.js`: if it calls wallets
- `sutar-os/agents/acn-integration/src/index.js`: same
- Anything else referencing port 4840

### Step 5.2 — Move `agent-economy` (karma/SLB) → `economy/economy-os`

**From:** `sutar-os/agents/agent-economy/`
**To:** `platform/economy/economy-os/`
**Port:** 4251 (unchanged)
**Renames:** `rtmn-agent-economy` → `@hojai/economy-os`

**Files to update:** Update SERVICE URLs that reference 4251.

### Step 5.3 — Create `platform/trust/trust-os` and move reputation + trust-network

**New dir:** `platform/trust/trust-os/`
**From:**
- `sutar-os/agents/agent-reputation/` (port 4820) → `platform/trust/trust-os/services/reputation/`
- `sutar-os/economy/trust-network/` (port 4149) → `platform/trust/trust-os/services/trust-network/`
- `sutar-os/contracts/dispute-resolution/` (port 4847) → `platform/trust/trust-os/services/dispute-resolution/`

**Becomes the unified Trust OS** for agents, humans, organizations, content.

**Files to update:** All references to ports 4820, 4149, 4847.

### Step 5.4 — Slim down SUTAR OS to its core

After moves, SUTAR OS contains:

**Agent Runtime & Collaboration (the new scope):**
- `sutar-gateway` (4140) — front door
- `sutar-monitoring` (3100) — observability
- `sutar-identity` (4144) + `sutar-agent-id` (4145) — identity
- `sutar-twin-os` (4142) + `sutar-memory-bridge` (4143) — twin/memory views
- `sutar-agent-network` (4155) — topology
- `acp-protocol` (4800) + `acn-network` (4801) + `acn-hub` (4852) — protocol + registry
- `negotiation-ai` (4850) + `dispute-resolution` (moved in Phase 5.3) — wait, dispute moved to trust-os
- `sutar-contracts` (4185) — SUTAR-specific templates (distinct from agent-contracts at 4830, which is moving to trust-os)
- `merchant-agents` (4810) — the merchant AI agents (SUTAR's unique contribution)
- `agent-marketplace` (4845) — discovery of agents
- `agent-orchestration` (4851) + `agent-learning` (4846) — multi-agent workflows
- `agent-twin` (3000) — agent digital twin
- `agent-analytics` (4848) — metrics
- `acn-integration` (4849) — RTMN bridge

That's **~16 services** (down from 26), all serving the "Agent Runtime & Collaboration" mission.

### Step 5.5 — Update CLAUDE.md, gateway docs, port registry

- Update the canonical port registry (`CANONICAL-PORT-REGISTRY.md`)
- Update SUTAR CLAUDE.md with new architecture diagram
- Update RTMN Hub (4399) routes to point to new service locations
- Update start scripts (`start-all.sh`)

**Acceptance:**
- SUTAR OS contains only agent-collaboration concerns
- Wallets/Karma/Trust live in their proper OS layers
- No duplicate code between SUTAR and the new homes
- All cross-service HTTP calls still work
- All 26 CLAUDE.md files reflect the new locations

---

## Phase 6 — Agent Teaming (16-20 hrs, the differentiator)

This is the 10/10 feature. Move SUTAR from "agent communication" to "agent organization."

### Step 6.1 — Create the `agent-teaming` service

**Path:** `sutar-os/agents/agent-teaming/`
**Port:** 4190 (free in the SUTAR range)
**Stack:** Express + Mongoose + the standard shared middleware

### Step 6.2 — Domain model

```js
// Team
{
  teamId, mission, industry, status,
  leaderId, // elected
  members: [{ agentId, role, capabilities, joinedAt, status }],
  taskDag: { nodes: [Task], edges: [Dependency] },
  createdAt, disbandedAt
}

// Task
{
  taskId, requiredCapability, assignedAgentId,
  status: 'pending' | 'in_progress' | 'completed' | 'failed',
  dependencies: [taskId],
  result, error, startedAt, completedAt
}
```

### Step 6.3 — Team formation endpoint

`POST /api/teams`

Request:
```json
{
  "mission": "restaurant_order_fulfillment",
  "industry": "restaurant",
  "requiredCapabilities": ["inventory_check", "kitchen", "delivery", "review"],
  "context": { "orderId": "ORD-123" }
}
```

Process:
1. Look up mission template (Step 6.7)
2. Discover available agents via `acn-network` (4801) by capability
3. Score candidates: trust (from trust-os), load (from monitoring), recency
4. Elect leader (highest score + required leadership capability)
5. Assign subtasks to team members
6. Return team with `teamId, leaderId, members, taskDag`

### Step 6.4 — Leader election

Two paths:
- **Automatic:** On team formation, leader = highest trust score + required capability
- **Manual override:** `POST /api/teams/:id/leader` (admin only, or with explicit auth)

The leader has authority to:
- Reassign subtasks
- Broadcast to team
- Disband team (with confirmation)

### Step 6.5 — Task decomposition

Leader receives mission, breaks into DAG of subtasks. Each subtask has:
- `taskId`
- `requiredCapability`
- `assignedAgentId`
- `dependencies: [taskId]`
- `status`, `result`, `error`, timestamps

DAG is topologically sorted on creation. Leader can add/modify subtasks during execution.

### Step 6.6 — Inter-agent delegation via ACP

Subtask execution = ACP message to assigned agent:
- `QUERY`: "execute task X with context Y"
- `ACCEPT`: agent confirms it can do it
- `ORDER`: leader formalizes
- `TRACK`: status updates
- `RESULT`: subtask completed (delivered as a new ACP message type or extended `ORDER`)

`POST /api/teams/:teamId/tasks/:taskId/delegate` — reassign if current agent fails

### Step 6.7 — Progress synchronization

Heartbeat protocol:
- Every 5s, all team members report subtask status
- Leader aggregates → `team.progress = completedTasks / totalTasks`
- Stale tasks (> 30s no progress) flagged
- `/api/teams/:id/status` returns full DAG state

### Step 6.8 — Failure recovery

Detection:
- Task timeout (configurable, default 60s)
- Agent heartbeat missing
- Explicit error report

Recovery:
- If assigned agent failed → re-delegate to another team member with same capability
- If no team member available → recruit from `agent-marketplace`
- If leader failed → re-elect (highest remaining trust)
- If team under-staffed → emergency recruitment

### Step 6.9 — Mission templates (5+ industries)

Built-in templates:
- `restaurant_order_fulfillment` — inventory → kitchen → delivery → review
- `hotel_booking` — availability → reservation → payment → confirmation
- `retail_purchase` — catalog → cart → payment → fulfillment → support
- `healthcare_appointment` — scheduling → insurance → confirmation
- `event_coordination` — venue → catering → entertainment → cleanup

Template format:
```yaml
mission: restaurant_order_fulfillment
subtasks:
  - capability: inventory_check
  - capability: kitchen
    depends_on: [inventory_check]
  - capability: delivery
    depends_on: [kitchen]
  - capability: review
    depends_on: [delivery]
```

### Step 6.10 — SDK

Publish:
- Node.js SDK: `@hojai/team-sdk`
- Python SDK: `hojai-teams`
- CLI: `hojai team create --mission <mission> --context <json>`

**Acceptance:**
- A `POST /api/teams` with `mission: restaurant_order_fulfillment` returns a complete team
- A failed subtask is automatically re-delegated
- Leader re-election works when the leader disconnects
- 5+ mission templates work end-to-end
- SDK can be used from a third-party script

---

## Phase 7 — Polish, Docs, Public ACP Spec (3-4 hrs)

### Step 7.1 — Per-service CLAUDE.md refresh

Run a script `gen-claudemd.js` that generates CLAUDE.md for each service from:
- package.json (name, description, port, deps)
- Source file (route list, auth model, persistence)
- Registry data

### Step 7.2 — Publish ACP spec

File: `sutar-os/agents/acp-protocol/SPEC.md`

Content:
- 8 message types with JSON schemas
- 12 negotiation states with valid transitions (state machine diagram)
- 7 message transitions (`nextValid` field)
- Extension points
- Versioning policy
- Conformance test suite reference

This is the moat — make it public and versioned (semver).

### Step 7.3 — End-to-end smoke test

`scripts/e2e-smoke.sh`:
1. Start CorpID (4702), gateway (4140), all 16 SUTAR services
2. Start trust-os, economy-os if separate
3. POST `/auth/register` to economy
4. POST `/api/merchants` to merchant-agents
5. POST `/api/wallets` to wallet-service
6. POST `/api/economy/karma/award` to economy-os
7. POST `/api/teams` to agent-teaming (mission=restaurant)
8. Verify team state
9. Walk the team through one task lifecycle
10. POST `/api/reputation/:agentId/transactions` to trust-os
11. Assert all expected state changes

### Step 7.4 — Performance baseline

Run `wrk` against:
- `GET /health` — should be <5ms p99
- `POST /api/negotiations` — should be <50ms p99
- `POST /api/wallets/:id/pay` — should be <100ms p99
- `POST /api/teams` — should be <500ms p99 (formation is expensive)

Document in `BENCHMARKS.md`.

**Acceptance:**
- A new dev can clone, `npm install`, `./start-all.sh`, `./e2e-smoke.sh` and see green
- ACP spec is public
- Performance baselines documented

---

## Phase 8 — Automation Hardening (2-3 hrs)

The existing scripts in `companies/HOJAI-AI/scripts/` are partially broken. Fix and extend:

### Step 8.1 — Fix `scripts/audit-auth.js`

Current bug: uses ESM `import` but file is CJS. Fix by:
- Either renaming to `audit-auth.mjs`
- OR converting to CJS
- OR adding `scripts/package.json` with `"type": "module"`

Make it print JSON output that matches the actual findings, then exit 1 if any unprotected mutations are found.

### Step 8.2 — Fix `scripts/patch-add-auth.js`

Same ESM/CJS bug. Fix similarly.

### Step 8.3 — Add `scripts/audit-services.js`

New script that, for each service:
- Parses `package.json` → name, port, deps
- Parses `src/index.js` → routes, auth model, persistence
- Asserts: service has `requireAuth` on all mutations, has helmet/cors/rateLimit, has Mongoose models
- Emits a per-service report

### Step 8.4 — Add `scripts/sutar-health.js`

For each service:
- `curl http://localhost:<port>/health`
- Report: status, version, uptime
- Exit 1 if any service is down

### Step 8.5 — Add `scripts/sutar-e2e.sh`

Boot the full stack, run a 5-minute scenario test, teardown.

**Acceptance:**
- All automation scripts run without errors
- `node scripts/audit-auth.js` exits 0 across the cleaned-up codebase
- `bash scripts/sutar-health.js` shows all services up
- `bash scripts/sutar-e2e.sh` runs the full scenario in <5 min

---

## 📅 Execution Schedule

| Day | Engineer A | Engineer B | Engineer C |
|---|---|---|---|
| 1 | Phase 0 + Phase 1.1-1.2 | Phase 1.3-1.4 (services 1-13) | Phase 1.3-1.4 (services 14-26) |
| 2 | Phase 2 (wallets) | Phase 2 (reputation + economy) | Phase 2 (contracts + disputes + ACP) |
| 3 | Phase 3 + Phase 4 | Phase 5.1-5.2 (move wallets + economy) | Phase 5.3-5.4 (trust-os + slim SUTAR) |
| 4-6 | Phase 6 (agent-teaming) | Phase 6 (SDK) | Phase 6 (mission templates + tests) |
| 7 | Phase 7 | Phase 8 | Phase 8 |

**Solo engineer: 1-2 weeks.** Three engineers: 1 week.

---

## 🎯 Final 10/10 Scorecard

| # | Criterion | Phase | Final check |
|---|---|---|---|
| 1 | All services start without errors | 0 | `bash start-all.sh && curl .../health` on each |
| 2 | All 143 mutations auth-protected at runtime | 1 | `node scripts/audit-auth.js` exits 0 |
| 3 | All services have rate limiting | 1 | `node scripts/audit-services.js` reports 100% |
| 4 | All services have helmet + CORS | 1 | Same |
| 5 | All mutations have input validation | 1 | Try malformed input → 400 |
| 6 | State persists across restarts | 2 | `kill` + restart + state survives |
| 7 | Wallet limits enforced | 3 | Try exceeding → 403 |
| 8 | Gateway routes work for all services | 4 | `/api/sutar/status` shows real health |
| 9 | SUTAR scope is "Agent Runtime" only | 5 | No wallet/reputation/karma code in SUTAR |
| 10 | Agent Teaming is first-class | 6 | `POST /api/teams` returns a working team |
| 11 | ACP spec is published | 7 | SPEC.md exists at semver |
| 12 | End-to-end smoke test passes | 7 | `./e2e-smoke.sh` exits 0 |
| 13 | Automation scripts are healthy | 8 | All scripts run without error |

**13/13 → 10/10.**

---

## 🚧 Risks & Open Questions

1. **MongoDB infra** — Plan assumes MongoDB is available. The user has chosen MongoDB but I haven't confirmed a running instance. If not, add `docker run -d -p 27017:27017 mongo` to `start-all.sh` or document it.

2. **Service move backward compatibility** — Moving `agent-wallets` out of SUTAR means any external consumer hitting `localhost:4840` still works (port stays) but the path is now `platform/economy/wallet-service/`. No breaking change for port-based consumers; the source location changes.

3. **Gateway auth (Phase 4.3)** — Adding `X-Internal-API-Key` could break the RTMN Hub (4399) which calls into SUTAR. Need to coordinate and update the hub's `sutar` callsite to send the key.

4. **Refactor vs. SLA** — Phase 5 moves code. If anyone has open PRs touching `agent-wallets`, they'll conflict. Recommend: freeze SUTAR changes during Phase 5.

5. **Token compatibility between services** — `agent-economy` uses its own auth (SHA-256 + random tokens), different from `@rtmn/shared/auth` (JWT). After Phase 5.2 moves it to economy-os, the token format is local to that service. No issue, but worth noting.

6. **Existing smoke tests** — Each service has `tests/smoke.sh`. These should all still pass after Phase 0 (the lib fix) and Phase 1 (security). They may need updates for Phase 2 (MongoDB) and Phase 5 (new locations).

7. **Scope of "everything"** — The user said "solve everything." This plan covers the SUTAR audit findings + the refactor + Agent Teaming. It does NOT cover:
   - Other RTMN companies' services (REZ, AdBazaar, etc.)
   - The full RTMN Hub (4399) integration
   - The other 11 industry OS services
   - The consumer apps (Do-App, REZ-App, etc.)
   If "everything" means "the entire RTMN ecosystem," that's a 10x larger scope. Confirming this plan = SUTAR-only.

---

## ✅ What "Done" Looks Like

When all 8 phases pass, you can demonstrate:

1. `git clone && cd companies/HOJAI-AI && ./start-all.sh` — 26 services come up clean
2. `bash sutar-os/scripts/e2e-smoke.sh` — full scenario passes
3. `curl localhost:4140/api/sutar/status` — every service is `live`
4. `node scripts/audit-auth.js` — exits 0
5. `node scripts/audit-services.js` — 100% across the board
6. `POST /api/teams` with a mission spec — returns a working team
7. ACP spec is at `sutar-os/agents/acp-protocol/SPEC.md` and is versioned
8. CLAUDE.md at every service level accurately describes current state

That's 10/10.

---

*This plan is the master reference. As phases complete, link to the actual PRs/commit history in each section.*
