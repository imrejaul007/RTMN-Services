# RTMN Customer Operations - Customer Onboarding Guide

**Version:** 1.0  
**Date:** June 17, 2026

---

## Quick Onboarding

### Step 1: Sign Up

```bash
# Via API
curl -X POST https://rtmn-pilot-onboarding.onrender.com/api/onboarding/signup \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Your Company Name",
    "email": "admin@yourcompany.com",
    "password": "secure_password"
  }'
```

Response:
```json
{
  "success": true,
  "companyId": "comp_xxxxx",
  "tenantId": "tenant_xxxxx",
  "message": "Welcome! Complete setup to start."
}
```

---

## Step 2: Complete Setup Wizard

### 2.1 Company Profile

```bash
curl -X PUT https://rtmn-pilot-onboarding.onrender.com/api/company/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Company Name",
    "industry": "retail",
    "size": "50-200",
    "timezone": "Asia/Kolkata"
  }'
```

### 2.2 Configure Twins

```bash
# Enable twins you need
curl -X POST https://rtmn-pilot-onboarding.onrender.com/api/setup/twins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "twins": ["customer", "order", "payment", "ticket"],
    "settings": {
      "autoEnrich": true,
      "aiPredictions": true
    }
  }'
```

### 2.3 Connect Channels

```bash
# WhatsApp
curl -X POST https://rtmn-pilot-onboarding.onrender.com/api/setup/channels/whatsapp \
  -H "Authorization: Bearer <token>" \
  -d '{"phone": "+1234567890"}'

# Email
curl -X POST https://rtmn-pilot-onboarding.onrender.com/api/setup/channels/email \
  -H "Authorization: Bearer <token>" \
  -d '{"domain": "yourcompany.com"}'

# Chat Widget
curl -X POST https://rtmn-pilot-onboarding.onrender.com/api/setup/channels/chat \
  -H "Authorization: Bearer <token>"
```

### 2.4 Invite Team

```bash
# Invite agents
curl -X POST https://rtmn-pilot-onboarding.onrender.com/api/team/invite \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": ["agent1@yourcompany.com", "agent2@yourcompany.com"],
    "role": "agent"
  }'

# Invite admins
curl -X POST https://rtmn-pilot-onboarding.onrender.com/api/team/invite \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": ["manager@yourcompany.com"],
    "role": "manager"
  }'
```

### 2.5 Configure AI

```bash
# Enable AI features
curl -X POST https://rtmn-pilot-onboarding.onrender.com/api/setup/ai \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "autoResolve": true,
      "sentimentAnalysis": true,
      "csatPrediction": true
    },
    "autoApprove": {
      "enabled": true,
      "maxAmount": 5000,
      "trustThreshold": 80
    }
  }'
```

---

## Step 3: Integrate Your Systems

### 3.1 E-Commerce / POS

```bash
# Connect via API
curl -X POST https://rtmn-pilot-onboarding.onrender.com/api/integrations/ecomm \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "shopify",
    "apiKey": "xxxxx",
    "webhookUrl": "https://rtmn.io/webhooks/shopify"
  }'
```

### 3.2 Payment Gateway

```bash
# Connect Stripe
curl -X POST https://rtmn-pilot-onboarding.onrender.com/api/integrations/payment \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "stripe",
    "publishableKey": "pk_live_xxxxx",
    "secretKey": "sk_live_xxxxx"
  }'
```

### 3.3 CRM / Other Systems

```bash
# Webhook endpoint for any CRM
WEBHOOK_URL="https://rtmn.io/webhooks/your-crm"

# Or use REST API
curl -X POST https://rtmn-pilot-onboarding.onrender.com/api/integrations/custom \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your CRM",
    "apiEndpoint": "https://your-crm.com/api",
    "apiKey": "xxxxx"
  }'
```

---

## Step 4: Customize

### 4.1 Branding

```bash
# Set branding
curl -X PUT https://rtmn-pilot-onboarding.onrender.com/api/settings/branding \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "logo": "https://yourcompany.com/logo.png",
    "primaryColor": "#0066FF",
    "chatWidget": {
      "enabled": true,
      "position": "bottom-right"
    }
  }'
```

### 4.2 SLAs

```bash
# Configure SLAs
curl -X POST https://rtmn-pilot-onboarding.onrender.com/api/settings/sla \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Standard",
    "responseTime": 360,
    "resolutionTime": 1440,
    "priority": "medium"
  }'
```

### 4.3 Auto-Approve Rules

```bash
# Set refund rules
curl -X POST https://rtmn-pilot-onboarding.onrender.com/api/settings/approval \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "rules": [
      {
        "condition": "trustScore >= 90",
        "action": "autoApprove",
        "maxAmount": 10000
      },
      {
        "condition": "trustScore >= 70",
        "action": "autoApprove",
        "maxAmount": 5000
      }
    ]
  }'
```

---

## Step 5: Go Live

### 5.1 Test

```bash
# Run test
./demo/test-api.sh https://rtmn-pilot-onboarding.onrender.com

# Check dashboard
open https://rtmn-pilot-onboarding.onrender.com/dashboard
```

### 5.2 Launch

```bash
# Enable live mode
curl -X POST https://rtmn-pilot-onboarding.onrender.com/api/setup/go-live \
  -H "Authorization: Bearer <token>"
```

### 5.3 Monitor

```bash
# Check health
curl https://rtmn-pilot-onboarding.onrender.com/health

# View logs
open https://rtmn-pilot-onboarding.onrender.com/logs
```

---

## Onboarding Checklist

| Step | Task | Status |
|------|------|--------|
| 1 | Sign up | ☐ |
| 2 | Company profile | ☐ |
| 3 | Enable twins | ☐ |
| 4 | Connect channels | ☐ |
| 5 | Invite team | ☐ |
| 6 | Configure AI | ☐ |
| 7 | Integrate systems | ☐ |
| 8 | Customize branding | ☐ |
| 9 | Set SLAs | ☐ |
| 10 | Test | ☐ |
| 11 | Go live | ☐ |

---

## Support

- **Docs:** https://docs.rtmn.io
- **Email:** support@rtmn.io
- **Chat:** https://rtmn.io/chat

---

**Welcome to RTMN Customer Operations OS!**
