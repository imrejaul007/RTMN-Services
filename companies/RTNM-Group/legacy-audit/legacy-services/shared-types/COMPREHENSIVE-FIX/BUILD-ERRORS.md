# Comprehensive Rez Ecosystem Build & Test Error Report

**Generated:** 2026-05-02
**Total Services Scanned:** 22

---

## BUILD ERRORS

### 1. rez-intent-predictor
- **Status:** Missing build script
- **Issue:** `npm error Missing script: "build"`
- **Fix:** Add `"build": "tsc"` to package.json scripts

### 2. rez-knowledge-base-service
- **Status:** Missing build script
- **Issue:** `npm error Missing script: "build"`
- **Fix:** Add `"build": "tsc"` to package.json scripts

### 3. rez-feature-flags
- **Status:** Missing build script
- **Issue:** `npm error Missing script: "build"`
- **Fix:** Add `"build": "tsc"` to package.json scripts

### 4. rez-corporate-service
**File:** `src/integrations/cards/razorpayCardService.ts`
- **Line:** 44
- **Error Type:** Type Error
- **Error:** `Type 'AxiosInstance' is missing the following properties from type 'AxiosStatic': Cancel, CancelToken, Axios, AxiosError, and 12 more.`
- **Fix:** Change `axios` to `axios.create()` or use correct type annotation

**File:** `src/integrations/travel/hotelOtaService.ts`
- **Line:** 24
- **Error Type:** Type Error
- **Error:** Same as above
- **Fix:** Use `axios.create()` for proper AxiosInstance type

**File:** `src/integrations/travel/rezTravelService.ts`
- **Line:** 22
- **Error Type:** Type Error
- **Error:** Same as above
- **Fix:** Use `axios.create()` for proper AxiosInstance type

**File:** `src/integrations/travel/tboService.ts`
- **Line:** 51
- **Error Type:** Type Error
- **Error:** Same AxiosInstance issue
- **Fix:** Use `axios.create()` for proper AxiosInstance type

**File:** `src/integrations/travel/tboService.ts`
- **Line:** 285, 310
- **Error Type:** Type Error
- **Error:** `Type 'string' is not assignable to type 'ObjectId'`
- **Fix:** Cast to ObjectId: `new Types.ObjectId(stringId)` or use `Types.ObjectId.createFromHexString(stringId)`

### 5. rez-travel-service
**File:** `src/index.ts`
- **Lines:** 2, 3, 4, 5
- **Error Type:** Module Not Found
- **Errors:**
  - `Cannot find module './flightRoutes' or its corresponding type declarations.`
  - `Cannot find module './trainRoutes' or its corresponding type declarations.`
  - `Cannot find module './busRoutes' or its corresponding type declarations.`
  - `Cannot find module './cabRoutes' or its corresponding type declarations.`
- **Fix:** Create the missing route files (flightRoutes.ts, trainRoutes.ts, busRoutes.ts, cabRoutes.ts) or remove the imports if not needed

### 6. rez-intent-graph
**Multiple TypeScript Errors:**

**File:** `src/__tests__/__mocks__/mongoose.ts`
- **Lines:** 6-7
- **Error Type:** Type/Declaration Error
- **Errors:**
  - `'mockMongooseInstance' implicitly has type 'any'`
  - `Block-scoped variable 'mockMongooseInstance' used before its declaration`
- **Fix:** Add explicit type annotation and fix declaration order

**File:** `src/__tests__/index.ts`
- **Lines:** 6, 9
- **Error Type:** Import Extension Error
- **Error:** `Relative import paths need explicit file extensions in ECMAScript imports`
- **Fix:** Add `.js` extension to imports: `import './setup.js'` and `import './__mocks__/ioredis.js'`

**File:** `src/__tests__/integration/health.test.ts`
- **Line:** 82
- **Error Type:** Property Missing
- **Error:** `Property 'host' is missing in type`
- **Fix:** Add `host` property to MockMongoDBConnection

**File:** `src/__tests__/unit/database/mongodb.test.ts`
- **Lines:** 64, 101, 119, 123, 127, 135, 203, 208
- **Error Type:** Property Does Not Exist
- **Error:** Properties `_setConnectionAttempts`, `_getConnectionAttempts`, `_setConnectionError` do not exist
- **Fix:** Add these methods to MongoDBConnectionModule or update test mocks

