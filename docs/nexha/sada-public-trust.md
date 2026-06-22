# SADA Public Trust API

**Service:** `sada-os`
**Port:** 4190
**Owner:** `companies/HOJAI-AI/platform/trust/sada-os/`
**Status:** ✅ Production (ADR-0009 Phase 3, 2026-06-22)
**Tests:** 19 / 19 pass

## What it does

SADA is the **only writer of trust scores** in the RTMN ecosystem. Its raw data (transaction history, document scans, KYC flags) is sensitive — it never leaves the service.

The **public trust API** is a read-only, sanitized projection: external callers (nexha-business-directory, do-app, third-party scripts) can ask "what's the trust score of entity X?" without ever seeing PII or raw history.

## Sanitization rules

The `toPublicTrust(doc)` function drops:

- ❌ Raw transaction IDs and counterparty names
- ❌ Document scan URLs and document type details
- ❌ Internal flags (e.g. `isUnderReview`, `complianceHold`)
- ❌ Operator notes and audit-log entries

…and exposes only:

- ✅ `entityId`, `entityType`
- ✅ `overallScore` (0-100)
- ✅ `riskLevel` (`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`)
- ✅ `verificationLevel` (`UNVERIFIED` | `BASIC` | `STANDARD` | `ENHANCED` | `INSTITUTIONAL`)
- ✅ `kybVerified`, `kycVerified`, `documentVerified` (booleans)
- ✅ `transactionCount` (integer)
- ✅ `successRate` (0.0 - 1.0, 4 decimal places)
- ✅ `lastActivity` (ISO timestamp)
- ✅ `computedAt` (ISO timestamp)

## Endpoints

All endpoints are mounted under `/public` and require auth (`@rtmn/shared/auth` JWT or `x-internal-token`).

### `GET /public/trust/:entityId`

Fetch the sanitized trust record for one entity.

```bash
curl -s http://localhost:4190/public/trust/sup-acme-001 \
  -H "Authorization: Bearer $JWT" | jq
```

```json
{
  "entityId": "sup-acme-001",
  "entityType": "COMPANY",
  "overallScore": 87,
  "riskLevel": "LOW",
  "verificationLevel": "ENHANCED",
  "kybVerified": true,
  "kycVerified": true,
  "documentVerified": true,
  "transactionCount": 142,
  "successRate": 0.9718,
  "lastActivity": "2026-06-21T18:33:02.000Z",
  "computedAt": "2026-06-22T03:11:00.000Z"
}
```

### `POST /public/trust/batch`

Fetch up to 200 trust records in one call. Used by `nexha-business-directory` for batch enrichment.

```bash
curl -s -X POST http://localhost:4190/public/trust/batch \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"entityIds":["sup-acme-001","agt-price-bot-01","sup-bravo-002"]}' | jq
```

```json
{
  "results": [
    { "entityId": "sup-acme-001", "overallScore": 87, ... },
    { "entityId": "agt-price-bot-01", "overallScore": 92, ... }
  ],
  "missing": ["sup-bravo-002"]
}
```

Limits:

- `entityIds` array — max 200 entries
- 400 if > 200, or if array is empty

### `GET /public/trust/health`

Liveness probe for the public surface.

```bash
curl -s http://localhost:4190/public/trust/health | jq
```

```json
{
  "status": "healthy",
  "service": "sada-public",
  "endpointCount": 3,
  "computedAt": "2026-06-22T03:11:00.000Z"
}
```

## Implementation

The public surface is implemented as a small isolated module:

```
src/modules/publicTrustService.ts
├── toPublicTrust(doc)             // pure function — sanitize one record
├── getPublicTrust(entityId)       // fetch + sanitize
├── getPublicTrustBatch(ids)       // batch fetch + sanitize
└── publicTrustRouter              // express router with auth
```

Mounted in `src/index.ts`:

```ts
import { publicTrustRouter } from './modules/publicTrustService.js';
app.use('/public', authMiddleware, publicTrustRouter);
```

The raw SADA routes (`/api/v1/...`) remain unchanged — they continue to serve internal callers with full data. The public surface is a **read-only sibling**, not a replacement.

## Tests (19 total)

Located in `platform/trust/sada-os/__tests__/unit/publicTrustService.test.ts`. Cover:

- Sanitization (no PII leakage — every public record has only allowed fields)
- Score range clamping (0-100)
- Success rate calculation (4 decimals, 0 when no transactions)
- Default values (unverified entity → LOW / UNVERIFIED / false / false / false)
- 404 on unknown entity
- Batch endpoint 400 on empty / > 200
- Batch endpoint 200 with `missing` array for unknown IDs
- Health endpoint shape
- Auth: JWT required, internal token accepted, anonymous rejected

## Rate limits

Public trust endpoints are read-heavy and small. Recommended limits (not yet enforced):

| Endpoint | Per-user | Per-IP |
|---|---|---|
| `GET /public/trust/:id` | 600 / min | 1200 / min |
| `POST /public/trust/batch` | 60 / min | 120 / min |
| `GET /public/trust/health` | 60 / min | 60 / min |

(Will be enforced via the existing `rateLimit` middleware in a follow-up.)

## Why a sanitized public API instead of opening up the raw one?

1. **PII minimization.** Even if a third-party developer accidentally over-shares the trust record, no PII or internal flags leak.
2. **Stable contract.** The public surface can evolve independently of SADA's internal schema. Adding new internal fields doesn't break consumers.
3. **Single write path.** SADA remains the only writer. No risk of inconsistent trust data from a second source.
4. **Cheap audit.** All public reads are auth'd and rate-limited; nothing bypasses the audit log.
