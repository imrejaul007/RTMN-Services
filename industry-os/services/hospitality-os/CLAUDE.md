# Hospitality OS - Development Guide

**Port:** 5050  
**Type:** Cross-Industry Hospitality Platform

## Architecture

Hospitality OS is a unified platform that manages multiple hospitality establishments (hotels, restaurants, spas, bars, venues) under one system.

### Supported Establishment Types

- hotel
- restaurant
- spa
- bar
- venue
- lounge
- club
- cafe

### Core Components

1. **Establishment Manager** - Multi-type hospitality business management
2. **Staff Roster** - Employee management across establishments
3. **Customer Hub** - Unified customer profiles
4. **Transaction Engine** - Cross-establishment transactions
5. **Event System** - Event creation and ticketing
6. **Loyalty Program** - Points and tier management

### Data Models

#### Establishment
```javascript
{
  id: string,
  name: string,
  type: string,
  address: string,
  amenities: string[],
  rating: number,
  status: 'active'|'inactive'
}
```

#### Staff
```javascript
{
  id: string,
  name: string,
  role: string,
  establishmentId: string,
  status: 'active'|'inactive'|'on_leave'
}
```

#### Transaction
```javascript
{
  id: string,
  customerId: string,
  establishmentId: string,
  type: 'sale'|'refund'|'deposit',
  amount: number,
  paymentMethod: string
}
```

### Digital Twins

| Twin | Purpose |
|

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
- **Industry Tagging** - Automatic industry classification

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Service port | No (default: service default) |
| MONGODB_URI | MongoDB connection string | No (demo mode if not set) |
| CRM_HUB_URL | REZ CRM Hub URL | No (default: http://localhost:4056) |
| SERVICE_NAME | Service identifier for logs | No |

### API Authentication Flow
```bash
# 1. Register a new business
curl -X POST http://localhost:5010/auth/register \
  -H "Content-Type: application/json" \
  -d '{"businessId":"biz_123","email":"owner@restaurant.com","password":"secret","businessName":"My Restaurant"}'

# 2. Login to get token
curl -X POST http://localhost:5010/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@restaurant.com","password":"secret"}'

# 3. Use token in requests
curl -H "Authorization: Bearer <token>" http://localhost:5010/api/menu
```
------|---------|
| establishment-twin | Business count |
| staff-twin | Active roster |
| customer-twin | Active customers |
| transaction-twin | Volume tracking |
| event-twin | Upcoming events |

### Integration Points

- **API Gateway** (port 3000) - Request routing
- **Restaurant OS** (port 5010) - Restaurant-specific features
- **Hotel OS** (port 5025) - Hotel-specific features
- **TwinOS Hub** - Central synchronization

### Testing

```bash
curl http://localhost:5050/health
curl http://localhost:5050/api/analytics
```