**File:** `src/__tests__/unit/middleware/cache.test.ts`
- **Lines:** 44-351 (multiple errors)
- **Error Type:** Type Compatibility
- **Error:** Various type errors with `unknown`, `Mock<UnknownFunction>`, and function parameter mismatches
- **Fix:** Add proper type assertions and explicit type annotations in tests

**File:** `src/api/merchant.routes.ts`
- **Line:** 6
- **Error Type:** Module Not Found
- **Error:** `Cannot find module 'jsonwebtoken' or its corresponding type declarations`
- **Fix:** `npm install --save-dev @types/jsonwebtoken`

**File:** `src/integrations/insightConnectors.ts`
- **Line:** 181
- **Error Type:** Type Conversion
- **Error:** `Conversion of type 'Record<string, unknown>' to type 'InsightData' may be a mistake`
- **Fix:** Cast via `unknown` first: `data as unknown as InsightData` or create proper conversion

**File:** `src/loadTests/loadProfile.ts` and `src/loadTests/scenario.ts`
- **Line:** 6 in each
- **Error Type:** Circular Definition
- **Error:** `Circular definition of import alias 'LoadScenario'`
- **Fix:** Remove circular import and properly export/import LoadScenario

**Multiple Files - Error Type Mismatches:**
- Files: `src/agents/*.ts`, `src/config/redis.ts`, `src/database/mongodb.ts`, `src/eventBus.ts`, `src/middleware/cache.ts`, `src/middleware/intentMiddleware.ts`, `src/services/*.ts`, `src/websocket/server.ts`
- **Error:** `Type 'unknown' is not assignable to type 'Error | undefined'`
- **Fix:** Add proper type guards or explicit type assertions for error handling

---

## TEST ERRORS

### 1. rez-auth-service
**File:** `src/__tests__/securityFixes.test.ts`
- **Line:** 9
- **Error:** `Argument of type '(_key: string, value: string) => Promise<string>' is not assignable to parameter of type '(...args: unknown[]) => any'`
- **Fix:** Cast mock function or update type definition

**File:** `src/__tests__/otpSecurity.test.ts`
- **Lines:** 196, 178, 189, 202, 241, 270, 299
- **Test Failures:** 8 tests failing
- **Error Pattern:** `verifyOTP` returning `{reason: "not_found", valid: false}` instead of expected values
- **Fix:** Redis mock not persisting data between operations; review mock implementation

**File:** `src/__tests__/tokenSecurity.test.ts`
- **Lines:** 131-133, 209
- **Test Failures:** 4 tests failing
- **Error:** MongoDB fallback failing, BSONError for ObjectId
- **Fix:** Ensure proper userId formatting for MongoDB ObjectId

### 2. rez-wallet-service
**File:** `tests/setup.ts`
- **Lines:** 14-64
- **Error:** `Cannot find name 'jest'`
- **Fix:** Add `@types/jest` to devDependencies and ensure Jest types are configured

### 3. rez-order-service
**File:** `tests/setup.ts`
- **Lines:** 14-100
- **Error:** `Cannot find name 'jest'`
- **Fix:** Add `@types/jest` to devDependencies

### 4. rez-payment-service
**File:** `test/access-guards.test.js`
- **Line:** 19
- **Test Failure:** `payment refund route remains restricted` test failing
- **Error:** Regex mismatch in test assertion
- **Fix:** Update test regex to match actual route pattern

### 5. rez-merchant-service
**File:** `src/__tests__/health.test.ts`, `src/__tests__/middleware.test.ts`
- **Lines:** Multiple
- **Error:** `Cannot find name 'jest'`, `Cannot find name 'expect'`, `Cannot find name 'it'`
- **Fix:** Add `@types/jest` to devDependencies and configure types in tsconfig.json

### 6. rez-catalog-service
**File:** `test/productSchemas.test.js`
- **Lines:** 33, 74
- **Test Failures:** 2 tests failing
- **Errors:**
  - Line 33: `ProductPricingSchema - all optional fields` assertion failed
  - Line 74: `Discount 0 should be valid` assertion failed
