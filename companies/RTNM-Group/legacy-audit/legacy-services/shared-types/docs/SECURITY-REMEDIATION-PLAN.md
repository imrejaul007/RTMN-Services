# ReZ Auth System Security Remediation Plan

**Created:** 2026-04-30
**Status:** IN PROGRESS
**Target Completion:** 2026-05-07

---

## Executive Summary

This document outlines the comprehensive remediation plan for the security vulnerabilities identified in the ReZ authentication system. The plan addresses **7 critical/high issues** with specific action items, responsible parties, and timelines.

---

## Issue Registry

### ISSUE-001: Production Secrets Exposed in .env (CVSS 9.1)
**Severity:** CRITICAL
**Status:** OPEN
**Owner:** DevOps / Security Team

**Description:**
The `.env` file in `rez-auth-service/` contains production-grade secrets that have been committed to the repository:
- `JWT_SECRET`, `JWT_MERCHANT_SECRET`, `JWT_ADMIN_SECRET`, `JWT_REFRESH_SECRET`
- `INTERNAL_SERVICE_TOKEN`
- `MONGODB_URI` with credentials
- `REDIS_URL`

**Impact:**
Complete authentication bypass possible if secrets are extracted from git history.

**Remediation Steps:**
- [ ] 1.1 Generate new production secrets
- [ ] 1.2 Update .env with new secrets
- [ ] 1.3 Add .env to .gitignore (verify existing)
- [ ] 1.4 Remove secrets from git history using BFG
- [ ] 1.5 Set up secrets manager (AWS Secrets Manager / HashiCorp Vault)
- [ ] 1.6 Create pre-commit hook to prevent future commits

**Verification:**
```bash
git log --all --full-history -- .env
# Should show no commits with real secrets
```

---

### ISSUE-002: Missing TOTP Encryption Key (CVSS 8.2)
**Severity:** HIGH
**Status:** OPEN
**Owner:** DevOps

**Description:**
`OTP_TOTP_ENCRYPTION_KEY` is not present in the `.env` file. The MFA feature will crash on enrollment without this key.

**Remediation Steps:**
- [ ] 2.1 Generate 32-byte hex key: `openssl rand -hex 32`
- [ ] 2.2 Add to production environment
- [ ] 2.3 Add to .env.example as template
- [ ] 2.4 Add startup validation for this key

**Verification:**
```bash
# Start service with OTP_TOTP_ENCRYPTION_KEY set
# Attempt MFA setup - should not crash
```

---

### ISSUE-003: IP Allowlist Not Configured (CVSS 7.5)
**Severity:** HIGH
**Status:** OPEN
**Owner:** Infrastructure

**Description:**
`ALLOWED_INTERNAL_IPS` is not set, making internal service endpoint access control ineffective.

**Remediation Steps:**
- [ ] 3.1 Identify internal service IP ranges
- [ ] 3.2 Configure `ALLOWED_INTERNAL_IPS` environment variable
- [ ] 3.3 Add startup validation warning when not set
- [ ] 3.4 Document IP ranges in infrastructure docs

**Verification:**
```bash
# Test internal endpoint from external IP - should return 403
curl -H "x-internal-token: xxx" http://service/internal/endpoint
```

---

### ISSUE-004: 7-Day Refresh Token TTL Too Long (CVSS 5.0)
**Severity:** MEDIUM
**Status:** OPEN
**Owner:** Backend Team

**Description:**
Refresh tokens expire after 7 days, creating an extended attack window if stolen.

**Remediation Steps:**
- [ ] 4.1 Reduce TTL from 7 days to 24 hours
- [ ] 4.2 Update documentation
- [ ] 4.3 Add environment variable for configurability
- [ ] 4.4 Consider implementing refresh token reuse detection

**Verification:**
```typescript
// Verify tokenService.ts line 85 shows 24h not 7d
const newRefreshToken = jwt.sign(..., { expiresIn: '24h' });
```

---

### ISSUE-005: Guest Token Predictability (CVSS 5.3)
**Severity:** MEDIUM
**Status:** OPEN
**Owner:** Backend Team

**Description:**
Guest IDs include timestamp, making them partially predictable within a time window.

**Remediation Steps:**
- [ ] 5.1 Remove Date.now() from guestId generation
- [ ] 5.2 Use only crypto.randomUUID() or crypto.randomBytes(16)
- [ ] 5.3 Update tests if any depend on format

