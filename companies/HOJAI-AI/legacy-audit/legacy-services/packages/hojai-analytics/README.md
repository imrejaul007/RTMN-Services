# @hojai/analytics

**Analytics & Attribution Platform**

---

## Overview

Multi-touch attribution, campaign analytics, and business intelligence for commerce.

## Features

- Multi-touch attribution models
- Campaign performance tracking
- ROAS calculation
- Audience segmentation
- A/B testing

## Quick Start

```bash
npm install @hojai/analytics
```

```typescript
import { Analytics } from '@hojai/analytics';

const analytics = new Analytics({ tenantId: 'merchant_123' });

const report = await analytics.getAttribution({
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  model: 'linear'
});
```

## Attribution Models

| Model | Description |
|-------|-------------|
| first-touch | First interaction credit |
| last-touch | Last interaction credit |
| linear | Equal credit all touchpoints |
| time-decay | Recent interactions weighted |
| position-based | First/last weighted |

---

**Port:** 4580
**Status:** Production Ready
