# @hojai/communications

**Multi-Channel Communications**

---

## Overview

Send messages across SMS, Email, Push notifications, and WhatsApp.

## Features

- SMS messaging
- Email campaigns
- Push notifications
- WhatsApp integration
- Template management
- Delivery tracking

## Quick Start

```bash
npm install @hojai/communications
```

```typescript
import { Communications } from '@hojai/communications';

const comm = new Communications({ tenantId: 'merchant_123' });

// Send SMS
await comm.sendSMS({
  to: '+919876543210',
  message: 'Your order is ready!'
});

// Send Email
await comm.sendEmail({
  to: 'user@example.com',
  subject: 'Order Confirmation',
  template: 'order-confirmation'
});
```

## Channels

| Channel | Status |
|---------|--------|
| SMS | ✅ |
| Email | ✅ |
| Push | ✅ |
| WhatsApp | ✅ |

---

**Port:** 4590
**Status:** Production Ready
