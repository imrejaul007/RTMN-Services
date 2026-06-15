# RTMN Pilot Client Onboarding Runbook
**Version:** 1.0 | **Date:** June 15, 2026 | **Author:** RTMN Engineering

---

## Overview

This runbook documents how to onboard a pilot client from zero to live on the RTMN platform. It covers every step from signing up through having a provisioned industry service running.

**Target user:** RTMN team member running the pilot onboarding
**SLA:** Complete onboarding in ≤30 minutes

---

## Prerequisites

Before starting, confirm:
- [ ] `services/pilot-onboarding/` is running (`cd services/pilot-onboarding && node src/index.js`)
- [ ] `.env` is configured (copy from `.env.example`)
- [ ] Stripe test keys configured (for real payments; use mock mode for free)
- [ ] Resend API key configured (for real emails; logs to console if not)
- [ ] Industry OS service(s) you plan to onboard are running

---

## Step 1: Client Signs Up

**Endpoint:** `POST http://localhost:4399/v1/auth/signup`

```bash
curl -X POST http://localhost:4399/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "password": "securepassword123",
    "companyName": "Sunrise Hotels Pvt Ltd",
    "contactName": "Amit Sharma",
    "phone": "+91 98765 43210"
  }'
```

**Expected response:**
```json
{
  "id": "uuid-here",
  "email": "client@example.com",
  "status": "pending_verification",
  "message": "Verification email sent",
  "devVerifyUrl": "http://localhost:3000/verify?token=..."
}
```

**In dev mode:** Use the `devVerifyUrl` directly. In prod, the client checks their email.

---

## Step 2: Verify Email

**Endpoint:** `GET http://localhost:4399/v1/auth/verify/:token`

```bash
curl http://localhost:4399/v1/auth/verify/d724916c-80f3-41ec-9175-c6d2e8c708d3
```

**Expected:**
```json
{ "ok": true, "message": "Email verified", "client": { "id": "...", "status": "active" } }
```

Account status changes from `pending_verification` → `active`.

---

## Step 3: Client Logs In

**Endpoint:** `POST http://localhost:4399/v1/auth/login`

```bash
curl -X POST http://localhost:4399/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "client@example.com", "password": "securepassword123"}'
```

**Response includes JWT token.** Save this token — it goes in the `Authorization: Bearer <token>` header for all authenticated requests.

---

## Step 4: Browse Services

**Endpoint:** `GET http://localhost:4399/v1/services`

Returns all 24 industry services with pricing. Note the `pilotReady` flag — only services with `pilotReady: true` are recommended for first clients.

**Recommended first service for Hotel industry:** `hotel-os` (port 5025) at $99/mo.

---

## Step 5: Select a Service

**Endpoint:** `POST http://localhost:4399/v1/services/select`

```bash
curl -X POST http://localhost:4399/v1/services/select \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{"serviceId": "hotel-os", "plan": "pilot"}'
```

**Expected:**
```json
{
  "ok": true,
  "selection": {
    "serviceId": "hotel-os",
    "plan": "pilot",
    "port": 5025,
    "status": "pending_payment",
    "pricing": { "monthly": 99, "currency": "USD", "plan": "pilot" }
  },
  "next": "POST /v1/billing/checkout to activate"
}
```

---

## Step 6: Payment

### Option A: Stripe Checkout (Real)
```bash
curl -X POST http://localhost:4399/v1/billing/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{"serviceId": "hotel-os", "plan": "pilot"}'
```
Returns a Stripe-hosted checkout URL. Client completes payment → webhook activates service automatically.

### Option B: Mock (Dev/Test)
```bash
# Get paymentId from checkout response
PAYMENT_ID="payment-id-from-checkout"
curl -X POST "http://localhost:4399/v1/billing/mock-confirm/$PAYMENT_ID" \
  -H "Authorization: Bearer <JWT>"
```
Service immediately becomes `active`.

---

## Step 7: Verify Service Provisioning

```bash
curl http://localhost:4399/v1/auth/me \
  -H "Authorization: Bearer <JWT>"
```

Check that `services` array contains the selected service with `status: "active"`.

---

## Step 8: Test Industry OS

Once active, the client can call the industry OS directly or via the proxy:

```bash
# Via proxy (stubbed — configure http-proxy-middleware for full proxying)
curl http://localhost:4399/v1/proxy/hotel-os/health \
  -H "Authorization: Bearer <JWT>"

# Direct (if hotel-os is running on port 5025)
curl http://localhost:5025/health
```

---

## Step 9: Open Dashboard

Open in browser:
```
http://localhost:4399/
```

The client dashboard shows:
- All provisioned services
- API test buttons
- Service catalog with pricing
- Billing history

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Invalid credentials` on login | Check email is lowercase, password matches |
| `Email not verified` on login | Run verify endpoint with token from signup |
| Service shows `pending_payment` | Complete checkout or run mock-confirm |
| `Service not reachable on port X` | Start industry OS: `cd services/hotel-os && npm start` |
| Stripe webhook not firing | Set `STRIPE_WEBHOOK_SECRET` and use `stripe listen --forward-to localhost:4399/v1/billing/webhook` |
| Email not sending | Check `RESEND_API_KEY`; falls back to console log in dev |

---

## Onboarding Checklist

- [ ] Client signup → verification email sent
- [ ] Email verified → account `active`
- [ ] Client logged in → JWT obtained
- [ ] Service selected → `pending_payment`
- [ ] Payment completed → service `active`
- [ ] Industry OS running → `/health` returns 200
- [ ] Dashboard accessible → shows correct services
- [ ] API test passed → industry OS responding
- [ ] Client informed of login credentials
- [ ] Support contact shared (support@rtmn.io)

---

## Contact

- **Support:** support@rtmn.io
- **Engineering escalation:** engineering@rtmn.io
- **Status page:** https://status.rtmn.io (configure uptime monitoring)