**Verification:**
```typescript
// authRoutes.ts line 725 should be:
// const guestId = `guest_${crypto.randomUUID()}`;
```

---

### ISSUE-006: Admin Login Without MFA (CVSS 5.9)
**Severity:** MEDIUM
**Status:** OPEN
**Owner:** Backend Team

**Description:**
Admin login (`adminLoginHandler`) does not enforce MFA despite infrastructure being implemented (XSC-07).

**Remediation Steps:**
- [ ] 6.1 Implement MFA check after password verification
- [ ] 6.2 Return `mfaRequired: true` with pending session token
- [ ] 6.3 Add MFA verification endpoint for admin flow
- [ ] 6.4 Add rate limiting for MFA attempts
- [ ] 6.5 Write tests for MFA bypass attempts

**Verification:**
```bash
# Login as admin - should return MFA challenge
curl -X POST /auth/admin/login -d '{"email":"admin@test.com","password":"xxx"}'
# Expected: {"success":true,"mfaRequired":true,...}
```

---

### ISSUE-007: OAuth Flow Security Improvements
**Severity:** MEDIUM
**Status:** OPEN
**Owner:** Backend Team

**Description:**
OAuth endpoints need additional security hardening:
- Redirect URI validation at startup
- Dedicated OAuth rate limiting
- Scope validation enhancement

**Remediation Steps:**
- [ ] 7.1 Add startup validation for redirect URIs (fail if localhost in production)
- [ ] 7.2 Add rate limiting middleware to OAuth routes
- [ ] 7.3 Add PKCE support for OAuth flows
- [ ] 7.4 Add OAuth flow security tests

---

## Implementation Timeline

### Day 1-2: Critical Fixes (48 hours)
| Time | Task | Owner |
|------|------|-------|
| Hour 1-4 | Generate new secrets, update .env | DevOps |
| Hour 4-8 | Run BFG to remove secrets from git history | DevOps |
| Hour 8-12 | Configure TOTP encryption key | DevOps |
| Hour 12-24 | Configure ALLOWED_INTERNAL_IPS | Infrastructure |
| Hour 24-48 | Test all fixes in staging | QA Team |

### Day 3-4: Code Fixes
| Time | Task | Owner |
|------|------|-------|
| Day 3 AM | Reduce refresh token TTL | Backend |
| Day 3 PM | Fix guest token predictability | Backend |
| Day 4 AM | Implement admin MFA | Backend |
| Day 4 PM | OAuth security improvements | Backend |

### Day 5-7: Testing & Validation
| Time | Task | Owner |
|------|------|-------|
| Day 5 | Test with rez-now | QA |
| Day 5 | Test with rez-app-consumer | QA |
| Day 6 | Test with rez-app-marchant | QA |
| Day 6 | Verify MongoDB data persistence | Backend |
| Day 6 | Verify Redis data persistence | Backend |
| Day 7 | Run security test suite | Security |
| Day 7 | Generate final audit report | Security |

---

## Testing Strategy

### Unit Tests
- [ ] Token rotation tests
- [ ] OTP verification tests
- [ ] Rate limiting tests
- [ ] MFA flow tests
- [ ] Admin MFA enforcement tests

### Integration Tests
- [ ] rez-now auth flow (OTP login, PIN login, token refresh)
- [ ] rez-app-consumer auth flow
- [ ] rez-app-marchant auth flow
- [ ] OAuth partner flow

### Data Persistence Tests
- [ ] Verify user creation in MongoDB
- [ ] Verify refresh token storage in MongoDB
- [ ] Verify OTP storage in Redis
- [ ] Verify blacklist storage in Redis
- [ ] Verify rate limit counters in Redis

### Security Tests
- [ ] Token blacklist verification
- [ ] Rate limiting enforcement
- [ ] Account lockout verification
- [ ] Enumeration prevention tests
- [ ] MFA bypass attempt tests

---

## Rollback Plan

If any fix causes issues in production:

1. **Secrets rotation:** Use backup secrets from secrets manager
2. **TTL changes:** Revert environment variable, deploy previous version
3. **MFA changes:** Disable MFA requirement via feature flag
4. **OAuth changes:** Revert to previous OAuth routes version

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Security Lead | | | |
| DevOps Lead | | | |
| Backend Lead | | | |
| QA Lead | | | |

---

**Document Version:** 1.0
**Last Updated:** 2026-04-30
