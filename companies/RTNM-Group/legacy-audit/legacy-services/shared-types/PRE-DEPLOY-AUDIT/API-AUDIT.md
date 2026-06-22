# API Consistency Audit

**Audit Date:** 2026-05-02
**Auditor:** API Consistency Auditor
**Scope:** ReZ Full App + rez-intent-graph

---

## Endpoint Inventory

### 1. Intent Graph Service (`/rez-intent-graph/src/api/`)

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| POST | `/api/intent/capture` | Internal Token | captureLimiter | Capture intent event |
| GET | `/api/intent/active/:userId` | Internal Token | - | Get active intents |
| GET | `/api/intent/user/:userId` | Internal Token | - | Get all user intents |
| GET | `/api/intent/dormant/:userId` | Internal Token | - | Get dormant intents |
| GET | `/api/intent/profile/:userId` | Internal Token | - | Get cross-app profile |
| GET | `/api/intent/enriched/:userId` | Internal Token | - | Get enriched context |
| POST | `/api/intent/revival` | Internal Token | - | Trigger revival |
| POST | `/api/intent/revived/:dormantIntentId` | Internal Token | - | Mark as revived |
| GET | `/api/intent/scheduled-revivals` | Internal Token | - | Get scheduled revivals |
| POST | `/api/intent/pause/:dormantIntentId` | Internal Token | - | Pause nudges |
| GET | `/api/intent/merchant-demand/:merchantId` | Internal Token | - | Get merchant demand |
| GET | `/api/intent/affinities/:userId` | Internal Token | - | Get user affinities |
| POST | `/api/intent/cron/detect-dormant` | Cron Secret | - | Detect dormant intents |
| POST | `/api/intent/cron/update-scores` | Cron Secret | - | Update revival scores |
| POST | `/api/intent/nudge/send` | Internal Token | nudgeLimiter | Send nudge |
| GET | `/api/intent/nudge/history/:userId` | Internal Token | - | Get nudge history |
| GET | `/api/intent/stats` | Internal Token | - | Get intent statistics |
| GET | `/api/intent/similar` | Internal Token | - | Find similar intents |
| GET | `/api/intent/recommendations` | Internal Token | - | Get recommendations |
| GET | `/api/intent/similar/global` | Internal Token | - | Global similarity search |
| **Chat & Knowledge Routes** |
| POST | `/api/knowledge/merchant/:merchantId/entries` | Internal Token | - | Add knowledge entry |
| POST | `/api/knowledge/merchant/:merchantId/bulk` | Internal Token | - | Bulk import |
| GET | `/api/knowledge/merchant/:merchantId` | None | - | Get knowledge base |
| GET | `/api/knowledge/merchant/:merchantId/search` | None | - | Search knowledge |
| PUT | `/api/knowledge/entries/:entryId` | Internal Token | - | Update entry |
| DELETE | `/api/knowledge/entries/:entryId` | Internal Token | - | Delete entry |
| POST | `/api/chat/message` | UserOrAuth | strictLimiter | Send chat message |
| GET | `/api/chat/history/:userId` | UserOrAuth | - | Get chat history |
| POST | `/api/chat/end-session` | UserOrAuth | - | End chat session |
| GET | `/api/chat/context/:userId` | UserOrAuth | - | Get chat context |
| POST | `/api/knowledge/merchant/:merchantId/menu` | Internal Token | - | Upload menu items |
| POST | `/api/knowledge/merchant/:merchantId/policy` | Internal Token | - | Upload policies |
| POST | `/api/knowledge/merchant/:merchantId/faq` | Internal Token | - | Upload FAQs |
| **Merchant Demand Routes** |
| GET | `/api/merchant/:merchantId/demand/dashboard` | Merchant Auth | - | Demand dashboard |
| GET | `/api/merchant/:merchantId/demand/signal` | Merchant Auth | - | Demand signal |
| GET | `/api/merchant/:merchantId/procurement` | Merchant Auth | - | Procurement signals |
| GET | `/api/merchant/:merchantId/intents/top` | Merchant Auth | - | Top intents |
| GET | `/api/merchant/:merchantId/trends` | Merchant Auth | - | Demand trends |
| GET | `/api/merchant/:merchantId/locations` | Merchant Auth | - | Location insights |
| GET | `/api/merchant/:merchantId/pricing` | Merchant Auth | - | Price expectations |
| POST | `/api/merchant/:merchantId/alerts` | Merchant Auth | - | Configure alerts |
| **Monitoring Routes** |
| GET | `/api/monitoring/health` | None | - | Health check |
| GET | `/api/monitoring/health/detailed` | None | - | Detailed health |
| GET | `/api/monitoring/metrics` | None | - | All metrics |
| GET | `/api/monitoring/metrics/:name` | None | - | Specific metric |
| POST | `/api/monitoring/metrics/record` | None | - | Record metric |
| GET | `/api/monitoring/metrics/export` | None | - | Prometheus export |
| GET | `/api/monitoring/alerts` | None | - | Get active alerts |
| GET | `/api/monitoring/alerts/history` | None | - | Alert history |
| POST | `/api/monitoring/alerts/:id/acknowledge` | None | - | Acknowledge alert |
| POST | `/api/monitoring/alerts/:id/clear` | None | - | Clear alert |
| POST | `/api/monitoring/alerts/trigger` | None | - | Trigger alert |
| GET | `/api/monitoring/dashboard` | None | - | Dashboard metrics |
| POST | `/api/monitoring/thresholds` | None | - | Set threshold |
| GET | `/api/monitoring/thresholds/check` | None | - | Check thresholds |
| GET | `/api/monitoring/websocket` | None | - | WebSocket stats |
| GET | `/metrics` | None | - | Prometheus metrics |
| GET | `/metrics/dashboard` | None | - | JSON dashboard |
| **Commerce Memory Routes** |
| GET | `/api/commerce-memory/context/:userId` | Internal Token | - | Get context |
| POST | `/api/commerce-memory/revival/trigger` | Internal Token | - | Trigger revival |
| POST | `/api/commerce-memory/offer/send` | Internal Token | strictLimiter | Send offer |
| GET | `/api/commerce-memory/enriched/:userId` | Internal Token | - | Enriched context |
| GET | `/api/commerce-memory/health` | None | - | Health check |

