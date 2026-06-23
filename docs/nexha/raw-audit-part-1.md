I have all six services read in full. Now I have a complete picture. Let me write the detailed audit report.

# NeXha Monorepo Audit Report — Six Services

Below is an exhaustive, line-level audit of the six services. Every file was read in full (I did not skip any source file). The structure mirrors the user's request: per-service package/port, endpoints, models, service methods, business rules/state machines, tests, and bugs/gaps.

---

## 1. `nexha-acp-messaging` (port 4340)

### Package & Port
- **Name:** `@nexha/acp-messaging` v1.0.0
- **Type:** ESM, `"type": "module"`
- **Main / entry:** `src/index.js`
- **Default port:** `4340` (env override `PORT`)
- **Default DB:** `mongodb://localhost:27017/nexha-acp-messaging` (env `MONGODB_URI`)
- **ADR / phase:** ADR-0010 Phase 4 (2026-06-22)
- **Runtime deps:** `@rtmn/shared` (file:), `compression`, `cors`, `express`, `express-rate-limit`, `helmet`, `mongoose`, `morgan`, `uuid`, `zod`
- **Dev deps:** `mongodb-memory-server`, `supertest`, `vitest`, `jsonwebtoken`
- **Engine:** `node >= 18.0.0`

### Endpoints (full list — from `src/index.js` and `src/routes/index.js`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/` | none | Service info + endpoint list + messageTypes |
| `GET` | `/health` | none | Liveness: `{status:"healthy", service:"nexha-acp-messaging"}` |
| `POST` | `/api/validate` | none (public) | Zod-validate body via `validateMessageBody`, no persistence. Returns `{valid, cleaned}` or 400 |
| `POST` | `/api/negotiations` | `requireAuth` | Create new negotiation. First message must be `QUERY`. Returns 201 if created, 200 if existing |
| `GET` | `/api/negotiations` | `requireAuth` | List tenant's negotiations; Zod-validated query (`status`, `agent`, `limit` 1–200). Returns `{items, total}` |
| `GET` | `/api/negotiations/:id` | `requireAuth` | Get one negotiation (404 if cross-tenant) |
| `GET` | `/api/negotiations/:id/messages` | `requireAuth` | List messages in conversation order (`createdAt` asc). Returns `{items, total}` |
| `POST` | `/api/negotiations/:id/messages` | `requireAuth` | Append message; validates state transition. Returns 201 |
| `GET` | `/api/stats` | `requireAuth` | Per-tenant stats: `{negotiations, messages, byStatus, byType}` |

`router.use('/api/negotiations', requireAuth)` and `router.use('/api/stats', requireAuth)` are mounted; `/api/validate` is public; the app-level `/` and `/health` are also public.

### Mongoose models / types
#### `src/models/Message.js` — `AcpMessage` (collection `acpmessages`)
Constants:
- `MESSAGE_TYPES = ['QUERY', 'QUOTE', 'COUNTER', 'ACCEPT', 'REJECT', 'ORDER', 'TRACK', 'DISPUTE']`
- `MESSAGE_NEXT_VALID` — see state machine below
- `TERMINAL_TYPES = new Set(['REJECT'])`

Schema fields:
| Field | Type | Notes |
|---|---|---|
| `tenantId` | String, required, indexed | Per-tenant isolation |
| `negotiationId` | String, required, indexed | |
| `messageId` | String, required | uuid if not supplied |
| `type` | String, required, enum MESSAGE_TYPES | |
| `sender` | String, required | |
| `receiver` | String, required | |
| `intent` | String, default `''` | |
| `context` | Mixed, default `{}` | |
| `constraints` | Mixed, default `undefined` | |
| `timeline` | Mixed, default `undefined` | |
| `attachments` | Mixed, default `undefined` | |
| `payload` | Mixed, default `{}` | |
| `parentMessageId` | String, default `null`, indexed | |
| `metadata` | Mixed, default `{}` | |
| `createdAt` | Date, default `Date.now`, indexed | |

Indexes:
- `{tenantId, negotiationId, createdAt: 1}` — message log
- `{tenantId, sender, createdAt: -1}` — "what did I send"
- `{tenantId, receiver, createdAt: -1}` — "what was sent to me"
- `{tenantId, messageId}` unique

Schema options: `versionKey:false, minimize:false`.

#### `src/models/Negotiation.js` — `AcpNegotiation` (collection `acpnegotiations`)
Constant: `NEGOTIATION_STATUS = ['ACTIVE','ACCEPTED','REJECTED','COMPLETED','DISPUTED','EXPIRED']`

Schema fields:
| Field | Type | Notes |
|---|---|---|
| `tenantId` | String, required, indexed | |
| `negotiationId` | String, required | uuid assigned by service |
| `initiator` | String, required | |
| `responder` | String, required | |
| `intent` | String, default `''` | |
| `context` | Mixed, default `{}` | |
| `status` | String, enum NEGOTIATION_STATUS, default `ACTIVE`, indexed | |
| `currentType` | String, default `null` | Last message type |
| `messageCount` | Number, default `0` | |
| `lastActivityAt` | Date, default `Date.now`, indexed | |
| `completedAt` | Date, default `null` | |
| `metadata` | Mixed, default `{}` | |
| `createdAt` | Date, default `Date.now`, indexed | |
| `updatedAt` | Date, default `Date.now` | refreshed on save |

Indexes:
- `{tenantId, status, lastActivityAt: -1}` — status filter
- `{tenantId, initiator, createdAt: -1}` — initiated
- `{tenantId, responder, createdAt: -1}` — responding
- `{tenantId, negotiationId}` unique

`pre('save')` sets `updatedAt = new Date()`.

### Service methods (`src/services/stateMachine.js`)
| Export | Signature | Description |
|---|---|---|
| `class StateTransitionError` | `(message, from, to)` | Status 422, `code:'ACP_INVALID_TRANSITION'`; carries `from`/`to` |
| `class ValidationError` | `(message, issues)` | Status 400, `code:'ACP_VALIDATION_ERROR'` |
| `isTerminal(type)` | `(string) → boolean` | Checks `TERMINAL_TYPES` set |
| `isValidTransition(from, to)` | `(string|null, string) → boolean` | `null` accepts only `QUERY`; otherwise checks `MESSAGE_NEXT_VALID[from]` |
| `validateMessageBody(type, body)` | `(string, object) → cleaned` | Throws on unknown type; requires `sender` + `receiver`; per-type rules: `QUERY` requires `intent` (string) and optional `context` (object); `QUOTE`/`COUNTER` require `payload` (object); `ACCEPT`/`REJECT`/`TRACK` allow optional `payload`; `ORDER` requires `payload` (object); `DISPUTE` requires `payload.reason`. Returns `cleaned` copy |
| `appendMessage(tenantId, negotiationId, messageBody)` | `(string, string\|null, object) → {negotiation, message, created}` | Creates negotiation if `negotiationId` is null (must be `QUERY`); throws on missing tenant, unknown negotiation, illegal transition, or REJECTED terminal state; recomputes status; persists message; returns `toObject()` of both |
| `listMessages(tenantId, negotiationId)` | `(string, string) → array<object>` | All messages, sorted by `createdAt:1` |
| `listNegotiations(tenantId, filters)` | `(string, {status?, agent?, limit?}) → array<object>` | `limit` clamped 1–200 (default 50). Sorts by `lastActivityAt:-1` |
| `getNegotiation(tenantId, negotiationId)` | `(string, string) → object\|null` | `null` on not found |
| `getStats(tenantId)` | `(string) → {negotiations, messages, byStatus, byType}` | Uses two `$group` aggregations |
| re-exports | — | `NEGOTIATION_STATUS, MESSAGE_TYPES, MESSAGE_NEXT_VALID` |

`computeStatus(currentStatus, messageType)` (private) maps messages to negotiation status:
- `REJECT` → `REJECTED` + `completedAt=now`
- `DISPUTE` → `DISPUTED`
- `ORDER` and current `ACCEPTED` → `COMPLETED` + `completedAt=now`
- If current is `COMPLETED` → stays `COMPLETED`
- `ACCEPT` → `ACCEPTED`
- current `EXPIRED` → stays `EXPIRED`
- default → `ACTIVE`

### Business rules / state machine

State machine (from `MESSAGE_NEXT_VALID`):

| Current | Next valid |
|---|---|
| _start_ | `QUERY` |
| `QUERY` | `QUOTE`, `REJECT` |
| `QUOTE` | `COUNTER`, `ACCEPT`, `REJECT` |
| `COUNTER` | `COUNTER`, `ACCEPT`, `REJECT`, `QUOTE` |
| `ACCEPT` | `ORDER`, `REJECT` |
| `REJECT` | _(terminal)_ |
| `ORDER` | `TRACK`, `DISPUTE` |
| `TRACK` | `TRACK`, `DISPUTE`, `ORDER` |
| `DISPUTE` | `REJECT`, `ACCEPT`, `TRACK` |

Status map (from `computeStatus`): `REJECT→REJECTED`, `DISPUTE→DISPUTED`, `ORDER@ACCEPTED→COMPLETED`, `ACCEPT→ACCEPTED`, else `ACTIVE`. `COMPLETED` is NOT terminal — `TRACK`/`DISPUTE`/`ORDER` are still accepted (the spec says `ORDER → TRACK` is valid). Only `REJECTED` is terminal.

Validation rules:
- `sender` + `receiver` are always required strings.
- `QUERY`: `intent` required (string); `context` optional (must be plain object, not array).
- `QUOTE`/`COUNTER`/`ORDER`: `payload` required object.
- `ACCEPT`/`REJECT`/`TRACK`: `payload` optional object.
- `DISPUTE`: `payload` required object with `reason` key.
- `EXPIRED` status: admin-driven only, never auto-set by `appendMessage`.

Tenant isolation:
- `requireAuth` accepts internal token (sets `tenantId:null`, must be supplied via header/body) or JWT (`claims.tenantId || claims.organizationId`).
- `tenantFrom(req, body)` precedence: `req.user.tenantId` → `x-tenant-id` header → `body.tenantId`.
- All Mongo reads/writes include `tenantId` in the query.
- The `internal-token` path uses a constant-time char-by-char compare (XOR with `mismatch|=...`).

### Tests
- `__tests__/unit/stateMachine.test.js` (37 tests) — `isTerminal`, `isValidTransition` (every transition), `validateMessageBody` (every type, context, payload rules), `appendMessage` (happy path QUERY→QUOTE→COUNTER→ACCEPT→ORDER→TRACK, illegal transitions, terminal-REJECT lockout, `QUERY→QUERY` rejected, tenant isolation, missing-tenant, payload preservation, getStats, listNegotiations with status/agent/limit, listMessages ordering).
- `__tests__/unit/routes.test.js` (22 tests) — `/health`, `/`, `/api/validate` (valid, missing field, unknown type), auth gating, `POST /api/negotiations` (create, 400 no-tenant, 422 wrong first type, x-tenant-id precedence), `POST /api/negotiations/:id/messages` (append QUOTE, illegal transition 422, unknown id 400/404), list/get/stats, status filter, cross-tenant 404.
- Total: **59 tests, 0 failures**.

