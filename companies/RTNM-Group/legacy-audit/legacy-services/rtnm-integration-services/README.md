# RTMN Integration Services
## Complete Platform for Enterprise Sales

**Version:** 3.0.0 | **Date:** June 8, 2026 | **Status:** ✅ PRODUCTION READY

---

## 🚀 What's Built

RTMN Integration Services connect the entire RTNM ecosystem through a unified platform:

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| **API Gateway** | 3000 | Single entry point | ✅ |
| **SSO Service** | 3015 | Enterprise auth | ✅ |
| **Billing Service** | 3016 | Multi-product billing | ✅ |
| **Help Center** | 3001 | Support portal | ✅ |
| **API Docs** | 3017 | Developer portal | ✅ |
| **Integration Hub** | 3010 | Auto-provisioning | ✅ |
| **Connect Service** | 3018 | Service registry | ✅ |
| **Dashboard** | 3012 | Monitoring | ✅ |

---

## 📦 SDKs

| Language | Package | Status |
|----------|---------|--------|
| **Node.js** | `@rtmn/sdk` | ✅ Ready |
| **Python** | `rtmn-sdk` | ✅ Ready |

---

## 🎯 Quick Start

### Option 1: Development (Node.js)

```bash
cd RTMN
chmod +x start-production.sh
./start-production.sh development
```

### Option 2: Docker (Production)

```bash
cd RTMN
docker-compose up -d
```

### Option 3: Start Individual Services

```bash
cd RTMN

# API Gateway
cd unified-api-gateway && npm install && npm start &

# SSO Service
cd ../sso-service && npm install && npm start &

# Billing
cd ../billing-service && npm install && npm start &

# Docs
cd ../api-docs && npm install && npm start &
```

---

## 🌐 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **API Gateway** | http://localhost:3000 | Unified API |
| **SSO** | http://localhost:3015 | Authentication |
| **Billing** | http://localhost:3016 | Invoicing |
| **Help Center** | http://localhost:3001 | Support |
| **API Docs** | http://localhost:3017 | Documentation |
| **Dashboard** | http://localhost:3012 | Monitoring |
| **Integration** | http://localhost:3010 | Auto-provision |
| **Connect** | http://localhost:3018 | Service registry |

---

## 💡 Quick Examples

### 1. Create Employee with Auto-Integrations

```bash
curl -X POST http://localhost:3010/api/integrate/employee \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Sharma",
    "email": "priya@acme.com",
    "department": "Engineering",
    "tenantId": "acme"
  }'
```

**Result:** Employee + Wallet + SafeQR Badge + Nexha Identity - all created automatically!

### 2. SSO Login

```bash
curl -X POST http://localhost:3015/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@rtmn.com","password":"demo123"}'
```

### 3. Create Subscription & Invoice

```bash
# Create customer
curl -X POST http://localhost:3016/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp","email":"billing@acme.com","gstin":"27AAACM1234C1ZB"}'

# Create subscription
curl -X POST http://localhost:3016/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{"customerId":"xxx","planId":"enterprise"}'

# Generate invoice
curl -X POST http://localhost:3016/api/invoices \
  -H "Content-Type: application/json" \
  -d '{"subscriptionId":"xxx"}'
```

### 4. Use SDK

```javascript
const RTMN = require('@rtmn/sdk');
const client = new RTMN({ apiKey: 'YOUR_API_KEY' });

// Create employee - wallet, SafeQR, Nexha auto-created!
const employee = await client.corpperks.createEmployee({
    name: 'Priya Sharma',
    email: 'priya@acme.com',
    department: 'Engineering'
});
console.log(employee.data.integrations);
```

---

## 🔗 Connected Services

### RTNM Ecosystem (via RTMN Gateway)

| Product | Route | Description |
|---------|-------|-------------|
| **HOJAI AI** | `/api/v1/hojai/*` | 600+ AI agents |
| **RABTUL** | `/api/v1/rabtul/*` | Payments, Wallet, BNPL |
| **CorpPerks** | `/api/v1/corpperks/*` | HRMS, Payroll |
| **AdBazaar** | `/api/v1/adbazaar/*` | Marketing, Campaigns |
| **SafeQR** | `/api/v1/safeqr/*` | Safety, Verification |
| **Nexha** | `/api/v1/nexha/*` | Identity, Trust |
| **RisaCare** | `/api/v1/risacare/*` | Healthcare |
| **RisnaEstate** | `/api/v1/risnaestate/*` | Real Estate |

