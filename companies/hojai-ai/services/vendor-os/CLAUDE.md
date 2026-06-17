# HOJAI VendorOS

**Port:** 5265 | **MongoDB:** vendor | **Status:** ✅ PRODUCTION READY

---

## Overview

VendorOS provides complete vendor management with trust scoring and risk assessment.

## Features

- Vendor profiles with complete info
- Trust score calculation (0-100)
- Risk score assessment
- GST/PAN verification
- Payment terms tracking
- Credit limit management
- Performance analytics

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/vendors | Create vendor |
| GET | /api/vendors | List vendors |
| GET | /api/vendors/:id | Get vendor |
| PATCH | /api/vendors/:id/score | Update scores |
| GET | /api/analytics | Vendor analytics |

## Quick Start

```bash
npm install && npm start
```

## Environment Variables

- `PORT` - HTTP port (default: 5265)
- `MONGO_URI` - MongoDB connection string

**Last Updated:** June 17, 2026