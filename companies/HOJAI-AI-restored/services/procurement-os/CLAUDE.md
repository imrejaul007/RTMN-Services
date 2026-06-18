# HOJAI ProcurementOS

**Port:** 5275 | **MongoDB:** procurement | **Status:** ✅ PRODUCTION READY

---

## Overview

ProcurementOS handles purchase requests, vendor quotes, and purchase orders.

## Features

- Purchase request creation and approval
- Vendor quote comparison
- Purchase order management
- Budget tracking
- Delivery tracking
- Analytics and reporting

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/purchase-requests | Create PR |
| GET | /api/purchase-requests | List PRs |
| PATCH | /api/purchase-requests/:id/approve | Approve PR |
| POST | /api/quotes | Submit quote |
| GET | /api/quotes/pr/:prId | Compare quotes |
| POST | /api/purchase-orders | Create PO |
| GET | /api/purchase-orders | List POs |
| GET | /api/analytics | Procurement stats |

## Quick Start

```bash
npm install && npm start
```

**Last Updated:** June 17, 2026