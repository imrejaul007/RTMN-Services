# RTMN Industry OS - Development Guide

**Version:** 1.0.0  
**Date:** June 16, 2026  
**Status:** ✅ 24 INDUSTRY OS SERVICES

---

## Overview

RTMN Industry OS provides 24 complete Industry Operating Systems, each offering:
- Industry-specific business operations
- MongoDB persistence
- Authentication & Authorization
- CRM integration (REZ CRM Hub)
- Multi-tenancy
- Digital Twins
- 15 layers of RTMN ecosystem integration

---

## Folder Structure

```
industry-os/
├── README.md                    # Overview and quick start
├── CLAUDE.md                   # This file
├── render.yaml                # Deployment blueprint
├── services/                  # All 24 Industry OS
│   ├── restaurant-os/
│   ├── hotel-os/
│   ├── healthcare-os/
│   └── ... (24 total)
└── shared/                    # Shared Digital Twins
    ├── agent-twin/
    ├── area-twin/
    ├── buyer-twin/
    ├── deal-twin/
    ├── property-twin/
    └── referral-twin/
```

---

## Each Industry OS Service

### Structure

```
{industry}-os/
├── CLAUDE.md                   # Service-specific guide
├── FEATURES.md                # Feature checklist
├── README.md                  # Quick start
├── package.json               # Dependencies
├── Dockerfile                 # Container
├── src/
│   └── index.js              # Main service (with 15 layers)
└── test/                     # Tests
```

### Common Features

Every Industry OS includes:

1. **Authentication**
   - `POST /auth/register` - Register business
   - `POST /auth/login` - Login
   - `GET /auth/verify` - Verify token
   - `requireAuth` middleware

2. **Database**
   - MongoDB via MONGODB_URI
   - In-memory fallback (demo mode)

3. **CRM Integration**
   - Sync to REZ CRM Hub
   - Industry tagging
   - Customer management

4. **Multi-tenancy**
   - tenantId isolation
   - Business-scoped data

5. **Digital Twins**
   - Industry-specific twins
   - Real-time state sync

6. **15 Layers**
   - All RTMN ecosystem access
   - Layer status endpoints

---

## Development

```bash
# Install dependencies
cd industry-os/services/{industry}-os
npm install

# Start in development
npm run dev

# Start in production
npm start

# Run tests
npm test

# Docker
docker build -t rtmn-{industry}-os .
docker run -p {port}:{port} rtmn-{industry}-os
```

---

## Adding a New Industry OS

1. Create service folder:
   ```bash
   mkdir services/new-industry-os
   ```

2. Create `package.json`:
   ```json
   {
     "name": "new-industry-os",
     "version": "1.0.0",
     "main": "src/index.js",
     "scripts": {
       "start": "node src/index.js",
       "dev": "node --watch src/index.js"
     },
     "dependencies": {
       "express": "^4.18.2",
       "cors": "^2.8.5",
       "helmet": "^7.1.0"
     }
   }
   ```

3. Create `src/index.js` with:
   - Industry data stores
   - CRUD endpoints
   - Layer integrations

4. Add to render.yaml

---

## Layer Integration

Each Industry OS connects to RTMN ecosystem via layers:

```javascript
// Layer 1: Intelligence (HOJAI)
GET /api/layer/intelligence

// Layer 2: Customer Growth
GET /api/layer/customer-growth

// Layer 3: Commerce (Nexha)
GET /api/layer/commerce

// Layer 4: Financial
GET /api/layer/finance

// ... all 15 layers

// All layers status
GET /api/layers
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Service port | No |
| MONGODB_URI | MongoDB connection | No (demo mode) |
| CRM_HUB_URL | REZ CRM Hub URL | No |
| SERVICE_NAME | Service name | No |
| LAYERS | Enabled layers (comma-separated) | No |

---

## Port Assignment

Ports 5010-5240 are reserved for Industry OS.

Format: `{base_port}` where base_port varies by industry.

---

## Testing

```bash
# Health check
curl http://localhost:5010/health

# Register
curl -X POST http://localhost:5010/auth/register \
  -H "Content-Type: application/json" \
  -d '{"businessId":"test","email":"test@test.com","password":"test"}'

# Login
curl -X POST http://localhost:5010/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Check layers
curl -H "Authorization: Bearer <token>" http://localhost:5010/api/layers
```

---

## Common Issues

1. **MongoDB not connecting**: Check MONGODB_URI format
2. **Auth not working**: Verify token in Authorization header
3. **Layers offline**: Check RTMN service URLs

---

*Last Updated: June 16, 2026*
