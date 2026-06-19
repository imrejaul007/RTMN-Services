# CorpID Cloud - Enterprise Identity Platform v4.0

**Version:** 4.0.0
**Port:** 4702
**Status:** ✅ ALL PHASES COMPLETE
**Last Updated:** June 18, 2026

---

## Overview

CorpID Cloud is a comprehensive enterprise identity platform providing Auth0/Okta/Clerk-grade identity services for the RTMN ecosystem. It supports **21 services across 4 phases** with **300+ API endpoints**.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CORPID CLOUD v4.0 - ALL SERVICES                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    UNIFIED GATEWAY (Port 4702)                           │   │
│  │                  Single Entry Point for All Services                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌──────────────────────────── PHASE 1: FOUNDATION ─────────────────────────┐   │
│  │  • Core         • Organization    • RBAC                                 │   │
│  │  • API Identity • Device          • Audit                                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌────────────────────────── PHASE 2: ENTERPRISE ────────────────────────────┐   │
│  │  • Consumer     • Merchant       • AI Agent                              │   │
│  │  • Trust Engine • Employee                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌────────────────────────── PHASE 3: ADVANCED ──────────────────────────────┐   │
│  │  • Identity Graph  • Universal Profile  • Memory  • Timeline           │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌───────────────────── PHASE 4: COMPLIANCE & PLATFORM ─────────────────────┐   │
│  │  • KYC Platform  • Consent  • Federation  • Identity Twin                │   │
│  │  • Developer     • Verification                                              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
cd companies/HOJAI-AI/services/corpid-service/corpID-cloud
npm install
npm start

# Health check
curl http://localhost:4702/health
```

**Default Admin Credentials:**
- Email: `admin@rtmn.com`
- Password: `TempPass123!`

---

## Service Directory

| # | Service | Prefix | Description |
|---|---------|--------|-------------|
| 1 | Core Auth | `/auth` | Register, login, JWT, sessions |
| 2 | Users | `/api/users` | User management |
| 3 | Organization | `/api/organizations` | Orgs, departments, teams |
| 4 | RBAC | `/api/roles`, `/api/permissions` | Roles, permissions, policies |
| 5 | API Identity | `/api/keys`, `/api/oauth`, `/api/webhooks` | API keys, OAuth, webhooks |
| 6 | Device | `/api/devices` | Device registration, trust |
| 7 | Audit | `/api/audit` | Immutable audit logs |
| 8 | Consumer | `/api/consumers` | REZ, Genie profiles |
| 9 | Merchant | `/api/merchants` | Stores, KYC, settlements |
| 10 | AI Agent | `/api/agents` | Agent identity, trust |
| 11 | Trust Engine | `/api/trust` | Risk scoring, fraud detection |
| 12 | Employee | `/api/employee` | HR integration |
| 13 | Identity Graph | `/api/graph` | Relationship graph |
| 14 | Universal Profile | `/api/universal` | Cross-platform profile |
| 15 | Identity Memory | `/api/memory` | AI memory integration |
| 16 | Identity Timeline | `/api/timeline` | Activity history |
| 17 | KYC Platform | `/api/kyc` | Document verification |
| 18 | Consent | `/api/consent` | GDPR/DPDP compliance |
| 19 | Federation | `/api/federation` | SSO, SAML, OAuth, OIDC |
| 20 | Identity Twin | `/api/twin` | Digital twin, simulations |
| 21 | Developer | `/api/developer` | External developer platform |
| 22 | Verification | `/api/verification` | Email, phone, domain, business |

---

## Project Structure

```
services/corpid-service/corpID-cloud/
├── gateway.js                      # Unified API Gateway
├── package.json                    # Dependencies
├── docs/                           # Documentation
│   ├── CORPID_ROADMAP.md          # 3-year strategic plan
│   ├── API_REFERENCE.md           # Complete API reference
│   ├── ARCHITECTURE.md            # System architecture
│   └── DEPLOYMENT.md              # Deployment guide
│
├── shared/                         # Shared utilities
│   ├── utils/
│   │   ├── constants.js           # 100+ constants
│   │   ├── logger.js              # Winston + audit logging
│   │   └── security.js            # Password, tokens, encryption
│   └── middleware/
│       ├── auth.js                # JWT authentication
│       ├── rate-limit.js          # Rate limiting
│       └── error-handler.js       # Error handling
│
├── core/                           # User model & auth
├── organization/                   # Phase 1
├── RBAC/                           # Phase 1
├── api-identity/                   # Phase 1
├── device/                         # Phase 1
├── audit/                          # Phase 1
├── consumer/                       # Phase 2
├── merchant/                       # Phase 2
├── agent/                          # Phase 2
├── trust/                          # Phase 2
├── employee/                       # Phase 2
├── graph/                          # Phase 3
├── universal/                      # Phase 3
├── memory/                         # Phase 3
├── timeline/                       # Phase 3
├── kyc/                            # Phase 4
├── consent/                        # Phase 4
├── federation/                     # Phase 4
├── twin/                           # Phase 4
├── developer/                      # Phase 4
└── verification/                   # Phase 4
```

---

## Environment Variables

```env
PORT=4702
JWT_SECRET=your-secure-secret-key-min-32-chars
JWT_EXPIRES_IN=1h
REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=https://app.example.com,https://admin.example.com
NODE_ENV=production
LOG_LEVEL=info
```

---

## Security Features

- ✅ JWT Authentication (Access + Refresh tokens)
- ✅ bcrypt password hashing (12 rounds)
- ✅ Password strength validation
- ✅ Rate limiting (5 auth/15min, 100 API/min)
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Input validation (express-validator)
- ✅ Prototype pollution prevention
- ✅ Audit logging with request IDs
- ✅ Session management with revocation
- ✅ Device trust scoring
- ✅ Risk-based access decisions

---

## Related Documentation

- [Complete API Reference](docs/API_REFERENCE.md) - All 300+ endpoints
- [Architecture](docs/ARCHITECTURE.md) - System design
- [3-Year Roadmap](docs/CORPID_ROADMAP.md) - Strategic plan
- [Deployment Guide](docs/DEPLOYMENT.md) - Production setup

---

*CorpID Cloud v4.0 - Enterprise Identity Platform*
