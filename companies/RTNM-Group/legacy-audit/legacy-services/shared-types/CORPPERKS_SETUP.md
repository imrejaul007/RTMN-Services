# CorpPerks Deployment Guide

## Architecture Overview

```
                    ┌─────────────────────────────────────────┐
                    │           Kong API Gateway                  │
                    │  (rez-api-gateway/kong/declarative/kong.yml)│
                    └───────────────┬───────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ Wallet Service│         │Finance Service│         │ Hotel OTA     │
│ rez-wallet   │         │ rez-finance  │         │ rez-hotel    │
│ :4004        │         │ :4006        │         │ :4011        │
└───────┬───────┘         └───────┬───────┘         └───────┬───────┘
        │                         │                           │
        ▼                         ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ CorpPerks    │         │ CorpGST      │         │ Makcorps     │
│ Routes       │         │ Service      │         │ API          │
│ /api/corp/* │         │ /api/gst/*  │         │ (External)   │
└───────────────┘         └───────────────┘         └───────────────┘
        │
        ▼
┌───────────────┐         ┌───────────────┐
│ Notif Service│         │ Karma Service│
│ rez-notif   │         │ rez-karma   │
│             │         │             │
└───────────────┘         └───────────────┘
```

## Services Required

### Core Services
1. **rez-wallet-service** (Port 4004) - CorpPerks benefits & employees
2. **rez-finance-service** (Port 4006) - GST calculations & invoices
3. **rez-auth-service** (Port 3001) - Authentication

### CorpPerks Specific Services
4. **rez-hotel-service** (Port 4011) - Hotel OTA proxy (new)
5. **rez-procurement-service** (Port 4012) - NextaBizz proxy (new)

### External Integrations
- **Makcorps API** - Hotel booking data
- **NextaBizz API** - Gift procurement
- **RTMN Finance API** - Wallet/BNPL (internal)
- **HRIS Providers** - GreytHR, Zoho, BambooHR

## Environment Variables

### rez-wallet-service
```env
# CorpPerks
CORPPERKS_ENABLED=true
```

### rez-finance-service
```env
# GST Service
GST_SERVICE_ENABLED=true
GST_API_KEY=your_gst_api_key
GST_EINVOICE_URL=https://einvoice.gst.gov.in
GST_EINVOICE_USER=your_username
GST_EINVOICE_PASSWORD=your_password
```

### rez-hotel-service (new service)
```env
PORT=4011
MAKCORPS_API_URL=https://api.makcorps.com
MAKCORPS_API_KEY=your_makcorps_key
MAKCORPS_CLIENT_ID=your_client_id
MAKCORPS_CLIENT_SECRET=your_client_secret
```

### rez-procurement-service (new service)
```env
PORT=4012
NEXTABIZZ_API_URL=https://api.nextabizz.com
NEXTABIZZ_API_KEY=your_api_key
NEXTABIZZ_CLIENT_ID=your_client_id
NEXTABIZZ_CLIENT_SECRET=your_client_secret
```

### Notification Service
```env
# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@company.com
SMTP_PASS=app_password

# SMS (MSG91)
SMS_API_KEY=your_msg91_key
SMS_SENDER_ID=REZPTS

# Firebase (Push)
FIREBASE_PROJECT_ID=your_project
FIREBASE_PRIVATE_KEY=your_key
FIREBASE_CLIENT_EMAIL=your_email
```

## Docker Compose Setup

```yaml
version: '3.8'

services:
  # Core Services
  rez-auth-service:
    image: rez/auth-service:latest
    ports:
      - "3001:3001"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/rez
      - REDIS_URL=redis://redis:6379

  rez-wallet-service:
    image: rez/wallet-service:latest
    ports:
      - "4004:4004"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/rez
      - REDIS_URL=redis://redis:6379
      - CORPPERKS_ENABLED=true
    depends_on:
      - rez-auth-service

  rez-finance-service:
    image: rez/finance-service:latest
    ports:
      - "4006:4006"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/rez
      - REDIS_URL=redis://redis:6379
      - GST_SERVICE_ENABLED=true
    depends_on:
      - rez-auth-service

  # CorpPerks Services
  rez-hotel-service:
    image: rez/hotel-service:latest
    ports:
      - "4011:4011"
    environment:
      - MAKCORPS_API_URL=https://api.makcorps.com
      - MAKCORPS_API_KEY=${MAKCORPS_API_KEY}
    depends_on:
      - rez-wallet-service

  rez-procurement-service:
    image: rez/procurement-service:latest
    ports:
      - "4012:4012"
    environment:
      - NEXTABIZZ_API_URL=https://api.nextabizz.com
      - NEXTABIZZ_API_KEY=${NEXTABIZZ_API_KEY}
    depends_on:
      - rez-wallet-service

  # Kong Gateway
  kong:
    image: kong:latest
    ports:
      - "8000:8000"
      - "8443:8443"
    environment:
      - KONG_DATABASE=postgres
      - KONG_PG_HOST=postgres
      - KONG_DECLARATIVE_CONFIG=/usr/local/kong/kong.yml
    volumes:
      - ./rez-api-gateway/kong/declarative:/usr/local/kong
    depends_on:
      - postgres
      - redis

  # Infrastructure
  mongo:
    image: mongo:6
    ports:
      - "27017:27017"

  postgres:
    image: postgres:15
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## API Endpoints Summary

### CorpPerks (Wallet Service)
```
GET    /api/corp/benefits           - List benefits
POST   /api/corp/benefits          - Create benefit
GET    /api/corp/benefits/:id      - Get benefit
PUT    /api/corp/benefits/:id      - Update benefit
DELETE /api/corp/benefits/:id      - Delete benefit

