# Automotive OS - Development Guide

**Port:** 5080  
**Type:** Industry OS (Automotive Service Management)  
**Tagline:** "Complete automotive service management"
**Status:** ✅ PRODUCTION READY

---

## Overview

Automotive OS is a comprehensive automotive service management platform that handles the complete lifecycle of vehicle service operations from customer management to appointment scheduling and invoicing.

---

## Core Features

### Vehicle Management
- Vehicle CRUD with VIN tracking
- Make/Model/Year identification
- License plate registration
- Mileage tracking
- Status management (active, in_service, sold, retired)
- Customer association
- Filtering by status and brand

### Customer Management
- Customer CRUD with contact information
- Address management
- Vehicle association
- CRM sync to REZ CRM Hub

### Service Catalog
- Service CRUD with categories
- Categories: oil_change, tire_service, brake_service, engine_repair, transmission, electrical, body_work, inspection, detailing
- Pricing and duration tracking
- Category-based filtering

### Appointment Scheduling
- Appointment CRUD
- Vehicle and service association
- Date/time scheduling
- Status tracking (scheduled, in_progress, completed, cancelled)
- Notes support

### Analytics Dashboard
- Total counts (vehicles, customers, services, appointments)
- Scheduled appointments count
- Real-time metrics

---

## Authentication & Database

### Authentication System
- **Register:** `POST /auth/register` - Create new business/account
- **Login:** `POST /auth/login` - Authenticate and get token
- **Verify:** `GET /auth/verify` - Validate JWT token
- **requireAuth middleware** - Protects API endpoints

### Database
- **MongoDB Support** - Full persistence via MONGODB_URI
- **Demo Mode** - Runs in-memory without MongoDB
- **Multi-tenancy** - All data isolated by tenantId/businessId

### CRM Integration
- **REZ CRM Hub** - Customer sync on registration
- **Contact Management** - Unified customer records
- **Industry Tagging** - Automatic industry classification (automotive)

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Service port | No (default: 5080) |
| MONGODB_URI | MongoDB connection string | No (demo mode if not set) |
| CRM_HUB_URL | REZ CRM Hub URL | No (default: http://localhost:4056) |
| SERVICE_NAME | Service identifier for logs | No |

---

## API Endpoints

### Health
```
GET /health - Health check
```

### Vehicles
```
GET  /api/vehicles          - List vehicles (filter: status, brand)
POST /api/vehicles          - Create vehicle
GET  /api/vehicles/:id      - Get vehicle
PUT  /api/vehicles/:id      - Update vehicle
DELETE /api/vehicles/:id    - Delete vehicle
```

### Customers
```
GET  /api/customers         - List customers
POST /api/customers         - Create customer
GET  /api/customers/:id     - Get customer
PUT  /api/customers/:id     - Update customer
DELETE /api/customers/:id   - Delete customer
```

### Services
```
GET  /api/services          - List services (filter: category)
POST /api/services          - Create service
GET  /api/services/:id      - Get service
PUT  /api/services/:id      - Update service
DELETE /api/services/:id    - Delete service
```

### Appointments
```
GET  /api/appointments      - List appointments
POST /api/appointments       - Create appointment
GET  /api/appointments/:id  - Get appointment
PUT  /api/appointments/:id   - Update appointment
PATCH /api/appointments/:id/status - Update status
DELETE /api/appointments/:id - Delete appointment
```

### Analytics
```
GET /api/analytics - Get analytics dashboard
```

### Authentication
```
POST /auth/register - Register business
POST /auth/login    - Login
GET  /auth/verify   - Verify token
```

---

## Testing

```bash
# Health check
curl http://localhost:5080/health

# Register
curl -X POST http://localhost:5080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"businessId":"biz_123","email":"owner@autoshop.com","password":"secret"}'

# Login
curl -X POST http://localhost:5080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@autoshop.com","password":"secret"}'

# Create vehicle
curl -X POST http://localhost:5080/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{"make":"Toyota","model":"Camry","year":2024,"vin":"1HGBH41JXMN109186","mileage":15000}'

# List vehicles
curl http://localhost:5080/api/vehicles

# Create customer
curl -X POST http://localhost:5080/api/customers \
  -H "Content-Type: application/json" \
  -d '{"Name":"John Doe","email":"john@example.com","phone":"+1234567890"}'

# Create service
curl -X POST http://localhost:5080/api/services \
  -H "Content-Type: application/json" \
  -d '{"Name":"Oil Change","category":"oil_change","price":49.99,"duration":30}'

# Create appointment
curl -X POST http://localhost:5080/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"vehicle-uuid","serviceId":"service-uuid","date":"2026-06-20","time":"10:00"}'

# Get analytics
curl http://localhost:5080/api/analytics
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Automotive OS (Port 5080)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Vehicles   │  │  Customers  │  │  Services   │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                 │                 │                    │
│         └────────────────┬┴────────────────┘                    │
│                          │                                      │
│                   ┌──────▼──────┐                              │
│                   │  Analytics  │                              │
│                   └──────┬──────┘                              │
│                          │                                      │
│  ┌─────────────┐  ┌─────▼──────┐  ┌─────────────┐            │
│  │ Appointments │  │  Auth/DB   │  │   CRM Hub  │            │
│  └─────────────┘  └────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Digital Twins

Automotive OS supports Digital Twin architecture:
- **Vehicle Twin** - Real-time vehicle state
- **Customer Twin** - Customer relationship mapping
- **Service Twin** - Service catalog state
- **Appointment Twin** - Scheduling coordination

---

## RTNM Ecosystem Integration

| Service | Port | Purpose |
|---------|------|---------|
| REZ CRM Hub | 4056 | Customer sync |
| CorpID | 4702 | Business identity |
| GoalOS | 4242 | Service goals |
| MemoryOS | 4703 | Service history |

---

**Last Updated:** June 15, 2026
