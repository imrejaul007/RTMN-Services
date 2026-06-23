# CLAUDE.md — marketplace-listings

> **TL;DR for Claude Code sessions:**
> Marketplace storefront + reviews + directory linkage.
> **Port 4250** · 81 vitest tests · MongoDB · ADR-0010 Phase 5.

## Quick orientation

This service is the **public marketplace** for AI agents, services, twins,
workflows, and other artifacts in the RTMN ecosystem. It is:

- **Per-tenant** — every tenant has its own catalog (compounded unique indexes).
- **Public-by-default** — `visibility=PUBLIC` listings are visible across all tenants.
- **Reviewable** — one review per `(tenant, listing)` with optional dimensions.
- **Trust-aware** — `directoryCompanyId` + `directoryAgentId` link to nexha-business-directory; `trustScore` is denormalized from SADA.

## File map

| File | What it does |
|---|---|
| `src/index.js` | Express app, auto-start on direct run, internal sanity endpoint, error handler |
| `src/models/Listing.js` | Mongoose model — 8 categories, 5 statuses, 3 visibilities, 5 pricing models, denormalized counters, text + compound indexes |
| `src/models/Review.js` | Mongoose model — per-tenant reviews, dimensions, status enum |
| `src/middleware/auth.js` | HS256 JWT + `x-internal-token`, env-var-at-request-time (so tests can swap) |
| `src/services/listingsService.js` | `createListing`, `updateListing`, `publishListing`, `unpublishListing`, `getListing`, `searchListings`, `recordView`, `recordInstall`, `getStats`. Error classes: `ValidationError`, `NotFoundError`, `ConflictError` |
| `src/services/reviewsService.js` | `addOrUpdateReview` (one per tenant+listing), `listReviews`, `hideReview`, `getMyReview`, internal `recomputeRating` for denormalized averages |
| `src/routes/index.js` | All HTTP routes with Zod validation; visibility/owner checks |
| `__tests__/helpers/db.js` | mongodb-memory-server + `syncIndexes()` so text search works on first query |
| `__tests__/unit/listingsService.test.js` | 27 service-layer tests |
| `__tests__/unit/reviewsService.test.js` | 19 service-layer tests |
| `__tests__/unit/routes.test.js` | 35 HTTP tests via supertest |

## Design rationale

### Why per-tenant compound indexes?
Two tenants could legitimately publish a listing with the same `listingId`
(for example, both reusing `product-launch-2026`). A unique index on
`listingId` alone would block that. Compounding on `tenantId` makes each
tenant's namespace independent.

### Why denormalize `reviewCount` + `averageRating` on Listing?
Discovery queries need to filter (`minRating`) and sort (`sort=rating`) on
these fields without joining. Denormalizing trades write cost (must recompute
on every review change) for read cost (single-collection read). The cost is
acceptable because reviews are write-rare, read-often.

### Why pre-save hook for `publishedAt`?
Setting it in the route would be error-prone (route can be bypassed). The
pre-save hook on the schema guarantees `publishedAt` is set the first time
status transitions to PUBLISHED — no matter which path mutates the doc.

### Why env-var-at-request-time?
Tests need to set `JWT_SECRET` and `INTERNAL_SERVICE_TOKEN` in `beforeAll`.
If the middleware captured these at module load, the test would race with the
import. Reading at request time is the canonical pattern across RTMN services.

### Why not RS256 JWT?
Lighter dependency footprint. For internal HOJAI-AI services that already
trust the CorpID secret, HS256 + shared `JWT_SECRET` is sufficient. For
external consumers or zero-trust flows, switch to RS256 via
`@rtmn/shared/auth/createCorpIdAuthMiddleware`.

## Common operations

### Create + publish in one call
```js
const created = await svc.createListing('tenant-A', {
  title: 'Hotel Bot',
  category: 'agent',
  pricingModel: 'subscription',
  price: 9900,           // minor units
  status: 'PUBLISHED',   // publish immediately
  publisherName: 'Acme',
});
```

### Search public listings
```js
const { items, total } = await svc.searchListings(
  { category: 'agent', sort: 'rating', limit: 10 },
  'tenant-X',   // caller tenant
  false,        // not internal
);
```

### Add a review
```js
const { review, listing, created } = await svc.addOrUpdateReview(
  'tenant-B',
  listingId,
  {
    rating: 5,
    title: 'Great',
    body: 'Loved it',
    reviewerId: 'user-123',
    reviewerName: 'Bob',
    dimensions: { easeOfUse: 5, documentation: 4 },
  },
);
// listing.averageRating and listing.reviewCount are recomputed
```

## Common pitfalls

- **Title min 3 chars** — Zod validates; tests use short titles to trigger 400.
- **Pricing model → price is required for paid models** — `one-time`, `subscription`, `usage-based` require a number.
- **Non-internal caller cannot filter by `?tenantId=...`** — must be internal caller or omit the filter.
- **`UNLISTED` is hidden from search** — owner must use direct `GET /api/listings/:id`.
- **JWT `exp` is checked** — expired tokens get 401 `MARKETPLACE_TOKEN_EXPIRED`.

## Running

```bash
npm install
npm test      # vitest run (81 tests, ~3.6s)
npm start     # production-style start on port 4250
npm run dev   # node --watch
```

Env vars: see `README.md`.

## ADR-0010 status

Phase 5 of 11 (Multi-Tenant Federation). Builds on:
- **Phase 0-2** — repo reshape + Hub de-aliasing
- **Phase 3** — `nexha-business-directory` (provides company/agent linkage)
- **Phase 4** — `nexha-acp-messaging` (provides negotiation channel after purchase)

Sets up:
- **Phase 6** — Mission Planner (HOJAI AI) — can compose marketplace listings into multi-step missions
- **Phase 9** — Per-Tenant SUTAR Instances — each large tenant gets isolated marketplace shard
- **Phase 11** — Final docs + audit