# Dependency Audit Report
**Generated:** 2026-05-02
**Auditor:** Claude Code Dependency Auditor
**Repositories Audited:** ReZ Full App (main), rez-intent-graph, resturistan/backend/src/analytics

---

## Executive Summary

This comprehensive audit covers **35+ microservices** across the Rez ecosystem. The ecosystem uses a consistent technology stack but suffers from **significant version drift** across services, particularly in TypeScript, testing frameworks, and security packages.

---

## Version Matrix (Core Packages)

| Package | Main App Range | rez-intent-graph | Recommended | Status |
|---------|---------------|------------------|-------------|--------|
| **Node.js** | 18.x - 20.x | 20.x | 20.x LTS | OK |
| **TypeScript** | 5.0.0 - 5.9.3 | 5.6.3 | ^5.6.3 | DRIFT |
| **Express** | 4.18.0 - 4.21.2 | 4.21.0 | ^4.21.2 | OK |
| **Mongoose** | 8.0.0 - 8.17.2 | 8.8.3 | ^8.17.2 | DRIFT |
| **IORedis** | 5.3.0 - 5.10.1 | 5.4.1 | ^5.10.1 | DRIFT |
| **JWT** | 9.0.0 - 9.0.3 | (none) | ^9.0.3 | OK |
| **Winston** | 3.11.0 - 3.17.0 | 3.11.0 | ^3.17.0 | DRIFT |
| **Zod** | 3.22.0 - 4.3.6 | 3.23.8 | ^3.23.8 | DRIFT |
| **Helmet** | 7.1.0 - 8.1.0 | 7.88.0 | ^8.1.0 | DRIFT |
| **CORS** | 2.8.5 - 2.8.6 | (none) | ^2.8.6 | OK |
| **BullMQ** | 5.0.0 - 5.76.4 | (none) | ^5.76.4 | DRIFT |
| **Sentry** | 7.88.0 - 8.0.0 | 7.88.0 | ^8.0.0 | DRIFT |
| **Jest** | 29.7.0 - 30.3.0 | 30.3.0 | ^29.7.0 | DRIFT |
| **ESLint** | 8.54.0 - 9.3.0 | (none) | ^9.0.0 | DRIFT |

---

## Version Conflicts Found

### 1. TypeScript Version Drift (CRITICAL)

| Service | Version | Deviation |
|---------|---------|-----------|
| rez-first-loop | 5.0.0 | MAJOR |
| rez-insights-service | 5.7.2 | MINOR |
| rez-intelligence-hub | 5.3.0 | MINOR |
| rez-corporate-service | 5.3.3 | MINOR |
| rez-travel-service | 5.3.2 | MINOR |
| Most services | 5.9.3 | CURRENT |

**Impact:** TypeScript 5.0 vs 5.9 has significant API differences including decorator improvements, type inference enhancements, and performance improvements.

### 2. Mongoose Version Drift (HIGH)

| Service | Version | Status |
|---------|---------|--------|
| rez-feature-flags | 8.0.0 | OUTDATED |
| rez-corporate-service | 8.0.0 | OUTDATED |
| rez-travel-service | 8.0.0 | OUTDATED |
| rez-intelligence-hub | 8.0.0 | OUTDATED |
| rez-merchant-intelligence-service | 8.2.0 | OUTDATED |
| rez-intent-predictor | 8.0.0 | OUTDATED |
| rez-automation-service | 8.0.3 | OUTDATED |
| rez-action-engine | 8.0.0 | OUTDATED |
| rez-feedback-service | 8.0.0 | OUTDATED |
| rez-push-service | 8.0.3 | OUTDATED |
| **Most services** | 8.17.2 | CURRENT |

### 3. IORedis Version Drift (MEDIUM)

| Service | Version |
|---------|---------|
| rez-intent-graph | 5.4.1 |
| rez-scheduler-service | 5.6.0 |
| rez-ads-service | 5.3.2 |
| rez-marketing-service | 5.3.2 |
| rez-user-intelligence-service | 5.3.2 |
| rez-action-engine | 5.3.2 |
| rez-feedback-service | 5.3.2 |
| rez-automation-service | 5.3.2 |
| **rez-shared** | 5.10.1 |
| **rez-wallet-service** | 5.3.0 |

