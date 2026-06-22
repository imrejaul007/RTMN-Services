# @hojai/wellness

**Employee Wellness & Engagement**

---

## Overview

Track and improve employee wellness, engagement, and productivity.

## Features

- Wellness tracking
- Engagement metrics
- Pulse surveys
- Mental health support
- Team analytics

## Quick Start

```bash
npm install @hojai/wellness
```

```typescript
import { Wellness } from '@hojai/wellness';

const wellness = new Wellness({ tenantId: 'merchant_123' });

// Get wellness score
const score = await wellness.getScore('user_123');

// Send pulse survey
await wellness.sendSurvey({
  type: 'weekly',
  questions: ['How are you feeling?', 'Energy level?']
});

// Track engagement
const engagement = await wellness.getEngagement('team_abc');
```

## Metrics

| Metric | Description |
|--------|-------------|
| wellness_score | Overall wellness (0-100) |
| engagement | Work engagement |
| burnout_risk | Burnout probability |
| satisfaction | Job satisfaction |

---

**Status:** Production Ready