### 2. Auth Service (`/rez-auth-service/src/routes/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/profile/summary` | requireAuth | Get profile summary |
| POST | `/api/profile/transaction` | requireAuth | Record transaction |
| POST | `/api/profile/engagement` | requireAuth | Record engagement |
| GET | `/api/profile/tier` | requireAuth | Get user tier |
| **Internal Routes** |
| POST | `/internal/profile/transaction` | Internal Token | Record transaction |
| POST | `/internal/profile/engagement` | Internal Token | Record engagement |
| GET | `/internal/profile/:userId` | Internal Token | Get profile |
| POST | `/internal/profile/refresh` | Internal Token | Batch refresh |

### 3. Automation Service (`/rez-automation-service/src/routes/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/` | - | List rules (paginated) |
| GET | `/api/stats` | - | Rule statistics |
| GET | `/api/:id` | - | Get rule by ID |
| POST | `/api/` | - | Create rule |
| PUT | `/api/:id` | - | Update rule |
| DELETE | `/api/:id` | - | Delete rule |
| POST | `/api/:id/execute` | - | Execute rule |
| POST | `/api/:id/toggle` | - | Toggle rule |
| POST | `/api/events` | - | Trigger event |
| GET | `/api/events` | - | Get event types |
| GET | `/api/events/history` | - | Event history |
| GET | `/api/logs` | - | Get logs (paginated) |
| GET | `/api/logs/stats` | - | Log statistics |
| GET | `/api/logs/:id` | - | Get log entry |
| GET | `/api/health` | - | Health check |

### 4. Insights Service (`/rez-insights-service/src/routes/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | - | Create insight |
| GET | `/user/:userId` | - | Get user insights |
| GET | `/merchant/:merchantId` | - | Get merchant insights |
| GET | `/user/:userId/count` | - | Get user insight count |
| GET | `/:id` | - | Get insight by ID |
| PATCH | `/:id` | - | Update insight status |
| DELETE | `/:id` | - | Delete insight |

