# marketplace-listings — ADR-0010 Phase 5

> **Port 4250** · `companies/HOJAI-AI/blr-ai-marketplace/services/marketplace-listings/` ·
> Replaces the in-memory `sutar-marketplace` (moved to BLR Marketplace 2026-06-21).
> **Status: ✅ Done (2026-06-22)** — 81 vitest tests + 28 client tests across 5 repos.

## Architecture

```
                            ┌─────────────────────┐
                            │  RTMN Hub :4399     │
                            │  /api/sutar/        │
                            │  marketplace-       │
                            │  listings/*         │
                            └──────────┬──────────┘
                                       │ proxy
                                       ▼
   ┌─────────────────────────────────────────────────────────────┐
   │             marketplace-listings :4250                      │
   │                                                             │
   │   Express + Mongoose + Zod                                 │
   │                                                             │
   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
   │   │ listingsSvc  │  │ reviewsSvc   │  │  routes/     │    │
   │   │ (CRUD+search)│  │ (rating agg) │  │  (Zod vld)   │    │
   │   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
   │          │                 │                  │            │
   │          ▼                 ▼                  ▼            │
   │   ┌─────────────────────────────────────────────────┐     │
   │   │  MongoDB (mongoose-listings, marketplace-       │     │
   │   │  reviews collections)                           │     │
   │   └─────────────────────────────────────────────────┘     │
   │                                                             │
   │   ┌─────────────────────────────────────────────────┐     │
   │   │  auth middleware (HS256 JWT + x-internal-token)  │     │
   │   └─────────────────────────────────────────────────┘     │
   └─────────────────────────────────────────────────────────────┘
                │                                  │
                │                                  │
                ▼                                  ▼
   ┌────────────────────────┐         ┌─────────────────────────┐
   │ nexha-business-dir     │         │ nexha-sada-public       │
   │ (port 4360)            │         │ (port 4191)             │
   │ resolves               │         │ trust score feed        │
   │ directoryCompanyId +   │         │ (denormalized into      │
   │ directoryAgentId       │         │  Listing.trustScore)    │
   └────────────────────────┘         └─────────────────────────┘
```

## Why this service

Phase 5 of ADR-0010 (Multi-Tenant Federation) introduces the public Agent
Marketplace. Prior to Phase 5, the marketplace was an in-memory
`PersistentMap`-based service that had no per-tenant isolation, no reviews, and
no link to the trust system. This new Mongo-backed service fixes all three.

## State machine — Listing

```
            ┌────────┐    publish()     ┌───────────┐
            │ DRAFT  │ ───────────────► │ PUBLISHED │
            └────────┘                  └─────┬─────┘
                                              │
                                unpublish()   │   suspend() (admin)
                                              ▼
                                        ┌─────────────┐
                                        │ UNPUBLISHED │
                                        └─────┬───────┘
                                              │
                                       archive() (admin)
                                              ▼
                                       ┌──────────┐
                                       │ ARCHIVED │
                                       └──────────┘
```

`SUSPENDED` is set by an admin action (out of scope for this PR — reserved
for trust-team moderation when a publisher is flagged by SADA).

## Visibility rules

| Visibility | Visible to anyone? | Visible to owner? | In search? |
|---|---|---|---|
| `PUBLIC` (default) | Yes, when PUBLISHED | Yes | Yes |
| `PRIVATE` | No | Yes | No |
| `UNLISTED` | No | Yes (direct id only) | No |
| `DRAFT` | No | Yes | No |
| `UNPUBLISHED` | No | Yes | No |
| `SUSPENDED` / `ARCHIVED` | No | Yes | No |

Non-internal callers cannot filter `searchListings` by a tenantId other than
their own (returns `MARKETPLACE_VALIDATION_ERROR`). Internal callers (with
`x-internal-token`) can pass any `tenantId`.

## Endpoints

### Listings

