# HOJAI ContractOS

**Port:** 5285 | **MongoDB:** contracts | **Status:** ✅ PRODUCTION READY

---

## Overview

ContractOS provides complete contract lifecycle management with renewal tracking.

## Features

- Contract creation and storage
- Renewal tracking
- Status management
- Multi-type support (Service, NDA, Lease, etc.)
- Expiry alerts
- Vendor linking

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/contracts | Create contract |
| GET | /api/contracts | List contracts |
| GET | /api/contracts/:id | Get contract |
| PATCH | /api/contracts/:id | Update contract |
| GET | /api/contracts/expiring/soon | Expiring contracts |
| GET | /api/analytics | Contract stats |

## Quick Start

```bash
npm install && npm start
```

**Last Updated:** June 17, 2026