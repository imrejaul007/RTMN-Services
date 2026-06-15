# Tutorial: Integrate with Hotel OS

**Connect BrandPulse sentiment data to Hotel OS for unified guest intelligence.**

**Time:** 20 minutes
**Prerequisites:** Hotel OS account, BrandPulse account, RTNM SDK

---

## What You'll Build

A real-time integration that:
1. Syncs BrandPulse sentiment data to Hotel OS guest profiles
2. Creates alerts when guests mention your hotel in negative reviews
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

## Step 2: Create a Sentiment Sync Job

```typescript
// Create a recurring sync job
const syncJob = await rtmn.integrations.createSyncJob({
  name: 'BrandPulse to Hotel OS Sentiment Sync',
  source: {
    type: 'brandpulse',
    entities: ['reviews', 'sentiment_scores']
  },
  destination: {
    type: 'hotel-os',
    endpoint: 'guest-twin'
  },
  schedule: '*/15 * * * *', // Every 15 minutes
  transform: async (review) => {
    // Extract guest from review
    const guestName = extractGuestName(review.author);
    const guestEmail = extractEmail(review.author);

    return {
      guestTwin: {
        name: guestName,
        email: guestEmail,
        lastReview: {
          source: review.source,
          rating: review.rating,
          sentimentScore: review.sentimentScore,
          text: review.text,
          date: review.createdAt,
          url: review.url
        },
        sentimentHistory: await getSentimentHistory(guestEmail),
        riskLevel: calculateRiskLevel(review.sentimentScore, review.rating)
      }
    };
  }
});

console.log('Sync job created:', syncJob.id);
```

---

## Step 3: Set Up Alert Routing

```typescript
// Create alert rule for negative reviews mentioning a guest
const alertRule = await rtmn.alerts.create({
  name: 'Guest Review Alert',
  trigger: {
    type: 'negative_review',
    conditions: {
      sentimentScore: { lt: -0.3 },
      sources: ['google', 'yelp', 'tripadvisor']
    }
  },
  actions: [
    {
      type: 'webhook',
      url: 'https://hotel-os.rtmn.io/api/v1/webhooks/guest-alert',
      headers: {
        'Authorization': `Bearer ${process.env.HOTEL_OS_WEBHOOK_SECRET}`
      },
      body: {
        alertType: 'negative_review',
        priority: 'high',
        action: 'create_service_recovery_task'
      }
    },
    {
      type: 'email',
      recipients: ['gm@hotel.com', 'front-desk@hotel.com']
    }
  ]
});
```

---

## Step 4: Create Webhook Handler

```typescript
import express from 'express';
import { RTMNClient } from '@rtmn/sdk';

const app = express();
const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY
});

app.post('/webhooks/guest-alert', express.json(), async (req, res) => {
  const { alertType, data, priority } = req.body;

  if (alertType === 'negative_review') {
    await handleNegativeReview(data, priority);
  }

  res.status(200).send('OK');
});

async function handleNegativeReview(review: any, priority: string) {
  // 1. Find matching guest in Hotel OS
  const guest = await rtmn.hotel.guests.findByEmail(review.authorEmail);

  if (!guest) {
    console.log('No matching guest found, creating new profile');
    const newGuest = await rtmn.hotel.guests.create({
      name: review.author,
      email: review.authorEmail,
      source: 'brandpulse',
      riskFlags: ['never_stayed']
    });
    await createRecoveryTask(newGuest.id, review, priority);
    return;
  }

  // 2. Update guest profile with review data
  await rtmn.hotel.guests.update(guest.id, {
    lastReview: {
      source: review.source,
      rating: review.rating,
      sentimentScore: review.sentimentScore,
      text: review.text,
      date: review.createdAt
    },
    riskLevel: calculateRiskLevel(review.sentimentScore, review.rating),
    priority: priority === 'high' ? 'vip' : 'standard'
  });

  // 3. Create service recovery task
  await createRecoveryTask(guest.id, review, priority);

  // 4. Notify front desk
  if (priority === 'high') {
    await rtmn.hotel.notifications.send({
      channel: 'front-desk',
      type: 'urgent',
      title: 'Guest Mentioned in Negative Review',
      message: `${guest.name} was mentioned in a ${review.rating}/5 ${review.source} review. Immediate follow-up recommended.`,
      data: {
        guestId: guest.id,
        reviewUrl: review.url
      }
    });
  }
}

async function createRecoveryTask(guestId: string, review: any, priority: string) {
  const task = await rtmn.hotel.tasks.create({
    title: `Service Recovery: ${review.source} Review Response`,
    description: `
Guest mentioned in negative review:

Source: ${review.source}
Rating: ${review.rating}/5
Sentiment: ${review.sentimentScore}

Review Text:
${review.text}

Recommended Actions:
1. Respond to review publicly
2. Reach out to guest privately
3. Offer compensation if appropriate
4. Log resolution in guest profile
    `.trim(),
    priority: priority === 'high' ? 'urgent' : 'normal',
    assignedTo: 'front-desk',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    relatedGuest: guestId,
    tags: ['service-recovery', 'review-response', review.source]
  });

  console.log('Task created:', task.id);
  return task;
}
```

