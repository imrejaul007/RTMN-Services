# nexha-federation-os — FederationOS (Nexha Registry + Governance)

> **Port:** 4273
> **Version:** 0.1.0
> **Layer:** 4 (Nexha network services)
> **Status:** ✅ **PRODUCTION-READY MVP** — 30/30 tests pass, builds clean.

---

## What it is

**The federation's registry + governance layer.** FederationOS manages:
1. **Nexha registry** — who is a member of the federation
2. **Bilateral handshakes** — mutual agreements between pairs of Nexhas
3. **Governance policies** — federation-wide rules all members must follow

This is the **governance backbone** of Global Nexha. Without it, anyone could claim to be a federation member, no one would know which Nexhas trust each other, and there'd be no common rules.

---

## Concepts

### Membership Tiers

| Tier | Description | Voting rights |
|---|---|---|
| `founding` | Charter members of the federation | Full + governance veto |
| `strategic` | High-volume, high-trust Nexhas | Full |
| `standard` | Regular active members | Standard |
| `associate` | Probationary or partial members | Limited |
| `observer` | Pending / read-only | None |

### Lifecycle Status

| Status | Meaning |
|---|---|
| `pending` | Application submitted, awaiting review |
| `active` | Full member, can transact + handshake |
| `suspended` | Temporarily blocked (governance violation) |
| `expelled` | Permanently removed |
| `churned` | Voluntarily left |

### Handshake Status

| Status | Meaning |
|---|---|
| `pending` | Initiator sent, awaiting target response |
| `accepted` | Both signed, mutual agreement in effect |
| `rejected` | Target declined |
| `expired` | Past `expiresAt` without response |
| `revoked` | Either party cancelled |

### Policy Enforcement

| Enforcement | Meaning |
|---|---|
| `mandatory` | All members must comply; violation → suspension |
| `recommended` | Best-practice; non-compliance is allowed but tracked |
| `optional` | Informational; available for adoption |

---

## Demo Federation (seed data)

7 Nexhas with varied tiers, statuses, and 4 handshakes (2 accepted, 1 pending, 1 rejected) and 3 policies.

| Nexha | Tier | Status | Region | Notes |
|---|---|---|---|---|
| Maya Collective | founding | active | IN | Charter member |
| Mumbai Logistics | strategic | active | IN | Fleet 1200 |
| Singapore Finance | strategic | active | SG | MAS-PI licensed |
| London Legal | strategic | active | GB | Common-law jurisdiction |
| Jakarta Data | standard | active | ID | Commodities data |
| Rogue Supplier | associate | **suspended** | XX | Fraud history |
| AI Marketplace Asia | observer | **pending** | SG | Application |

**Handshakes:**
- Maya ↔ Mumbai Logistics (accepted)
- Singapore Finance ↔ Maya Collective (accepted)
- Jakarta Data → AI Marketplace Asia (pending)
- Rogue → Maya Collective (rejected)

**Policies:**
- Data Privacy Baseline (mandatory)
- Payment Settlement T+2 (mandatory)
- Anti-Fraud Conduct (mandatory)

---

## Quick Start

```bash
cd companies/Nexha/services/nexha-federation-os
npm install
npm run build
PORT=4273 node dist/index.js
# → Listening on :4273
```

```bash
# Health
curl http://localhost:4273/health

# List active Nexhas
curl 'http://localhost:4273/api/v1/nexhas?status=active'

# Join the federation
curl -X POST http://localhost:4273/api/v1/nexhas/join \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Cafe Test",
    "description": "Test cafe Nexha",
    "region": "FR",
    "contactEmail": "hi@cafe.example",
    "publicKey": "fp:cafe123",
    "categories": ["service", "food"],
    "osVersion": "nexha-os-1.4.0"
  }'

# Initiate a handshake
curl -X POST http://localhost:4273/api/v1/handshakes \
  -H 'Content-Type: application/json' \
  -d '{
    "initiatorId": "nexha-cafe-test",
    "targetId": "nexha-maya-collective",
    "terms": {
      "mutualCapabilities": ["service"],
      "dataSharing": "public",
      "paymentTerms": "standard"
    }
  }'

# Accept the handshake (as target)
curl -X POST http://localhost:4273/api/v1/handshakes/hs-abc/respond \
  -H 'Content-Type: application/json' \
  -d '{"accept": true, "targetSignature": "sig-target-2026"}'

# Get a Nexha's accepted peers
curl http://localhost:4273/api/v1/nexhas/nexha-maya-collective/peers

# Federation stats
curl http://localhost:4273/api/v1/stats
```

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health + counts |
| `GET` | `/api/v1/info` | Service metadata |
| `POST` | `/api/v1/nexhas/join` | **Register a new Nexha** |
| `GET` | `/api/v1/nexhas` | List Nexhas (filters: tier, status, region, category) |
| `GET` | `/api/v1/nexhas/:id` | Get one Nexha |
| `PATCH` | `/api/v1/nexhas/:id` | Update Nexha |
| `POST` | `/api/v1/nexhas/:id/suspend` | Suspend Nexha |
| `POST` | `/api/v1/nexhas/:id/activate` | Activate Nexha |
| `GET` | `/api/v1/nexhas/:id/peers` | **Get accepted peers** |
| `POST` | `/api/v1/handshakes` | Initiate handshake |
| `GET` | `/api/v1/handshakes` | List handshakes |
| `GET` | `/api/v1/handshakes/:id` | Get one |
| `POST` | `/api/v1/handshakes/:id/respond` | Accept/reject |
| `POST` | `/api/v1/handshakes/:id/revoke` | Revoke |
| `POST` | `/api/v1/policies` | Create policy |
| `GET` | `/api/v1/policies` | List policies |
| `GET` | `/api/v1/policies/:id` | Get one |
| `PATCH` | `/api/v1/policies/:id` | Update (auto-increments version) |
| `DELETE` | `/api/v1/policies/:id` | Delete |
| `GET` | `/api/v1/stats` | Federation-wide stats |
| `GET` | `/rez-intel-status` | REZ Intelligence health |
| `POST` | `/api/enrich` | REZ Intelligence enrichment (graceful) |

