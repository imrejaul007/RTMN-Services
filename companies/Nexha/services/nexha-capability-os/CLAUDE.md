# nexha-capability-os — CapabilityOS Service

> **Port:** 4270
> **Version:** 0.1.0
> **Layer:** 4 (Nexha network services)
> **Status:** ✅ **PRODUCTION-READY MVP** — 22/22 tests pass, builds clean.

---

## What it is

**The canonical capability schema + registry for the Nexha federation.** Every Nexha publishes what it offers here (skills, services, products, agents, data feeds, workflows, integrations, content); every consumer queries here to find what they need.

This is the **discovery + matching engine** of the Global Nexha network. Without it, federation participants can't find each other's capabilities.

---

## Capabilities (8 categories)

| Category | What | Example |
|---|---|---|
| `skill` | Executable SkillOS skill | "AI fashion negotiation agent" |
| `service` | B2B service | "Mumbai same-day delivery" |
| `product` | Tangible good or SKU | SKU + inventory |
| `agent` | SUTAR agent that can be invoked cross-Nexha | "AI Tax Advisor (SG/IN)" |
| `data` | Data feed | "Indonesia retail price index" |
| `workflow` | Multi-step workflow template | "Customer onboarding pipeline" |
| `integration` | Connector to external API | "Salesforce sync" |
| `content` | Article / video / course | "Legal compliance course" |

Each capability carries:
- **Owner** (Nexha + entity ID)
- **Pricing** (free / per-call / per-hour / per-transaction / subscription / quote)
- **Trust signals** (verified flag, KYC level, insurance)
- **Coverage** (regions, languages)
- **SLA** (expected response time in ms)

---

## Quick Start

```bash
# Install
cd companies/Nexha/services/nexha-capability-os
npm install
npm run build

# Run
PORT=4270 node dist/index.js
# → Listening on :4270
```

```bash
# Health
curl http://localhost:4270/health

# Match (POST)
curl -X POST http://localhost:4270/api/v1/match \
  -H 'Content-Type: application/json' \
  -d '{"q":"fashion negotiation","region":"IN","verifiedOnly":true}'

# Match (GET)
curl 'http://localhost:4270/api/v1/match?category=agent&region=IN'

# Register a capability
curl -X POST http://localhost:4270/api/v1/capabilities \
  -H 'Content-Type: application/json' \
  -d '{
    "nexhaId": "nexha-mine",
    "name": "AI Image Tagger",
    "description": "Tag product images with category, color, style",
    "category": "service",
    "tags": ["image", "tagging", "ai"],
    "pricing": { "model": "per-call", "amount": 0.05, "currency": "USD" },
    "trust": { "verified": true, "kycLevel": "basic" },
    "regions": ["US", "EU"],
    "languages": ["en"],
    "slaMs": 2000,
    "status": "active"
  }'

# Federation stats
curl http://localhost:4270/api/v1/stats
```

---

## Matching Algorithm

```
score = 0
score += 0.40  if category matches
score += jaccard(query.tags ∩ cap.tags) × 0.30  (tag overlap)
score += (text hits / query words) × 0.15  (free-text)
score += 0.05  if region matches
score += 0.05  if language matches
score += 0.05  if verified
score = min(1.0, score)
```

Each match includes **explainable `reasons`** so consumers know why a capability was ranked where it was:
```json
{
  "score": 0.74,
  "reasons": ["category:agent", "tags:negotiation,procurement", "region:IN", "verified"]
}
```

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Service health + stats |
| `GET` | `/ready` | Readiness probe |
| `GET` | `/api/v1/info` | Service metadata |
| `POST` | `/api/v1/capabilities` | Register a new capability |
| `GET` | `/api/v1/capabilities` | List all capabilities (admin) |
| `GET` | `/api/v1/capabilities/:id` | Get one |
| `PUT` | `/api/v1/capabilities/:id` | Update |
| `DELETE` | `/api/v1/capabilities/:id` | Remove |
| `POST` | `/api/v1/match` | **Match query (body)** |
| `GET` | `/api/v1/match` | **Match query (query params)** |
| `GET` | `/api/v1/nexhas/:nexhaId/stats` | Per-Nexha stats |
| `GET` | `/api/v1/stats` | Federation-wide stats |
| `GET` | `/rez-intel-status` | REZ Intelligence health |
| `POST` | `/api/enrich` | REZ Intelligence enrichment (graceful) |

