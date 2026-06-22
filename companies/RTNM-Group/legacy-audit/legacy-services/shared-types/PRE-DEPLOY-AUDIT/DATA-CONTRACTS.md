# Data Contracts Audit

**Audit Date:** 2026-05-02
**Auditor:** Data Contracts Auditor
**Repositories Audited:**
- `/Users/rejaulkarim/Documents/ReZ Full App`
- `/Users/rejaulkarim/Documents/rez-intent-graph`
- `/Users/rejaulkarim/Documents/resturistan/backend`

---

## Executive Summary

This audit examined all schema files, TypeScript types/interfaces, API contracts, and event definitions across the Rez Ecosystem. Several inconsistencies and gaps were identified that should be addressed before deployment.

---

## Schema Inconsistencies Found

### 1. ID Field Naming Inconsistency

**Issue:** Mixed usage of `_id` (Mongoose) vs `id` (API responses)

| File | Field Name | Notes |
|------|------------|-------|
| `rez-intent-graph/src/models/Intent.ts` | `_id: mongoose.Types.ObjectId` | Mongoose Document style |
| `rez-intent-graph/src/types/intent.ts` | `id: string` | Pure TypeScript interface |
| `rez-intent-graph/src/services/IntentCaptureService.ts` | Returns `id: i._id.toString()` | Converts to string for API |
| `rez-intent-graph/src/models/DormantIntent.ts` | `_id: mongoose.Types.ObjectId` | Mongoose Document style |
| `rez-intent-graph/src/models/CrossAppIntentProfile.ts` | `_id: mongoose.Types.ObjectId` | Mongoose Document style |
| `rez-travel-service/src/models/BookingModel.ts` | `bookingId: string` | Custom string ID field |
| `resturistan/prisma/schema.prisma` | `id: String @id @default(uuid())` | Prisma style |

**Recommendation:** Standardize on using `id` for API responses and `_id` for MongoDB internals. The `toObject()` method should convert `_id` to `id`.

---

### 2. Date Field Handling Inconsistency

**Issue:** Mixed usage of `Date` objects vs `string` representations

| Location | Field | Type |
|----------|-------|------|
| `Intent.ts` (Mongoose model) | `firstSeenAt`, `lastSeenAt` | `Date` |
| `Intent.ts` (TypeScript interface) | `firstSeenAt`, `lastSeenAt` | `Date` |
| `IntentSequence.ts` | `occurredAt` | `Date` |
| `TravelBooking` model | `createdAt`, `updatedAt` | `Date` with `timestamps: true` |
| `IntentCaptureService.ts` (cache) | `lastSeenAt: i.lastSeenAt.toISOString()` | Converts to string for Redis |
| `commerce-memory.routes.ts` | `formatRelativeTime()` | Converts to relative strings |

**Recommendation:** Define serialization conventions. All MongoDB dates should remain `Date` objects, with explicit `.toISOString()` calls only at API boundary serialization.

---

### 3. Enum Value Inconsistencies

**Issue:** Different enum definitions across files

#### Intent Status Enums

| Location | Values |
|----------|--------|
| `Intent.ts` (model) | `'ACTIVE' \| 'DORMANT' \| 'FULFILLED' \| 'EXPIRED'` |
| `types/intent.ts` | `'ACTIVE' \| 'DORMANT' \| 'FULFILLED' \| 'EXPIRED'` |
| `DormantIntent.ts` (model) | `'active' \| 'paused' \| 'revived'` (lowercase!) |
| `Nudge.ts` (model) | `'pending' \| 'sent' \| 'delivered' \| 'clicked' \| 'converted' \| 'failed'` |
| `Commerce-memory.routes.ts` | `status: 'active'` (comparing with uppercase 'ACTIVE') |

**CRITICAL BUG FOUND:**
```typescript
// commerce-memory.routes.ts line 41-42
const dormantIntents = await DormantIntent.find(
  { userId, status: 'active' },  // Uses lowercase 'active'
  // ...
);

// But DormantIntent schema has:
status: {
  type: String,
  enum: ['active', 'paused', 'revived'],  // lowercase - CORRECT
}
```

The query is correct, but the comparison is inconsistent with Intent model which uses uppercase.

#### AppType Inconsistencies

| Location | Values |
|----------|--------|
| `types/intent.ts` | `'hotel_ota' \| 'restaurant' \| 'retail' \| 'hotel_guest'` |
| `IntentCaptureService.ts` | Also uses `hotel_ota`, `hotel_guest`, `restaurant`, `retail`, `rez_now` |
| `Zod schema (intent.ts)` | `'hotel_ota' \| 'restaurant' \| 'retail' \| 'hotel_guest'` |

**Issue:** `rez_now` is used in `IntentCaptureService.ts` but not defined in the type or Zod schema.

---

### 4. Category Enum Inconsistencies

