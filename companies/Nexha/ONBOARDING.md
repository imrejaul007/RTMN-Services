# NeXha Commerce Network — Client Onboarding Guide

**Version:** 1.0.0 | **Updated:** June 15, 2026

---

## Overview

NeXha Commerce Network is a B2B platform enabling suppliers and buyers to onboard, transact, and build trust through verified identities, GST validation, and reputation scoring.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     NeXha Platform                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │  Portal     │   │ Commerce    │   │ SUTAR OS    │       │
│  │  (Next.js)  │◄─►│ Identity    │◄─►│ (Mock)      │       │
│  │  :3000      │   │  :8000      │   │  :4799      │       │
│  └─────────────┘   └──────┬──────┘   └─────────────┘       │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │  MongoDB    │                          │
│                    │  :27017     │                          │
│                    └─────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Services

| Service | Port | Description |
|---------|------|-------------|
| `portal` | 3000 | Next.js web UI |
| `commerce-identity` | 8000 | Auth, identity, onboarding |
| `sutar-mock` | 4799 | SUTAR OS mock (CorpID, Trust, Policy, Events) |
| MongoDB | 27017 | Persistent storage |

---

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB running (`brew services start mongodb-community`)
- Port 3000, 4799, 8000, 27017 available

### 1. Start All Services

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/Nexha

# Start MongoDB
brew services start mongodb-community

# Start SUTAR mock
cd sutar-mock && npm install && npm start &
sleep 2

# Start commerce-identity
cd ../commerce-identity && npm install && npm start &
sleep 2

# Start portal
cd ../portal && npm install && npm run dev &
sleep 3

# Verify all services
curl http://localhost:8000/health
curl http://localhost:4799/stats
curl http://localhost:3000
```

### 2. Open Portal

Navigate to: **http://localhost:3000**

---

## Onboarding Flows

### Guest Onboarding (Supplier)

For suppliers who want to explore before committing.

1. **Go to portal** → http://localhost:3000/onboard-guest
2. **Fill form**:
   - Business name
   - Phone number (with +91)
   - Email
3. **Receive OTP** — 6-digit code via WhatsApp (dev: check logs)
4. **Enter OTP** → receive guest JWT token
5. **Access dashboard** with limited features

### Full Supplier Onboarding

For verified suppliers with GSTIN.

1. **Go to portal** → http://localhost:3000/onboard-supplier
2. **Step 1: Business Details**
   - Legal name
   - GSTIN (validated against mod-36 checksum)
   - PAN
   - Business type
3. **Step 2: Contact Info**
   - Phone (OTP verified)
   - Email
   - Address
4. **Step 3: Review & Submit**
   - Summary of all details
   - Submit for CorpID issuance

### Login

1. **Go to portal** → http://localhost:3000/login
2. **Enter email + password**
3. **Receive JWT token** for authenticated sessions

---

## API Reference

### Authentication Endpoints

#### POST /api/auth/login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"supplier@example.com","password":"secret123"}'
```

#### POST /api/auth/guest-token
```bash
curl -X POST http://localhost:8000/api/auth/guest-token \
  -H 'Content-Type: application/json' \
  -d '{"guestId":"GST-XXXXXX","code":"123456"}'
```

#### GET /api/auth/me
```bash
curl http://localhost:8000/api/auth/me \
  -H 'Authorization: Bearer <token>'
```

### Guest Onboarding Endpoints

#### POST /api/guest-suppliers/onboard
```bash
curl -X POST http://localhost:8000/api/guest-suppliers/onboard \
  -H 'Content-Type: application/json' \
  -d '{
    "businessName": "Acme Supplies",
    "phone": "+919876543210",
    "email": "acme@example.com"
  }'
```

### Supplier Endpoints

#### POST /api/suppliers/register
```bash
curl -X POST http://localhost:8000/api/suppliers/register \
  -H 'Content-Type: application/json' \
  -d '{
    "legalName": "Acme Supplies Pvt Ltd",
    "gstin": "27AABCU9603R1ZM",
    "pan": "AABCU9603R",
    "businessType": "private_limited",
    "phone": "+919876543210",
    "email": "acme@example.com",
    "address": {
      "street": "123 Industrial Area",
      "city": "Mumbai",
      "state": "MH",
      "pincode": "400001"
    }
  }'
```

### Trust & Reputation Endpoints

#### POST /api/trust/link
```bash
curl -X POST http://localhost:8000/api/trust/link \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"targetCorpId":"GST-XXXXXX","relationship":"supplier"}'
```

#### POST /api/ratings
```bash
curl -X POST http://localhost:8000/api/ratings \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "subjectId": "GST-XXXXXX",
    "subjectType": "supplier",
    "dimensions": {"quality": 5, "delivery": 4, "communication": 5},
    "review": "Excellent service and quality"
  }'
```

---

## Dev Tools

### Check SUTAR Events

```bash
curl http://localhost:4799/events | python3 -m json.tool
```

### Check Service Logs

```bash
# commerce-identity logs
tail -f /private/tmp/claude-*/tasks/*.output | grep commerce-identity

# sutar-mock logs
tail -f /private/tmp/claude-*/tasks/*.output | grep sutar-mock
```

### Verify MongoDB Data

```bash
mongosh nexha_commerce_identity --eval 'db.guestSuppliers.find().pretty()'
mongosh nexha_commerce_identity --eval 'db.suppliers.find().pretty()'
mongosh nexha_commerce_identity --eval 'db.ratings.find().pretty()'
```

---

## WhatsApp OTP (Dev Mode)

In development, OTPs are logged instead of sent:

```
[DEV] WhatsApp OTP → +919900112233: Your verification code is 123456. Valid for 10 minutes.
```

Also published to SUTAR event bus topic: `nexha.whatsapp.otp.dev`

To switch to production:
1. Set `WHATSAPP_PROVIDER=meta` or `twilio`
2. Configure `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` (Meta) or `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`
3. Set `WHATSAPP_FROM_NUMBER` for Twilio

---

## Troubleshooting

### MongoDB Connection Failed

```bash
brew services restart mongodb-community
```

### Service Won't Start

Check for port conflicts:
```bash
lsof -i :8000  # commerce-identity
lsof -i :4799  # sutar-mock
lsof -i :3000  # portal
```

### OTP Not Received

1. Check dev logs for `[DEV] WhatsApp OTP`
2. Verify SUTAR event bus: `curl http://localhost:4799/events`
3. Check MongoDB guest record exists

### GSTIN Validation Failed

GSTIN must pass mod-36 checksum:
- Format: 27AABCU9603R1ZM (15 characters)
- Characters 1-2: State code (01-35)
- Characters 3-11: PAN (uppercase letters/numbers)
- Character 12: Entity number (1-9 or A-Z)
- Character 13: Z flag
- Characters 14-15: Check characters (alphanumeric)

---

## Docker Deployment

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/Nexha

# Build and start all services
docker-compose up --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

With TLS (Caddy):
```bash
# Start Caddy reverse proxy
caddy run --config Caddyfile

# Access portal at https://localhost
# Access API at https://localhost:8443
```

---

## Next Steps

- [ ] Connect to real SUTAR OS (replace sutar-mock)
- [ ] Implement buyer onboarding flow
- [ ] Add product catalog endpoints
- [ ] Build RFQ (Request for Quote) system
- [ ] Integrate payment gateway
- [ ] Add analytics dashboard

---

*Last Updated: June 15, 2026*