GET    /api/corp/employees         - List employees
POST   /api/corp/employees        - Enroll employee
GET    /api/corp/employees/:id    - Get employee
POST   /api/corp/employees/:id/benefits - Allocate benefit

GET    /api/corp/me                - My profile
GET    /api/corp/me/benefits       - My benefits
```

### GST (Finance Service)
```
POST   /api/gst/calculate          - Calculate GST
POST   /api/gst/itc-check         - Check ITC eligibility
POST   /api/gst/invoices          - Create invoice
GET    /api/gst/invoices          - List invoices
GET    /api/gst/invoices/:number - Get invoice
POST   /api/gst/reports/gstr1     - Generate GSTR-1
POST   /api/gst/einvoice/:number  - Submit e-invoice
```

### Hotels (Hotel Service)
```
GET    /api/hotels/search         - Search hotels
GET    /api/hotels/:id            - Get hotel
GET    /api/hotels/:id/availability - Room availability
POST   /api/hotels/bookings       - Create booking
GET    /api/hotels/bookings        - List bookings
GET    /api/hotels/bookings/:id    - Get booking
POST   /api/hotels/bookings/:id/cancel - Cancel booking
POST   /api/hotels/pricing/calculate - Calculate price
```

### Procurement (Procurement Service)
```
GET    /api/nextabizz/products     - Search products
GET    /api/nextabizz/products/:id  - Get product
GET    /api/nextabizz/products/recommended - Recommended products
POST   /api/nextabizz/orders       - Create order
GET    /api/nextabizz/orders       - List orders
GET    /api/nextabizz/orders/:id  - Get order
POST   /api/nextabizz/quotes       - Request quote
GET    /api/nextabizz/vendors      - List vendors
```

## Webhook Endpoints

```
POST   /api/integrations/makcorps/webhook    - Makcorps events
POST   /api/integrations/nextabizz/webhook   - NextaBizz events
POST   /api/integrations/hris/webhook       - HRIS events
POST   /api/integrations/finance/webhook    - Finance events
```

## OAuth Endpoints

```
GET    /api/integrations/:provider/connect  - Initiate OAuth
GET    /api/integrations/:provider/callback - OAuth callback
POST   /api/integrations/:provider/disconnect - Disconnect
GET    /api/integrations/:provider/status   - Connection status
```

## Health Check URLs

```
Wallet Service:   GET http://localhost:4004/health
Finance Service:  GET http://localhost:4006/health
Hotel Service:    GET http://localhost:4011/health
Procurement:     GET http://localhost:4012/health
```

## Database Collections

### MongoDB (Wallet Service)
- `corporateBenefits` - Benefit packages
- `corporateEmployees` - Employee enrollments
- `corporateBenefitTransactions` - Benefit usage

### MongoDB (Finance Service)
- `gstInvoices` - GST invoices
- `invoiceSequences` - Invoice number sequences

## Deployment Steps

1. **Build all services**
```bash
cd rez-wallet-service && npm run build
cd rez-finance-service && npm run build
cd rez-hotel-service && npm run build
cd rez-procurement-service && npm run build
```

2. **Push images to registry**
```bash
docker push rez/wallet-service:latest
docker push rez/finance-service:latest
docker push rez/hotel-service:latest
docker push rez/procurement-service:latest
```

3. **Update Kong configuration**
```bash
kong config parse kong.yml
kong reload
```

4. **Run migrations**
```bash
npm run migrate:corp
```

5. **Verify health**
```bash
curl http://localhost:4004/health
curl http://localhost:4006/health
curl http://localhost:4011/health
curl http://localhost:4012/health
```

## Monitoring

### Key Metrics
- `corp_benefits_total` - Total benefits allocated
- `corp_employees_enrolled` - Employees enrolled
- `corp_gst_invoices_generated` - GST invoices
- `corp_hotel_bookings` - Hotel bookings
- `corp_gift_orders` - Gift orders

### Alerts
- GST invoice generation failure
- Makcorps API down
- Employee sync failures
- Wallet balance low (< ₹10,000)