### 5. Next.js API Routes (adsqr, adBazaar, rez-now)

| Service | Endpoint | Methods | Auth |
|---------|----------|---------|------|
| adsqr | `/api/campaigns` | GET, POST | Supabase Auth |
| adsqr | `/api/campaigns/[id]` | GET, PUT, DELETE | Supabase Auth |
| adsqr | `/api/campaigns/[id]/qr` | GET | Supabase Auth |
| adsqr | `/api/campaigns/[id]/qr/bulk` | POST | Supabase Auth |
| adsqr | `/api/campaigns/[id]/qr/download` | GET | Supabase Auth |
| adsqr | `/api/scan/[slug]` | GET | None |
| adsqr | `/api/analytics/attribution` | GET | None |
| adsqr | `/api/purchase` | POST | None |
| adsqr | `/api/visit` | POST | None |
| adBazaar | `/api/auth/rez-login` | GET | OAuth |
| adBazaar | `/api/auth/rez-callback` | GET | OAuth |
| adBazaar | `/api/campaigns` | GET, POST | - |
| adBazaar | `/api/listings` | GET, POST | - |
| adBazaar | `/api/bookings` | GET, POST | - |
| adBazaar | `/api/auth/2fa/setup` | POST | - |
| adBazaar | `/api/auth/2fa/verify` | POST | - |
| adBazaar | `/api/cron/*` | POST | Cron Secret |
| rez-now | `/api/health` | GET | None |
| rez-now | `/api/chat` | GET, POST | - |
| rez-now | `/api/auth/*` | GET, POST | - |

---

## REST Convention Violations

### Critical Issues

1. **Inconsistent URL Naming Conventions**
   - **Issue:** Mixed usage of kebab-case and camelCase
   - **Examples:**
     - `/api/intent/active/:userId` (camelCase in path)
     - `/api/commerce-memory/context/:userId` (kebab-case)
   - **Recommendation:** Standardize to kebab-case for all URL paths

2. **Versioning Pattern Inconsistency**
   - **Issue:** No consistent versioning across services
   - **Found:**
     - Most services: No version prefix (`/api/...`)
     - Event Platform: No version prefix
     - Some endpoints: Internal prefix (`/internal/...`)
   - **Recommendation:** Adopt `/api/v1/` prefix for all public endpoints

3. **HTTP Method Misuse**
   - **Issue:** POST used for operations that should be PATCH
   - **Example:**
     - `POST /api/rules/:id/toggle` should be `PATCH /api/rules/:id` with `{ enabled: boolean }`
   - **Recommendation:** Use PATCH for partial updates

4. **Non-RESTful Action Endpoints**
   - **Issue:** Verb-based endpoints instead of resource-based
   - **Examples:**
     - `POST /api/intent/nudge/send` should be `POST /api/nudges` with intent reference
     - `POST /api/chat/end-session` should be `DELETE /api/chat/sessions/:id`
     - `POST /api/intent/revival` should be `POST /api/dormant-intents/:id/revive`
   - **Recommendation:** Refactor to resource-based REST patterns

5. **Inconsistent Route Prefixes**
   - **Issue:** No unified route structure
   - **Found:**
     - `/api/` prefix (most services)
     - `/internal/` prefix (internal auth routes)
     - `/cron/` prefix (scheduler routes)
     - No prefix at all (`/metrics`, `/health`)
   - **Recommendation:** Standardize with `/api/v1/` and use headers for routing to internal/cron

### High Priority Issues

6. **Duplicate Functionality Across Services**
   - **Issue:** Similar endpoints exist in multiple services without clear ownership
   - **Examples:**
     - Health checks: Multiple services have `/health` with different response formats
     - Profile endpoints: Both `/api/profile/*` and `/internal/profile/*` exist
   - **Recommendation:** Consolidate to single source of truth per resource