---

## Architecture

```
nexha-federation-os (port 4273)
├── src/
│   ├── index.ts                          # Express server entry
│   ├── types/
│   │   └── index.ts                      # Nexha, Handshake, GovernancePolicy, etc.
│   └── services/
│       └── federationService.ts          # Registry + handshake + policy manager
├── __tests__/unit/
│   └── federationService.test.ts         # 30 tests
├── dist/                                 # Compiled output
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Storage:** In-memory `Map<id, T>`. Production would use a federated distributed store (Postgres + per-region replication).

**Auth:** Optional JWT via dynamic `@rtmn/shared/auth` import.

**REZ Intelligence:** Wired (`/rez-intel-status` + `/api/enrich`). Graceful degradation.

---

## Configuration

| Env var | Default | Description |
|---|---|---|
| `PORT` | 4273 | Service port |
| `FEDERATION_OS_REQUIRE_AUTH` | `true` | Set to `false` to disable JWT auth in dev |
| `REZ_INTEL_URL` | `http://localhost:5370` | REZ Intelligence URL |
| `REZ_INTEL_ENABLED` | `true` | Disable REZ Intel wiring |
| `REZ_INTEL_TIMEOUT_MS` | `3000` | REZ Intel request timeout |

---

## Tests

30 unit tests covering:
- Seeding (idempotent + mix of tiers/statuses)
- Nexha registration (validates required, rejects dupes, generates IDs)
- Nexha lifecycle (suspend, activate, update)
- Listing + filtering (tier, status, region, category, sort by name)
- Handshakes (initiate, respond accept/reject, revoke, getPeers)
- Governance policies (create, update w/ version++, delete, filter)
- Federation stats (aggregates, regions, active handshakes)

```bash
npm test
# ✓ 30 tests pass
```

---

## Build

```bash
npm install
npm run build    # tsc → dist/
npm start        # node dist/index.js
npm run dev      # tsx watch src/index.ts
```

---

## Files

```
nexha-federation-os/
├── CLAUDE.md                # This file
├── package.json             # @nexha/federation-os@0.1.0
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── src/
│   ├── index.ts             # Express server
│   ├── types/index.ts       # Type definitions
│   └── services/
│       └── federationService.ts  # Registry + handshake + policy manager
├── __tests__/unit/
│   └── federationService.test.ts # 30 tests
└── dist/                    # Built output
```

---

## Use Cases

**Onboarding a new Nexha:**
```ts
// Step 1: Apply to join
const apply = await fetch('http://localhost:4273/api/v1/nexhas/join', {
  method: 'POST',
  body: JSON.stringify({ name: 'X', description: '...', region: 'US', ... })
});
// Status: pending

// Step 2: Founding members review + approve
await fetch(`http://localhost:4273/api/v1/nexhas/${apply.id}/activate`, {
  method: 'POST'
});
```

**Bilateral agreement between two Nexhas:**
```ts
// Maya initiates handshake with Logistics
const hs = await fetch('http://localhost:4273/api/v1/handshakes', {
  method: 'POST',
  body: JSON.stringify({
    initiatorId: 'nexha-maya-collective',
    targetId: 'nexha-logistics-mumbai',
    terms: { mutualCapabilities: ['agent', 'service'], dataSharing: 'aggregated', paymentTerms: 'preferred' }
  })
});
// Status: pending

// Logistics accepts
await fetch(`http://localhost:4273/api/v1/handshakes/${hs.id}/respond`, {
  method: 'POST',
  body: JSON.stringify({ accept: true, targetSignature: 'sig-logi-2026' })
});
// Status: accepted
```

**Suspension for fraud:**
```ts
await fetch(`http://localhost:4273/api/v1/nexhas/${nexhaId}/suspend`, {
  method: 'POST',
  body: JSON.stringify({ reason: 'Anti-fraud policy violation' })
});
```

**Enforce a policy update:**
```ts
await fetch(`http://localhost:4273/api/v1/policies/pol-data-privacy`, {
  method: 'PATCH',
  body: JSON.stringify({
    description: 'Updated GDPR-aligned data handling',
    rules: [{ when: '...', then: '...' }]
  })
});
// Version auto-increments from N to N+1
```

---

## Integration Points

- **nexha-capability-os** (port 4270) — discovers capabilities of registered Nexhas
- **nexha-reputation-os** (port 4271) — uses active member list for ACI scoring
- **nexha-discovery-os** (port 4272) — filters by federation membership status
- **nexha-business-directory** (port 4360) — alternative company registry
- **nexha-gateway** (port 5002) — federation entry point
- **nexha-acp-messaging** — cross-Nexha messaging (requires active handshake)
- **HOJAI SADA** (port 4190) — feeds governance policy violations → risk events

---

*Built as part of Phase D-I roadmap (40-phase plan, item #7: FederationOS).*