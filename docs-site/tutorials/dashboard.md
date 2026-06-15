# Build a Brand Dashboard

Create a real-time brand dashboard in 15 minutes.

## Overview

Build a dashboard that shows sentiment scores, review volume, and source breakdown.

## Code

```typescript
import { RTMNClient } from '@rtmn/sdk';

const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY
});

const overview = await rtmn.analytics.getSentimentOverview(brandId, {
  period: '30d'
});

console.log('Sentiment:', overview.overallSentiment);
console.log('Reviews:', overview.totalReviews);
```

[Full tutorial →](/tutorials/brand-dashboard)