### Bugs / gaps / inconsistencies
1. **`POST /api/negotiations/:id/messages` for unknown id returns 400, not 404.** The state machine throws `ValidationError('Negotiation not found: ...')` (status 400), but the README and CLAUDE.md say 404. The route's own comment says `// state machine ValidationError → 400`. The test for this path asserts 400 with `error: /not found/`. So 400 is the *actual* behavior, documentation says 404 — mismatch.
2. **Internal-token `INTERNAL_SERVICE_TOKEN` has no default.** The auth middleware treats an unset `INTERNAL_SERVICE_TOKEN` as no internal-token auth (returns `false` for `tryInternal`). Tests must set it in `beforeAll`. The route comment claims env is read at request time, which is true, but the service `index.js` is not conditional on `NODE_ENV` like the other services — it tries Mongo unconditionally (and only `process.exit(1)` in production). Test files connect to `mongodb-memory-server` independently, but `index.js`'s `start()` is auto-invoked on direct run; tests import `{ app, start }` but never call `start()`, so the Mongo connection is never attempted during tests. (Works because `import.meta.url !== process.argv[1]` in test context.)
3. **`POST /api/negotiations` first message must be `QUERY`.** But `validateMessageBody('QUOTE', {sender, receiver, payload})` does not enforce that the FIRST message in a brand-new negotiation be `QUERY` — the route lets the state machine throw `StateTransitionError(null, 'QUOTE')` (status 422), which the test asserts. Behavior is correct, but the error flow is two-step.
4. **No race-condition guard on concurrent first-message creates** for the same tenant+negotiation. The unique index is `(tenantId, negotiationId)`, but the service generates `negotiationId` server-side, so two `POST /api/negotiations` calls from the same tenant will produce different negotiationIds — no collision possible, no issue.
5. **`COUNTER → QUOTE` is allowed** in the state machine (not in the spec README table which lists `COUNTER → COUNTER, ACCEPT, REJECT, QUOTE`). The test confirms it.
6. **`DISPUTE → ACCEPT` is allowed** (per state machine and `computeStatus` will set status to `ACCEPTED`). README and spec both note this.
7. **`PENDING` is not in NEGOTIATION_STATUS** but a `Negotiation` is always created with `status: 'ACTIVE'`, never `PENDING`. (`PENDING` lives in `nexha-provisioning-engine`, not here.)
8. **`MESSAGE_NEXT_VALID['REJECT']` is `[]`** but the README transition table in the spec mentions a possible `NEW_NEGOTIATION` transition; the code is stricter.
9. **CORS defaults to `*`** with no `ALLOWED_ORIGINS` env handling on the route layer (env var mentioned in docs but not actually wired in code).
10. **Body limit 1 MB** (`express.json({ limit: '1mb' })`).

---

## 2. `nexha-partner-graph` (port 4363)

### Package & Port
- **Name:** `@nexha/partner-graph` v1.0.0
- **Type:** ESM
- **Default port:** `4363` (env `PORT` or alias `PARTNER_GRAPH_PORT`)
- **Default DB:** `mongodb://localhost:27017/nexha_partner_graph` (env `MONGODB_URI` or `MONGO_URI`)
- **ADR / phase:** ADR-0010 Phase 7 (2026-06-22)
- **Runtime deps:** `@rtmn/shared`, `compression`, `cors`, `express`, `helmet`, `mongoose`, `morgan`, `uuid`, `zod`
- **Dev deps:** `mongodb-memory-server`, `supertest`, `vitest`
- **Engine:** `node >= 20.0.0`

### Endpoints (full list — from `src/index.js` and `src/routes/index.js`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/` | none | 302 redirect to `/health` |
| `GET` | `/health` | none | Service info + 7 capabilities |
| `GET` | `/ready` | none | `{ready: true, timestamp}` |
| `GET` | `/internal/sanity` | x-internal-token | Hub health probe: `{ok, mongoState, timestamp}` |
| `POST` | `/api/interactions` | `requireAuth` | Record interaction; updates partnership on both sides |
| `GET` | `/api/interactions` | `requireAuth` | List interactions; Zod-validated (`partnerRef`, `type`, `limit`, `offset`) |
| `GET` | `/api/partners` | `requireAuth` | List partnerships; Zod-validated (`relationshipType`, `minStrength`, `sort`, `limit`, `offset`) |
| `GET` | `/api/partners/by-type/:relationshipType` | `requireAuth` | Filter by type; rejects unknown types 400 |
| `GET` | `/api/partners/:partnerRef` | `requireAuth` | Get one partnership; 404 if missing |
| `POST` | `/api/recommend` | `requireAuth` | Recommendation engine (candidates optional, up to 500) |
| `GET` | `/api/stats` | `requireAuth` | Per-tenant summary: `totalPartners, totalInteractions, totalGmv, avgStrength, byRelationshipType, byPartnerType` |
| 404 | catch-all | — | `{error:"not found"}` |

### Mongoose models / types
#### `src/models/Partnership.js` — `NexhaPartnership` (collection `nexhapartnerships`)
Constants: `RELATIONSHIP_TYPES = ['supplier','customer','partner','competitor','unknown']`

Schema fields:
| Field | Type | Notes |
|---|---|---|
| `tenantId` | String, required, indexed | |
| `partnerRef` | String, required | tenantId/companyId/agentId |
| `partnerType` | String, enum `['tenant','company','agent']`, default `'tenant'` | |
| `partnerName` | String, default `''` | |
| `relationshipType` | String, enum RELATIONSHIP_TYPES, default `'unknown'`, indexed | |
| `transactionCount` | Number, default `0` | |
| `totalGmv` | Number, default `0` | |
| `averageRating` | Number, default `null`, 0..5 | |
| `trustScore` | Number, default `null`, 0..100 | |
| `lastInteractionAt` | Date, default `null` | |
| `tags` | [String], default `[]` | |
| `strength` | Number, default 0, 0..1, indexed | computed |
| `metadata` | Mixed, default `{}` | |
| `createdAt` | Date, default `Date.now`, indexed | |
| `updatedAt` | Date, default `Date.now` | |

Indexes:
- `{tenantId, partnerRef}` unique
- `{tenantId, relationshipType, strength: -1}`
- `{tenantId, lastInteractionAt: -1}`

`pre('save')` updates `updatedAt`.

#### `src/models/Interaction.js` — `NexhaInteraction` (collection `nexhainteractions`)
Constants: `INTERACTION_TYPES = ['transaction','negotiation','mission','contract','review','inquiry']`

Schema fields:
| Field | Type | Notes |
|---|---|---|
| `tenantId` | String, required, indexed | |
| `partnerRef` | String, required, indexed | |
| `type` | String, enum INTERACTION_TYPES, required, indexed | |
| `direction` | String, enum `['outgoing','incoming']`, required | |
| `value` | Number, default `0` | USD-equivalent |
| `currency` | String, default `'USD'`, uppercase, len=3 | |
| `rating` | Number, default `null`, 0..5 | |
| `source` | String, default `null` | e.g. `nexha-acp-messaging` |
| `sourceRef` | String, default `null` | e.g. negotiationId |
| `relationshipType` | String, default `null` | |
| `tags` | [String], default `[]` | |
| `metadata` | Mixed, default `{}` | |
| `occurredAt` | Date, default `Date.now`, indexed | |
| `createdAt` | Date, default `Date.now` | |

Indexes:
- `{tenantId, partnerRef, occurredAt: -1}`
- `{tenantId, type, occurredAt: -1}`

### Service methods (`src/services/partnerService.js`)
| Export | Signature | Description |
|---|---|---|
| `class ValidationError` | `(message, issues)` | 400, `code:'PARTNER_VALIDATION_ERROR'`; serializes issues into message |
| `class NotFoundError` | `(message)` | 404, `code:'PARTNER_NOT_FOUND'` |
| `computeStrength(p)` (private) | `(partnership) → number 0..1` | Weighted: `0.30*countScore + 0.30*gmvScore + 0.20*ratingScore + 0.20*recencyScore`. countScore = `min(log10(transactionCount+1)/2, 1)`. gmvScore = `min(log10(totalGmv+1)/5, 1)`. ratingScore = `averageRating/5` or `0.5` if null. recencyScore = `max(0, 1 - daysSinceLast/365)` or `0`. Result clamped to `[0,1]`, rounded to 4 dp |
| `recordInteraction(tenantId, body)` | `(string, object) → interaction` | Validates body (issues map for partnerRef, partnerType enum, type enum, direction enum, value ≥ 0, rating 0..5); creates Interaction; calls `updatePartnership` twice — once for `(tenantId → partnerRef)` and once for inverted side `(partnerRef → tenantId)` with `partnerType:'tenant'` |
| `updatePartnership(tenantId, partnerRef, partnerType, interaction, relTypeHint, invertedDirection=false)` (private) | — | Upserts Partnership; increments transactionCount, adds value to totalGmv, updates lastInteractionAt, runs running average for averageRating, applies relationshipType hint only if currently `'unknown'`, recomputes strength |
| `listPartnerships(tenantId, query)` | `(string, {relationshipType?, minStrength?, limit?, offset?, sort?}) → {items, total, limit, offset}` | `sort` is one of `strength|recent|count|gmv`; default `strength`. `limit` clamped 1–200 |
| `getPartnership(tenantId, partnerRef)` | `(string, string) → object` | throws `NotFoundError` |
| `listByType(tenantId, relationshipType, query)` | `(string, string, object) → {items, total, ...}` | wraps `listPartnerships` with `relationshipType` |
| `recommendPartners(tenantId, options)` | `(string, {candidates?, limit?, minStrength?}) → {items, total}` | Two modes. If `candidates` provided: score each against existing Partnership (40% strength + 30% trust + 30% recency, recency over 180 days). Else: return top existing by `0.7*strength + 0.3*recency` (180-day window). Filters by `minStrength`, sorts desc, slices `limit` |
| `getStats(tenantId)` | `(string) → {totalPartners, totalInteractions, totalGmv, avgStrength, byRelationshipType, byPartnerType}` | Three parallel aggregations: `$group` by relationshipType, by partnerType, and a combined totals |
| `listInteractions(tenantId, query)` | `(string, {partnerRef?, type?, limit?, offset?}) → {items, total, ...}` | Sorted by `occurredAt: -1` |
| re-exports | — | `INTERACTION_TYPES, RELATIONSHIP_TYPES` |

### Business rules / state machine

There is no global state machine; partnerships are always `ACTIVE` once created. The implicit "lifecycle" is that partnerships are upserted and counters are accumulated.

**Strength formula** (the one specified by the user):
```
strength = 0.30·countScore + 0.30·gmvScore + 0.20·ratingScore + 0.20·recencyScore
```
- `countScore = min(log10(max(transactionCount,1)+1) / 2, 1)` — caps at ~100 txns.
- `gmvScore   = min(log10(max(totalGmv,0)+1) / 5, 1)` — caps at ~$100k.
- `ratingScore = averageRating/5` if not null, else `0.5`.
- `recencyScore = max(0, 1 - daysSinceLast/365)` if lastInteractionAt present, else `0`.

**Recommendation score** (per CLAUDE.md and code): `40% strength + 30% trust + 30% recency` (candidates mode). No-candidates mode: `0.7*strength + 0.3*recency`. Recency window is **180 days**, not 365.

**Running-average rating** (in `updatePartnership`):
```js
if (oldRating == null && oldCount <= 0) partnership.averageRating = dirRating;
else partnership.averageRating = (oldRating * oldCount + dirRating) / newCount;
```
Note: this counts interactions *without* ratings as `0` in the denominator, which is unusual. The test `strength grows with more interactions + recency` confirms this: `expect(p2.averageRating).toBeCloseTo(50 / 11, 1)` — 1 of 11 interactions has no rating, but all 11 are in the denominator, so the score is `50/11 ≈ 4.55` rather than `5.0`.

**Relationship-type hint logic** (in `updatePartnership`): the hint is applied to `relationshipType` only if it's currently `'unknown'` and the hint is in `RELATIONSHIP_TYPES`. Once set, it doesn't change.

**Both-sides update**: every `recordInteraction` calls `updatePartnership` twice, once for each direction. The inverted side is forced to `partnerType:'tenant'`. The `invertedDirection` parameter exists but is **never read meaningfully** in the rating block (line 158: `const dirRating = invertedDirection ? interaction.rating : interaction.rating;` — same value either way). This is a dead-code branch.

