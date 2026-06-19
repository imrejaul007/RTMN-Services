# Secrets Manager

**Version:** 1.0.0
**Port:** 4744
**Status:** ✅ RUNNING
**Layer:** HOJAI AI - Foundation Division (Division 1)

---

## Overview

Secrets Manager is the **centralized secret storage** for the RTMN ecosystem. It replaces the
loose practice of storing credentials in `.env` files scattered across services with a single,
auditable, versioned secret store — modeled after HashiCorp Vault and AWS Secrets Manager.

Most RTMN services today read secrets from `.env` files committed (or partially committed) to
the repo. This is a security risk. Secrets Manager gives every service a single HTTP endpoint
to fetch, rotate, and audit credentials at runtime.

---

## Architecture

```
services/secrets-manager/
├── src/
│   └── index.js            # Express service (in-memory Map, see TODOs)
├── package.json
└── CLAUDE.md
```

Storage is an in-memory `Map` to match the rest of the foundation services. See the TODOs in
`src/index.js` for the production hardening roadmap (encryption at rest, Vault/AWS integration,
RBAC via CorpID, tenant scoping).

---

## Features

| Feature              | Description |
|----------------------|-------------|
| Secret CRUD          | Create, read, update, delete named secrets |
| Versioning           | Every update/rotate creates a new immutable version |
| Auto-rotation flag   | `rotationDays` interval; secrets past due are flagged in the list API |
| Manual rotation      | `POST /api/secrets/:name/rotate` with optional new value |
| Audit log            | Every create / read-value / update / delete / rotate is logged with principal, IP, success |
| Bulk fetch           | One call to hydrate a service at startup with N secrets |
| Metadata + tags      | Free-form metadata and key/value tags per secret |
| Security headers     | `helmet`, CORS, JSON body limit |
| Per-secret principal | Read from `X-Actor` / `X-Principal` / `Authorization` headers |

---

## API Endpoints

```
POST   /api/secrets                       # Create a new secret
GET    /api/secrets                       # List all secrets (metadata only)
GET    /api/secrets/:name                 # Get metadata for one secret
GET    /api/secrets/:name/value           # Get current value (audit-logged)
PUT    /api/secrets/:name                 # Update secret (creates new version)
DELETE /api/secrets/:name                 # Delete secret and all versions
GET    /api/secrets/:name/versions        # List all versions
POST   /api/secrets/:name/rotate          # Manually rotate (auto-generates if no value)
GET    /api/secrets/:name/audit           # Audit log scoped to one secret
POST   /api/secrets/bulk                  # Bulk fetch (body: { names: [...] })
GET    /api/audit                         # Full audit log (filter: ?secret, ?op, ?limit)
GET    /api/health                        # Health + stats
```

---

## Example

```bash
# Create
curl -X POST http://localhost:4744/api/secrets \
  -H "Content-Type: application/json" \
  -H "X-Actor: alice@rtmn.com" \
  -d '{"name":"db-password","value":"s3cr3t","rotationDays":30,"tags":{"env":"prod"}}'

# List
curl http://localhost:4744/api/secrets

# Read value (audit-logged)
curl http://localhost:4744/api/secrets/db-password/value -H "X-Actor: service:sales-os"

# Rotate
curl -X POST http://localhost:4744/api/secrets/db-password/rotate -H "X-Actor: alice@rtmn.com"

# Bulk (service startup)
curl -X POST http://localhost:4744/api/secrets/bulk \
  -H "Content-Type: application/json" \
  -d '{"names":["db-password","jwt-signing-key","stripe-secret"]}'

# Audit
curl http://localhost:4744/api/audit
```

---

## Quick Start

```bash
cd services/secrets-manager
npm install
npm start

curl http://localhost:4744/api/health
```

---

## Production Roadmap (TODOs in code)

- **Encrypt at rest** using AES-256-GCM with a KMS-managed master key
- **Integrate with Vault / AWS Secrets Manager** for HA, replication, and HSM-backed keys
- **RBAC** — verify caller identity and permissions via CorpID JWT before every operation
- **Per-tenant scoping** — bind secrets to a `businessId` / `tenantId`
- **Persistent storage** — replace the in-memory `Map` with PostgreSQL or DynamoDB

---

*Last Updated: June 19, 2026*
*HOJAI AI - Foundation Division*
