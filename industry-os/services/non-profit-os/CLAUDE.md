# NonProfit OS - Development Guide

**Port:** 5160  
**Type:** Industry OS (non_profit)  
**Industry:** Non Profit

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
| PORT | Service port | No (default: 5160) |
| MONGODB_URI | MongoDB connection string | No (demo mode if not set) |
| CRM_HUB_URL | REZ CRM Hub URL | No (default: http://localhost:4056) |
| SERVICE_NAME | Service identifier for logs | No |

---

## Architecture

NonProfit OS manages complete non profit operations.

### Core Components

1. **cont Management** - CRUD operations for conts
1. **cont Management** - CRUD operations for conts
1. **cont Management** - CRUD operations for conts
1. **cont Management** - CRUD operations for conts

### Digital Twins

- **const Twin** - Real-time const state
- **const Twin** - Real-time const state
- **const Twin** - Real-time const state

### Testing

```bash
# Health check
curl http://localhost:5160/health

# Register
curl -X POST http://localhost:5160/auth/register \
  -H "Content-Type: application/json" \
  -d '{"businessId":"biz_123","email":"owner@non_profit.com","password":"secret"}'

# Login
curl -X POST http://localhost:5160/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@non_profit.com","password":"secret"}'
```
