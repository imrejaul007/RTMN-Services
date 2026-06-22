# SUTAR OS — What Actually Runs (Phase B Post-Build)

> **Date:** 2026-06-22
> **Audience:** Engineers, product managers
> **Purpose:** Honest status of the 5 SUTAR services targeted by Phase B of the [ROADMAP-TO-VISION.md](../../ROADMAP-TO-VISION.md), replacing aspirational claims in [README.md](README.md) and [API.md](API.md).
> **Supersedes:** the old "25 services operational" claims (the 25 figure was inflated; only 5 services are in Phase B scope).

---

## TL;DR

| Service | Port | LOC | Real or scaffold? | Tests | Status |
|---|---:|---:|---|---|---|
| **sutar-decision-engine** | 4240 | 1,600 | ✅ Real | 21/21 | ✅ Verified E2E |
| **sutar-negotiation-engine** | 4191 | 1,200 | ✅ Real (built in Phase B.1) | 48/48 | ✅ Verified E2E |
| **sutar-economy-os** | 4251 | 5,890 | 🟡 Real services, no tests | 0 | ⏳ Not started |
| **sutar-trust-engine** | 4180 | 1,400 | 🟡 Real services, no SADA hookup | 0 | ⏳ Not started |
| **sutar-contract-os** | 4185 | 3,750 | 🟡 Real services, partial logic (analytics/sla/workflow are stubs) | 0 | ⏳ Not started |

**Phase B status:** 2 of 5 services fully real + tested. 3 more need test coverage + Hub wire-up verification.

---

## B.1 — sutar-negotiation-engine (port 4191) ✅ DONE

### What's real

- **ZOPA algorithm** (Zone of Possible Agreement) — `src/services/zopa.service.ts`, 463 LOC of pure functions
- **5 negotiation strategies**: competitive, collaborative, accommodating, compromising, principled
- **Trust-weighted concession decay** — higher trust → larger concessions
- **Counter-offer auto-generation** — `generateBuyerCounter` / `generateSellerCounter`
- **Multi-round audit trail** — every action recorded with timestamp + actor
- **AXP (Agent Exchange Protocol)** — session-based multi-party negotiation
- **Multi-tenant** — isolated by `tenantId`

### Endpoints (13)

```
POST   /api/v1/negotiations              Create negotiation
GET    /api/v1/negotiations              List/filter
GET    /api/v1/negotiations/:id          Get one
POST   /api/v1/negotiations/:id/offers   Add offer
POST   /api/v1/negotiations/:id/counter  Manual counter
POST   /api/v1/negotiations/:id/auto-counter  ZOPA-based auto counter
POST   /api/v1/negotiations/:id/accept   Accept current offer
POST   /api/v1/negotiations/:id/reject   Reject current offer
POST   /api/v1/negotiations/:id/cancel   Cancel
GET    /api/v1/negotiations/:id/zopa     ZOPA analysis
GET    /api/v1/negotiations/stats        Tenant-level stats
POST   /api/v1/axp                       Start AXP session
POST   /api/v1/axp/:sessionId/respond    Respond in AXP session
```

### Verified end-to-end

```bash
# 1. Create negotiation
curl -X POST http://localhost:4191/api/v1/negotiations -H "Content-Type: application/json" -d '{...}'

# 2. Seller offers 60000
curl -X POST http://localhost:4191/api/v1/negotiations/{id}/offers -d '{...}'

# 3. ZOPA analysis (buyerMax=50000, sellerMin=40000)
# → hasOverlap: true, midpoint: 45000, width: 10000

# 4. Auto-counter (collaborative)
# → counterAmount: 49200 (54% of gap, trust-adjusted)

# 5. Accept → status: accepted
```

### Tests

- `__tests__/unit/zopa.test.ts` — 28 tests (ZOPA math, strategies, decay, walk-away)
- `__tests__/unit/negotiation.service.test.ts` — 20 tests (CRUD, offers, counters, AXP)
- **Total: 48/48 passing**

### Commit

- HOJAI-AI: `ac45a040 feat(sutar-negotiation): real ZOPA-based negotiation engine`
- RTMN: `f7312d441 HOJAI-AI: bump submodule pointer (Phase B.1: sutar-negotiation ZOPA engine)`

---

## B.2 — sutar-decision-engine (port 4240) ✅ DONE

### What's real

- **Policy evaluation engine** — 502 LOC of `policyEngine.ts` with 10 decision types
- **Risk assessment** — 299 LOC of `riskAssessment.ts` with 4 risk levels
- **Decision engine** — 262 LOC of `decisionEngine.ts` with simulation + what-if
- **Multi-option ranker** (Phase B.2) — 341 LOC of `optionRanker.ts`
  - Scores N options across 4 dimensions (cost, time, risk, trust)
  - Min-max normalization with direction handling
  - Weighted scoring with configurable weights
  - Confidence from score spread