7. **Inconsistent Path Parameter Naming**
   - **Issue:** Mixed snake_case and camelCase in path parameters
   - **Examples:**
     - `:userId` (camelCase)
     - `:dormantIntentId` (camelCase)
     - `:merchantId` (camelCase)
   - **Recommendation:** Standardize all path params to kebab-case where applicable, or camelCase consistently

---

## Response Format Inconsistencies

### Critical Inconsistencies

1. **Success Response Format Variants**

   | Service | Response Format |
   |---------|-----------------|
   | Intent Graph | `{ success: true, data: result }` or direct `result` |
   | Auth Service | `{ success: true, data: summary }` |
   | Automation | `{ data: rules, pagination: {...} }` |
   | Insights | `{ success: true, data: insight }` |
   | adsqr | `{ campaigns }` (no wrapper) |
   | adBazaar | `{ success: false, message: ... }` (flat) |
   | rez-now | `{ ok: true, ts: ... }` (custom) |

2. **Error Response Format Variants**

   | Service | Error Format |
   |---------|--------------|
   | Intent Graph | `{ error: 'message' }` |
   | Auth Service | `{ success: false, message: err.message }` |
   | Automation | `{ error: 'Rule not found' }` |
   | Insights | `{ success: false, error: result.error }` |
   | adsqr | `{ error: 'Unauthorized' }` (status only) |

3. **Pagination Format Inconsistencies**

   - **Automation:** `{ data: [...], pagination: { page, limit, total, totalPages } }`
   - **Insights:** Uses helper function `sendResponse()` with different structures
   - **Intent Graph:** Returns arrays directly without pagination metadata

4. **Missing Standard Fields**

   - **Issue:** Inconsistent timestamp and correlation ID usage
   - **Recommendation:** All responses should include:
     ```json
     {
       "success": boolean,
       "data": unknown,
       "timestamp": "ISO8601",
       "correlationId": "uuid" (for debugging)
     }
     ```

---

## Missing Middleware

### Authentication Gaps

1. **Unauthenticated Public Endpoints**
   - `/api/knowledge/merchant/:merchantId` - No auth required
   - `/api/knowledge/merchant/:merchantId/search` - No auth required
   - `/api/monitoring/*` - All endpoints unauthenticated
   - `/metrics` - No authentication
   - `/api/commerce-memory/health` - No auth

2. **Inconsistent Auth Header Names**
   - `x-internal-token` (Intent Graph)
   - `Authorization: Bearer <token>` (API Gateway)
   - `x-merchant-token` (Merchant routes)
   - `x-api-key` (Some endpoints)
   - `x-cron-secret` (Cron endpoints)
   - `x-user-id` (User context - trusted proxy only)

3. **Missing Auth on Some CRUD Operations**
   - `PUT /api/knowledge/entries/:entryId` - Has auth
   - `DELETE /api/knowledge/entries/:entryId` - Has auth
   - `POST /api/knowledge/merchant/:merchantId/bulk` - Has auth
   - But no auth on GET for same resources in some cases

### Rate Limiting Gaps

1. **No Rate Limiting On:**
   - All monitoring endpoints
   - Health check endpoints
   - Merchant demand dashboard
   - Most GET endpoints

2. **Inconsistent Rate Limiter Configurations**
   - Intent Graph uses `express-rate-limit`
   - API Gateway uses custom Redis-backed implementation
   - No standard configuration shared

3. **Missing Rate Limit Headers**
   - Some endpoints don't return `X-RateLimit-*` headers
   - Standard headers should be on all rate-limited endpoints

### Validation Gaps

1. **Input Validation Inconsistency**
   - Intent Graph: Manual checks in route handlers
   - Automation: Custom `validateRuleInput` middleware
   - Insights: No validation visible
   - Should use Zod schemas from shared contracts

2. **Missing Request Body Validation**
   - Most endpoints don't validate request bodies
   - Only Automation service has explicit validation middleware

---

## Documentation Gaps

### OpenAPI/Swagger Coverage

