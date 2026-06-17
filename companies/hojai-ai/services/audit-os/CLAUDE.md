# HOJAI AuditOS

**Port:** 5305 | **MongoDB:** audit | **Status:** ✅ PRODUCTION READY

---

## Overview

AuditOS provides financial audits, compliance checks, and fraud detection.

## Features

- Audit scheduling
- Multi-type audits
- Findings tracking
- Severity classification
- Resolution tracking
- Analytics dashboard

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/audits | Create audit |
| GET | /api/audits | List audits |
| GET | /api/audits/:id | Get audit |
| PATCH | /api/audits/:id | Update audit |
| GET | /api/analytics | Audit stats |

## Quick Start

```bash
npm install && npm start
```

**Last Updated:** June 17, 2026