---

## Architecture

```
nexha-capability-os (port 4270)
├── src/
│   ├── index.ts                       # Express server entry
│   ├── types/
│   │   └── index.ts                   # Capability, CapabilityQuery, etc.
│   └── services/
│       └── capabilityService.ts       # CRUD + matching engine + stats
├── __tests__/unit/
│   └── capabilityService.test.ts       # 22 tests
├── dist/                              # Compiled output
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Storage:** In-memory `Map<id, Capability>` (MVP). Can be swapped for MongoDB / Postgres without changing the API.

**Auth:** Optional JWT via dynamic `@rtmn/shared/auth` import. Set `CAPABILITY_OS_REQUIRE_AUTH=false` to disable in dev.

**REZ Intelligence:** Wired (`/rez-intel-status` + `/api/enrich`). Gracefully degrades when REZ Intel is unreachable.

---

## Configuration

| Env var | Default | Description |
|---|---|---|
| `PORT` | 4270 | Service port |
| `CAPABILITY_OS_REQUIRE_AUTH` | `true` | Set to `false` to disable JWT auth in dev |
| `REZ_INTEL_URL` | `http://localhost:5370` | REZ Intelligence URL |
| `REZ_INTEL_ENABLED` | `true` | Set to `false` to disable REZ Intel wiring |
| `REZ_INTEL_TIMEOUT_MS` | `3000` | REZ Intel request timeout |

---

## Tests

22 unit tests covering:
- Seeding (idempotent)
- CRUD (register, get, update, delete with timestamp safety)
- Validation (required fields)
- Match scoring (category filter, tag overlap, free-text, region, language, verified)
- Pagination (limit + offset)
- Explainability (reasons for match score)
- Stats (per-Nexha + federation-wide)

```bash
npm test
# ✓ 22 tests pass
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
nexha-capability-os/
├── CLAUDE.md                # This file
├── package.json             # @nexha/capability-os@0.1.0
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts             # Express server
│   ├── types/index.ts       # Type definitions
│   └── services/
│       └── capabilityService.ts  # Business logic
├── __tests__/unit/
│   └── capabilityService.test.ts # 22 tests
└── dist/                    # Built output
```

---

## Use Cases

**Find an AI agent for a specific task:**
```ts
const response = await fetch('http://localhost:4270/api/v1/match', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ q: 'negotiate procurement', region: 'IN', verifiedOnly: true })
});
const { matches } = await response.json();
const top = matches[0]; // best match
```

**Build a federation dashboard:**
```ts
const stats = await fetch('http://localhost:4270/api/v1/stats').then(r => r.json());
// { nexhas: 50, totalCapabilities: 1200, byCategory: {...}, byNexha: [...] }
```

**Cross-Nexha discovery:**
```ts
// From a buyer Nexha looking for a supplier
const result = await fetch(`${SUPPLIER_NEXHA}/api/v1/match`, {
  method: 'POST',
  body: JSON.stringify({ category: 'service', tags: ['delivery', 'mumbai'] })
});
```

---

## Related

- **nexha-business-directory** (port 4360) — company + agent registry (overlapping; can be consolidated)
- **nexha-discovery-engine** (BAM, port 4256) — marketplace asset discovery
- **nexha-gateway** (port 5002) — federation gateway
- **nexha-acp-messaging** — ACP protocol for cross-Nexha agent communication
- **CapabilityOS spec:** see `.claude/plans/built-vs-needed-audit.md` + `.claude/plans/global-nexha-development-plan.md`
- **Phase E:** Reputation Flywheel (uses CapabilityOS for capability discovery)

---

*Built as part of Phase D-I roadmap (40-phase plan, item #2).*