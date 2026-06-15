# Quick Start Guide

**Get up and running with RTMN in 5 minutes.**

---

## Prerequisites

- Node.js 18+ (or Python 3.9+)
- An RTMN account ([Sign up free](https://app.rtmn.io/signup) — TBD)
- Basic familiarity with REST APIs

---

## Step 1: Create an Account

1. Go to [app.rtmn.io](https://app.rtmn.io/signup) (TBD)
2. Enter your email and password
3. Verify your email
4. You're in!

---

## Step 2: Get Your API Key

1. Go to **Settings → API Keys**
2. Click **Create API Key**
3. Name it "My First Integration"
4. Copy the key — it looks like `rtmn_prod_xxxxxxxxxxxx`

---

## Step 3: Install the SDK

### TypeScript / Node.js

```bash
npm install @rtmn/sdk
```

### Python

```bash
pip install rtmn-sdk
```

---

## Step 4: Make Your First API Call

### TypeScript

```typescript
import { RTMNClient } from '@rtmn/sdk';

const rtmn = new RTMNClient({
  apiKey: 'rtmn_prod_your_key_here'
});

// Get your account info
const account = await rtmn.account.get();
console.log('Account:', account.name);

// List your brands
const brands = await rtmn.brands.list();
console.log('Brands:', brands);
```

### Python

```python
from rtmn import RTMNClient

rtmn = RTMNClient(api_key='rtmn_prod_your_key_here')

account = rtmn.account.get()
print(f"Account: {account.name}")

brands = rtmn.brands.list()
print(f"Brands: {brands}")
```

### cURL

```bash
curl https://api.rtmn.io/api/v1/account \
  -H "Authorization: Bearer rtmn_prod_your_key_here"
```

---

## Step 5: Create Your First Brand

### TypeScript

```typescript
const brand = await rtmn.brands.create({
  name: 'My Restaurant',
  website: 'https://myrestaurant.com',
  industry: 'restaurant'
});

console.log('Brand created:', brand.id);
```

### cURL

```bash
curl -X POST https://api.rtmn.io/api/v1/brands \
  -H "Authorization: Bearer rtmn_prod_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Restaurant",
    "website": "https://myrestaurant.com",
    "industry": "restaurant"
  }'
```

---

## Step 6: Connect a Review Source (BrandPulse)

```typescript
// Connect Google Reviews
const source = await rtmn.brands.connectSource(brand.id, {
  type: 'google',
  businessId: 'your-google-business-id'
});

console.log('Source connected:', source.id);
```

---

## What's Next?

You've made your first API call! Here's where to go next:

| Goal | Guide |
|------|-------|
| Explore all API endpoints | [API Reference](docs/api-reference/OVERVIEW.md) |
| Build a sentiment dashboard | [Brand Dashboard Tutorial](docs/tutorials/BRAND-DASHBOARD.md) |
| Set up real-time alerts | [Sentiment Alerts Tutorial](docs/tutorials/SENTIMENT-ALERTS.md) |
| Understand the architecture | [Core Concepts](docs/getting-started/CORE-CONCEPTS.md) |
| Deploy to production | [Production Deployment](docs/deploy/PRODUCTION.md) |

---

## Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check your API key is correct and not expired |
| 403 Forbidden | Your key doesn't have the required permission |
| 429 Too Many Requests | Wait and retry with exponential backoff |
| Network error | Check your internet connection and firewall |

---

## Need Help?

- **Documentation:** docs.rtmn.io
- **Support:** support@rtmn.com
- **Status:** status.rtmn.io

---

*Ready to build? Let's go!*