### 4. Jest Version Drift (HIGH)

| Service | Version |
|---------|---------|
| rez-auth-service | 30.3.0 |
| rez-intent-graph | 30.3.0 |
| **Most services** | 29.7.0 |
| rez-consumer-copilot | NONE |
| rez-support-copilot | NONE |
| rez-feature-flags | NONE |

**Issue:** Jest 30.x is in beta. Services using 30.x may face instability.

### 5. Sentry Version Drift (HIGH)

| Service | Version |
|---------|---------|
| rez-merchant-service | 8.0.0 |
| rez-ads-service | 8.0.0 |
| rez-wallet-service | 8.0.0 |
| rez-api-gateway | N/A |
| **Most services** | 7.100.0 - 7.120.4 |

---

## Outdated Packages

### Critical Security Updates Needed

| Package | Outdated Version | Latest Version | Risk |
|---------|------------------|----------------|------|
| `@types/express` | 4.17.0 (auth) | 5.x | HIGH |
| `@types/node` | 20.10.0 - 20.11.0 | 22.x | MEDIUM |
| `bcryptjs` | 2.4.3 (corp) | 3.0.3 | MEDIUM |
| `date-fns` | 2.30.0 (targeting) | 4.x | MEDIUM |
| `nodemailer` | 8.0.7 (marketing) | 6.9.x | HIGH |
| `swagger-jsdoc` | 6.2.8 (merchant-intel) | 6.2.x | LOW |

### Packages Missing Version Constraints

| Service | Package | Issue |
|---------|---------|-------|
| rez-travel-service | joi | No ^ prefix |
| rez-corporate-service | pdfkit | No ^ prefix |
| rez-corporate-service | xlsx | No ^ prefix |
| rez-knowledge-base-service | papaparse | No ^ prefix |

---

## Missing Standard Dependencies

### Security Headers (Helmet)

| Service | Has Helmet | Version |
|---------|------------|---------|
| rez-feature-flags | NO | - |
| rez-corporate-service | NO | - |
| rez-intelligence-hub | YES | 7.1.0 |
| Most services | YES | 7.1.0 - 8.1.0 |

**Missing in:** rez-feature-flags, rez-corporate-service

### CORS Configuration

| Service | Has CORS | Version |
|---------|----------|---------|
| rez-feature-flags | NO | - |
| rez-ads-service | YES | 2.8.5 |
| Most services | YES | 2.8.5+ |

**Missing in:** rez-feature-flags

### Compression

| Service | Has Compression | Version |
|---------|-----------------|---------|
| rez-feature-flags | NO | - |
| rez-intelligence-hub | NO | - |
| rez-corporate-service | NO | - |
| rez-intent-predictor | NO | - |
| Most services | YES | 1.7.4+ |

**Missing in:** rez-feature-flags, rez-intelligence-hub, rez-corporate-service, rez-intent-predictor, rez-support-copilot, rez-consumer-copilot

### Express Async Errors

| Service | Has express-async-errors |
|---------|-------------------------|
| rez-ads-service | YES |
| rez-marketing-service | YES |
| Most services | NO |

**Missing in:** ALL services except rez-ads-service and rez-marketing-service

### Express Rate Limit

| Service | Has Rate Limit |
|---------|----------------|
| rez-ads-service | YES |
| rez-marketing-service | NO |
| rez-merchant-service | YES |
| rez-order-service | YES |
| rez-wallet-service | YES |
| Most services | NO |

---

## Inconsistent DevDependencies

### TypeScript Versions in DevDependencies

| Service | TypeScript Version |
|---------|-------------------|
| rez-contracts | 5.9.3 |
| rez-insights-service | 5.7.2 |
| rez-intelligence-hub | 5.3.0 |
| rez-corporate-service | 5.3.3 |
| rez-travel-service | 5.3.2 |
| rez-first-loop | 5.0.0 |

### ESLint Configuration Drift