- **Fix:** Update schema to allow empty optional fields and discount of 0

### 7. rez-action-engine
**File:** `src/__tests__/health.test.ts`
- **Line:** 15060 (timeout)
- **Test Failure:** `should return health status from remote endpoint`
- **Error:** `Timeout of 15000ms exceeded`
- **Fix:** Increase test timeout or mock external health endpoint

### 8. rez-user-intelligence-service
**File:** `tests/UserIntelligenceService.test.ts`
- **Lines:** 11-374
- **Error:** `Cannot find name 'describe'`, `Cannot find name 'it'`, `Cannot find name 'expect'`
- **Fix:** Add `@types/jest` to devDependencies

### 9. rez-merchant-intelligence-service
**File:** `src/tests/ScoringService.test.ts`
- **Line:** 329
- **Error:** `Type '{ score: number; grade: "F"; components: {}; ... }' is not assignable to type 'HealthScore'`
- **Fix:** Provide all required properties in `components` object (revenue, orders, customers, inventory, feedback, engagement)

---

## MISSING TEST SCRIPTS

The following services do not have a `test` script defined in package.json:

| Service | Status |
|---------|--------|
| rez-marketing-service | No test script |
| rez-intelligence-hub | No test script |
| rez-feedback-service | No test script |
| REZ-support-copilot | No test script |
| rez-knowledge-base-service | No test script |
| rez-feature-flags | No test script |
| rez-travel-service | No test script |
| rez-corporate-service | jest command not found (not installed) |

---

## ESLINT CONFIGURATION ERRORS

All services using ESLint are failing because:
- **Error:** `ESLint couldn't find an eslint.config.(js|mjs|cjs) file`
- **Reason:** ESLint v9 requires flat config format (eslint.config.js) but services have old .eslintrc files
- **Fix:** Migrate to flat config format per [ESLint Migration Guide](https://eslint.org/docs/latest/use/configure/migration-guide)

Affected services:
- rez-auth-service
- rez-wallet-service
- rez-order-service
- rez-payment-service
- rez-merchant-service
- rez-search-service
- rez-catalog-service
- rez-gamification-service

---

## SUMMARY BY SERVICE

| Service | Build Status | Test Status | TypeScript Status |
|---------|-------------|-------------|------------------|
| rez-auth-service | PASS | FAIL (11 tests) | PASS |
| rez-wallet-service | PASS | FAIL (setup errors) | PASS |
| rez-order-service | PASS | FAIL (setup errors) | PASS |
| rez-payment-service | PASS | FAIL (1 test) | PASS |
| rez-merchant-service | PASS | FAIL (setup errors) | PASS |
| rez-search-service | PASS | PASS | PASS |
| rez-catalog-service | PASS | FAIL (2 tests) | PASS |
| rez-gamification-service | PASS | PASS | PASS |
| rez-marketing-service | PASS | No test script | PASS |
| rez-intelligence-hub | PASS | No test script | PASS |
| rez-action-engine | PASS | FAIL (1 test) | PASS |
| rez-feedback-service | PASS | No test script | PASS |
| rez-user-intelligence-service | PASS | FAIL (setup errors) | PASS |
| rez-merchant-intelligence-service | PASS | FAIL (1 test) | PASS |
| rez-intent-predictor | No build script | No test script | N/A |
| REZ-support-copilot | PASS | No test script | PASS |
| rez-knowledge-base-service | No build script | No test script | PASS |
| rez-feature-flags | No build script | No test script | PASS |
| rez-corporate-service | FAIL (6 errors) | jest not installed | FAIL (6 errors) |
| rez-travel-service | FAIL (4 errors) | No test script | FAIL (4 errors) |
| rez-intent-graph | FAIL (80+ errors) | PASS (141 tests) | FAIL (80+ errors) |

---

## CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION

1. **rez-intent-graph**: 80+ TypeScript errors - extensive type safety issues
2. **rez-corporate-service**: 6 TypeScript errors - Axios type mismatches and ObjectId issues
3. **rez-travel-service**: 4 TypeScript errors - Missing route files
4. **Multiple services**: @types/jest missing - tests cannot run
5. **All services**: ESLint v9 migration needed - requires flat config format
