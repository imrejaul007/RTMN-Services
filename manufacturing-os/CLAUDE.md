# Manufacturing OS - Development Guide

**Port:** 5150  
**Type:** Industry OS (Manufacturing)

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
| PORT | Service port | No (default: 5150) |
| MONGODB_URI | MongoDB connection string | No (demo mode if not set) |
| CRM_HUB_URL | REZ CRM Hub URL | No (default: http://localhost:4056) |
| SERVICE_NAME | Service identifier for logs | No |

---

## Architecture

Manufacturing OS manages complete manufacturing operations from product management to production orders, machine maintenance, and quality control.

### Core Components

1. **Product Management** - Product catalog with SKU, status tracking
2. **Production Orders** - Order management with status, priority, deadline
3. **Machine Management** - Machine inventory with status and location
4. **Material Management** - Material tracking with low stock alerts
5. **Worker Management** - Worker profiles with roles, skills, availability
6. **Quality Control** - Quality checks with defect tracking

### Testing

```bash
# Health check
curl http://localhost:5150/health

# Register
curl -X POST http://localhost:5150/auth/register \
  -H "Content-Type: application/json" \
  -d '{"businessId":"biz_123","email":"owner@factory.com","password":"secret"}'

# Login
curl -X POST http://localhost:5150/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@factory.com","password":"secret"}'
```
