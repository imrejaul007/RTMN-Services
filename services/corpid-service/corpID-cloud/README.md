# CorpID Cloud v4.0

Enterprise Identity Platform for the RTMN Ecosystem

---

## Quick Start

```bash
# Install
npm install

# Start
npm start

# Default admin credentials
# Email: admin@rtmn.com
# Password: TempPass123!
```

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](../CLAUDE.md) | Project overview |
| [API Reference](../docs/API_REFERENCE.md) | Complete API documentation |
| [Architecture](../docs/ARCHITECTURE.md) | System architecture |
| [Deployment](../docs/DEPLOYMENT.md) | Production deployment guide |
| [Roadmap](../docs/CORPID_ROADMAP.md) | 3-year strategic plan |

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
