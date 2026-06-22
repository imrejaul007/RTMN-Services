# REZ Ecosystem — Issue Resolution Execution Plan

**Created:** 2026-04-30
**Status:** IN PROGRESS

---

## Summary

| Category | Total | Resolved | Remaining |
|----------|-------|----------|-----------|
| P0 | 7 | 7 | 0 |
| P1 | 10 | 4 | 6 |
| P2 | 9 | 2 | 7 |
| P3 | 5 | 3 | 2 |
| **Total** | **31** | **16** | **15** |

---

## Phase 1: Quick Wins (P2 Issues - 1-2 days each)

### 1.1 TECH-007: NextaBiZ Duplicate Merchant ✅ ALREADY FIXED
**Status:** Fixed in merchant-service
**Files:** `src/routes/oauth.ts`
**Fix:** Check by phone/email before creating merchant

### 1.2 TECH-008: Feature Flag Rollout ✅ ALREADY FIXED
**Status:** Fixed in merchant-service
**Files:** `src/routes/featureFlags.ts`
**Fix:** Implement deterministic SHA256-based rollout percentage

### 1.3 TECH-010: Hotel Panel Port Mismatch ✅ VERIFIED OK
**Status:** Working as designed
**Finding:** Panel on 3001, API on 3000 - correct configuration

### 1.4 TECH-011: Barrel Export TS Errors ✅ VERIFIED OK
**Status:** No errors
**Finding:** TypeScript compiles cleanly

### 1.5 TECH-012: Rendez Auth Coverage ✅ VERIFIED OK
**Status:** Working as designed
**Finding:** Health routes intentionally unauthenticated

---

## Phase 2: Partial Completions (P1 Issues - 2-3 days each)

### 2.1 OPS-005: Redis HA - Verify Deployment
**Status:** Code Ready
**Action:** Document production deployment steps

### 2.2 OPS-006: Observability - Add Metrics to Services
**Status:** Partial
**Action:** Add metrics middleware to all services (already exists in auth-service)

### 2.3 SEC-003: Validation - Add ESLint Rule
**Status:** Partial
**Action:** Create ESLint rule to enforce validation middleware

### 2.4 SEC-005: MFA - Add User Setup UI
**Status:** Partial
**Action:** Document frontend integration needed

### 2.5 SEC-006: PCI-DSS - Complete SAQ-A ✅ ALREADY DOCUMENTED
**Status:** Complete
**Action:** None needed

### 2.6 TECH-002: Unbounded Queries - Complete Audit
**Status:** Audit Done
**Action:** Document findings and create linting rule

### 2.7 TECH-005: PMS Bundle - Implement Code Splitting ✅ ALREADY OPTIMIZED
**Status:** Optimized
**Action:** Verify build output improvement

---

## Phase 3: Medium Effort (P1 Issues - 1-2 weeks each)

### 3.1 OPS-007: Staging Parity
**Status:** Open
**Action:** Document staging environment requirements

### 3.2 OPS-008: SLA/SLO
**Status:** Open
**Action:** Define SLOs and create status page

### 3.3 TECH-004: Hotel OTA Structure (8-12 weeks)
**Status:** Open
**Recommendation:** Low priority - structure is manageable
**Action:** Document migration path (future phase)

### 3.4 TECH-006: Two Hotel Frontends (3-4 weeks)
**Status:** Open
**Recommendation:** Keep separate (different user journeys)
**Action:** Document decision and shared component extraction

---

## Phase 4: Large Effort (Requires Legal + Engineering)

### 4.1 SEC-004: KYC/AML (4-8 weeks + legal)
**Status:** Open
**Action:** Legal review first, then infrastructure

---

## Execution Checklist

- [x] TECH-007: Fix duplicate merchant
- [x] TECH-008: Implement rollout %
- [x] SEC-005: Consumer MFA flow
- [x] SEC-006: PCI-DSS documentation
- [x] TECH-005: Bundle optimization
- [ ] TECH-010: Verify port mismatch
- [ ] TECH-011: Fix TS errors
- [ ] TECH-012: Audit auth coverage
- [ ] OPS-005: Document production deployment
- [ ] OPS-006: Add metrics to all services
- [ ] SEC-003: Create ESLint rule
- [ ] SEC-005: Document frontend integration
- [ ] TECH-002: Complete linting rule
- [ ] OPS-007: Document staging requirements
- [ ] OPS-008: Define SLOs
- [ ] TECH-004: Document migration path
- [ ] TECH-006: Document decision
- [ ] SEC-004: Legal review

---

## Notes

- All P0 issues are resolved
- P1/P2 issues have been audited and progress made
- Remaining work requires either:
  - Legal/compliance review (SEC-004)
  - Large refactoring (TECH-004)
  - Simple documentation tasks (OPS-007, OPS-008)
