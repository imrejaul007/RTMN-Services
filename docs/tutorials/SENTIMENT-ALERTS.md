# Tutorial: Set Up Sentiment Alerts

**Configure real-time alerts so your team responds to negative reviews within minutes, not days.**

**Time:** 10 minutes
**Prerequisites:** BrandPulse account, API key

---

## What You'll Configure

1. Alert when a negative review is detected
2. Alert when sentiment drops below threshold
3. Alert when review volume spikes
4. Webhook integration to your CRM or Slack

---

## Step 1: Create Alert Rules

### Via Dashboard

1. Go to **BrandPulse → [Your Brand] → Alerts**
2. Click **Create Alert Rule**
3. Configure the rule (see below)

### Via API

```typescript
import { RTMNClient } from '@rtmn/sdk';

const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY
});

// Alert when negative review detected
const alert1 = await rtmn.alerts.create({
  name: 'Negative Review Alert',
  brandId: 'brand_abc123',
  trigger: {
    type: 'negative_review',
    conditions: {
      sentimentScore: { lt: -0.3 }
    }
  },
  actions: [
    { type: 'email', recipients: ['manager@hotel.com'] },
    { type: 'webhook', url: 'https://your-crm.com/webhooks/brandpulse' }
  ]
});

// Alert when sentiment drops
const alert2 = await rtmn.alerts.create({
  name: 'Sentiment Drop Alert',
  brandId: 'brand_abc123',
  trigger: {
    type: 'sentiment_threshold',
    conditions: {
      sentimentScore: { lt: 3.5 },
      period: '7d'
    }
  },
  actions: [
    { type: 'slack', channel: '#hotel-alerts' },
    { type: 'email', recipients: ['gm@hotel.com', 'owner@hotel.com'] }
  ]
});

// Alert on review volume spike
const alert3 = await rtmn.alerts.create({
  name: 'Review Volume Spike',
  brandId: 'brand_abc123',
  trigger: {
    type: 'volume_spike',
    conditions: {
      reviewCount: { gt: 10 },
      period: '1h'
    }
  },
  actions: [
    { type: 'webhook', url: 'https://your-crm.com/webhooks/reviews' }
  ]
});
```

---

## Step 2: Configure Webhook Endpoint

Create a webhook handler to receive alerts:

```typescript
import express from 'express';
import crypto from 'crypto';

const app = express();

// Verify webhook signature
function verifySignature(payload: Buffer, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature.replace('sha256=', ''))
  );
}

app.post('/webhooks/brandpulse', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-brandpulse-signature'] as string;

  if (!verifySignature(req.body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body.toString());

  switch (event.type) {
    case 'alert.negative_review':
      handleNegativeReview(event.data);
      break;

    case 'alert.sentiment_threshold':
      handleSentimentDrop(event.data);
      break;

    case 'alert.volume_spike':
      handleVolumeSpike(event.data);
      break;
  }

  res.status(200).send('OK');
});

function handleNegativeReview(data: any) {
  console.log('Negative review:', data);

  // Create support ticket in your CRM
  createTicket({
    title: `Negative Review - ${data.source}`,
    description: data.reviewText,
    priority: 'high',
    tags: ['review', 'negative', data.source]
  });

  // Notify Slack
  sendSlackMessage({
    channel: '#hotel-alerts',
    text: `🚨 Negative review detected on ${data.source}`,
    attachments: [{
      color: 'danger',
      fields: [
        { title: 'Rating', value: `${data.rating}/5`, short: true },
        { title: 'Sentiment', value: data.sentimentScore.toFixed(2), short: true },
        { title: 'Review', value: data.reviewText.substring(0, 200) }
      ]
    }]
  });
}

function handleSentimentDrop(data: any) {
  console.log('Sentiment drop:', data);

  sendSlackMessage({
    channel: '#hotel-alerts',
    text: `⚠️ Sentiment score dropped to ${data.sentimentScore.toFixed(2)} (7-day average)`,
    attachments: [{
      color: 'warning',
      fields: [
        { title: 'Current Score', value: data.sentimentScore.toFixed(2), short: true },
        { title: 'Previous Score', value: data.previousScore.toFixed(2), short: true },
        { title: 'Change', value: `${(data.sentimentScore - data.previousScore).toFixed(2)}`, short: true }
      ]
    }]
  });
}

function handleVolumeSpike(data: any) {
  console.log('Volume spike:', data);
  // Investigate — could be a crisis or a positive viral moment
}
```

---

## Step 3: Set Up Slack Integration

```typescript
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function sendSlackMessage(message: any) {
  await slack.chat.postMessage(message);
}

// Example: Alert in Slack with action buttons
async function sendAlertWithActions(data: any) {
  await slack.chat.postMessage({
    channel: '#hotel-alerts',
    text: `🚨 Negative review needs attention`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Negative Review Detected*\n${data.reviewText.substring(0, 150)}...`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Review' },
            url: data.reviewUrl
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Respond' },
            action_id: 'respond_review'
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Dismiss' },
            action_id: 'dismiss_alert'
          }
        ]
      }
    ]
  });
}
```

---

## Step 4: Configure Email Alerts

```typescript
// Alert via email (using SendGrid)
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmailAlert(data: any) {
  await sgMail.send({
    to: ['manager@hotel.com', 'gm@hotel.com'],
    from: 'alerts@brandpulse.rtmn.io',
    subject: `🚨 Negative Review Alert - ${data.source}`,
    html: `
      <h2>Negative Review Detected</h2>
      <p><strong>Source:</strong> ${data.source}</p>
      <p><strong>Rating:</strong> ${data.rating}/5</p>
      <p><strong>Sentiment Score:</strong> ${data.sentimentScore.toFixed(2)}</p>
      <p><strong>Review:</strong></p>
      <blockquote>${data.reviewText}</blockquote>
      <p>
        <a href="${data.reviewUrl}">View Full Review</a> |
        <a href="${data.responseUrl}">Respond Now</a>
      </p>
    `
  });
}
```

---

## Step 5: Test Your Alerts

```typescript
// Create a test alert
await rtmn.alerts.test({
  alertId: alert1.id,
  testData: {
    sentimentScore: -0.5,
    reviewText: 'Terrible service, worst hotel ever!',
    source: 'google',
    rating: 1
  }
});
```

---

## Alert Best Practices

| Do | Don't |
|----|-------|
| ✅ Set specific thresholds | ❌ Alert on every single review |
| ✅ Include actionable information | ❌ Send vague alerts |
| ✅ Route to the right person | ❌ Email everyone |
| ✅ Set quiet hours | ❌ Alert at 3 AM for non-critical issues |
| ✅ Include direct links to respond | ❌ Make them search for the review |
| ✅ Test alerts before going live | ❌ Set and forget |

---

## Alert Templates

### Negative Review (Critical)

```
🚨 Negative Review Alert

Source: Google
Rating: 1/5
Sentiment: -0.85

"This was the worst experience of my life..."

Response time: 4 hours 23 minutes
Status: Needs response

[Respond Now] [View Review] [Dismiss]
```

### Sentiment Drop (Warning)

```
⚠️ Sentiment Score Dropped

Brand: Grand Hotel NYC
Current: 3.2 (was 4.1)
Change: -0.9

Top issues this week:
- Service: -0.3
- Cleanliness: -0.5
- Value: -0.2

[View Analysis] [Contact Team]
```

---

## Next Steps

- [Connect Review Sources](CONNECT-SOURCES.md)
- [Build Your First Dashboard](BRAND-DASHBOARD.md)
- [API Reference: Alerts](docs/api-reference/BRANDPULSE-API.md#alerts)