```http
POST   /api/listings                          # create (DRAFT or status:PUBLISHED)
GET    /api/listings?q=&category=&sort=...    # search/filter/sort/paginate
GET    /api/listings/:listingId               # get one (visibility-checked)
PATCH  /api/listings/:listingId               # update (owner only)
POST   /api/listings/:listingId/publish       # DRAFT → PUBLISHED
POST   /api/listings/:listingId/unpublish     # PUBLISHED → UNPUBLISHED
POST   /api/listings/:listingId/view          # increments viewCount
POST   /api/listings/:listingId/install       # increments installCount
POST   /api/validate                          # lint without persisting
```

### Reviews

```http
GET    /api/listings/:listingId/reviews       # list published reviews
PUT    /api/listings/:listingId/reviews       # add or update my review
DELETE /api/reviews/:reviewId                 # hide a review (reviewer or owner)
GET    /api/my-reviews?listingId=...          # get my review for a listing
```

### Stats

```http
GET    /api/stats                             # per-tenant: counts by status + category
```

### Health

```http
GET    /health                                # service health + capabilities
GET    /ready                                 # readiness probe
GET    /internal/sanity                       # Hub health aggregator (x-internal-token)
```

## Auth

Two paths:

1. **JWT (HS256)** — `Authorization: Bearer <jwt>` with `JWT_SECRET` env var.
   Claims: `sub`, `tenantId`, `organizationId`, `roles`, `name`, `email`, `exp`.
   Expired tokens get 401 `MARKETPLACE_TOKEN_EXPIRED`.

2. **Internal token** — `x-internal-token: <INTERNAL_SERVICE_TOKEN>`. Caller must
   also supply `x-tenant-id` (or `body.tenantId`) because the internal path
   doesn't imply a tenant.

Both env vars are read at request time (NOT at module load) so tests can
swap them with `beforeAll`.

## Tenant model

| Aspect | How it's determined |
|---|---|
| **TenantId** | `req.user.tenantId` (JWT) → `X-Tenant-Id` header → `body.tenantId` (internal) |
| **Per-tenant isolation** | Compound unique indexes: `{tenantId, listingId}` and `{tenantId, listingId}` (reviews) |
| **Cross-tenant queries** | Internal callers (`x-internal-token`) may pass `?tenantId=...` for any tenant; others restricted to their own tenant for non-PUBLIC listings |
| **Listing ownership** | `req.user.tenantId === listing.tenantId` |

## Data model

### Listing (17 fields)

| Field | Type | Notes |
|---|---|---|
| `tenantId` | string | Owning tenant (required, indexed) |
| `listingId` | string | UUID (required) |
| `title` | string | 3–200 chars |
| `description` | string | 0–5000 chars |
| `shortDescription` | string | 0–500 chars |
| `category` | enum | `agent`, `service`, `twin`, `workflow`, `data`, `integration`, `consulting`, `training` |
| `tags` | string[] | 0–20, 1–50 chars each |
| `pricingModel` | enum | `free`, `one-time`, `subscription`, `usage-based`, `quote-only` |
| `price` | number | minor units; required for paid models |
| `currency` | string | ISO 4217 (default `USD`) |
| `visibility` | enum | `PUBLIC` (default), `PRIVATE`, `UNLISTED` |
| `status` | enum | `DRAFT` (default), `PUBLISHED`, `UNPUBLISHED`, `SUSPENDED`, `ARCHIVED` |
| `directoryCompanyId` | string | FK to nexha-business-directory:4360 |
| `directoryAgentId` | string | FK to nexha-business-directory:4360 |
| `trustScore` | number | 0–100, denormalized from SADA |
| `reviewCount` | number | denormalized, maintained by reviewsService |
| `averageRating` | number | 0–5, denormalized, maintained by reviewsService |
| `installCount` | number | denormalized |
| `viewCount` | number | denormalized |
| `publisherName` | string | free text |
| `publisherUrl` | string | publisher site URL |
| `sampleData` | mixed | sample schema/data |
| `assets` | string[] | ≤ 20 URLs |
| `metadata` | mixed | tenant-defined |
| `publishedAt` | date | set on first publish (pre-save hook) |

