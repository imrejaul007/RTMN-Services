# @hojai/blr-marketplace-listings

> **BLR AI Marketplace — listings + reviews + directory linkage.**
> Per-tenant Agent Marketplace service (ADR-0010 Phase 5, June 22 2026).
> Port: **4250** · Package: `@hojai/blr-marketplace-listings` v1.0.0

The marketplace is where AI agents, services, twins, workflows, and other
artifacts are listed, priced, rated, and discovered. This service is the
**storefront + reviews API**; the runtime that *executes* a purchased agent
lives in TwinOS Hub (4705) and the agent commerce logic lives in
`nexha-acp-messaging` (4340) and `sutar-decision-engine` (4290).

## What this service does

- **Listings CRUD** — every tenant gets their own catalog (DRAFT → PUBLISHED lifecycle).
- **Public discovery** — `GET /api/listings?q=...&category=...&pricingModel=...&sort=...` returns PUBLIC + PUBLISHED listings across all tenants.
- **Reviews** — one review per `(tenant, listing)`, dimensions (easeOfUse, docs, support, valueForMoney), denormalized `averageRating` + `reviewCount` on each listing.
- **Engagement signals** — `view` and `install` counters, free-text search, structured filters.
- **Directory linkage** — every listing carries optional `directoryCompanyId` (nexha-business-directory:4360) and `directoryAgentId` so consumers can resolve trust scores from SADA.

## Tenant model

| Aspect | How it's determined |
|---|---|
| **TenantId** | `req.user.tenantId` (from JWT `tenantId` claim) or `X-Tenant-Id` header or `body.tenantId` (for internal callers) |
| **Per-tenant data isolation** | Compound `{tenantId, listingId}` and `{tenantId, listingId}` (reviews) unique indexes — same id can be reused across tenants |
| **Cross-tenant queries** | Internal callers (`x-internal-token`) may pass `?tenantId=...` for any tenant; everyone else is restricted to their own tenant for non-PUBLIC listings |
| **Visibility** | `PUBLIC` (visible to all when PUBLISHED), `PRIVATE` (owner only), `UNLISTED` (owner only via direct id, hidden from search) |

## State machine

```
            ┌────────┐    publish()     ┌───────────┐
            │ DRAFT  │ ───────────────► │ PUBLISHED │
            └────────┘                  └─────┬─────┘
                                              │
                                unpublish()   │   suspend()
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

`SUSPENDED` is set by an admin action (out of scope for this PR — reserved for trust-team moderation).

## Endpoints

### Health
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | none | Service health + capability list |
| GET | `/ready` | none | Readiness probe |
| GET | `/` | none | Redirects to `/health` |
| GET | `/internal/sanity` | `x-internal-token` | Hub health aggregator |

### Listings
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/listings` | required | Create listing (DRAFT by default; `status: "PUBLISHED"` to publish immediately) |
| GET | `/api/listings` | optional | Search/filter/sort/paginate PUBLIC+PUBLISHED listings |
| GET | `/api/listings/:listingId` | optional | Get one (visibility-checked) |
| PATCH | `/api/listings/:listingId` | required (owner) | Update allowed fields |
| POST | `/api/listings/:listingId/publish` | required (owner) | DRAFT → PUBLISHED, sets `publishedAt` |
| POST | `/api/listings/:listingId/unpublish` | required (owner) | PUBLISHED → UNPUBLISHED |
| POST | `/api/listings/:listingId/view` | optional | Increments `viewCount` |
| POST | `/api/listings/:listingId/install` | optional | Increments `installCount` |
| POST | `/api/validate` | optional | Lint a listing payload (no persist) |

### Reviews
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/listings/:listingId/reviews` | optional | List reviews (default: published only) |
| PUT | `/api/listings/:listingId/reviews` | required | Add or update my review (one per tenant+listing) |
| DELETE | `/api/reviews/:reviewId` | required | Hide a review (reviewer or listing owner) |
| GET | `/api/my-reviews?listingId=...` | required | Get my review for a listing |

### Stats
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/stats` | required | Per-tenant stats (count by status + category) |

## Auth

Two paths:

1. **JWT (HS256)** — `Authorization: Bearer <jwt>`. The middleware verifies
   the shared `JWT_SECRET` env var exists, decodes the payload, and rejects
   expired tokens. Claims used: `sub`, `tenantId`, `organizationId`, `roles`,
   `name`, `email`, `exp`. (For full RS256 CorpID verification, use
   `@rtmn/shared/auth` — out of scope for this service.)
2. **Internal token** — `x-internal-token: <INTERNAL_SERVICE_TOKEN>`. The
   caller must also supply `x-tenant-id` (or `body.tenantId`) because the
   internal path doesn't imply a tenant.

Both env vars are read at request time (NOT at module load) so tests can
swap them with `beforeAll`.

## Data model

### Listing

