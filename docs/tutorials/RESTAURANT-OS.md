# Tutorial: Restaurant OS Integration

**Connect BrandPulse sentiment data to Restaurant OS for unified guest intelligence.**

**Time:** 20 minutes
**Prerequisites:** Restaurant OS account, BrandPulse account, RTNM SDK

---

## What You'll Build

A real-time integration that:
1. Syncs BrandPulse sentiment data to Restaurant OS guest profiles
2. Creates alerts when guests mention your restaurant in negative reviews
3. Enables proactive service recovery

---

## Step 1: Initialize the RTNM SDK

```typescript
import { RTMNClient } from '@rtmn/sdk';

const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY
});
```

---

## Step 2: Create Sentiment Sync

```typescript
// Create sync from BrandPulse to Restaurant OS
const syncJob = await rtmn.integrations.createSyncJob({
  name: 'BrandPulse to Restaurant OS Sentiment',
  source: {
    type: 'brandpulse',
    entities: ['reviews', 'sentiment_scores']
  },
  destination: {
    type: 'restaurant-os',
    endpoint: 'customer-twin'
  },
  schedule: '*/15 * * * *',
  transform: async (review) => {
    return {
      customerTwin: {
        name: review.author,
        email: extractEmail(review.author),
        lastReview: {
          source: review.source,
          rating: review.rating,
          sentimentScore: review.sentimentScore,
          text: review.text,
          date: review.createdAt
        },
        sentimentHistory: await getSentimentHistory(review.author),
        riskLevel: calculateRiskLevel(review.sentimentScore, review.rating)
      }
    };
  }
});
```

---

## Step 3: Create Alerts

```typescript
// Alert when negative review mentions food quality
const alertRule = await rtmn.alerts.create({
  name: 'Food Quality Alert',
  trigger: {
    type: 'negative_review',
    conditions: {
      sentimentScore: { lt: -0.3 },
      keywords: ['food', 'meal', 'taste', 'order', 'dish']
    }
  },
  actions: [
    {
      type: 'webhook',
      url: 'https://restaurant-os.rtmn.io/api/v1/webhooks/kitchen-alert',
      body: {
        alertType: 'food_quality',
        priority: 'high',
        action: 'create_kitchen_review'
      }
    },
    {
      type: 'slack',
      channel: '#kitchen'
    }
  ]
});
```

---

## Step 4: Webhook Handler

```typescript
app.post('/webhooks/kitchen-alert', express.json(), async (req, res) => {
  const { alertType, data, priority } = req.body;

  if (alertType === 'food_quality') {
    await handleFoodQualityAlert(data, priority);
  }

  res.status(200).send('OK');
});

async function handleFoodQualityAlert(review: any, priority: string) {
  // 1. Find customer
  const customer = await rtmn.restaurant.customers.findByEmail(review.authorEmail);

  // 2. Update customer profile
  await rtmn.restaurant.customers.update(customer.id, {
    lastReview: {
      source: review.source,
      rating: review.rating,
      sentimentScore: review.sentimentScore,
      text: review.text
    },
    riskLevel: calculateRiskLevel(review.sentimentScore, review.rating)
  });

  // 3. Create kitchen review task
  const task = await rtmn.restaurant.tasks.create({
    title: `Food Quality Review: ${review.source}`,
    description: `Negative review mentioning food quality.\n\n${review.text}`,
    priority: priority === 'high' ? 'urgent' : 'normal',
    assignedTo: 'kitchen',
    dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
    tags: ['food-quality', 'review-response']
  });

  // 4. Notify kitchen
  await rtmn.restaurant.notifications.send({
    channel: 'kitchen',
    type: 'urgent',
    title: 'Food Quality Issue Reported',
    message: `Review from ${review.author} mentions food quality. Task created.`
  });
}
```

---

## Step 5: Dashboard Widget

```typescript
async function getRestaurantSentimentWidget(brandId: string) {
  const overview = await rtmn.brandpulse.analytics.getSentimentOverview(brandId, {
    period: '30d'
  });

  // Find food-related issues
  const foodReviews = await rtmn.brandpulse.reviews.list(brandId, {
    limit: 50,
    sentiment: 'negative'
  });

  const foodIssues = foodReviews.data.filter(r =>
    ['food', 'meal', 'taste', 'order', 'dish'].some(k =>
      r.text.toLowerCase().includes(k)
    )
  );

  return {
    overallSentiment: overview.overallSentiment,
    reviewVolume: overview.totalReviews,
    foodIssueCount: foodIssues.length,
    topFoodIssues: analyzeFoodIssues(foodIssues),
    highRiskCustomers: await getHighRiskCustomers(brandId)
  };
}
```

---

## Next Steps

- [Hotel OS Integration](HOTEL-INTEGRATION.md)
- [Custom Workflow Tutorial](CUSTOM-WORKFLOW.md)
- [Restaurant OS API Reference](docs/api-reference/RESTAURANT-OS-API.md)