| Location | Values |
|----------|--------|
| `types/intent.ts` | `'TRAVEL' \| 'DINING' \| 'RETAIL' \| 'HOTEL_SERVICE' \| 'GENERAL'` |
| `NudgeSchedule.ts` | `'TRAVEL' \| 'DINING' \| 'RETAIL' \| 'ALL'` (missing HOTEL_SERVICE, GENERAL; has ALL) |
| `IntentCaptureService.ts` | Uses `TRAVEL`, `DINING`, `RETAIL`, `GENERAL` |
| `CrossAppAggregationService.ts` | Uses `TRAVEL`, `DINING`, `RETAIL` (hardcoded) |
| `Prisma schema` | Uses snake_case strings like `'fine_dining'`, `'qsr'`, `'cafe'` |

---

## Type Definition Issues

### 1. Duplicate Type Definitions

**RevivalCandidate defined in multiple places:**

| Location | Definition |
|----------|------------|
| `DormantIntentService.ts` | `export interface RevivalCandidate { dormantIntent, intent, revivalScore, suggestedNudge, idealTiming }` |
| `IntentScoringService.ts` | `export interface RevivalCandidate { dormantIntent, intent, revivalScore, suggestedNudge, idealTiming }` |
| `types/intent.ts` | NOT defined here |

**Recommendation:** Move `RevivalCandidate` to a shared types file and export from both services.

### 2. ChatContext Duplication

| Location | Definition |
|----------|------------|
| `types/intent.ts` | `EnrichedContext` with `activeIntents`, `dormantIntents`, `suggestedNudges`, `crossAppProfile` |
| `autonomousChat.ts` | `ChatContext` with `merchantId`, `merchantKnowledge`, `userIntents`, `conversationHistory` |
| `CrossAppAggregationService.ts` | `EnrichedContext` with different structure |
| `agentOsIntegration.ts` | `EnrichedContext` with yet another structure |

**Issue:** Three different `EnrichedContext` interfaces with incompatible structures.

### 3. Missing Type Exports

| File | Issue |
|------|-------|
| `Intent.ts` | `IIntentSignal` is exported but used inconsistently |
| `CrossAppIntentProfile.ts` | `ICrossAppIntentProfile` not re-exported from models index |
| `types/intent.ts` | `CaptureIntentResult` defined but not exported |

### 4. Hardcoded String Literals

Multiple services use hardcoded strings instead of referencing enum types:

```typescript
// DormantIntentService.ts
const CATEGORY_REVIVAL_TIMES: Record<string, number> = {
  TRAVEL: 14,
  HOTEL: 14,  // Not in Category enum!
  DINING: 7,
  RESTAURANT: 7,  // Not in Category enum!
  RETAIL: 10,
  GENERAL: 7,
};
```

---

## API Contract Gaps

### 1. Zod Schema Validation

**Found Zod schemas in:**
- `types/intent.ts` - `CaptureIntentSchema`, `DormancyCheckSchema`, `RevivalTriggerSchema`

**Issues:**
- Schemas defined but not imported/used in routes
- No request body validation middleware using these schemas
- API routes use manual validation:
```typescript
// intent.routes.ts
if (!userId || !appType || !intentKey || !eventType || !category) {
  return res.status(400).json({ error: 'Missing required fields' });
}
```

**Recommendation:** Create a validation middleware using the existing Zod schemas.

### 2. Response Type Inconsistency

| Endpoint | Response Format |
|----------|-----------------|
| `POST /capture` | `{ success: true, data: result }` |
| `GET /active/:userId` | Returns array directly (no wrapper) |
| `GET /profile/:userId` | Returns object directly |
| `POST /revival` | `{ success: true, data: candidate }` |

**Recommendation:** Standardize all responses with `{ success: boolean, data?: T, error?: string }`.

### 3. Missing API Documentation Types

No OpenAPI/Swagger decorators found in intent-graph routes. Consider adding:
- `@ApiResponse` decorators
- `@ApiQuery` for query parameters
- Request/Response DTOs with decorators

---

## Event Schema Alignment

### 1. AgentMessage Type Inconsistency

**In `agents/types.ts`:**
```typescript
export interface AgentMessage {
  from: string;
  to: string;
  type: 'signal' | 'request' | 'response' | 'alert' | 'transaction' | 'order' | 'task' | 'status_update' | 'notification';
  payload: unknown;
  timestamp: Date;
}
```

**Used in `shared-memory.ts`:**
```typescript
await sharedMemory.publish({
  from: 'intent-graph',
  to: 'agent-os',
  type: 'signal',
  payload: { ... },
  timestamp: new Date(),
});
```

**Issue:** `AgentMessage` type is defined but not exported from the main index, making it harder to ensure consistency across services.

### 2. Event Type Drift

| Service | Event Types Used |
|---------|------------------|
| `autonomousChat.ts` | `notification`, `signal` |
| `agentOsIntegration.ts` | `signal` |
| `merchantKnowledge.ts` | `notification` |
| `shared-memory.ts` | All types from AgentMessage |