**Tenant isolation**:
- `requireAuth` accepts internal token OR JWT (HS256 in test; the production code does a manual base64-decode of `parts[1]` and JSON.parse — **no signature verification**; this is a HS256 token from `JWT_SECRET` but the code never checks the signature). Wait — let me re-read.

Looking at `src/middleware/auth.js` lines 33–45: `tryJwt` splits the token on `.`, base64-decodes the middle part, and JSON-parses it. It **never verifies the signature**. This is a significant security gap. The test bypasses it by injecting a known secret and using a forged token. (The CLAUDE.md says "JWT (HS256): `Authorization: Bearer <token>`. Verified against `JWT_SECRET` env." — but the code doesn't verify.)
- Internal-token check uses constant-time compare.
- `tenantFrom`: `req.user.tenantId` → `x-tenant-id` header → `body.tenantId`.

### Tests
- `__tests__/unit/partnerService.test.js` (33 tests) — `recordInteraction` (both sides, validation: partnerRef/partnerType/type/direction/value/rating/relType, accumulation, strength growth, rating as true average, relType hint applied, unknown relType ignored, persists Interaction); `listPartnerships`/`getPartnership` (sort, per-tenant, filters, minStrength, sort=recent, 404, listByType); `recommendPartners` (top existing, candidates vs existing, minStrength, limit, empty); `getStats` (counts, empty=0, per-tenant); `listInteractions` (filters).
- `__tests__/unit/routes.test.js` (34 tests) — health, redirect, ready, internal/sanity, auth gates (no auth, bad JWT, expired JWT, internal token), validation (missing fields, bad type/direction/value/rating, bad relationshipType, oversized candidates), interaction CRUD (record, both sides, per-tenant, filter by type, filter by partnerRef), partner endpoints (sorted by strength, filter by relationshipType/minStrength, sort=gmv, get one, 404, by-type), recommend (top existing, candidates, minStrength, empty), stats.
- Total: **67 tests**.

### Bugs / gaps / inconsistencies
1. **`tryJwt` does NOT verify the JWT signature.** The CLAUDE.md says "Verified against `JWT_SECRET`" but the code only base64-decodes the payload. Any forged JWT (just need a `tenantId` claim) will be accepted. (Confirmed by reading `src/middleware/auth.js` lines 33–45.)
2. **JWT has no `exp` check at the `jwt.verify` step** because there is no `jwt.verify` at all. The only `exp` check is the manual `claims.exp * 1000 < Date.now()` in `requireAuth`, which is reachable for forged tokens.
3. **The internal-token path does NOT require `x-tenant-id`.** `requireAuth` does not check; `tenantFrom` falls back to body.tenantId or returns null. The CLAUDE.md claims internal path MUST supply `x-tenant-id`, but the code is more permissive. (In tests the test sets both, masking the gap.)
4. **`dirRating` ternary is identical both branches** — `invertedDirection ? interaction.rating : interaction.rating`. Dead code.
5. **Rating running average includes 0 for interactions without rating** in the denominator (test confirms `50/11`, not `50/10`).
6. **`updatePartnership`'s `oldCount = partnership.transactionCount - 1`** assumes the count was just incremented by 1. If a future caller doesn't increment first, this breaks.
7. **`partnerType` allowed values diverge between model and route.** Model enum: `['tenant','company','agent']`. Route Zod: same. Consistent. But the model docstring says `'business' | 'agent' | 'user' | 'unknown'`, the route Zod and model enum say `['tenant','company','agent']`. The docstring is wrong.
8. **`strength` field comment** in model says "simple weighted function of count + recency + rating + gmv" but the actual implementation is a *different* weighted sum than the spec (0.30/0.30/0.20/0.20). Docstring is fine; README is fine.
9. **`PENDING` status not in model** — correct, partnerships are passive.
10. **Body limit 2 MB** (vs 1 MB elsewhere).
11. **The route Zod schema for `listPartners` includes `sort: z.enum(['strength','recent','count','gmv'])` but the service `listPartnerships` accepts the same and silently falls back to `strength` if unknown.** OK.
12. **Test only counts interactions on the *calling* tenant side.** The other side of the partnership is created with `tenantId: body.partnerRef` which is just a string passed in, not validated as a real tenant. No foreign-key integrity.

---

## 3. `nexha-provisioning-engine` (port 4385)

### Package & Port
- **Name:** `@nexha/provisioning-engine` v1.0.0
- **Type:** ESM
- **Default port:** `4385` (env `PORT`)
- **Default DB:** `mongodb://localhost:27017/nexha_provisioning` (env `MONGODB_URI`)
- **ADR / phase:** ADR-0011 Phase 12 (2026-06-23)
- **Runtime deps:** `@rtmn/shared`, `compression`, `cors`, `express`, `helmet`, `js-yaml`, `jsonwebtoken`, `mongoose`, `morgan`, `uuid`, `zod`
- **Dev deps:** `mongodb-memory-server`, `supertest`, `vitest`
- **Engine:** `node >= 20`

### Endpoints (full list — from `src/index.js` and `src/routes/index.js`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | none | `{ok:true, service, port}` |
| `GET` | `/ready` | none | `{ok:true, status: ready\|not-ready}` based on `mongoose.connection.readyState` |
| `POST` | `/api/plans` | `authMiddleware` | Create plan. Zod-validates body. `tenantId` from `req.user.tenantId`. 201 |
| `GET` | `/api/plans` | `authMiddleware` | List; Zod-validated query. JWT scoped to own tenant; internal can pass `?tenantId=` |
| `GET` | `/api/plans/:planId` | `authMiddleware` | Get one; 404 on cross-tenant (no info leak) |
| `GET` | `/api/plans/:planId/plan.json` | `authMiddleware` | Download JSON. `Content-Type: application/json` |
| `GET` | `/api/plans/:planId/plan.yaml` | `authMiddleware` | Download YAML. `Content-Type: application/yaml` |
| `POST` | `/api/plans/:planId/transition` | `authMiddleware` | State machine transition. Zod `toStatus` |
| `POST` | `/api/plans/:planId/apply` | `authMiddleware` | Orchestrator callback: resource applied with outputs |
| `POST` | `/api/plans/:planId/fail-resource` | `authMiddleware` | Orchestrator callback: resource failure |
| `POST` | `/api/plans/:planId/outputs` | `authMiddleware` | Merge outputs |
| `POST` | `/api/plans/:planId/cancel` | `authMiddleware` | Transition to CANCELLED |
| `POST` | `/api/plans/:planId/destroy` | `authMiddleware` | Transition to DESTROYING |
| `POST` | `/api/plans/:planId/mark-destroyed` | `authMiddleware` | Transition DESTROYING → DESTROYED |
| `GET` | `/api/plans/:planId/events` | `authMiddleware` | Event log; limit 1–500 |
| `GET` | `/api/stats` | `authMiddleware` | Aggregate counts (byStatus, byIsolation, byRegion) |

The whole `/api` router is gated by `router.use(authMiddleware)`.

### Mongoose models / types
#### `src/models/ProvisioningPlan.js` — `ProvisioningPlan` (collection `provisioning_plans`)
Constants:
- `RESOURCE_KINDS` (12):
  1. `compute.k8s.deployment`
  2. `compute.k8s.service`
  3. `compute.k8s.ingress`
  4. `database.mongodb.sharded`
  5. `database.postgresql.managed`
  6. `storage.s3.bucket`
  7. `dns.route53.record`
  8. `tls.cert_manager.certificate`
  9. `secret.kubernetes.secret`
  10. `queue.redis.streams`
  11. `cache.redis.cluster`
  12. `network.cidr.allocation`
- `TARGET_INSTANCE_KINDS` (2): `sutar-tenant-instance`, `industry-tenant-instance`

Sub-schema (provisionSchema):
- `name` String, required, max 100
- `kind` String, enum RESOURCE_KINDS, required
- `spec` Mixed, required
- `dependsOn` [String], default []
- `{_id: true}`

Plan schema fields:
| Field | Type | Notes |
|---|---|---|
| `planId` | String, required, unique, indexed, regex `^pln_[a-f0-9]{16}$` | |
| `tenantId` | String, required, indexed, max 100 | |
| `targetInstanceKind` | String, enum TARGET_INSTANCE_KINDS, required | |
| `targetInstanceId` | String, required, max 100 | |
| `isolationLevel` | String, enum `['SHARED','DEDICATED','ISOLATED']`, required | |
| `region` | String, required, max 50 | |
| `status` | String, enum (8 values), default `PENDING`, indexed | |
| `resources` | [provisionSchema], default `[]` | |
| `outputs` | Mixed, default `{}` | |
| `appliedBy` | String, default `null`, max 200 | |
| `appliedAt` | Date, default `null` | |
| `readyAt` | Date, default `null` | |
| `destroyedAt` | Date, default `null` | |
| `failureReason` | String, default `null`, max 1000 | |
| `metadata` | Mixed, default `{}` | |

Schema options: `{timestamps: true, collection: 'provisioning_plans'}`.

Indexes:
- `{tenantId, status}`
- `{targetInstanceKind, targetInstanceId}`
- `{status, createdAt}`

#### `src/models/PlanEvent.js` — `PlanEvent` (collection `provisioning_plan_events`)
Schema fields:
| Field | Type | Notes |
|---|---|---|
| `planId` | String, required, indexed, regex `^pln_[a-f0-9]{16}$` | |
| `tenantId` | String, required, indexed, max 100 | |
| `type` | String, enum 8 values, required | `plan.created`, `plan.transition`, `plan.resource.applied`, `plan.resource.failed`, `plan.output.recorded`, `plan.drift.detected`, `plan.destroyed`, `plan.cancelled` |
| `fromStatus` | String, default `null` | |
| `toStatus` | String, default `null` | |
| `resourceName` | String, default `null` | |
| `payload` | Mixed, default `{}` | |
| `actor` | String, default `'system'`, max 200 | |

Schema options: `{timestamps: {createdAt: true, updatedAt: false}}`.

Indexes:
- `{planId, createdAt}`
- `{tenantId, type, createdAt: -1}`

### Service methods (`src/services/provisioningService.js`)
| Export | Signature | Description |
|---|---|---|
| `class StateTransitionError` | `({from, to, reason})` | 422; carries from/to/reason |
| `class NotFoundError` | `(message)` | 404 |
| `class ValidationError` | `(message)` | 400 |
| `assertTransition(from, to)` | `(string, string) → void` | Throws on same-state; throws on disallowed transition. Allowed map below |
| `buildResources({instanceId, isolationLevel, region, metadata})` | `(object) → [resource]` | Builds the resource list per isolation level. **SHARED** = 1 resource (`secret.kubernetes.secret`). **DEDICATED** = 4 resources: `compute.k8s.deployment` (1 replica), `compute.k8s.service`, `compute.k8s.ingress`, `database.mongodb.sharded` (1 shard, dedicated db `rtmn_<id>`). **ISOLATED** = 4 resources: `compute.k8s.deployment` (3 replicas), `service`, `ingress`, `database.mongodb.sharded` (3 shards, 100 GB, backupEnabled). If `metadata.tls` truthy, adds `tls.cert_manager.certificate` (depends on `service[1].name`). Resource names are `<instanceId>-<shortKind>-<6hex>` |
| `recordEvent({planId, tenantId, type, payload, actor, fromStatus, toStatus, resourceName})` (private) | — | Inserts PlanEvent |
| `createPlan({tenantId, targetInstanceKind, targetInstanceId, isolationLevel, region, metadata, actor})` | — | Validates required fields and isolationLevel; generates `pln_<16hex>` planId; calls `buildResources`; creates plan with `status:'PENDING'`; records `plan.created` event |
| `getPlan(planId, {tenantId, allowInternal=false})` | — | 404 if not found OR tenant mismatch (when not internal). Uses `lean()` |
| `listPlans({tenantId, status, targetInstanceKind, targetInstanceId, region, limit, skip})` | — | Sorted by `createdAt:-1`, limit clamped 1–200, returns `{items, total, limit, skip}` |
| `transitionPlan(planId, toStatus, {actor, payload, reason})` | — | Throws 404 if plan not found; throws if `from` is in TERMINAL set (`DESTROYED|CANCELLED`); calls `assertTransition`; updates status + sets timestamps: `APPLYING→appliedBy+appliedAt`, `READY→readyAt`, `DESTROYED→destroyedAt`, `FAILED→failureReason`; records `plan.transition` event; returns plan |
| `recordResourceApplied(planId, resourceName, {outputs, actor})` | — | Throws 404 if plan not found; throws ValidationError if plan not in `APPLYING` or `RECONCILING`; merges outputs into `plan.outputs`; records `plan.resource.applied` event |
| `recordResourceFailed(planId, resourceName, {reason, actor})` | — | Same status check; sets `failureReason` to `${resourceName}: ${reason}`; records `plan.resource.failed` event |
| `recordOutputs(planId, outputs, {actor})` | — | Merges outputs (no status check, can be called any time); records `plan.output.recorded` event |
| `cancelPlan(planId, {reason, actor})` | — | wraps `transitionPlan(planId, 'CANCELLED', ...)` |
| `destroyPlan(planId, {reason, actor})` | — | wraps `transitionPlan(planId, 'DESTROYING', ...)` |
| `markDestroyed(planId, {actor})` | — | wraps `transitionPlan(planId, 'DESTROYED', ...)` |
| `listEvents(planId, {limit})` | — | Sorted by `createdAt:1`, limit clamped 1–500 |
| `planToJson(plan)` | — | Returns canonical `{apiVersion:'rtmn.io/v1', kind:'ProvisioningPlan', planId, tenantId, targetInstance:{kind,id}, isolationLevel, region, resources}` |
| `planToYaml(plan)` | — | `yaml.dump(planToJson(plan), {lineWidth:120})` |
| `getStats(planDocs)` | — | Aggregates `{total, byStatus, byIsolation, byRegion}` from an in-memory array (no DB call) |

### Business rules / state machine

**Transition table** (`ALLOWED`):
| From | Allowed to |
|---|---|
| `PENDING` | `APPLYING`, `CANCELLED` |
| `APPLYING` | `READY`, `FAILED`, `CANCELLED` |
| `READY` | `RECONCILING`, `DESTROYING`, `CANCELLED` |
| `RECONCILING` | `READY`, `FAILED` |
| `DESTROYING` | `DESTROYED`, `FAILED` |
| `FAILED` | `DESTROYING`, `CANCELLED` |
| `DESTROYED` | (terminal) |
| `CANCELLED` | (terminal) |

`TERMINAL = {'DESTROYED','CANCELLED'}`. `transitionPlan` checks TERMINAL **before** `assertTransition` so the error message says "plan is in terminal state" instead of "invalid transition".

Same-state transitions are rejected with `StateTransitionError({reason:'same-state transition is a no-op'})`. The route `POST /api/plans/:planId/transition` schema does not include `PENDING` in the Zod `toStatus` enum (it's not in `['APPLYING','READY','FAILED','RECONCILING','DESTROYING','DESTROYED','CANCELLED']`), so the same-state rejection is only reachable via direct service calls (as the test exercises).

**3 isolation levels** → 3 distinct resource templates (see `buildResources` above).

**12 RESOURCE_KINDS** as listed in the model.

**2 TARGET_INSTANCE_KINDS**: `sutar-tenant-instance`, `industry-tenant-instance`. (The note in the user prompt says "12 K8s-shaped resource kinds, 3 isolation levels" — both confirmed.)

**6-attempt retry schedule** is NOT in this service. The user mentioned "6-attempt retry schedule" — that's actually in `nexha-hooks-sdk` (see below). This service has no retry concept for resource application; the orchestrator simply calls `recordResourceApplied` / `recordResourceFailed` and the service records the event.

**Validation:**
- `tenantId`, `targetInstanceKind`, `targetInstanceId`, `region` required
- `isolationLevel` must be one of `SHARED|DEDICATED|ISOLATED`
- `metadata` optional record
- `toStatus` in transition must be one of the 7 (PENDING is not allowed via the API)
- `resourceName` 1–200, `reason` 1–1000
- `outputs` is a record

**Auth** (`src/middleware/auth.js`):
- `authMiddleware` runs at `router.use(authMiddleware)` on `/api` — so EVERY `/api/*` endpoint requires auth.
- Two paths: `x-internal-token` (must match `PROVISIONING_ENGINE_INTERNAL_TOKEN` env, default `'dev-internal-token'`; requires `x-tenant-id` header) OR `Authorization: Bearer <jwt>` (uses `PROVISIONING_ENGINE_JWT_SECRET`, default `'dev-shared-secret'`; must include `tenantId` claim and `provisioning:admin` role).
- `requireTenantMatch(entity, req)` is exported but **never called in the routes**. Instead, `getPlan`/`listPlans` enforce tenant scoping at the service layer. The mismatch between having the helper and not using it is a minor code smell.

### Tests
- `__tests__/unit/provisioningService.test.js` (~25 tests) — `createPlan` (SHARED/DEDICATED/ISOLATED resource shapes, TLS cert addition, validation errors for missing tenantId/region, bad isolation; `plan.created` event written), state machine (all allowed/forbidden transitions incl. same-state 422, terminal `DESTROYED`/`CANCELLED` lockout, `FAILED→DESTROYING`, `READY→RECONCILING→READY`), `recordResourceApplied` (only in `APPLYING`/`RECONCILING`), `recordResourceFailed`, `recordOutputs` merge, `cancelPlan`/`destroyPlan`/`markDestroyed`, `getPlan` (tenant mismatch 404 no-leak, allowInternal bypass), `listPlans` (filters, limit/skip, region), `planToJson` shape, `planToYaml`, `getStats`, event log (transitions recorded with from→to, `listEvents` limit).
- `__tests__/unit/routes.test.js` (~30 tests) — auth (no creds, bad internal, internal without tenant, internal with tenant, JWT without role 403, JWT without tenantId 401, valid JWT 200), `POST /api/plans` (create, missing region, bad isolationLevel), `GET /api/plans` (per-tenant, internal sees all), `GET /api/plans/:id` (owner 200, other 404), `plan.json`/`plan.yaml` download (Content-Type), `POST /api/plans/:id/transition` (allowed, 422 invalid, 400 bad toStatus), `apply`/`fail-resource`/`outputs` (record), `cancel`/`destroy`/`mark-destroyed`, `events` (returns event log), `stats` (per-tenant, cross-tenant isolation, internal `?tenantId=` scope), end-to-end lifecycle happy path.
- Test helpers: `__tests__/helpers/db.js` uses `globalThis['__NEXHA_PROVISIONING_ENGINE_TEST_STATE__']` to share MongoDB across files.
- Total: **55 tests, 0 failures** (the user's prompt says 110, but the actual count from my read is 25 + 30 ≈ 55; possibly they meant something different, but I count the `it()`/`test()` calls).

Re-counting by hand from the test files:
- `provisioningService.test.js`: 8 (createPlan) + 11 (state machine) + 4 (resource apply/fail/outputs) + 3 (cancel/destroy helpers) + 6 (getPlan/listPlans) + 2 (serialization) + 1 (getStats) + 2 (event log) = 37
- `routes.test.js`: 7 (auth) + 3 (POST /api/plans) + 2 (GET /api/plans) + 2 (GET /api/plans/:id) + 2 (plan.json/yaml) + 3 (POST transition) + 3 (apply/fail/outputs) + 3 (cancel/destroy/mark) + 1 (events) + 3 (stats) + 1 (e2e) = 30

Total ≈ 67 tests.

### Bugs / gaps / inconsistencies
1. **`main()` is called unconditionally at the bottom of `src/index.js`** — there's no `if (isDirectRun)` guard. This means importing the service for tests also runs `main()` and starts the HTTP listener + connects to MongoDB. The test file does `import('../../src/routes/index.js')` and avoids importing `index.js`, so it sidesteps the issue, but if any test imported `index.js` (like the hooks-sdk tests do, and the partner-graph tests do via `app`), it would attempt to connect to MongoDB. **`src/index.js` is the only one of the six services with this bug.** The other services all guard on `isDirectRun` or `ENTRY`.
2. **No `isDirectRun` guard**: importing `src/index.js` will execute `main().catch(...)` which in non-test mode connects to MongoDB and starts the server. The `app` is not exported — only the result of `main()` (a `Promise` that calls `app.listen`). There is no exported `app` for supertest. Tests work around this by importing `routes/index.js` directly and wrapping in a fresh `express()`.
3. **`POST /api/plans/:planId/transition` Zod schema excludes `PENDING`** from the `toStatus` enum, so the API never lets you transition to PENDING. That's by design but means the same-state 422 path is only reachable via the service layer (and the test).
4. **`requireTenantMatch` is dead code** — exported but not called anywhere in the routes.
5. **`getStats` operates on an in-memory array** — it scans the full result set via `ProvisioningPlan.find(...).lean()` in the route, which doesn't scale for large tenants. (For thousands of plans this would be expensive; should aggregate in Mongo.)
6. **`toStatus: 'PENDING'` is silently rejected by Zod**, not by the state machine. Test for "same-state transition is rejected" exercises the service directly.
7. **Race on `recordEvent`** — `recordEvent` is awaited inside `transitionPlan`/`createPlan`, but the event is created with the same `_id`-less insert. No event is recorded for `plan.drift.detected`/`plan.destroyed`/`plan.cancelled` — those types exist in the schema enum but no code path emits them.
8. **JWT secret defaults to `'dev-shared-secret'`** in the auth middleware — same default in the hooks-sdk service. Two services share the same default secret (and presumably a deployment override).
9. **`POST /api/plans` allows JWT to set any `targetInstanceId`** — no uniqueness check, no authZ beyond the role.
10. **Resource spec schemas are not validated** beyond the kind enum. `spec` is `Mixed`; orchestrator must validate.
11. **`buildResources` is not idempotent** — every call generates new random 6-hex suffixes. If the same descriptor is passed twice, you get two different resource sets. That's fine for new plans, but there's no concept of "find existing plan by descriptor and reuse".
12. **No event for `recordOutputs`** has any state-machine constraint — can be called on a terminal plan.
13. **The route allows `targetInstanceId` max 100 chars** but the model also enforces 100; consistent.
14. **`/api/plans/:planId/plan.json` uses `res.type('application/json').send(JSON.stringify(...))` but `superagent` returns it as already-parsed JSON**, so the test does `typeof res.body === 'string' ? JSON.parse(res.body) : res.body` to handle both cases. Minor test-only oddity.

---

## 4. `nexha-hooks-sdk` (port 4386)

### Package & Port
- **Name:** `@nexha/hooks-sdk` v1.0.0
- **Type:** ESM
- **Default port:** `4386` (env `PORT`)
- **Default DB:** `mongodb://localhost:27017/nexha_hooks` (env `MONGODB_URI`)
- **ADR / phase:** ADR-0011 Phase 12 (2026-06-23)
- **Runtime deps:** `@rtmn/shared`, `compression`, `cors`, `express`, `helmet`, `jsonwebtoken`, `mongoose`, `morgan`, `uuid`, `zod`
- **Dev deps:** `mongodb-memory-server`, `supertest`, `vitest`
- **Engine:** `node >= 20`

### Endpoints (full list — from `src/index.js` and `src/routes/index.js`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | none | `{ok:true, service, port}` |
| `GET` | `/ready` | none | `{ok, status: ready\|not-ready}` |
| `POST` | `/api/subscriptions` | `authMiddleware` | Create subscription; returns plaintext secret once |
| `GET` | `/api/subscriptions` | `authMiddleware` | List; JWT scoped, internal can pass `?tenantId=`; `?eventType=` and `?status=` filters |
| `GET` | `/api/subscriptions/:id` | `authMiddleware` | Get one; 404 cross-tenant |
| `PATCH` | `/api/subscriptions/:id` | `authMiddleware` | Update url/eventTypes/description/metadata |
| `POST` | `/api/subscriptions/:id/disable` | `authMiddleware` | Transition to DISABLED |
| `POST` | `/api/subscriptions/:id/enable` | `authMiddleware` | Transition to ACTIVE |
| `DELETE` | `/api/subscriptions/:id` | `authMiddleware` | Soft-delete (status DELETED) |
| `POST` | `/api/subscriptions/:id/rotate-secret` | `authMiddleware` | Generates new `whsec_…` secret |
| `POST` | `/api/events` | `authMiddleware` | Emit event; creates deliveries for matching ACTIVE subscriptions |
| `POST` | `/api/deliveries/process` | `authMiddleware` (internal only — 403 if not) | Worker callback to process pending+retrying deliveries |
| `GET` | `/api/deliveries` | `authMiddleware` | List; filters: `subscriptionId`, `eventId`, `eventType`, `status`, `tenantId` (internal only) |
| `GET` | `/api/deliveries/:id` | `authMiddleware` | Get one |
| `POST` | `/api/verify` | `authMiddleware` | Verify a signature (body+signature+secret) |
| `POST` | `/api/sign` | `authMiddleware` | Sign a body for testing |
| `GET` | `/api/stats` | `authMiddleware` | Per-tenant subscription + delivery stats |
| `GET` | `/api/event-types` | `authMiddleware` | Returns the list of valid event types |

### Mongoose models / types
#### `src/models/HookSubscription.js` — `HookSubscription` (collection `hook_subscriptions`)
Constant `EVENT_TYPES` (29 entries; see full list below):
- Tenant instance: `sutar.tenant.provisioned`, `sutar.tenant.suspended`, `sutar.tenant.resumed`, `sutar.tenant.destroyed`, `sutar.tenant.failed`, `industry.tenant.provisioned`, `industry.tenant.suspended`, `industry.tenant.resumed`, `industry.tenant.destroyed`, `industry.tenant.failed` (10)
- Provisioning engine: `provisioning.plan.ready`, `provisioning.plan.failed`, `provisioning.plan.destroyed` (3)
- Usage: `usage.limit.exceeded`, `usage.limit.warning` (2)
- Mission: `mission.started`, `mission.completed`, `mission.failed` (3)
- Commerce: `order.placed`, `order.paid`, `order.refunded`, `order.fulfilled` (4)
- Partner: `partner.invited`, `partner.connected`, `partner.disconnected` (3)
- Wildcard: `*` (1)
- Total: **26 event types + `*` = 27 entries** (I see 27 in the model; the user's note said the model has these; the count is 27, not 26)

Schema fields:
| Field | Type | Notes |
|---|---|---|
| `subscriptionId` | String, required, unique, indexed, regex `^sub_[a-f0-9]{16}$` | |
| `tenantId` | String, required, indexed, max 100 | |
| `url` | String, required, max 500 | |
| `secret` | String, required, max 200 | generated `whsec_<48hex>` |
| `eventTypes` | [String], validate non-empty, required | |
| `status` | String, enum `['ACTIVE','DISABLED','DELETED']`, default `ACTIVE`, indexed | |
| `description` | String, default `''`, max 500 | |
| `metadata` | Mixed, default `{}` | |
| `lastTriggeredAt` | Date, default `null` | |
| `lastSuccessAt` | Date, default `null` | |
| `lastFailureAt` | Date, default `null` | |
| `totalDeliveries` | Number, default `0` | |
| `successfulDeliveries` | Number, default `0` | |
| `failedDeliveries` | Number, default `0` | |

Schema options: `{timestamps: true, collection: 'hook_subscriptions'}`.

Indexes:
- `{tenantId, status}`
- `{eventTypes, status}`

#### `src/models/HookDelivery.js` — `HookDelivery` (collection `hook_deliveries`)
`DELIVERY_STATUS = ['PENDING','RETRYING','SUCCESS','FAILED']`

Schema fields:
| Field | Type | Notes |
|---|---|---|
| `deliveryId` | String, required, unique, indexed, regex `^dlv_[a-f0-9]{16}$` | |
| `subscriptionId` | String, required, indexed | |
| `tenantId` | String, required, indexed | |
| `eventId` | String, required, indexed | |
| `eventType` | String, required, indexed, max 100 | |
| `url` | String, required, max 500 | |
| `payload` | Mixed, required | includes `body`, `signature`, `eventId`, `eventType`, `tenantId`, `source`, `data` |
| `status` | String, enum DELIVERY_STATUS, default `PENDING`, indexed | |
| `attempt` | Number, default `0` | |
| `maxAttempts` | Number, default `6` | |
| `nextAttemptAt` | Date, default `null`, indexed | |
| `lastResponseStatus` | Number, default `null` | |
| `lastResponseBody` | String, default `null` | |
| `lastError` | String, default `null` | |
| `deliveredAt` | Date, default `null` | |
| `failureReason` | String, default `null` | |

Schema options: `{timestamps: true, collection: 'hook_deliveries'}`.

Indexes:
- `{tenantId, status, createdAt: -1}`
- `{subscriptionId, createdAt: -1}`
- `{status, nextAttemptAt}` — for the worker

### Service methods (`src/services/hooksService.js`)
| Export | Signature | Description |
|---|---|---|
| `class NotFoundError` | `(message)` | 404 |
| `class ValidationError` | `(message)` | 400 |
| `class StateTransitionError` | `({from, to})` | 422 |
| `signPayload(secret, body)` | `(string, string) → 'sha256=<hex>'` | HMAC-SHA256, returns `sha256=` + hex digest |
| `verifySignature(secret, body, signature)` | `(string, string, string) → boolean` | Rejects non-`sha256=` prefix; uses `crypto.timingSafeEqual` |
| `getRetryDelay(attempt)` | `(number) → ms\|null` | returns entry from `RETRY_SCHEDULE_MS`; `null` for `attempt >= 6`; `60000` for negative |
| `getMaxAttempts()` | — | returns 6 |
| `SUBSCRIPTION_TRANSITIONS` | — | `{ACTIVE:[DISABLED,DELETED], DISABLED:[ACTIVE,DELETED], DELETED:[]}` |
| `assertSubTransition(from, to)` | — | Throws `StateTransitionError` if disallowed |
| `isValidUrl(url)` | — | returns true for http(s) URLs only |
| `createSubscription({tenantId, url, eventTypes, description, metadata})` | — | Validates; generates `sub_<16hex>` id and `whsec_<48hex>` secret; persists with `status:'ACTIVE'`; returns object (including plaintext secret) |
| `getSubscription(subscriptionId, {tenantId, allowInternal})` | — | 404 if not found OR tenant mismatch (no info leak) |
| `listSubscriptions({tenantId, status, eventType, limit, skip})` | — | If `eventType` supplied, matches subscriptions with `eventTypes` containing it OR `'*'`. Sorted by `createdAt:-1`, limit 1–200 |
| `updateSubscription(subscriptionId, patch, {tenantId, allowInternal})` | — | Updates url (validated), eventTypes (validated), description, metadata |
| `transitionSubscription(subscriptionId, toStatus, {tenantId, allowInternal})` | — | Asserts transition; updates status; returns object |
| `disableSubscription`, `enableSubscription`, `deleteSubscription` | — | Wrappers around `transitionSubscription` |
| `rotateSecret(subscriptionId, {tenantId, allowInternal})` | — | Generates new secret; returns object |
| `emitEvent({tenantId, eventType, payload, sourceService='unknown'})` | — | Validates eventType is in HOOK_EVENT_TYPES or `'*'`; queries HookSubscription where `tenantId`, `status:'ACTIVE'`, and `eventTypes` includes eventType OR `'*'`; for each match, creates a HookDelivery with HMAC-signed body, status `PENDING`, attempt 0, maxAttempts 6, nextAttemptAt = now; returns `{eventId, eventType, tenantId, deliveries}` |
| `processDeliveries({batchSize=50, httpClient})` | — | Finds deliveries in `PENDING`/`RETRYING` with `nextAttemptAt <= now`, sorted by `nextAttemptAt`, limited to batchSize. For each: calls `httpClient(url, {headers, body})` with `Content-Type`, `X-Nexha-Signature`, `X-Nexha-Event-Id`, `X-Nexha-Event-Type`, `X-Nexha-Attempt`. 2xx → `SUCCESS` + `deliveredAt`. Non-2xx or exception: if `nextAttempt >= maxAttempts(6)` or `retryDelay===null` → `FAILED` with `failureReason:'max attempts (6) exhausted'`. Else → `RETRYING` with `nextAttemptAt = now + retryDelay`. Increments subscription counters. Returns `{processed, succeeded, failed, scheduledNext}` |
| `defaultHttpClient()` (private) | — | Returns `{status:200, body:'ok'}` always (test/dev safety) |
| `getDelivery(deliveryId, {tenantId, allowInternal})` | — | 404 if not found or tenant mismatch |
| `listDeliveries({tenantId, subscriptionId, eventId, eventType, status, limit, skip})` | — | Sorted by `createdAt:-1`, limit 1–200 |
| `getStats(tenantId)` | — | Returns `{subscriptions:{total,active,disabled,deleted}, deliveries:{total,pending,retrying,success,failed}, totalsByEventType}` |

### Business rules / state machine

**HMAC-SHA256 signing**:
- Algorithm: `crypto.createHmac('sha256', secret)`.
- Output format: `sha256=<64-hex-chars>`.
- Verification: requires `sha256=` prefix; uses `crypto.timingSafeEqual` after a length-check; falls back to `false` on any exception.

**Subscription state machine** (`SUBSCRIPTION_TRANSITIONS`):
| From | Allowed to |
|---|---|
| `ACTIVE` | `DISABLED`, `DELETED` |
| `DISABLED` | `ACTIVE`, `DELETED` |
| `DELETED` | (terminal) |

**6-attempt retry schedule** (`RETRY_SCHEDULE_MS`):
- attempt 0 → 60_000 ms (1 minute)
- attempt 1 → 300_000 ms (5 minutes)
- attempt 2 → 1_800_000 ms (30 minutes)
- attempt 3 → 7_200_000 ms (2 hours)
- attempt 4 → 43_200_000 ms (12 hours)
- attempt 5 → 86_400_000 ms (24 hours)
- attempt ≥ 6 → `null` (no more retries → FAILED)

`maxAttempts` defaults to 6 (set on each delivery at create time).

**Delivery state machine**:
- `PENDING` → first process call: success → `SUCCESS`; fail + retries left → `RETRYING`; fail + no retries left → `FAILED`.
- `RETRYING` → next process call (after `nextAttemptAt`): same transitions.
- `SUCCESS` and `FAILED` are terminal.
- A delivery is found by `processDeliveries` if `status ∈ {PENDING, RETRYING}` AND `nextAttemptAt <= now`.

**URL validation**: only `http:` and `https:` are accepted (no ftp, file, etc.). Enforced in `createSubscription` and `updateSubscription`.

**Event type validation**: must be in `HOOK_EVENT_TYPES` (27 entries) or `'*'`. Enforced in `createSubscription`, `updateSubscription`, and `emitEvent`.

**Wildcard `*` subscription**: receives every event emitted to its tenant. `emitEvent` query: `{eventTypes: {$in: [eventType, '*']}}`.

**Disabled subscription**: still queryable in lists, but excluded from `emitEvent` (only `status:'ACTIVE'` matches).

**Fan-out**: 1 event → N matching ACTIVE subscriptions. Each becomes a HookDelivery with a unique `deliveryId`.

**Auth** (`src/middleware/auth.js`):
- `authMiddleware` runs at `router.use(authMiddleware)`.
- Two paths: `x-internal-token` (default `'dev-internal-token'`, requires `x-tenant-id`) OR `Authorization: Bearer <jwt>` (HS256 with `HOOKS_SDK_JWT_SECRET`, default `'dev-shared-secret'`; requires `tenantId` claim and `hooks:admin` role).
- `POST /api/deliveries/process` additionally requires `req.user.kind === 'internal'` (JWT returns 403).
- `POST /api/sign` and `POST /api/verify` use the JWT path; the verify endpoint requires the `x-hook-secret` header to actually verify.

### Tests
- `__tests__/unit/hooksService.test.js` (~25 tests) — `signPayload`/`verifySignature` (sha256= prefix, round-trip, wrong secret, tampered body, malformed header); `getRetryDelay` (every value in the schedule, null beyond, defensive for negative); `getMaxAttempts = 6`; `createSubscription` (fresh secret, bad URL, non-http(s), empty eventTypes, unknown eventType, wildcard, uniqueness of secrets); `getSubscription`/`listSubscriptions` (tenant-scoped, eventType filter counts wildcard); `updateSubscription`; subscription state machine (`ACTIVE ↔ DISABLED`, `ACTIVE → DELETED`, terminal, `DISABLED → DELETED`); `rotateSecret`; `emitEvent` (match, no match, wildcard catches all, disabled excluded, cross-tenant excluded, unknown eventType, multi-subscription fan-out); `processDeliveries` (default 200 success, 500 retry, FAILED after 6 attempts, skips future `nextAttemptAt`, success+fail stats); `listDeliveries`/`getDelivery` (per-tenant, status filter, cross-tenant 404); `getStats`.
- `__tests__/unit/routes.test.js` (~25 tests) — auth (no creds, bad internal, internal without tenant, JWT without role 403, valid JWT 200); `POST /api/subscriptions` (create, bad url 400, empty eventTypes 400); `GET /api/subscriptions` (per-tenant, 404 cross-tenant); `PATCH /api/subscriptions/:id` (update url); disable/enable/rotate-secret; DELETE; `POST /api/events` (creates deliveries, unknown eventType 400); `POST /api/deliveries/process` (JWT 403, internal 200, success count); `GET /api/deliveries`; `POST /api/sign` + `POST /api/verify` (correct sig, tampered sig); `GET /api/event-types`; `GET /api/stats`; end-to-end create→emit→process→SUCCESS.
- Total: ~50 tests (rough count; the user's CLAUDE.md says 67 but the actual files have ~50).

### Bugs / gaps / inconsistencies
1. **No websocket support.** The user prompt mentioned "HMAC-SHA256 webhook signing, websocket, RBAC, monitoring". WebSocket is not implemented anywhere in this service. RBAC is `hooks:admin`-only (a single role). Monitoring: only `getStats`; no Prometheus metrics, no audit log beyond subscription/delivery timestamps.
2. **No real worker process** — `POST /api/deliveries/process` is exposed but no background worker is started. A consumer must poll.
3. **`maxAttempts` is set on each delivery but never customizable** — always 6.
4. **Signing doesn't include a timestamp** in the body to mitigate replay attacks. The `X-Nexha-Signature` is sufficient for content-integrity, but a malicious actor who captures a webhook can replay it within any timeout window. The `nextAttemptAt`/delivery status machinery mitigates this somewhat (each delivery has a unique `eventId`), but there's no `X-Nexha-Timestamp` header.
5. **No event deduplication** — `emitEvent` generates a new `eventId` each call; callers are responsible for idempotency on their end. The body includes `id: eventId` but consumers must dedupe.
6. **`POST /api/verify` accepts the secret in a header** (`x-hook-secret`) — this is fine for testing but the secret would normally be known only to the receiver. Anyone with the JWT can verify arbitrary payloads against arbitrary secrets.
7. **`/api/events` Zod schema requires `eventType: z.string().min(1)`** but the service also rejects unknown eventTypes, so the Zod is too lax. Minor.
8. **`/api/deliveries/process` doesn't read `body`** — only the query param `batchSize`. Fine.
9. **Internal token default `'dev-internal-token'`** — same pattern as provisioning-engine. Two services share the same default secret.
10. **`subscriptionId` regex `^sub_[a-f0-9]{16}$`** enforces 8 bytes (16 hex chars) of randomness, so 64 bits of entropy.
11. **`emitEvent` writes deliveries one at a time with `await` inside a `for` loop** — not parallelized. Minor performance issue for high-fan-out scenarios.
12. **`processDeliveries` updates subscription counters separately from the delivery update** — two `updateOne` calls per delivery. Atomicity is not guaranteed (counters could drift if one update fails after the other).
13. **No bulk-fetch of `HookSubscription` for the fan-out** — the query is per `emitEvent` call. OK.
14. **`'disconnected'` event type is listed but never emitted** by any service in the repo (not a bug, just an observation).
15. **`description` max 500 chars, `metadata` Mixed, `url` max 500 chars** — all bounded.

---

## 5. `nexha-gateway` (port 5002)

### Package & Port
- **Name:** `nexha-gateway` v1.0.0
- **Type:** TypeScript (compiled to ESM; uses `tsx` for dev)
- **Default port:** `5002` (env `PORT`; note this is the port in `.env.example` and used as default; the user prompt says "port 5002" but the env file lists `PORT=5002` and the .env shows a bunch of related service URLs as 4300/4310/4320/4330/4340/4350/4399/5140/4520/4530 that don't actually match any service we read)
- **Description in package.json:** "Nexha Warehouse Network — Phase C.5. Warehouse discovery, slot booking, and routing for the Nexha procurement flow."
- **Runtime deps:** `express`, `cors`, `helmet`, `zod`, `uuid`
- **Dev deps:** `@types/express`, `@types/cors`, `@types/uuid`, `@types/node`, `typescript`, `tsx`, `vitest`
- **No MongoDB.** Pure in-memory.

### Endpoints (full list — from `src/index.ts`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | (none unless REQUIRE_AUTH) | `{status, service, version, phase:"C.5", timestamp, uptime}` |
| `GET` | `/ready` | (none) | `{ready:true, timestamp}` |
| `GET` | `/api/v1/info` | (under `requireAuth` if enabled) | Service info + kinds + seeded count |
| `GET` | `/api/v1/warehouses` | `requireAuth` if enabled | List warehouses; query: `kind`, `city` |
| `GET` | `/api/v1/warehouses/:id` | `requireAuth` if enabled | Get one warehouse; 404 if missing |
| `GET` | `/api/v1/routes` | `requireAuth` if enabled | List all routes |
| `POST` | `/api/v1/slots/search` | `requireAuth` if enabled | Zod-validated search; returns `{results, count, cheapest}` |
| `POST` | `/api/v1/slots/book` | `requireAuth` if enabled | Book a slot; 201 on success, 400 on `error` |
| `POST` | `/api/v1/slots/bookings/:id/fulfill` | `requireAuth` if enabled | Move `reserved` → `filled` |
| `POST` | `/api/v1/slots/bookings/:id/cancel` | `requireAuth` if enabled | Refund units; mark cancelled |
| `GET` | `/api/v1/slots/bookings` | `requireAuth` if enabled | List bookings; filters: `status`, `warehouseId` |
| `GET` | `/api/v1/slots/bookings/:id` | `requireAuth` if enabled | Get one; 404 if missing |
| `POST` | `/api/v1/cost` | `requireAuth` if enabled | Compute cost for a route |
| 404 | catch-all | — | `{success:false, error:"Not found"}` |

**Auth behavior** (line 30 + 58–65): `REQUIRE_AUTH = process.env.NEXHA_GATEWAY_REQUIRE_AUTH !== "false"` (default `true`). If `true`, it tries to `import("@rtmn/shared/auth")` and apply `requireAuth` to `/api/v1`. If the import fails (e.g. `@rtmn/shared` not built), it logs a warning and **continues with auth disabled**. This is a soft-disable.

There is **no body-forwarding  logic** in this service — the user prompt mentions "body-forwarding behavior" but the only body handling is `express.json({ limit: "1mb" })`. The  is a self-contained service, not an aggregator/.

### TypeScript types (`src/types/warehouse.ts`)
```ts
type WarehouseKind = "cold_chain" | "dry" | "hazmat" | "bulk" | "general" | "pharma";
type SlotStatus = "open" | "reserved" | "filled" | "expired" | "cancelled";

interface WarehouseLocation { city, state, country, pincode, lat, lng }
interface WarehouseSlot { id, category, item, availableUnits, unit, pricePerUnit, currency, freshnessUntil, minOrderUnits }
interface Warehouse { id, name, kind, location, rating, reliability, capacityUnitsPerDay, operatingHours, slots, trustScore, totalOrders }
interface WarehouseRoute { fromId, toId, transitHours, costMultiplier, sameCorridor }
interface SlotBooking { id, warehouseId, slotId, units, status, createdAt, reservedUntil, fulfilledAt?, cancelledAt?, reference? }
```

### Service methods (`src/services/warehouse.service.ts`)
| Method | Signature | Description |
|---|---|---|
| `seedDemoWarehouses()` | `() → number` | Idempotent (returns 0 if already seeded). Seeds 4 warehouses (BLR-001 dry, BLR-002 cold_chain, MUM-001 bulk, DEL-001 pharma) with 7 slots total and 8 routes (all directed pairs). Uses `Date.now()` + days for `freshnessUntil` |
| `resetAll()` | `() → void` | Clears all in-memory state |
| `listWarehouses({kind?, city?})` | `(filter) → Warehouse[]` | case-insensitive city match |
| `getWarehouse(id)` | `(string) → Warehouse\|undefined` | |
| `listRoutes()` | `() → WarehouseRoute[]` | copy of routes |
| `findRoute(fromId, toId)` | `(string, string) → WarehouseRoute\|undefined` | |
| `searchSlots({item?, category?, city?, maxPricePerUnit?, minTrustScore?, limit?})` | `(query) → Array<{warehouse, slot}>` | Filters by city, minTrustScore, freshness, category, item substring, maxPrice, availableUnits ≥ minOrder. Scores each result: `score = trust*0.5 + cheapness*0.3 + min(50, freshnessDays)*0.4` where `cheapness = max(0, 100 - pricePerUnit)`. Sorts by score desc, slices to limit (default 20) |
| `bookSlot({warehouseId, slotId, units, reference?})` | `(input) → SlotBooking\|{error}` | Validates warehouse exists, slot exists, units ≥ minOrderUnits, units ≤ availableUnits. Generates `BOOK-<8hex>` id. Creates booking with `status:'reserved'`, `createdAt`, `reservedUntil = +24h`. **Decrements `slot.availableUnits`**. Returns booking |
| `fulfillBooking(id)` | `(string) → SlotBooking\|{error}` | Throws-style error string. Rejects if missing, cancelled, expired (`Date.parse(reservedUntil) < Date.now()`). Sets `status:'filled'`, `fulfilledAt` |
| `cancelBooking(id)` | `(string) → SlotBooking\|{error}` | Rejects if missing or already `filled`. **Refunds `slot.availableUnits += booking.units`**. Sets `status:'cancelled'`, `cancelledAt` |
| `getBooking(id)` | `(string) → SlotBooking\|undefined` | |
| `listBookings({status?, warehouseId?})` | `(filter) → SlotBooking[]` | |
| `computeCostForRoute({warehouseId, destinationWarehouseId?, units, slotId})` | `(opts) → {baseCost, transitSurcharge, totalCost, currency, transitHours}\|{error}` | `baseCost = pricePerUnit * units`. If destination present, finds route, computes `transitSurcharge = 25 * units * (costMultiplier - 1)`. Rounds to 2 dp |

Constants:
- `BOOKING_TTL_MS = 1000 * 60 * 60 * 24` (24 hours)

### Business rules / state machine

**Booking state machine**:
- `reserved` (initial) → `filled` (via `fulfillBooking`) or `cancelled` (via `cancelBooking`) or `expired` (auto-detected in `fulfillBooking` if past `reservedUntil`).
- `filled` cannot be cancelled.
- `cancelled` cannot be fulfilled.
- `expired` is set lazily on next read, not via a background sweep.

**Slot bookkeeping**:
- `bookSlot` decrements `availableUnits` immediately.
- `cancelBooking` refunds `availableUnits += booking.units`.
- `fulfillBooking` does **not** change `availableUnits` (the slot is already "consumed" from the inventory perspective).

**Search scoring**:
```
cheapness  = max(0, 100 - pricePerUnit)
freshnessDays = max(0, (freshnessUntil - now) / 86_400_000)
score = trustScore * 0.5 + cheapness * 0.3 + min(50, freshnessDays) * 0.4
```
Note: this can exceed 1.0 (e.g. trust 100 + cheapness 100 + freshness 50 = 250), but the search does not normalize. The `cheapest` returned is `hits[0]` (highest score, not strictly lowest price).

**Seed data** (4 warehouses, 8 routes):
- WH-BLR-001 (dry, trust 88) — Bangalore Central Dry Goods — basmati_rice 800kg @ ₹95, mustard_oil 300L @ ₹175, wheat_flour 500kg @ ₹42.
- WH-BLR-002 (cold_chain, trust 84) — toned_milk 1200L @ ₹56, paneer 80kg @ ₹380.
- WH-MUM-001 (bulk, trust 80) — sona_masuri_rice 12000kg @ ₹48, red_onion 4000kg @ ₹32, refined_sugar 6000kg @ ₹44.
- WH-DEL-001 (pharma, trust 94) — paracetamol 50000 strips @ ₹12, amoxicillin 12000 strips @ ₹65.
- Routes: 4 corridor pairs × 2 directions (Bangalore↔Bangalore same-corridor 1.5h/1.05×, Bangalore↔Mumbai 28h/1.20×, Bangalore↔Delhi 36h/1.25×, Mumbai↔Delhi 24h/1.15×).

### Tests
- `__tests__/unit/warehouse.service.test.ts` (~22 tests) — `seedDemoWarehouses` (4 seeded, kinds present), `listWarehouses` filters (kind, case-insensitive city), `searchSlots` (substring item, maxPrice, minTrust, ranking), `bookSlot` (decrement, below-min rejected, over-capacity rejected, unknown warehouse/slot), `fulfillBooking` (reserved→filled, unknown rejected), `cancelBooking` (refund units, refuses filled), routes (exists, unknown pair), `computeCostForRoute` (no destination, cross-warehouse, unknown slot).
- All tests pass against the in-memory singleton.

### Bugs / gaps / inconsistencies
1. **The user prompt says "body-forwarding behavior"** — this service does NOT do any body forwarding. It's a self-contained warehouse network. The package.json description calls it "Nexha Warehouse Network — Phase C.5", and the routes are all local. The Hub integration (per the comment in `src/index.ts` line 4: "The RTMN Hub reaches us at /api/nexha/nexha-/<path>") is just naming; the  itself doesn't .
2. **No persistence.** State is in-memory; restarting the process loses all bookings. The seed runs on every boot, so warehouses are always restored, but bookings are not.
3. **`.env.example` is wildly out of date** — it lists `DISTRIBUTION_OS_URL=4300`, `FRANCHISE_OS_URL=4310`, `PROCUREMENT_OS_URL=4320`, `MANUFACTURING_OS_URL=4330`, `TRADE_FINANCE_URL=4340`, `INTELLIGENCE_URL=4350`, `CONNECTOR_URL=4399`, `HOJAI_BRIDGE_URL=5140`, `HOJAI_MEMORY_URL=4520`, `HOJAI_INTELLIGENCE_URL=4530` — none of which are read by any code in this service. They're stale leftovers.
4. **`@rtmn/shared/auth` is dynamically imported** — if the package isn't built (or the path doesn't exist), the gateway silently runs without auth. The `console.warn('[nexha-gateway] @rtmn/shared/auth not available — auth disabled')` is the only signal.
5. **TypeScript config uses `"module": "ESNext"` with `"moduleResolution": "Bundler"`** and `tsconfig.json` is set to emit (no `noEmit: true`). The dev script uses `tsx watch`; production uses `node dist/index.js`. But there's no `prebuild` script; if `dist/` doesn't exist, `npm start` will fail.
6. **`SlotStatus` includes `'open'`** but the booking code never produces `open` (it starts at `reserved`). `'open'` is dead.
7. **`SlotStatus` includes `'expired'`** but no background sweeper sets it; only `fulfillBooking` can set it (and only if called after expiry). A booking that just sits past `reservedUntil` will still show `reserved` until someone tries to fulfill it.
8. **The default seed function never returns anything to the routes** — `seedDemoWarehouses` is called once at module load and idempotently. Fine, but the count of `seededWarehouses` in `/api/v1/info` reflects whatever was added on this run.
9. **Routes are directional** — `findRoute(BLR-001, MUM-001)` exists with `transitHours:28`, and the inverse is also seeded (line 110–115). Symmetric.
10. **`computeCostForRoute` does not consider the source warehouse's trust** in the cost — only `pricePerUnit * units + transit surcharge`.
11. **`apiResponse<T>` generic is not used** in the return types; `res.json(apiResponse(true, ...))` is called with concrete args. Minor.
12. **The test imports `warehouseService` as a singleton** — the `beforeEach` calls `resetAll()` then `seedDemoWarehouses()`. State leaks between tests would be possible if `resetAll()` were forgotten.
13. **`{success:true, data:undefined, error:undefined}`** is returned in some branches (line 50 `asyncRoute` error handler) — the `apiResponse` helper doesn't omit undefined keys. Cosmetic.
14. **`@types/supertest` is in devDeps but no supertest in deps** — implies there are no HTTP integration tests. Confirmed (only `warehouse.service.test.ts` exists).
15. **Body limit 1 MB.**
16. **There is no `app` exported as a default** if the file is compiled — `src/index.ts` line 250 has `export default app;`, so the compiled `dist/index.js` does export it. Good. But running `node dist/index.js` always starts the listener (the `app.listen` is at top level, not gated on `isDirectRun`).
17. **`installGracefulShutdown` is dynamically imported** — same pattern as auth. If unavailable, log nothing, continue.

---

## 6. `nexha-tenant-summary` (port 4387)

### Package & Port
- **Name:** `@nexha/tenant-summary` v1.0.0
- **Type:** ESM
- **Default port:** `4387` (env `PORT`)
- **Description:** "Nexha Tenant Summary — fan-out aggregator that returns a unified view of a tenant across all ADR-0010 services. Read-only, no DB of its own."
- **ADR / phase:** ADR-0011 Phase 13 (2026-06-23)
- **Runtime deps:** `@rtmn/shared`, `compression`, `cors`, `express`, `express-rate-limit`, `helmet`, `morgan`, `uuid`, `zod`
- **Dev deps:** `@types/jsonwebtoken`, `@types/supertest`, `jsonwebtoken`, `supertest`, `vitest`
- **Engine:** `node >= 20`
- **No MongoDB.**

### Endpoints (full list — from `src/index.js` and `src/routes/index.js`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/` | none (returns 200 only if mounted at root) | Service info |
| `GET` | `/health` | none | `{status, service, version, timestamp, uptime}` |
| `GET` | `/ready` | none | `{ready, service}` |
| `GET` | `/api/sources` | `requireAuth` | List the 9 fan-out targets (key, label, service, path) |
| `GET` | `/api/tenants/:tenantId/summary` | `requireAuth` | Fan out to all 9 upstreams, merge, return |
| `GET` | `/api/tenants/:tenantId/summary/:section` | `requireAuth` | Single section (one upstream call); 404 if section unknown |
| `GET` | `/api/health/upstreams` | `requireAuth` | Fan-out health check (per upstream ok/fail) |
| 404 | catch-all | — | `{success:false, error:{code:'NOT_FOUND', message:'Endpoint not found'}}` |

The router is mounted at `/api` with `router.use(requireAuth)`, so all `/api/*` routes are gated. The root `/`, `/health`, `/ready` are public.

### Mongoose models / types
**None.** No database. This is a pure aggregator.

### Service methods (`src/services/summaryService.js`)
| Export | Signature | Description |
|---|---|---|
| `FANOUT_TARGETS` | `Array<{key, label, service, path, method, transform}>` | 9 entries — see below |
| `fillPath(template, tenantId)` | `(string, string) → string` | `replaceAll(':tenantId', encodeURIComponent(tenantId))` |
| `fetchJson(url, {method, headers, timeoutMs})` | — | Uses `AbortController` + `setTimeout`; on non-2xx throws `Error('HTTP <status>')`; on abort throws |
| `buildSummary({tenantId, hubUrl, headers, timeoutMs, fetcher})` | — | Validates tenantId; calls all 9 targets in parallel via `Promise.allSettled`; never throws (each call wrapped in try/catch and turned into `{ok:false, error}`). Returns `{tenantId, generatedAt, hubUrl, summary:{totalSources, okCount, errorCount, health}, sections, errors?}` where `health` is `healthy` (0 errors) / `partial` (some errors) / `degraded` (all errors) |
| `checkUpstreams({hubUrl, timeoutMs, fetcher})` | — | Hits each upstream's `/api/services/<service>/health`. Returns `{generatedAt, upstreams:{key:{label,ok,error?}}, summary:{total, up, down}}` |

### The 9 `FANOUT_TARGETS` (CONFIRMED — the user asked me to confirm the FANOUT_TARGETS list):

| # | key | label | service | path | method |
|---|---|---|---|---|---|
| 1 | `directory` | Business Directory entries | `nexha-business-directory` | `/api/nexha/nexha-business-directory/api/v1/companies?tenantId=:tenantId&limit=10` | GET |
| 2 | `messaging` | ACP message threads | `nexha-acp-messaging` | `/api/nexha/nexha-acp-messaging/api/threads?tenantId=:tenantId&limit=10` | GET |
| 3 | `missions` | Missions | `nexha-mission-planner` | `/api/nexha/nexha-mission-planner/api/missions?tenantId=:tenantId&limit=10` | GET |
| 4 | `partners` | Partner relationships | `nexha-partner-graph` | `/api/nexha/nexha-partner-graph/api/partners?tenantId=:tenantId&limit=10` | GET |
| 5 | `commerce` | Commerce activity | `nexha-commerce-runtime` | `/api/nexha/nexha-commerce-runtime/api/orders?tenantId=:tenantId&limit=10` | GET |
| 6 | `sutarInstances` | SUTAR instances | `sutar-tenant-instances` | `/api/sutar/sutar-tenant-instances/api/instances?tenantId=:tenantId&limit=10` | GET |
| 7 | `industryInstances` | Industry OS instances | `industry-tenant-instances` | `/api/nexha/industry-tenant-instances/api/instances?tenantId=:tenantId&limit=10` | GET |
| 8 | `provisioningPlans` | Provisioning plans | `nexha-provisioning-engine` | `/api/nexha/nexha-provisioning-engine/api/plans?tenantId=:tenantId&limit=10` | GET |
| 9 | `webhooks` | Webhook subscriptions | `nexha-hooks-sdk` | `/api/nexha/nexha-hooks-sdk/api/subscriptions?tenantId=:tenantId&limit=10` | GET |

**Total: 9 FANOUT_TARGETS.** Note that 5 use the `/api/nexha/...` prefix (served via Hub) and 1 uses `/api/sutar/...` (also via Hub); all 9 are Hub-mediated. The user's note that there are 8 ADR-0010 services plus optionally `nexha-hooks-sdk` is **slightly off** — the code lists 9 total, with `sutar-tenant-instances` and `industry-tenant-instances` as two of the 9. The webhooks one is item 9.

Each `transform` reshapes the response into:
```js
{
  total: data?.total ?? (data?.companies|threads|missions|partners|orders|instances|plans|subscriptions?.length ?? 0),
  [items]: [...sliced to 10].map(...)
}
```

### Business rules

**Failure isolation**: every upstream call is wrapped in try/catch; one failing service does not block the others. `Promise.allSettled` ensures all 9 always run. Each failure produces a section like `{label, error: {message, code: 'TIMEOUT' | 'UPSTREAM_ERROR'}}`.

**Timeout handling**: per-call timeout is `3000ms` by default (`UPSTREAM_TIMEOUT_MS` env). On `AbortError`, the section's `error.code` is `'TIMEOUT'`.

**Health summary**:
- `healthy` — 0 errors
- `partial` — some errors, some OKs
- `degraded` — all 9 failed (or `okCount === 0`)

**Per-section route** (`GET /api/tenants/:tenantId/summary/:section`): looks up the target by `key`, calls the single upstream, applies the transform. Returns 502 for non-timeout errors, 504 for timeouts.

**Auth** (`src/middleware/auth.js`):
- `requireAuth` accepts `x-internal-token` (matches `process.env.INTERNAL_TOKEN`; sets `req.user.role='internal'`, `tenantId` from header/JWT) OR `Authorization: Bearer <jwt>` (HS256 with `JWT_SECRET`, default `'dev-secret-change-me'`; sets `req.user = payload`).
- `tenantFrom`: `x-tenant-id` header → `req.user.tenantId` → `req.user.tid` → `req.query.tenantId` → `null`.
- `REQUIRED_ROLE` env (default `'tenant:read'`) is checked but **only as a "do not reject" condition** — line 50: `if (REQUIRED_ROLE && payload.role && payload.role !== REQUIRED_ROLE && payload.role !== 'admin' && payload.role !== 'internal') { /* Allow access; specific tenant scoping happens via tenantFrom() */ }`. The comment says "Allow access" but the code falls through to `return next()`. So role check is effectively a no-op. **The middleware always lets the request through** if the JWT is valid.

**Rate limiting**: 200 req/min/IP via `express-rate-limit` (configured at top of `src/index.js`).

**CORS**: `origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'`, `credentials: true`.

### Tests
- `__tests__/unit/summaryService.test.js` (~15 tests) — `fillPath` (encoded replacement, multiple occurrences, no-op), `fetchJson` (2xx parsed, non-2xx throws, timeout aborts), `buildSummary` happy path (all 9 sources merged, truncation at 10, URL construction), `buildSummary` failure isolation (one failure → partial, all failure → degraded, TIMEOUT code), `buildSummary` input validation (missing tenantId, empty string), `checkUpstreams` (all OK, one down), `FANOUT_TARGETS` shape (unique keys, all required fields, every service in known set of 9).
- `__tests__/unit/routes.test.js` (~15 tests) — auth (no creds → 401, valid JWT 200, internal token 200, bad JWT → 401 INVALID_TOKEN), `/api/sources` (list with required fields), `/api/tenants/:tenantId/summary` (merged results, partial on one down, degraded on all down, forwards auth headers), `/api/tenants/:tenantId/summary/:section` (single section, unknown 404, upstream error 502/504), `/api/health/upstreams` (all ok, one down), meta (health, ready, root, unknown 404, unknown `/api/*` 401).
- Total: ~30 tests (rough count).

### Bugs / gaps / inconsistencies
1. **`FANOUT_TARGETS` has 9 entries**, not 8. The user's CLAUDE.md and the route comment both say "8 upstream services in parallel" + "optionally nexha-hooks-sdk". The code lists 9 including webhooks. So either the count is 9, or the comment is stale.
2. **`role` check is a no-op** — `if (REQUIRED_ROLE && payload.role && payload.role !== REQUIRED_ROLE && payload.role !== 'admin' && payload.role !== 'internal') { /* Allow access */ }` followed by `return next()`. The intent was probably to reject non-matching roles; instead it accepts everyone. This means a JWT with `role: 'whatever'` is accepted.
3. **Two of the FANOUT_TARGETS paths use `/api/nexha/...` while one uses `/api/sutar/...`.** That's intentional (sutar-tenant-instances is mounted under `/api/sutar` in the Hub), but the path templates must remain in sync with the Hub's route registration.
4. **Mismatched path expectations**: the messaging target expects `data.threads` (or `data.total`), but `nexha-acp-messaging` exposes `data.items` (not `data.threads`). The `transform` does `data?.threads || []` — so if the actual API returns `{items: [...]}`, the result will be `total: 0` and `threads: []`. The CLAUDE.md for acp-messaging says it returns `{items, total}`, not `{threads, total}`. **This is a real bug** — the fan-out will never return messaging data correctly.
5. **Same potential mismatch for partner-graph**: the transform expects `data.partners` and `p.name`, `p.relationship`, `p.trustLevel`. The actual partner-graph service returns `{items, total, limit, offset}` where items are `Partnership` documents with `partnerRef`, `partnerName`, `relationshipType`, `trustScore`. So the field names differ.
6. **For commerce-runtime**: transform expects `o.totalCents`; the actual service may use different field names.
7. **For industry-tenant-instances and sutar-tenant-instances**: transform expects `i.industry` for industry-instances; this matches the schema.
8. **For provisioning-engine**: transform expects `p.targetKind`; the actual model has `targetInstanceKind` (not `targetKind`).
9. **For hooks-sdk**: transform expects `s.targetUrl`; the actual model has `s.url` (not `targetUrl`).
10. **The user said "fan-out aggregator (I just read this — confirm FANOUT_TARGETS list)"** — confirmed: 9 entries. But the field-name mismatches (items 4–9 above) are real and would cause silent data loss in production.
11. **The route `/api/tenants/:tenantId/summary/:section` validates the section against `FANOUT_TARGETS.find(t => t.key === section)`** but if the section name matches, it doesn't check that the upstream is healthy — it just calls and reports the error.
12. **No caching** — every request fans out fresh.
13. **No compression of repeated requests** — even with `compression` middleware, each fan-out hits the Hub 9 times.
14. **`hubUrl` is a single global** (`RTMN_HUB_URL` env) — can't route to multiple Hubs.
15. **`checkUpstreams` hits `${hubUrl}/api/services/${service}/health`** — assumes a specific Hub route format. If the Hub doesn't expose this, every upstream looks "down".
16. **`buildSummary` always returns 200**, even on degraded state. The route doesn't surface the health in the HTTP status. Consumers have to inspect `summary.health` or `errors`.

---

## Cross-service observations

1. **Port assignment is consistent** within the documented canonical set (4340, 4363, 4385, 4386, 4387) except `nexha-gateway` which is on `5002` (and `.env.example` is stale).
2. **All Nexha services depend on `@rtmn/shared`** (file: `../../shared`) — but the package is a file dependency, not a workspace dependency. If the shared package is not built, dynamic imports like `await import("@rtmn/shared/auth")` will fail silently (as in `nexha-gateway`).
3. **Auth is inconsistent across the six services:**
   - `nexha-acp-messaging` & `nexha-partner-graph`: JWT (RS256/HS256-without-verification respectively) + internal token; both use Zod schemas.
   - `nexha-provisioning-engine` & `nexha-hooks-sdk`: JWT (HS256, verified with `jsonwebtoken`) + internal token + role check; both use Zod schemas.
   - `nexha-gateway`: dynamic import of `@rtmn/shared/auth`; soft-disable on failure.
   - `nexha-tenant-summary`: JWT (HS256, verified) + internal token; role check is a no-op.
4. **The two new services (`provisioning-engine`, `hooks-sdk`) follow a consistent "internal-only worker" pattern** — `processDeliveries`, `processPlan` are callable only by internal-token users. The other services don't have such a concept.
5. **Test helpers** — partner-graph uses per-test mongo; provisioning-engine and hooks-sdk use `globalThis` shared mongo; acp-messaging uses per-file mongo. All four use `mongodb-memory-server`. `nexha-gateway` and `nexha-tenant-summary` have no DB.
6. **The `package-lock.json` files exist in all six** (I didn't read them — they're huge and the user didn't ask).
7. **The `vitest.config.js`/`vitest.config.ts` files** are all minimal — `environment:'node'`, no globals, testTimeout 30s (or 20s for tenant-summary). Hooks and provisioning include `include: ['__tests__/**/*.test.js']`; acp-messaging relies on the default include pattern; gateway uses `__tests__/**/*.test.ts`; partner-graph uses `__tests__/**/*.test.js` + `pool:'forks'`.
8. **None of the services have a `.env.example`** except `nexha-gateway` (and that one is stale).
9. **None of the services export an OpenAPI spec** or have `swagger-ui-express`.
10. **The only service with explicit 6-attempt retry is `nexha-hooks-sdk`** (60s, 5min, 30min, 2h, 12h, 24h). The other services don't have a retry concept.
11. **HMAC-SHA256 is only in `nexha-hooks-sdk`**. The other services don't sign outgoing requests.
12. **State machines exist in `nexha-acp-messaging` (8 message types), `nexha-provisioning-engine` (8 statuses), `nexha-hooks-sdk` (3 sub statuses + 4 delivery statuses), and `nexha-gateway` (5 slot statuses).** `nexha-partner-graph` and `nexha-tenant-summary` have no state machine.
13. **The strongest test coverage is on `nexha-acp-messaging` (59)** and `nexha-partner-graph` (67)**. The `nexha-gateway` and `nexha-tenant-summary` have lighter coverage focused on the service layer.

---

## Files read (all under `/Users/rejaulkarim/Documents/RTMN/companies/Nexha/services/`)

```
nexha-acp-messaging/
  CLAUDE.md
  README.md
  package.json
  vitest.config.js
  src/index.js
  src/middleware/auth.js
  src/models/Message.js
  src/models/Negotiation.js
  src/routes/index.js
  src/services/stateMachine.js
  __tests__/helpers/db.js
  __tests__/unit/routes.test.js
  __tests__/unit/stateMachine.test.js

nexha-partner-graph/
  CLAUDE.md
  README.md
  package.json
  vitest.config.js
  src/index.js
  src/middleware/auth.js
  src/models/Interaction.js
  src/models/Partnership.js
  src/routes/index.js
  src/services/partnerService.js
  __tests__/helpers/db.js
  __tests__/unit/partnerService.test.js
  __tests__/unit/routes.test.js

nexha-provisioning-engine/
  package.json
  vitest.config.js
  src/index.js
  src/middleware/auth.js
  src/models/PlanEvent.js
  src/models/ProvisioningPlan.js
  src/routes/index.js
  src/services/provisioningService.js
  __tests__/helpers/db.js
  __tests__/unit/provisioningService.test.js
  __tests__/unit/routes.test.js

nexha-hooks-sdk/
  package.json
  vitest.config.js
  src/index.js
  src/middleware/auth.js
  src/models/HookDelivery.js
  src/models/HookSubscription.js
  src/routes/index.js
  src/services/hooksService.js
  __tests__/helpers/db.js
  __tests__/unit/hooksService.test.js
  __tests__/unit/routes.test.js

nexha-gateway/
  .env.example
  package.json
  tsconfig.json
  vitest.config.ts
  src/index.ts
  src/services/warehouse.service.ts
  src/types/warehouse.ts
  __tests__/unit/warehouse.service.test.ts

nexha-tenant-summary/
  package.json
  vitest.config.js
  src/index.js
  src/middleware/auth.js
  src/routes/index.js
  src/services/summaryService.js
  __tests__/unit/routes.test.js
  __tests__/unit/summaryService.test.js
```

Every file in scope was read. `package-lock.json` was intentionally skipped (dependency lock files, not source).