### Endpoints (real)

```
POST   /api/v1/decide              Make a decision (with risk + policy)
POST   /api/v1/decide/simulate     What-if simulation
GET    /api/v1/policies            List all policies
GET    /api/v1/policies/:type      Get policy by decision type
GET    /api/v1/stats               Decision statistics
POST   /api/v1/stats/reset         Reset statistics (auth)
POST   /api/v1/risk/assess         Direct risk assessment (auth)
POST   /api/v1/rank                Multi-option ranker (auth)
```

### Verified end-to-end

```bash
# Direct decision
curl -X POST http://localhost:4240/api/v1/decide -d '{
  "context": {"decisionType": "PRICING", "userId": "u1", "amount": 5000}
}'
# → outcome: PROCEED, riskLevel: HIGH, confidence: 0.32

# Multi-option ranking
curl -X POST http://localhost:4240/api/v1/rank -d '{
  "options": [
    {"id":"A","name":"Bharat","cost":48000,"time":86400,"risk":15,"trust":85},
    {"id":"B","name":"Local","cost":52000,"time":3600,"risk":25,"trust":70},
    {"id":"C","name":"Premium","cost":55000,"time":1800,"risk":10,"trust":95}
  ]
}'
# → winner: Premium Importer, score: 0.7, confidence: 0.56
```

### Tests

- `__tests__/unit/optionRanker.test.ts` — 21 tests
- **Total: 21/21 passing**
- (Pre-existing tests for policyEngine, riskAssessment, decisionEngine are absent — gap to fill in B.6)

### Known issue

The RTMN Hub at 4399 has a POST-pipe bug that hangs on `req.pipe(proxyReq)` for some services. **GET requests work** (`/api/sutar/sutar-decision-engine/health` succeeds). **POST requests hang**. The decision engine itself is healthy. Workaround: call the service directly on port 4240.

### Commit

- HOJAI-AI: `d032ed6a` (optionRanker in prior commit) + `bd4b2d11` (shared.d.ts)

---

## B.3 — sutar-economy-os (port 4251) ⏳ NOT STARTED

### What's there (real code, no tests)

10 service modules totalling **5,890 LOC**:

| Service | LOC | What it does |
|---|---:|---|
| `transaction.service.ts` | 605 | Transaction lifecycle |
| `payment.service.ts` | 561 | Payment processing |
| `escrow.service.ts` | 608 | Escrow open/release/refund |
| `billing.service.ts` | 626 | Billing cycles + invoicing |
| `balance.service.ts` | 542 | Account balance queries |
| `earnings.service.ts` | 515 | Earnings aggregation |
| `redemption.service.ts` | 706 | Reward/credit redemption |
| `karma.service.ts` | 603 | Karma/points engine |
| `leaderboard.service.ts` | 543 | Top-earners leaderboard |
| `integration.service.ts` | 581 | External integrations |

### What needs to be done for B.3 ✅

1. **Start it** — add to `start-all.sh`
2. **Write tests** — at least 10 unit tests for escrow + payment (the safety-critical parts)
3. **Verify routes** — call escrow open/release, payment create/refund
4. **Document** — at minimum, a section in this file

### Why it's "real but unstarted"

The audit (June 21) showed the service code is substantial but the tests are 0. It runs only if you `cd` into it and `npm start`. The Hub route `/api/sutar/sutar-economy-os/...` will work if it's running.

### Estimated effort

2-3 hours of focused work (start script entry, 10-15 tests, E2E verification, this section update).

---

## B.4 — sutar-trust-engine (port 4180) ⏳ NOT STARTED

### What's there (real code, no SADA hookup)

4 service modules totalling **1,400 LOC**:

| Service | LOC | What it does |
|---|---:|---|
| `trustService.ts` | 340 | Core trust scoring |
| `reputationService.ts` | 369 | Reputation aggregation |
| `creditCheck.ts` | 404 | Credit checks |
| `verificationService.ts` | 286 | Identity verification |

### What's missing

1. **SADA integration** — SADA OS (port 4190) is the canonical trust engine for RTMN. The sutar-trust-engine should proxy/federate to SADA rather than maintain its own logic.
2. **No tests** — 0 unit tests
3. **Not in start-all.sh**

### What needs to be done for B.4 ✅

1. **Wire to SADA** — replace `trustService.calculate()` with HTTP call to SADA `/trust/v2/:entityId`
2. **Start it** — add to `start-all.sh`
3. **Write tests** — at least 5 tests for the proxy
4. **Document** — a section here