| Service | ESLint | ESLint Config |
|---------|--------|---------------|
| rez-adbazaar | 9.x | eslint-config-next 16.2.2 |
| rez-ads-service | NONE | - |
| rez-gamification-service | 9.0.0 | eslint-config-prettier 9.0.0 |
| rez-auth-service | 9.0.0 | eslint-config-prettier 9.0.0 |
| rez-intelligence-hub | NONE | - |
| Most services | 8.54.0 - 9.3.0 | Mixed |

### Test Framework Inconsistencies

| Service | Test Framework | Config |
|---------|--------------|--------|
| rez-auth-service | Jest 30.3.0 | ts-jest 29.4.9 |
| rez-payment-service | Node Test | - |
| rez-catalog-service | Node Test | - |
| rez-search-service | Node Test | - |
| rez-ads-service | Node Test | - |
| rez-contracts | Jest | - |
| rez-recommendation-engine | Jest 29.7.0 | - |

---

## Recommendations

### Priority 1: Critical Updates

1. **Upgrade Jest from 30.x to 29.7.0**
   - Jest 30.x is beta/unstable
   - Affected: rez-auth-service, rez-intent-graph

2. **Upgrade TypeScript to 5.9.3**
   - rez-first-loop is 2 major versions behind
   - Create migration path for 5.0.0 -> 5.9.3

3. **Add express-async-errors to all services**
   - Only 2 services have it
   - Prevents unhandled promise rejection crashes

### Priority 2: Security Updates

4. **Upgrade nodemailer in rez-marketing-service**
   - 8.0.7 is severely outdated
   - Upgrade to 6.9.x

5. **Add helmet to rez-feature-flags, rez-corporate-service**

6. **Add compression to laggard services**
   - Performance impact for latency-sensitive endpoints

### Priority 3: Consistency

7. **Standardize TypeScript to ^5.6.3**
   - Pick a canonical version for all services

8. **Standardize Mongoose to ^8.17.2**
   - Several services on 8.0.0

9. **Standardize BullMQ to ^5.76.4**
   - Version range spans 5.0.0 to 5.76.4

10. **Add express-rate-limit to all API services**
    - Missing in most services

### Priority 4: Technical Debt