**Indexes:**
- `{tenantId, listingId}` UNIQUE
- `{visibility, status, publishedAt: -1}` (public discovery)
- `{visibility, status, category, publishedAt: -1}` (filtered discovery)
- `{visibility, status, averageRating: -1, reviewCount: -1}` (top-rated)
- `{title, description, tags}` text index (full-text search)

### Review (per tenant+listing)

| Field | Type | Notes |
|---|---|---|
| `tenantId` | string | Reviewer's tenant (indexed) |
| `reviewId` | string | UUID |
| `listingId` | string | FK to Listing |
| `listingTenantId` | string | denormalized |
| `reviewerId` | string | user id (or 'anonymous') |
| `reviewerName` | string | display name |
| `rating` | number | 1–5 (required) |
| `title`, `body` | string | optional |
| `dimensions.{easeOfUse,documentation,support,valueForMoney}` | number | 1–5 (optional) |
| `status` | enum | `published` (default), `hidden`, `flagged`, `removed` |

**Indexes:**
- `{tenantId, listingId}` UNIQUE (one per tenant+listing)
- `{listingId, status, createdAt: -1}` (per-listing listing)
- `{listingTenantId, status, createdAt: -1}` (publisher's reviews-inbox)

## Related services

| Service | Port | Why it matters |
|---|---|---|
| **nexha-business-directory** | 4360 | Directory of companies + agents — `directoryCompanyId` / `directoryAgentId` link listings to verified entities |
| **nexha-sada-public** | 4191 | Trust scoring — `trustScore` is denormalized from SADA into listings |
| **nexha-acp-messaging** | 4340 | Agent Commerce Protocol — when a marketplace consumer wants to negotiate/buy, ACP messages flow here |
| **sutar-decision-engine** | 4290 | Decision policies (e.g. "auto-approve free listings", "flag suspicious publisher") |
| **twin-marketplace** | 4146 | Sibling twin-template marketplace (older PersistentMap-based) |
| **REZ-ecosystem-connector** (Hub) | 4399 | Exposes this service at `/api/sutar/marketplace-listings/*` |

## Env vars

| Var | Required | Default | Purpose |
|---|---|---|---|
| `MONGODB_URI` | yes | `mongodb://localhost:27017/marketplace_listings` | MongoDB connection |
| `MARKETPLACE_LISTINGS_PORT` | no | `4250` | HTTP port |
| `JWT_SECRET` | for JWT auth | — | HS256 secret for JWT verification |
| `INTERNAL_SERVICE_TOKEN` | for internal callers | — | Hub cross-service token |

## Tests

- **81 vitest** in `marketplace-listings/__tests__/`:
  - `listingsService.test.js` — 27 tests (CRUD + search + visibility + tenant isolation)
  - `reviewsService.test.js` — 19 tests (add/list/hide + rating aggregation)
  - `routes.test.js` — 35 HTTP tests (every endpoint via supertest)
- **14 jest** in `do-app/backend/__tests__/unit/hojaiClient.nexha.test.ts`
- **14 node:test** in `REZ-Workspace/core/unified-fabric/test-marketplace-listings.js`
- **Total Phase 5 tests: 109** (all pass)

## Files

```
marketplace-listings/
├── package.json
├── vitest.config.js
├── src/
│   ├── index.js
│   ├── models/{Listing,Review}.js
│   ├── middleware/auth.js
│   ├── services/{listingsService,reviewsService}.js
│   └── routes/index.js
└── __tests__/
    ├── helpers/db.js
    └── unit/{listingsService,reviewsService,routes}.test.js
```

## What Phase 5 unblocks

- **Phase 6 (Mission Planner)** — can compose marketplace listings into
  multi-step missions (e.g., "find + buy + deploy").
- **Phase 9 (Per-Tenant SUTAR Instances)** — each large tenant can get an
  isolated marketplace shard for performance.
- **Phase 11 (Final docs + audit)** — Phase 5 will be one of the listed
  production services in the final audit.