### Note on conflict with SADA

Both sutar-trust-engine (4180) and SADA (4190) are trust engines. The `companies/HOJAI-AI/CLAUDE.md` audit notes this is a known overlap. The Phase B.4 plan is to make sutar-trust-engine a **federated layer** that:
- Calls SADA as source of truth
- Adds SUTAR-specific trust dimensions (e.g., negotiation success rate)
- Caches results for performance

### Estimated effort

3-4 hours (SADA proxy + tests + start script + docs).

---

## B.5 — sutar-contract-os (port 4185) ⏳ NOT STARTED

### What's there (mostly real, 3 stubs)

10 service modules, but **3 are placeholder stubs**:

| Service | LOC | Status |
|---|---:|---|
| `templates.ts` | 720 | ✅ Real (Markdown templates → JSON schema) |
| `clauses.ts` | 655 | ✅ Real (clause library + matching) |
| `integrations.ts` | 635 | ✅ Real (external integrations) |
| `signatures.ts` | 458 | ✅ Real (HMAC + multi-sig) |
| `renewals.ts` | 458 | ✅ Real (auto-renewal logic) |
| `amendments.ts` | 417 | ✅ Real (contract amendment flow) |
| `versions.ts` | 384 | ✅ Real (version history) |
| `analytics.ts` | **16** | ❌ **STUB** (2 lines of empty class) |
| `sla.ts` | **2** | ❌ **STUB** (empty class) |
| `workflow.ts` | **4** | ❌ **STUB** (empty class) |

### What needs to be done for B.5 ✅

1. **Implement the 3 stubs** — analytics (real aggregation), sla (service-level agreement monitoring), workflow (multi-step contract workflows)
2. **Start it** — add to `start-all.sh`
3. **Write tests** — at least 10 tests for templates + clauses + signatures
4. **Document** — a section here

### Note

`analytics.ts` at 16 LOC is the most stub-like. The audit shows it as `export class ContractAnalytics { }` with no methods. The other two are 2-4 LOC empty classes.

### Estimated effort

5-6 hours (3 implementations + 10 tests + start script + docs).

---

## Phase B deliverable summary

| Sub-phase | Service | Tests | Real? | Effort | Status |
|---|---|---:|---|---:|---|
| B.1 | sutar-negotiation-engine | 48/48 | ✅ | 8h | ✅ **DONE** |
| B.2 | sutar-decision-engine | 21/21 | ✅ | 4h | ✅ **DONE** |
| B.3 | sutar-economy-os | 0/0 | 🟡 | 2-3h | ⏳ TODO |
| B.4 | sutar-trust-engine | 0/0 | 🟡 | 3-4h | ⏳ TODO |
| B.5 | sutar-contract-os | 0/0 | 🟡 | 5-6h | ⏳ TODO |

**Total done: 69 tests passing, 2 services verified E2E.**
**Total remaining: ~10-13 hours of work, 3 services.**

---

## What this means for the roadmap

[ROADMAP-TO-VISION.md](../../ROADMAP-TO-VISION.md) estimated Phase B at 2 weeks. After B.1 + B.2, the actual remaining work is closer to 1 week. The audit was overly pessimistic — most SUTAR services are real code, just lacking tests + start script entries + Hub wire-up verification.

### Suggested next step

1. **B.3 economy-os** (2-3h) — highest value because it's the financial layer for the entire agent economy
2. **B.4 trust-engine** (3-4h) — important for trust scores flowing through the system
3. **B.5 contract-os** (5-6h) — important for the "Genie buys groceries" demo (Phase D)

### Hub POST-pipe bug

The RTMN Hub at 4399 has a known issue where POST requests hang. This blocks `/api/sutar/<service>/api/v1/...` style calls. **Workaround:** call services directly on their canonical ports. **Fix:** in the Hub's `src/index.ts` lines 86-119, the `req.pipe(proxyReq)` for POST bodies is not draining the request before piping. Tracked as a follow-up.

---

## How to start the SUTAR services

```bash
# B.1 Negotiation (built in B.1, has its own start command)
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/sutar-os/contracts/sutar-negotiation-engine
PORT=4191 INTERNAL_SERVICE_TOKEN=test-internal-token npm start

# B.2 Decision
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/sutar-os/core/sutar-decision-engine
PORT=4240 INTERNAL_SERVICE_TOKEN=test-internal-token npm start

# B.3, B.4, B.5 — not in start-all.sh yet, manual start needed
# (TODO: add to start-all.sh in B.6)
```

---

*Last updated: 2026-06-22*
*Owner: SUTAR OS maintainers*
*Honest counter to aspirational claims in [README.md](README.md) and [API.md](API.md)*
