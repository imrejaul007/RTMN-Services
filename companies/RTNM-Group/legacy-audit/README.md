# RTNM-Group

**Parent Company** - Controls, Admin Panels & Finance

---

## Overview

RTNM-Group is the parent company controlling the entire REZ ecosystem through admin panels, identity services, and finance operations.

### Company Structure

```
RTNM-Group (Parent)
├── Admin Panels (8 services)
├── Identity & Security
├── Finance Services
├── Operations
└── Documentation
```

---

## Services

### RTNM Integration Services (NEW)

Unified integration layer connecting all REZ ecosystem products.

| Service | Purpose | Port |
|---------|---------|------|
| Unified API Gateway | Single entry point | 3000 |
| SSO Service | Enterprise auth | 3015 |
| Billing Service | Multi-product billing | 3016 |
| Help Center | Support portal | 3001 |
| API Docs | Developer portal | 3017 |
| Integration Hub | Auto-provisioning | 3010 |
| Dashboard | Monitoring | 3012 |

**Location:** `rtnm-integration-services/`

### Admin Panels (8)

| Service | Purpose | Port |
|---------|---------|------|
| REE-Admin | Control panel | 5000 |
| REE-Dashboard | Dashboard | 5001 |
| REE-Monitoring | System monitoring | 5002 |
| REZ-Admin-REE-Dashboard | Combined dashboard | 5003 |
| REZ-admin-dashboard | Admin UI | 5004 |
| rez-admin-service | Admin API | 5005 |
| rez-admin-training-panel | Training | 5006 |
| rez-loyalty-admin | Loyalty admin | 5007 |

### Identity & Security

| Service | Purpose |
|---------|---------|
| REZ-identity-service | Identity management |

### Finance Services

| Service | Purpose |
|---------|---------|
| REZ-capital-service | Capital financing |
| REZ-bnpl-service | Buy Now Pay Later |
| rez-payment-links-service | Payment links |

### Operations

| Service | Purpose |
|---------|---------|
| REZ-ops-dashboard | Operations monitoring |

### Documentation

| Service | Purpose |
|---------|---------|
| SOT | Source of Truth |
| shared-types | Shared TypeScript types |
| rez-api-docs | API documentation |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RTNM-Group (Parent)                        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Admin Panels │   │   Identity   │   │   Finance     │
│    5000+    │   │    5008     │   │    5009+     │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## Dependencies

| Service | Purpose |
|---------|---------|
| RABTUL-Technologies | Auth, Payment, Gateway |
| REZ-Intelligence | AI services |

---

## Tech Stack

- **Frontend:** Next.js, React
- **Backend:** Node.js, TypeScript
- **Database:** MongoDB
- **Cache:** Redis

---

## Quick Start

```bash
# Clone and setup
npm install

# Run admin panel
cd REZ-admin-dashboard && npm run dev

# Run admin service
cd rez-admin-service && npm run dev
```

---

## Deployment

| Service | Platform |
|---------|----------|
| Admin Services | Render |
| Admin Dashboards | Vercel |

---

## Related Documentation

- [RTNM-Digital](../RTNM-Digital/) - Digital integration hub
- [RABTUL-Technologies](../RABTUL-Technologies/) - Core services
- [REZ-Intelligence](../REZ-Intelligence/) - AI platform

---

## GitHub

https://github.com/imrejaul007/RTNM-Group

---

**Last Updated:** June 4, 2026
