# Legal OS

**Industry:** Legal  
**Port:** 5035  
**Status:** ✅ RUNNING  
**Digital Twins:** Client, Case, Lawyer, Document

## Overview

Legal OS is a comprehensive legal practice management system that handles:
- Client management
- Case management
- Document management
- Billing & invoicing
- Lawyer management

## Quick Start

```bash
cd legal-os
npm install
npm start
```

## API Endpoints

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Add client
- `GET /api/clients/:id` - Get client
- `PUT /api/clients/:id` - Update client

### Cases
- `GET /api/cases` - List cases
- `POST /api/cases` - Open case
- `GET /api/cases/:id` - Get case
- `PATCH /api/cases/:id/status` - Update status

### Lawyers
- `GET /api/lawyers` - List lawyers
- `POST /api/lawyers` - Add lawyer
- `GET /api/lawyers/:id` - Get lawyer

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document
- `PATCH /api/documents/:id` - Update document

### Appointments
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Schedule appointment

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice

### Analytics
- `GET /api/analytics` - Dashboard analytics

### Health
- `GET /health` - Health check

## Digital Twins

| Twin | Purpose |
|------|---------|
| Client Twin | Client profiles |
| Case Twin | Case management |
| Lawyer Twin | Lawyer profiles |
| Document Twin | Document management |