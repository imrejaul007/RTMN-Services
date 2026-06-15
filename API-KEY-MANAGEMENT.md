# API Key Management

**Last Updated:** June 15, 2026

---

## Overview

RTMN uses API keys to authenticate requests to our services. This guide covers creating, managing, and securing API keys.

---

## Key Types

| Type | Prefix | Use Case |
|------|--------|----------|
| **Production Key** | `rtmn_prod_` | Live environment, real data |
| **Test Key** | `rtmn_test_` | Testing, development |
| **Restricted Key** | `rtmn_restricted_` | Limited scope access |
| **Webhook Secret** | `rtmn_whsec_` | Webhook signature verification |

---

## Creating API Keys

### Via Dashboard

1. Go to **Settings → API Keys**
2. Click **Create API Key**
3. Enter a name (e.g., "Production API", "Local Dev")
4. Select the environment (**Production** or **Test**)
5. Set permissions (if restricted)
6. Set expiration (optional)
7. Click **Create**
8. **Copy and save the key** — it won't be shown again

### Via API

```bash
# Create API key via RTMN API
curl -X POST https://api.rtmn.io/api/v1/keys \
  -H "Authorization: Bearer YOUR_EXISTING_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CI/CD Pipeline",
    "environment": "production",
    "permissions": ["brands:read", "analytics:read"],
    "expiresAt": "2027-06-15T00:00:00Z"
  }'
```

---

## Key Permissions

### Available Permissions

| Permission | Description |
|------------|-------------|
| `brands:read` | Read brand information |
| `brands:write` | Create/update brands |
| `brands:delete` | Delete brands |
| `reviews:read` | Read reviews |
| `reviews:write` | Create/update reviews |
| `reviews:delete` | Delete reviews |
| `analytics:read` | Read analytics data |
| `analytics:export` | Export analytics |
| `webhooks:manage` | Manage webhooks |
| `users:manage` | Manage user accounts |
| `settings:read` | Read account settings |
| `settings:write` | Update account settings |
| `admin:*` | Full admin access (use sparingly) |

### Principle of Least Privilege

> Only grant the permissions required for the task.

| Use Case | Recommended Permissions |
|----------|------------------------|
| Dashboard display only | `brands:read`, `reviews:read`, `analytics:read` |
| Data export | `brands:read`, `analytics:read`, `analytics:export` |
| CI/CD pipeline | `brands:read`, `brands:write` |
| Webhook receiver | (No permissions needed — verify with signature) |
| Full access | `admin:*` |

---

## Using API Keys

### REST API

```bash
# Include API key in Authorization header
curl https://api.rtmn.io/api/v1/brands \
  -H "Authorization: Bearer rtmn_prod_xxxxxxxxxxxx"

# For test environment
curl https://api-test.rtmn.io/api/v1/brands \
  -H "Authorization: Bearer rtmn_test_xxxxxxxxxxxx"
```

### TypeScript SDK

```typescript
import { BrandPulseClient } from '@rtmn/brandpulse-sdk';

const client = new BrandPulseClient({
  apiKey: process.env.BRANDPULSE_API_KEY,
  environment: 'production' // or 'test'
});

// All requests authenticated automatically
const brands = await client.brands.list();
```

### Python SDK

```python
from rtmn import BrandPulseClient

client = BrandPulseClient(
    api_key=os.environ['BRANDPULSE_API_KEY'],
    environment='production'
)

brands = client.brands.list()
```

---

## Webhook Signature Verification

### Verifying Webhooks

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: Buffer,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const receivedSig = signature.replace('sha256=', '');

  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedSig)
  );
}

// Express example
app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-brandpulse-signature'];

  if (!verifyWebhookSignature(req.body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);
  // Process event...
  res.status(200).send('OK');
});
```

```python
import hmac
import hashlib

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    received = signature.replace('sha256=', '')

    # Use compare_digest for timing safety
    return hmac.compare_digest(expected, received)
```

---

## Key Rotation

### Rotate a Key

1. **Create a new key** (Settings → API Keys → Create)
2. **Update all systems** to use the new key
3. **Test** that all integrations work
4. **Revoke the old key**

### Automated Rotation

For automated rotation in production:

```bash
# Example: Rotate every 90 days via cron
# 0 0 */90 * * /opt/rtmn/scripts/rotate-api-key.sh
```

```bash
#!/bin/bash
# rotate-api-key.sh

NEW_KEY=$(curl -s -X POST https://api.rtmn.io/api/v1/keys \
  -H "Authorization: Bearer $CURRENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Rotated Key", "expiresAt": "'$(date -d '+90 days' -I)'"}')

echo $NEW_KEY > /etc/rtmn/api-key.env
systemctl reload brandpulse
```

---

## Security Best Practices

| Do | Don't |
|----|-------|
| ✅ Store keys in environment variables | ❌ Commit keys to git |
| ✅ Use restricted keys for specific tasks | ❌ Use admin keys everywhere |
| ✅ Rotate keys every 90 days | ❌ Use the same key for years |
| ✅ Monitor key usage in dashboard | ❌ Ignore unusual API activity |
| ✅ Revoke keys when no longer needed | ❌ Keep unused keys active |
| ✅ Use separate keys per environment | ❌ Use production keys in dev |

### Environment-Specific Keys

```bash
# .env.production
BRANDPULSE_API_KEY=rtmn_prod_xxxxxxxxxxxx

# .env.staging
BRANDPULSE_API_KEY=rtmn_test_yyyyyyyyyyyy

# .env.local
BRANDPULSE_API_KEY=rtmn_test_zzzzzzzzzzzz
```

### Git Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Prevent API keys from being committed

if git diff --cached --name-only | xargs grep -l "rtmn_prod_\|rtmn_test_\|rtmn_whsec_" 2>/dev/null; then
  echo "ERROR: API keys found in staged files"
  echo "Remove keys before committing or use environment variables"
  exit 1
fi
```

---

## Monitoring & Auditing

### View Key Usage

- **Dashboard:** Settings → API Keys → [Key Name] → Usage
- **Logs:** All API requests logged with key ID (masked in logs)

### Audit Log

| Event | Logged |
|-------|--------|
| Key created | ✅ (who, when, permissions) |
| Key used | ✅ (timestamp, endpoint, status) |
| Key rotated | ✅ (who, when) |
| Key revoked | ✅ (who, when) |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check key is correct and not expired |
| 403 Forbidden | Key doesn't have required permission |
| 429 Too Many Requests | Rate limit exceeded; implement retry with backoff |
| Key compromised | Immediately revoke and create new key |
| Key expired | Create new key; old key cannot be extended |

---

## Key Expiration

| Plan | Key Expiration |
|------|---------------|
| Free | 1 year |
| Starter | 1 year |
| Professional | 2 years |
| Enterprise | Custom |

Keys approaching expiration trigger:
- Email notification at 30 days
- Email notification at 7 days
- Dashboard warning banner at 7 days

---

*For help with API keys: support@rtmn.com*