**Recommendation:** Define a single event type enum in shared-types.

### 3. Payload Structure Inconsistency

Different services publish events with different payload structures:

```typescript
// autonomousChat.ts - uses 'payload' field
{ from: 'autonomous-chat', to: 'analytics', type: 'notification', payload: {...} }

// shared-memory.ts - uses generic AgentMessage
{ from: 'intent-graph', to: 'agent-os', type: 'signal', payload: {...} }

// merchantKnowledge.ts - uses different structure
{ merchantId, entryId, type }  // No 'from', 'to', 'type' at message level
```

---

## Database Model Cross-Reference

### MongoDB vs Prisma

| Concept | MongoDB (Intent Graph) | Prisma (Resturistan) |
|---------|------------------------|----------------------|
| ID Generation | `mongoose.Types.ObjectId` | `@default(uuid())` |
| Timestamps | Manual `{ timestamps: true }` | `@default(now()) @updatedAt` |
| Field Naming | camelCase | snake_case in `@map()` |
| Enum Storage | String with enum array | String |
| Relations | `ref: 'ModelName'` | `@relation` |

---

## Recommendations

### Critical (Must Fix)

1. **Create shared-types package:**
   - Move all enums (`IntentStatus`, `AppType`, `Category`, `EventType`) to shared-types
   - Export `RevivalCandidate`, `EnrichedContext`, `AgentMessage` from shared-types
   - Add `ZodSchema` exports for all request/response types

2. **Fix AppType enum:**
   - Add `rez_now` to the type definition in `types/intent.ts`
   - Or remove `rez_now` from `IntentCaptureService.ts`

3. **Standardize response format:**
   - All API endpoints should return `{ success, data?, error? }`

4. **Fix dormant intent query:**
   - Add index on `Intent.ts` for `status` field consistency check

### High Priority

5. **Add validation middleware:**
   - Create `validateRequest(ZodSchema)` middleware
   - Use in all route handlers

6. **Export missing types:**
   - Add `export type { CaptureIntentResult }` to `types/intent.ts`
   - Re-export all model interfaces from `models/index.ts`

7. **Fix date serialization:**
   - Add `.toISOString()` at API boundary only
   - Document serialization strategy

### Medium Priority

8. **Add OpenAPI documentation:**
   - Add Swagger decorators to all endpoints
   - Document request/response DTOs

9. **Create event bus type registry:**
   - Define all possible event types
   - Create type-safe event publishing utilities

10. **Database naming conventions:**
    - Consider snake_case for Prisma, camelCase for MongoDB
    - Document naming strategy

---

## Files Audited

### Intent Graph (`/Users/rejaulkarim/Documents/rez-intent-graph`)

| File | Status |
|------|--------|
| `src/types/intent.ts` | Issues found |
| `src/models/Intent.ts` | Issues found |
| `src/models/DormantIntent.ts` | Issues found |
| `src/models/Nudge.ts` | OK |
| `src/models/MerchantKnowledge.ts` | OK |
| `src/models/IntentSequence.ts` | OK |
| `src/models/CrossAppIntentProfile.ts` | Issues found |
| `src/models/NudgeSchedule.ts` | Issues found |
| `src/services/IntentCaptureService.ts` | Issues found |
| `src/services/DormantIntentService.ts` | Issues found |
| `src/services/CrossAppAggregationService.ts` | Issues found |
| `src/services/MerchantKnowledgeService.ts` | OK |
| `src/services/IntentScoringService.ts` | Issues found |
| `src/api/intent.routes.ts` | Issues found |
| `src/api/commerce-memory.routes.ts` | Issues found |
| `src/chat/autonomousChat.ts` | Issues found |
| `src/agents/types.ts` | Issues found |
| `src/agents/shared-memory.ts` | Issues found |
| `src/integrations/agentOsIntegration.ts` | Issues found |
| `src/middleware/intentMiddleware.ts` | OK |

### ReZ Full App (`/Users/rejaulkarim/Documents/ReZ Full App`)

| File | Status |
|------|--------|
| `rez-travel-service/src/models/BookingModel.ts` | OK |
| `shared-types/package.json` | OK (meta) |

### Resturistan Backend (`/Users/rejaulkarim/Documents/resturistan/backend`)

| File | Status |
|------|--------|
| `prisma/schema.prisma` | OK |
| Models and types | Needs further audit |

---

## Conclusion

The Rez Ecosystem has multiple data contract inconsistencies that should be addressed through:

1. Establishing a canonical shared-types package
2. Creating validation middleware for API contracts
3. Standardizing enum definitions across services
4. Documenting serialization conventions

The most critical issues are:
- Duplicate `RevivalCandidate` type definitions
- Inconsistent enum values for status fields
- Missing Zod schema integration in routes
- Inconsistent API response formats
