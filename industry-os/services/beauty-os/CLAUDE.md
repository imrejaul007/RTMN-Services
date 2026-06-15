# Beauty OS - Development Guide

**Port:** 5090  
**Type:** Industry OS (Beauty/Salon Management)  
**Tagline:** "AI-powered beauty salon management"
**Status:** ✅ PRODUCTION READY

---

## Overview

Beauty OS is a comprehensive beauty salon management platform that handles client management, service cataloging, staff scheduling, appointment booking, and product inventory for beauty salons and spas.

---

## Core Features

### Client Management
- Client CRUD with contact information
- Preferences customization (JSON)
- Loyalty points system
- Appointment history
- CRM sync to REZ CRM Hub

### Service Management
- Service CRUD with categories
- Categories: haircut, coloring, treatment, skincare, makeup, nail, spa, massage
- Pricing and duration tracking
- Category-based filtering

### Staff Management
- Staff CRUD with role assignment
- Roles: stylist, colorist, aesthetician, nail_tech, massage_therapist, manager
- Specialties tracking
- Availability status

### Appointment Scheduling
- Appointment CRUD
- Client, service, and staff assignment
- Date/time scheduling
- Status tracking (scheduled, confirmed, in_progress, completed, cancelled)
- Conflict detection

### Product Management
- Product CRUD
- Categories: skincare, haircare, makeup, nail_products, spa_products
- Stock tracking
- Pricing

### Loyalty Program
- Points earning per service
- Points redemption
- Tier system (Bronze, Silver, Gold, Platinum)

### Analytics Dashboard
- Total counts (clients, services, staff, appointments, products)
- Appointment statistics
- Revenue tracking

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
- **REZ CRM Hub** - Client sync on registration
- **Contact Management** - Unified client records
- **Industry Tagging** - Automatic industry classification (beauty)

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Service port | No (default: 5090) |
| MONGODB_URI | MongoDB connection string | No (demo mode if not set) |
| CRM_HUB_URL | REZ CRM Hub URL | No (default: http://localhost:4056) |
| SERVICE_NAME | Service identifier for logs | No |

---

## API Endpoints

### Health
```
GET /health - Health check
```

### Clients
```
GET  /api/clients            - List clients
POST /api/clients            - Create client
GET  /api/clients/:id        - Get client
PUT  /api/clients/:id        - Update client
DELETE /api/clients/:id      - Delete client
POST /api/clients/:id/points - Add loyalty points
```

### Services
```
GET  /api/services           - List services (filter: category)
POST /api/services           - Create service
GET  /api/services/:id      - Get service
PUT  /api/services/:id      - Update service
DELETE /api/services/:id    - Delete service
```

### Staff
```
GET  /api/staff             - List staff
POST /api/staff              - Create staff
GET  /api/staff/:id          - Get staff
PUT  /api/staff/:id          - Update staff
DELETE /api/staff/:id        - Delete staff
```

### Appointments
```
GET  /api/appointments       - List appointments
POST /api/appointments       - Create appointment
GET  /api/appointments/:id   - Get appointment
PUT  /api/appointments/:id   - Update appointment
PATCH /api/appointments/:id/status - Update status
DELETE /api/appointments/:id - Delete appointment
```

### Products
```
GET  /api/products           - List products
POST /api/products           - Create product
GET  /api/products/:id       - Get product
PUT  /api/products/:id       - Update product
DELETE /api/products/:id     - Delete product
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
curl http://localhost:5090/health

# Register
curl -X POST http://localhost:5090/auth/register \
  -H "Content-Type: application/json" \
  -d '{"businessId":"biz_123","email":"owner@beautysalon.com","password":"secret"}'

# Login
curl -X POST http://localhost:5090/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@beautysalon.com","password":"secret"}'

# Create client
curl -X POST http://localhost:5090/api/clients \
  -H "Content-Type: application/json" \
  -d '{"Name":"Jane Smith","email":"jane@example.com","phone":"+1234567890"}'

# List clients
curl http://localhost:5090/api/clients

# Create service
curl -X POST http://localhost:5090/api/services \
  -H "Content-Type: application/json" \
  -d '{"Name":"Haircut","category":"haircut","price":35,"duration":45}'

# Create staff
curl -X POST http://localhost:5090/api/staff \
  -H "Content-Type: application/json" \
  -d '{"Name":"Maria","role":"stylist","specialties":["haircut","coloring"]}'

# Create appointment
curl -X POST http://localhost:5090/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"clientId":"client-uuid","serviceId":"service-uuid","staffId":"staff-uuid","date":"2026-06-20","time":"14:00"}'

# Get analytics
curl http://localhost:5090/api/analytics
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Beauty OS (Port 5090)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Clients   │  │   Services  │  │    Staff    │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                 │                 │                    │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐            │
│  │   Loyalty   │  │ Appointments │  │  Schedule   │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                 │                 │                    │
│         └────────────────┬┴────────────────┘                    │
│                          │                                      │
│                   ┌──────▼──────┐                              │
│                   │  Analytics  │                              │
│                   └──────┬──────┘                              │
│                          │                                      │
│  ┌─────────────┐  ┌─────▼──────┐  ┌─────────────┐            │
│  │  Products   │  │  Auth/DB   │  │   CRM Hub  │            │
│  └─────────────┘  └────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Digital Twins

Beauty OS supports Digital Twin architecture:
- **Client Twin** - Client preferences and history
- **Service Twin** - Service catalog state
- **Staff Twin** - Staff availability and skills
- **Appointment Twin** - Scheduling coordination
- **Product Twin** - Inventory state

---

## RTNM Ecosystem Integration

| Service | Port | Purpose |
|---------|------|---------|
| REZ CRM Hub | 4056 | Client sync |
| CorpID | 4702 | Business identity |
| GoalOS | 4242 | Revenue goals |
| MemoryOS | 4703 | Client history |

---

**Last Updated:** June 15, 2026
