# Beauty OS - Development Guide

**Port:** 5090  
**Type:** Industry OS (Beauty/Salon)

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
| PORT | Service port | No (default: 5090) |
| MONGODB_URI | MongoDB connection string | No (demo mode if not set) |
| CRM_HUB_URL | REZ CRM Hub URL | No (default: http://localhost:4056) |
| SERVICE_NAME | Service identifier for logs | No |

---

## Architecture

Beauty OS manages complete salon/spa operations from client management to appointments, staff scheduling, and product inventory.

### Core Components

1. **Client Management** - Client profiles with preferences, contact info, loyalty points
2. **Service Management** - Service catalog with categories, duration, pricing
3. **Staff Management** - Staff profiles with roles, specialties, availability
4. **Appointments** - Scheduling with client/service/staff assignment
5. **Product Management** - Product inventory with stock tracking

### Testing

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
```
