# HOJAI Cloud

> **Port:** 4380
> **Version:** 1.2.0
> **Status:** ✅ Built + Enhanced (2026-06-25)

HOJAI Cloud receives `npx hojai deploy` calls from any HOJAI Foundry project, provisions a per-tenant runtime, and returns the public URL.

---

## v1.2 New Features (2026-06-25)

| Feature | Description |
|---------|-------------|
| **Auto-respawn** | On boot, automatically restarts all previously deployed backends |
| **SSL Certificates** | Infrastructure for Let's Encrypt certificate provisioning |
| **Custom Domains** | Allow users to bind their own domains |
| **Preview Environments** | PR-based preview deployments |
| **Rollbacks** | One-click revert to previous version |

---

## Quick Start

```bash
cd products/hojai-cloud
npm install
npm start        # Port 4380
npm test         # Run tests
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOJAI_CLOUD_PORT` | 4380 | Service port |
| `HOJAI_PUBLIC_HOST` | hojai.app | Public hostname |
| `HOJAI_PUBLIC_SCHEME` | https | URL scheme |
| `HOJAI_CLOUD_STORAGE` | .storage | Project file storage |
| `HOJAI_CLOUD_PORT_RANGE_START` | 8800 | First per-tenant port |
| `HOJAI_CLOUD_PORT_RANGE_END` | 8899 | Last per-tenant port |
| `HOJAI_API_KEY` | dev-key | Bearer token |
| `HOJAI_CLOUD_REQUIRE_AUTH` | true | Require auth |
| `HOJAI_CLOUD_AUTO_RESPAWN` | true | Auto-restart on boot |
| `HOJAI_CLOUD_MAX_SNAPSHOTS` | 10 | Max rollback snapshots |
| `HOJAI_CLOUD_PREVIEW_EXPIRY_DAYS` | 7 | Preview expiry |

---

## API Endpoints

### Deployments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/deploy` | Bearer | Push a project |
| `GET` | `/api/v1/deployments` | Bearer | List all deployments |
| `GET` | `/api/v1/deployments/:id` | Bearer | Get one deployment |
| `DELETE` | `/api/v1/deployments/:id` | Bearer | Delete deployment |
| `POST` | `/api/v1/deployments/:id/rollback` | Bearer | Rollback to previous |

### Previews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/previews` | Bearer | List previews |
| `POST` | `/api/v1/previews` | Bearer | Create preview |
| `DELETE` | `/api/v1/previews/:id` | Bearer | Delete preview |

### Custom Domains

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/domains` | Bearer | List domains |
| `POST` | `/api/v1/domains` | Bearer | Add domain |
| `POST` | `/api/v1/domains/:domain/verify` | Bearer | Verify DNS |
| `POST` | `/api/v1/domains/:domain/activate` | Bearer | Activate domain |
| `DELETE` | `/api/v1/domains/:domain` | Bearer | Remove domain |

### SSL Certificates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/certificates` | Bearer | List certificates |
| `POST` | `/api/v1/certificates` | Bearer | Provision cert |
| `DELETE` | `/api/v1/certificates/:domain` | Bearer | Revoke cert |

### Snapshots

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/snapshots/:projectId` | Bearer | List snapshots |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/health` | None | Service health |
| `GET` | `/api/v1/ready` | None | Readiness |

---

## Usage Example

```bash
# Deploy a project
curl -X POST http://localhost:4380/api/v1/deploy \
  -H 'Authorization: Bearer dev-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "maya-collective",
    "type": "marketplace",
    "manifest": { "name": "maya-collective" },
    "files": { "apps/backend/src/index.js": "..." }
  }'

# Create preview for PR
curl -X POST http://localhost:4380/api/v1/previews \
  -H 'Authorization: Bearer dev-key' \
  -d '{ "name": "feature-new-ui", "branch": "feature/new-ui", "prNumber": 42, "projectId": "..." }'

# Rollback
curl -X POST http://localhost:4380/api/v1/deployments/:id/rollback \
  -H 'Authorization: Bearer dev-key'
```

---

## Files

```
hojai-cloud/
├── src/
│   ├── index.js              # Main service (v1.2)
│   ├── respawn.js           # Auto-respawn on boot
│   ├── ssl-manager.js       # SSL certificate management
│   ├── domain-manager.js    # Custom domains
│   ├── preview-environments.js # Preview deployments
│   ├── rollback-manager.js  # Snapshots + rollback
│   └── __tests__/
│       └── hojai-cloud.test.js
├── CLAUDE.md
├── package.json
└── .storage/               # Per-project files (gitignored)
```

---

## Architecture

```
npx hojai deploy --mode=remote
        │
        │  POST /api/v1/deploy
        │  { name, manifest, files }
        ↓
hojai-cloud (:4380)
        │
        ├── 1. validate
        ├── 2. snapshot (for rollback)
        ├── 3. allocate port 8800-8899
        ├── 4. persist files to .storage/
        ├── 5. spawn backend (detached)
        ├── 6. wait for health
        └── 7. return URL
                │
                ↓
       https://<name>.hojai.app
```

---

## Related Services

- **AI Studio UI** (:3000) — Web UI
- **AI Architect** (:4390) — Company blueprint generator
- **Blueprint Compiler** (:4391) — Project generator
