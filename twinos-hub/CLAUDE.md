# TwinOS Hub - Development Guide

**Port:** 4705  
**Type:** Digital Twin Hub

## Architecture

TwinOS Hub is the central coordination point for all digital twins in RTMN. It provides:
- Twin registry management
- State synchronization
- Relationship mapping
- Health monitoring
- Category-based organization

### Twin Types

| Type | Description |
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
------|-------------|
| catalog | Product/item catalogs |
| order | Order management |
| queue | Queue/worker systems |
| resource | Resource tracking |
| customer | Customer profiles |
| identity | Identity management |
| storage | Data storage |
| policy | Policy/rules engine |
| agent | AI agent state |
| metric | Metrics/telemetry |

### Twin Categories

1. **foundation** - Core platform services (CorpID, MemoryOS, GoalOS)
2. **business** - Business operations (Marketing, Finance, Commerce)
3. **restaurant** - Restaurant industry twins
4. **hotel** - Hotel industry twins
5. **hospitality** - Cross-industry hospitality twins
6. **intelligence** - AI and analytics twins

### Twin Relationships

Standard relationships:
- `order` twins relate to `catalog` and `customer` twins
- `booking` twins relate to `resource` and `customer` twins
- `transaction` twins relate to `customer` twins

### Data Models

#### Twin Registry Entry
```javascript
{
  id: string,           // e.g., 'restaurant-os.menu'
  name: string,         // Display name
  service: string,      // Source service name
  type: string,         // Twin type
  category: string,     // Category
  port: number,         // Service port
  status: string,       // 'active'|'syncing'|'inactive'
  health: string,       // 'healthy'|'degraded'|'unknown'
  lastSync: timestamp,
  lastUpdate: timestamp,
  version: number,
  syncCount: number
}
```

#### Twin State
```javascript
{
  data: any,            // Twin data
  timestamp: timestamp,
  version: number
}
```

### Integration Points

All Industry OS services should register their twins with TwinOS Hub on startup for centralized monitoring and synchronization.

### Testing

```bash
# Health check
curl http://localhost:4705/health

# List all twins
curl http://localhost:4705/api/twins

# Get statistics
curl http://localhost:4705/api/stats

# Health check all
curl http://localhost:4705/api/health/all

# Export state
curl http://localhost:4705/api/export
```