| Service | Has OpenAPI | Status |
|---------|-------------|--------|
| rez-event-platform | Yes (`openapi.yaml`) | Complete |
| rez-intent-graph | No | Missing |
| rez-auth-service | No | Missing |
| rez-automation-service | No | Missing |
| rez-insights-service | No | Missing |
| rez-api-gateway | No | Missing |
| adsqr | No | Missing |
| adBazaar | No | Missing |
| rez-now | No | Missing |

### JSDoc Coverage

1. **Good Coverage:**
   - Intent Graph routes have JSDoc comments
   - Automation routes have JSDoc comments

2. **Missing Documentation:**
   - No parameter descriptions
   - No response schema documentation
   - No example requests/responses
   - No error scenario documentation

### API Contract Schemas

- **Good:** `rez-shared/src/schemas/apiContracts.ts` defines canonical schemas
- **Gap:** Schemas exist but aren't enforced in route handlers
- **Gap:** No runtime validation using these schemas

---

## Recommendations

### Immediate Actions (P0)

1. **Standardize Response Format**
   - Adopt canonical response wrapper from `rez-shared`:
   ```typescript
   interface ApiResponse<T> {
     success: boolean;
     data?: T;
     error?: string;
     message?: string;
     timestamp: string;
     correlationId?: string;
   }
   ```

2. **Add Versioning**
   - Prefix all public APIs with `/api/v1/`
   - Maintain backward compatibility with `/api/` -> `/api/v1/` redirects

3. **Audit and Secure Unauthenticated Endpoints**
   - Review all `/api/monitoring/*` endpoints
   - Add authentication or move to separate internal network

### High Priority (P1)

4. **Unify Authentication**
   - Standardize on `Authorization: Bearer <JWT>` for all services
   - Use `x-internal-token` only for service-to-service
   - Document auth requirements in OpenAPI specs

5. **Add Rate Limiting to All Services**
   - Implement shared rate limiter from `rez-shared`
   - Apply to monitoring and health endpoints
   - Add `X-RateLimit-*` headers consistently

6. **Generate OpenAPI Documentation**
   - Add OpenAPI specs to all services
   - Use existing `openapi.yaml` from event-platform as template
   - Enable Swagger UI in development

7. **Refactor Non-RESTful Endpoints**
   - Convert verb-based to resource-based REST
   - Examples:
     - `POST /nudge/send` -> `POST /nudges`
     - `POST /chat/end-session` -> `DELETE /sessions/:id`
     - `POST /revival/trigger` -> `POST /dormant-intents/:id/revive`

### Medium Priority (P2)

8. **Add Request/Response Validation**
   - Integrate Zod validation from shared contracts
   - Validate all request bodies and query parameters
   - Return standardized validation error responses

9. **Add Correlation IDs**
   - Generate UUID for each request
   - Include in all responses and logs
   - Enable distributed tracing

10. **Document Error Scenarios**
    - Add error response schemas to all endpoints
    - Document retry behavior for idempotent operations
    - Specify which errors are retryable

### Long Term (P3)

11. **API Gateway Consolidation**
    - Route all external traffic through API Gateway
    - Enforce consistent middleware at gateway level
    - Remove direct service exposure

12. **Client SDK Generation**
    - Generate TypeScript clients from OpenAPI specs
    - Publish to npm for consumer apps
    - Maintain versioning aligned with API versions

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Endpoints Audited | 120+ |
| REST Violations (Critical) | 7 |
| REST Violations (High) | 3 |
| Response Format Variants | 5+ |
| Auth Mechanism Variants | 6 |
| Rate Limited Endpoints | ~25 |
| OpenAPI Documented Services | 1/9 |
| Unauthenticated Public Endpoints | 15+ |

---

## Appendix: Services Requiring Updates

1. **rez-intent-graph** - Response format, versioning, OpenAPI
2. **rez-auth-service** - Response format, internal routes cleanup
3. **rez-automation-service** - REST conventions, pagination
4. **rez-insights-service** - Response format, validation
5. **rez-api-gateway** - Documentation, consistency
6. **adsqr** - Response format, versioning
7. **adBazaar** - Response format, auth standardization
8. **rez-now** - Response format, documentation