| Field | Type | Notes |
|---|---|---|
| `tenantId` | string | Owning tenant (required, indexed) |
| `listingId` | string | UUID (required) |
| `title` | string | 3–200 chars |
| `description` | string | 0–5000 chars |
| `shortDescription` | string | 0–500 chars |
| `category` | enum | `agent`, `service`, `twin`, `workflow`, `data`, `integration`, `consulting`, `training` |
| `tags` | string[] | 0–20 tags, 1–50 chars each |
| `pricingModel` | enum | `free`, `one-time`, `subscription`, `usage-based`, `quote-only` |
| `price` | number | minor units (cents/paise); required for paid models |
| `currency` | string | ISO 4217 (default `USD`) |
| `visibility` | enum | `PUBLIC` (default), `PRIVATE`, `UNLISTED` |
| `status` | enum | `DRAFT` (default), `PUBLISHED`, `UNPUBLISHED`, `SUSPENDED`, `ARCHIVED` |
| `directoryCompanyId` | string | FK to nexha-business-directory:4360 |
| `directoryAgentId` | string | FK to nexha-business-directory:4360 |
| `trustScore` | number | 0–100, denormalized from SADA |
| `reviewCount` | number | denormalized, maintained by reviewsService |
| `averageRating` | number | 0–5, denormalized, maintained by reviewsService |
| `installCount` | number | denormalized, incremented by `/install` |
| `viewCount` | number | denormalized, incremented by `/view` |
| `publisherName` | string | free text (usually also in directory) |
| `publisherUrl` | string | publisher's site URL |
| `sampleData` | mixed | sample data (e.g. twin schema) |
| `assets` | string[] | asset URLs (≤ 20) |
| `metadata` | mixed | arbitrary tenant-defined metadata |
| `publishedAt` | date | set on first publish (pre-save hook) |
| `createdAt`, `updatedAt` | date | automatic |

**Indexes:**
- `{tenantId, listingId}` UNIQUE (per-tenant uniqueness)
- `{visibility, status, publishedAt: -1}` (public discovery)
- `{visibility, status, category, publishedAt: -1}` (filtered discovery)
- `{visibility, status, averageRating: -1, reviewCount: -1}` (top-rated)
- `{title, description, tags}` text index (full-text search)

### Review

| Field | Type | Notes |
|---|---|---|
| `tenantId` | string | Reviewer's tenant (required, indexed) |
| `reviewId` | string | UUID (required) |
| `listingId` | string | FK to Listing |
| `listingTenantId` | string | denormalized from Listing for fast lookups |
| `reviewerId` | string | user id (or 'anonymous') |
| `reviewerName` | string | display name (defaults to 'Anonymous') |
| `rating` | number | 1–5 (required) |
| `title` | string | 0–200 chars |
| `body` | string | 0–5000 chars |
| `dimensions.easeOfUse` | number | 1–5 (optional) |
| `dimensions.documentation` | number | 1–5 (optional) |
| `dimensions.support` | number | 1–5 (optional) |
| `dimensions.valueForMoney` | number | 1–5 (optional) |
| `status` | enum | `published` (default), `hidden`, `flagged`, `removed` |

**Indexes:**
- `{tenantId, listingId}` UNIQUE (one review per tenant+listing)
- `{listingId, status, createdAt: -1}` (fast per-listing listing)
- `{listingTenantId, status, createdAt: -1}` (publisher's reviews-inbox)

## Env vars

| Var | Required | Default | Purpose |
|---|---|---|---|
| `MONGODB_URI` | yes | `mongodb://localhost:27017/marketplace_listings` | MongoDB connection |
| `MARKETPLACE_LISTINGS_PORT` | no | `4250` | HTTP port |
| `JWT_SECRET` | yes (for JWT auth) | — | HS256 secret for JWT verification |
| `INTERNAL_SERVICE_TOKEN` | yes (for internal callers) | — | Hub cross-service token |

## Tests

```bash
npm test
```

- **81 vitest tests** in 3 files:
  - `__tests__/unit/listingsService.test.js` (27 tests) — service-layer CRUD, search, tenant isolation, visibility rules, denormalized counters
  - `__tests__/unit/reviewsService.test.js` (19 tests) — add/update/hide, rating aggregation, per-tenant isolation
  - `__tests__/unit/routes.test.js` (35 tests) — full HTTP suite via supertest: health, auth gating (JWT + internal token), every endpoint, error paths
- Uses `mongodb-memory-server` for hermetic tests.
- Tests run in ~3.6s total.

## Related services

| Service | Port | Why it matters |
|---|---|---|
| **nexha-business-directory** | 4360 | Directory of companies + agents — `directoryCompanyId` / `directoryAgentId` link listings to verified entities |
| **nexha-sada-public** | 4191 | Trust scoring — `trustScore` is denormalized from SADA into listings |
| **nexha-acp-messaging** | 4340 | Agent Commerce Protocol — when a marketplace consumer wants to negotiate/buy, ACP messages flow here |
| **sutar-decision-engine** | 4290 | Decision policies (e.g. "auto-approve free listings", "flag suspicious publisher") |
| **twin-marketplace** | 4146 | Sibling twin-template marketplace (older PersistentMap-based, this service is the Mongo-backed successor) |
| **REZ-ecosystem-connector** (Hub) | 4399 | Exposes this service at `/api/nexha/marketplace-listings/*` |

## Files

```
marketplace-listings/
├── package.json
├── vitest.config.js
├── src/
│   ├── index.js                    # Express app + auto-start
│   ├── models/
│   │   ├── Listing.js              # Listing Mongoose model
│   │   └── Review.js               # Review Mongoose model
│   ├── middleware/
│   │   └── auth.js                 # JWT + internal-token auth
│   ├── services/
│   │   ├── listingsService.js      # CRUD + search + stats
│   │   └── reviewsService.js       # Add/list/hide + rating aggregation
│   └── routes/
│       └── index.js                # HTTP routes
└── __tests__/
    ├── helpers/
    │   └── db.js                   # mongodb-memory-server helper
    └── unit/
        ├── listingsService.test.js
        ├── reviewsService.test.js
        └── routes.test.js
```