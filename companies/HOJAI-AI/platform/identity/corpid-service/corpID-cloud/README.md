# CorpID Cloud v4.0

Enterprise Identity Platform for the RTMN Ecosystem

---

## Quick Start

```bash
# Install
npm install

# Set required env vars (see Deployment guide)
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
export SECRETS_PEPPER=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
export AUDIT_LOG_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
export INTERNAL_SERVICE_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Start
npm start
```

## First-time admin bootstrap

There is **no default admin user**. On first startup in a fresh
environment, the service refuses to start unless the env var
`BOOTSTRAP_ADMIN_EMAIL` is set. If set, the service generates a
single-use bootstrap token, prints it to stdout, and exits. Use that
token with `POST /api/auth/bootstrap-admin` to set the password and
complete the bootstrap.

This replaces the prior behavior of auto-seeding a hardcoded admin user with
a default password (removed for security — see the audit report). See the
Deployment guide for details.

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](../CLAUDE.md) | Project overview |
| [Audit Report](../docs/CORPID-AUDIT-REPORT-2026-06-21.md) | Security audit findings (June 2026) |
| [Phase 7 Low Fix Report](../docs/CORPID-PHASE-7-LOW-FIX-REPORT-2026-06-22.md) | L-1..L-15 remediation log |

> Note: The previous links to API_REFERENCE.md, ARCHITECTURE.md, DEPLOYMENT.md
> and CORPID_ROADMAP.md were broken (404). Those documents are still in
> planning. The audit report and the phase 7 fix log above are the current
> authoritative references for this codebase.

## Services (21 Total)

### Phase 1: Foundation
- **Core** - User authentication and sessions
- **Organization** - Multi-tenant org management
- **RBAC** - Role-based access control
- **API Identity** - API keys, OAuth, webhooks
- **Device** - Device registration and trust
- **Audit** - Immutable audit logs

### Phase 2: Enterprise
- **Consumer** - REZ, Genie user profiles
- **Merchant** - Store, KYC, settlements
- **AI Agent** - Agent identity and trust
- **Trust Engine** - Risk scoring, fraud detection
- **Employee** - HR integration

### Phase 3: Advanced
- **Identity Graph** - Relationship graph
- **Universal Profile** - Cross-platform profile
- **Identity Memory** - AI memory integration
- **Identity Timeline** - Activity history

### Phase 4: Compliance & Platform
- **KYC Platform** - Document verification
- **Consent** - GDPR/DPDP compliance
- **Federation** - SSO, SAML, OAuth, OIDC
- **Identity Twin** - Digital twin, simulations
- **Developer** - External developer platform
- **Verification** - Email, phone, domain, business

## Project Structure

```
corpID-cloud/
├── gateway.js              # Unified API Gateway
├── package.json            # Dependencies
├── README.md               # This file
│
├── shared/                 # Shared utilities
│   ├── utils/
│   │   ├── constants.js   # 100+ constants
│   │   ├── logger.js      # Winston + audit
│   │   └── security.js    # Crypto utilities
│   └── middleware/
│       ├── auth.js         # JWT authentication
│       ├── rate-limit.js   # Rate limiting
│       └── error-handler.js
│
├── core/                   # User model
├── organization/           # Phase 1
├── RBAC/                   # Phase 1
├── api-identity/           # Phase 1
├── device/                 # Phase 1
├── audit/                  # Phase 1
├── consumer/               # Phase 2
├── merchant/               # Phase 2
├── agent/                  # Phase 2
├── trust/                  # Phase 2
├── employee/               # Phase 2
├── graph/                  # Phase 3
├── universal/              # Phase 3
├── memory/                 # Phase 3
├── timeline/               # Phase 3
├── kyc/                    # Phase 4
├── consent/                # Phase 4
├── federation/             # Phase 4
├── twin/                   # Phase 4
├── developer/              # Phase 4
└── verification/           # Phase 4
```

## Environment Variables

```env
PORT=4702
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=*
LOG_LEVEL=info
```

## Scripts

```bash
npm start       # Start production server
npm run dev     # Start with auto-reload
```

## License

MIT