11. **Move @types/* packages to devDependencies**
    - Some services incorrectly have types in dependencies

12. **Standardize logging with Winston**
    - rez-support-copilot, rez-feature-flags lack logging

13. **Add health check endpoints standardization**

---

## Service-by-Service Audit Summary

| Service | Node | TS | Express | Mongoose | Helmet | Rate Limit | Test | Status |
|---------|------|-----|---------|----------|--------|------------|-------|--------|
| rez-auth-service | 20.x | 5.9.3 | 4.18.0 | 8.17.2 | 7.1.0 | NO | Jest 30 | WARN |
| rez-merchant-service | 20.x | 5.9.3 | 4.21.2 | 8.17.2 | 8.1.0 | YES | Jest 29 | OK |
| rez-order-service | 20.x | 5.9.3 | 4.21.2 | 8.17.2 | 8.1.0 | YES | Jest 29 | OK |
| rez-payment-service | 20.x | 5.9.3 | 4.18.0 | 8.17.2 | 7.1.0 | YES | Node | WARN |
| rez-catalog-service | 20.x | 5.9.3 | 4.21.2 | 8.17.2 | 8.1.0 | NO | Node | WARN |
| rez-search-service | 20.x | 5.9.3 | 4.21.2 | 8.17.2 | 7.1.0 | NO | Node | WARN |
| rez-wallet-service | 20.x | 5.9.3 | 4.21.2 | 8.17.2 | 8.1.0 | YES | Jest 29 | OK |
| rez-ads-service | 18.x | 5.9.3 | 4.21.2 | 8.17.2 | 7.1.0 | NO | Node | WARN |
| rez-notification-events | 20.x | 5.4.5 | 4.19.2 | 8.17.2 | NO | NO | Node | FAIL |
| rez-gamification-service | 20.x | 5.9.3 | 4.21.2 | 8.17.2 | 8.1.0 | NO | NONE | FAIL |
| rez-insights-service | 18.x | 5.7.2 | 4.21.2 | 8.17.2 | NO | NO | Jest 29 | FAIL |
| rez-scheduler-service | 20.x | 5.9.3 | 4.21.2 | 8.17.2 | 7.1.0 | NO | NONE | FAIL |
| rez-marketing-service | 18.x | 5.9.3 | 4.21.2 | 8.17.2 | 7.1.0 | NO | NONE | FAIL |
| rez-feature-flags | 18.x | NONE | 4.18.2 | 8.0.0 | NO | NO | NONE | FAIL |
| rez-corporate-service | - | 5.3.3 | 4.18.2 | 8.0.0 | NO | NO | NONE | FAIL |
| rez-intelligence-hub | - | 5.3.0 | 4.18.2 | 8.0.0 | 7.1.0 | NO | NONE | FAIL |
| rez-travel-service | - | 5.3.2 | 4.18.2 | 8.0.0 | 7.1.0 | NO | NONE | FAIL |
| rez-automation-service | 18.x | 5.3.3 | 4.18.2 | 8.0.3 | 7.1.0 | NO | Jest 29 | FAIL |
| rez-action-engine | 18.x | 5.3.2 | 4.18.2 | 8.0.0 | 7.1.0 | NO | Jest 29 | FAIL |
| rez-feedback-service | 18.x | 5.3.0 | 4.18.2 | 8.0.0 | 7.1.0 | NO | Jest 29 | FAIL |
| rez-push-service | 18.x | - | 4.18.2 | 8.0.3 | 7.1.0 | YES | Jest 29 | FAIL |
| rez-user-intelligence-service | 18.x | 5.3.2 | 4.18.2 | 8.0.0 | 7.1.0 | YES | Jest 29 | FAIL |
| rez-merchant-intelligence-service | 18.x | 5.3.3 | 4.18.2 | 8.2.0 | 7.1.0 | NO | Jest 29 | FAIL |
| rez-intent-predictor | - | - | 4.18.2 | 8.0.0 | NO | NO | NONE | FAIL |
| rez-support-copilot | - | - | 4.18.2 | 8.23.1 | 7.1.0 | NO | NONE | FAIL |
| rez-consumer-copilot | - | - | 4.18.2 | NO | NO | NO | NONE | FAIL |
| rez-recommendation-engine | 20.x | - | 4.19.2 | 8.4.0 | 7.1.0 | NO | Jest 29 | WARN |
| rez-targeting-engine | - | 5.3.2 | 4.18.2 | 8.0.0 | 7.1.0 | YES | Jest 29 | FAIL |
| rez-knowledge-base-service | - | 5.3.3 | 4.18.2 | 8.0.0 | 7.1.0 | NO | NONE | FAIL |
| rez-unified-chat | - | 5.0.0 | - | - | - | - | NONE | WARN |
| rez-first-loop | 18.x | 5.0.0 | - | - | - | - | Jest 29 | WARN |
| rez-contracts | - | 5.9.3 | - | - | - | - | Jest | WARN |
| analytics-events | 20.x | 5.3.0 | 4.22.1 | 8.17.2 | 8.1.0 | NO | Node | WARN |
| rez-shared | - | 5.9.3 | 4.21.2 | 8.17.2 | NO | YES | Node | WARN |
| rez-intent-graph | 20.x | 5.6.3 | 4.21.0 | 8.8.3 | NO | YES | Jest 30 | WARN |

---

## Audit Legend

- **OK:** All dependencies up to date, no issues
- **WARN:** Minor version drift, recommend update before deploy
- **FAIL:** Critical issues, blocking for production deployment

---

## Actions Required Before Deployment

1. [ ] Upgrade Jest from 30.x to 29.7.0 in affected services
2. [ ] Standardize TypeScript to 5.6.3+ across all services
3. [ ] Add express-async-errors to all Express services
4. [ ] Upgrade Mongoose from 8.0.0 to 8.17.2 in laggard services
5. [ ] Add helmet to services missing security headers
6. [ ] Add compression middleware to latency-sensitive services
7. [ ] Upgrade nodemailer in rez-marketing-service
8. [ ] Standardize IORedis to 5.10.1
9. [ ] Add express-rate-limit to all API services

---

**End of Report**