---

## Step 5: Dashboard Widget

```typescript
// Create a dashboard widget showing guest sentiment
async function getGuestSentimentWidget(brandId: string) {
  const overview = await rtmn.brandpulse.analytics.getSentimentOverview(brandId, {
    period: '30d'
  });

  const recentReviews = await rtmn.brandpulse.reviews.list(brandId, {
    limit: 10,
    sort: 'createdAt',
    order: 'desc'
  });

  // Find reviews with high-risk guests
  const highRiskReviews = recentReviews.data.filter(r =>
    r.sentimentScore < -0.3 || r.rating <= 2
  );

  return {
    overallSentiment: overview.overallSentiment,
    sentimentTrend: overview.sentimentTrend,
    reviewVolume: overview.totalReviews,
    highRiskCount: highRiskReviews.length,
    highRiskReviews: highRiskReviews.map(r => ({
      source: r.source,
      rating: r.rating,
      sentiment: r.sentimentScore,
      excerpt: r.text.substring(0, 100),
      date: r.createdAt
    })),
    topConcerns: overview.topAspects.filter(a => a.score < 0)
  };
}
```

---

## Step 6: Automated Response Workflow

```typescript
// Set up automated response workflow
async function setupResponseWorkflow() {
  // When a negative review is detected
  rtmn.events.subscribe('brandpulse.review.negative', async (event) => {
    const { review, brand } = event.data;

    // 1. Analyze review for actionable items
    const analysis = await rtmn.brandpulse.analytics.analyzeReview(review.id);

    // 2. Create guest profile if new
    const guest = await findOrCreateGuest(review.author, review.authorEmail);

    // 3. Update guest risk score
    await updateGuestRiskScore(guest.id, analysis.sentimentScore);

    // 4. If high risk, trigger service recovery
    if (analysis.sentimentScore < -0.5) {
      await triggerServiceRecovery(guest.id, review, analysis);
    }

    // 5. Queue review response
    await queueReviewResponse(review, guest);
  });
}

async function triggerServiceRecovery(guestId: string, review: any, analysis: any) {
  // Create a service recovery sequence
  const recoverySequence = await rtmn.hotel.sequences.create({
    name: `Service Recovery - ${guestId}`,
    trigger: 'manual',
    steps: [
      {
        action: 'create_task',
        data: {
          title: 'Personal outreach to guest',
          description: `Guest ${guestId} left a negative review. Personal follow-up recommended.`,
          assignedTo: 'concierge',
          dueIn: '2h'
        }
      },
      {
        action: 'send_email',
        data: {
          template: 'service-recovery',
          variables: {
            guestName: review.author,
            reviewSource: review.source,
            reviewUrl: review.url
          }
        },
        delay: '1h'
      },
      {
        action: 'send_sms',
        data: {
          template: 'service-recovery',
          variables: {
            guestName: review.author
          }
        },
        delay: '4h'
      },
      {
        action: 'log_outcome',
        data: {
          task: 'service-recovery',
          checkIn: '24h'
        }
      }
    ]
  });

  await rtmn.hotel.sequences.start(recoverySequence.id, {
    guestId,
    reviewId: review.id
  });
}
```

---

## Complete Example

```typescript
import { RTMNClient } from '@rtmn/sdk';

const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY
});

// Initialize integration
async function initializeBrandPulseHotelIntegration(brandId: string, hotelId: string) {
  // 1. Create sync job
  const syncJob = await rtmn.integrations.createSyncJob({
    name: 'BrandPulse Sentiment Sync',
    source: { type: 'brandpulse', entities: ['reviews'] },
    destination: { type: 'hotel-os', hotelId },
    schedule: '*/15 * * * *',
    transform: transformReviewToGuestUpdate
  });

  // 2. Create alert rules
  await rtmn.alerts.create({
    name: 'High-Risk Review Alert',
    trigger: { type: 'negative_review', conditions: { sentimentScore: { lt: -0.5 } } },
    actions: [{ type: 'webhook', url: `/webhooks/guest-alert` }]
  });

  // 3. Subscribe to events
  rtmn.events.subscribe('brandpulse.review.*', handleReviewEvent);

  console.log('Integration initialized:', { syncJob: syncJob.id });
  return { syncJob: syncJob.id };
}

async function transformReviewToGuestUpdate(review: any) {
  return {
    lastReview: {
      source: review.source,
      rating: review.rating,
      sentimentScore: review.sentimentScore,
      text: review.text,
      date: review.createdAt
    },
    riskLevel: calculateRiskLevel(review.sentimentScore, review.rating)
  };
}

async function handleReviewEvent(event: any) {
  const { type, data } = event;
  if (type === 'brandpulse.review.negative') {
    await handleNegativeReview(data);
  }
}

console.log('BrandPulse + Hotel OS integration ready!');
```

---

## Next Steps

- [Custom Workflow Tutorial](CUSTOM-WORKFLOW.md)
- [Hotel OS API Reference](docs/api-reference/HOTEL-OS-API.md)
- [Digital Twins Deep Dive](docs/concepts/DIGITAL-TWINS.md)