---

## 🏢 Enterprise Features

### SSO Providers

| Provider | Status |
|----------|--------|
| Email/Password | ✅ |
| Magic Links | ✅ |
| SAML 2.0 | ✅ |
| OIDC (Azure AD) | ✅ |
| OIDC (Okta) | ✅ |
| OIDC (Google) | ✅ |

### Billing Features

| Feature | Status |
|---------|--------|
| Multi-product subscription | ✅ |
| GST Invoicing | ✅ |
| Usage tracking | ✅ |
| Payment collection | ✅ |
| Dashboard | ✅ |

---

## 📁 File Structure

```
RTMN/
├── README.md                     # This file
├── docker-compose.yml            # Docker orchestration
├── start-production.sh          # Start script
│
├── unified-api-gateway/        # API Gateway (3000)
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/             # All product routes
│   │   ├── middleware/        # Auth, logging
│   │   └── services/           # Event bus, registry
│   └── Dockerfile
│
├── sso-service/                 # SSO (3015)
│   └── src/index.js            # SAML, OIDC, Magic links
│
├── billing-service/             # Billing (3016)
│   └── src/index.js            # Subscriptions, invoices, GST
│
├── api-docs/                    # API Docs (3017)
│   └── src/index.js            # Swagger, guides, SDKs
│
├── help-center/                 # Help Center (3001)
│   └── src/index.js            # Knowledge base, tickets
│
├── integrations/
│   ├── corpperks-rabtul/      # Auto-provisioning (3010)
│   └── connect-all/            # Service registry (3018)
│
├── unified-dashboard/          # Dashboard (3012)
│   └── src/index.js            # Service monitoring
│
├── sdks/                       # SDKs
│   ├── node-sdk/               # @rtmn/sdk (npm)
│   ├── python-sdk/             # rtmn-sdk (pip)
│   └── README.md
│
└── nginx/                      # Production proxy
    └── nginx.conf
```

---

## 🚀 Production Deployment

### 1. Configure Environment

```bash
# Copy and edit .env
cp .env.example .env

# Edit with your values
nano .env
```

### 2. Set Up SSL

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Add your certificates
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
```

### 3. Deploy

```bash
# Development
./start-production.sh development

# Production with Docker
./start-production.sh docker
```

### 4. Verify

```bash
# Check health
curl http://localhost:3000/health

# View dashboard
open http://localhost:3012

# View API docs
open http://localhost:3017
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Core
PORT=3000
NODE_ENV=production
JWT_SECRET=your-secret-key

# RTNM Service URLs
HOJAi_URL=https://hojai.rtnm.com
RABTUL_URL=https://rabtul.rtnm.com
CORPPERKS_URL=https://corpperks.rtnm.com
ADBAZAAR_URL=https://adbazaar.rtnm.com
SAFEQR_URL=https://safeqr.rtnm.com
NEXHA_URL=https://nexha.rtnm.com

# SSO
SSO_URL=https://auth.rtmn.com

# Billing
DB_HOST=postgres
DB_PASSWORD=your-password
```

---

## 📊 Monitoring

### Health Checks

```bash
# API Gateway
curl http://localhost:3000/health

# All services
curl http://localhost:3012/api/dashboard
```

### Logs

```bash
# View all logs
./start-production.sh logs

# View specific service
./start-production.sh logs api-gateway
```

---

## 🧪 Testing

```bash
# Test SSO
curl -X POST http://localhost:3015/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@rtmn.com","password":"demo123"}'

# Test Billing
curl http://localhost:3016/api/plans

# Test Integration
curl -X POST http://localhost:3010/api/integrate/employee \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","tenantId":"test"}'
```

---

## 📚 Documentation

| Document | Location |
|----------|----------|
| API Reference | http://localhost:3017 |
| SDK Docs | `sdks/README.md` |
| Docker Setup | `docker-compose.yml` |
| Service Routes | `unified-api-gateway/src/routes/` |

---

## 🆘 Support

- **Help Center:** http://localhost:3001
- **API Docs:** http://localhost:3017
- **Dashboard:** http://localhost:3012
- **Email:** support@rtmn.com

---

## 📄 License

MIT

---

**Status:** Production Ready  
**Version:** 2.0.0  
**Date:** June 8, 2026