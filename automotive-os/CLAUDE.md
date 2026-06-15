# Automotive OS - Development Guide

**Port:** 5080  
**Type:** Industry OS (Automotive Service)

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
| PORT | Service port | No (default: 5080) |
| MONGODB_URI | MongoDB connection string | No (demo mode if not set) |
| CRM_HUB_URL | REZ CRM Hub URL | No (default: http://localhost:4056) |
| SERVICE_NAME | Service identifier for logs | No |

---

## Architecture

Automotive OS manages complete automotive service lifecycle from vehicle registration to service appointments and invoicing.

### Core Components

1. **Vehicle Management** - CRUD operations with VIN tracking, mileage, status
2. **Customer Management** - Customer profiles with contact info and address
3. **Service Management** - Service catalog with categories, duration, pricing
4. **Appointments** - Scheduling system with status tracking
5. **Invoicing** - Invoice generation with tax calculation

### Testing

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
```
