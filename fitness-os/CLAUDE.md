# Fitness OS - Development Guide

**Port:** 5110  
**Type:** Industry OS (Fitness/Gym)

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
| PORT | Service port | No (default: 5110) |
| MONGODB_URI | MongoDB connection string | No (demo mode if not set) |
| CRM_HUB_URL | REZ CRM Hub URL | No (default: http://localhost:4056) |
| SERVICE_NAME | Service identifier for logs | No |

---

## Architecture

Fitness OS manages complete fitness club operations from member management to class scheduling, trainer assignments, and membership tracking.

### Core Components

1. **Member Management** - Member profiles with contact info, emergency contacts, membership type
2. **Trainer Management** - Trainer profiles with specialties, certifications, availability
3. **Class Management** - Class catalog with trainer assignment, schedule, capacity
4. **Membership Plans** - Membership types with pricing and duration
5. **Attendance Tracking** - Check-in/out system with class tracking

### Testing

```bash
# Health check
curl http://localhost:5110/health

# Register
curl -X POST http://localhost:5110/auth/register \
  -H "Content-Type: application/json" \
  -d '{"businessId":"biz_123","email":"owner@gym.com","password":"secret"}'

# Login
curl -X POST http://localhost:5110/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@gym.com","password":"secret"}'
```
