# @hojai/policy

**Consent & Data Rights**

---

## Overview

GDPR/CCPA compliance, consent management, and data rights.

## Features

- Consent collection
- Preference management
- Data export (portability)
- Data deletion
- Audit trail

## Quick Start

```bash
npm install @hojai/policy
```

```typescript
import { Policy } from '@hojai/policy';

const policy = new Policy({ tenantId: 'merchant_123' });

// Check consent
const consent = await policy.check('marketing_email', 'user_123');

// Update consent
await policy.updateConsent('user_123', {
  marketing_email: false,
  analytics: true
});

// Export data (GDPR)
const export = await policy.exportData('user_123');

// Delete data (RTBF)
await policy.deleteData('user_123');
```

## Consent Categories

| Category | Description |
|----------|-------------|
| marketing | Email/SMS marketing |
| analytics | Usage analytics |
| personalization | AI personalization |
| third_party | Third-party sharing |

---

**Port:** 4505
**Status:** Production Ready
