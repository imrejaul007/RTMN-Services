# Tutorial: Build a Custom Workflow

**Create automated workflows that connect BrandPulse data to your business processes.**

**Time:** 30 minutes
**Prerequisites:** RTNM SDK, basic understanding of webhooks

---

## What You'll Build

An automated workflow that:
1. Detects a negative review mentioning a specific issue
2. Creates a task in your task management system
3. Assigns it to the right team member
4. Sends a Slack notification
5. Tracks resolution

---

## Step 1: Define Your Workflow

```
┌─────────────────┐
│ Negative Review │
│  Detected       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Analyze Review  │
│ (Extract Issues)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Categorize Issue│
│ (Service/Clean/ │
│  Food/Value)    │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│Kitchen│ │Service│
│ Issue │ │ Issue │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Create │ │Create │
│Task   │ │Task   │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌─────────────────┐
│ Slack Notification│
│ (To Team)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Track Resolution│
│ (Update Review) │
└─────────────────┘
```

---

## Step 2: Create the Workflow Engine

```typescript
import { RTMNClient } from '@rtmn/sdk';
import { WebClient } from '@slack/web-api';

const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY
});

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Issue categories and their routing
const ISSUE_CATEGORIES = {
  service: {
    keywords: ['service', 'staff', 'rude', 'wait', 'attentive', 'helpful'],
    team: 'front-desk',
    priority: 'high'
  },
  cleanliness: {
    keywords: ['clean', 'dirty', 'smell', 'stain', 'dust', 'bathroom'],
    team: 'housekeeping',
    priority: 'high'
  },
  food: {
    keywords: ['food', 'meal', 'restaurant', 'breakfast', 'dinner', 'taste'],
    team: 'kitchen',
    priority: 'medium'
  },
  value: {
    keywords: ['price', 'value', 'expensive', 'overpriced', 'worth'],
    team: 'management',
    priority: 'low'
  },
  room: {
    keywords: ['room', 'bed', 'ac', 'noise', 'view', 'bathroom'],
    team: 'maintenance',
    priority: 'medium'
  }
};

// Main workflow function
async function processReviewWorkflow(review: any) {
  console.log('Processing review:', review.id);

  // Step 1: Analyze review
  const analysis = await rtmn.brandpulse.analytics.analyzeReview(review.id);

  if (analysis.sentimentScore > -0.2) {
    console.log('Review not negative enough, skipping');
    return;
  }

  // Step 2: Categorize issues
  const issues = categorizeIssues(review.text);

  if (issues.length === 0) {
    console.log('No identifiable issues, skipping');
    return;
  }

  // Step 3: Create tasks for each issue
  const tasks = [];
  for (const issue of issues) {
    const task = await createTask(review, issue);
    tasks.push(task);
  }

  // Step 4: Send Slack notification
  await sendSlackNotification(review, issues, tasks);

  // Step 5: Update review with workflow status
  await rtmn.brandpulse.reviews.update(review.id, {
    workflowStatus: 'in_progress',
    tasksCreated: tasks.map(t => t.id)
  });

  console.log('Workflow complete:', { tasksCreated: tasks.length });
}
```

---

## Step 3: Issue Categorization

```typescript
function categorizeIssues(text: string): Issue[] {
  const lowerText = text.toLowerCase();
  const foundIssues: Issue[] = [];

  for (const [category, config] of Object.entries(ISSUE_CATEGORIES)) {
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword)) {
        // Check if already added
        if (!foundIssues.some(i => i.category === category)) {
          foundIssues.push({
            category,
            keyword,
            team: config.team,
            priority: config.priority
          });
        }
        break; // Only add once per category
      }
    }
  }

  return foundIssues;
}

interface Issue {
  category: string;
  keyword: string;
  team: string;
  priority: 'high' | 'medium' | 'low';
}
```

---

## Step 4: Task Creation

```typescript
async function createTask(review: any, issue: Issue): Promise<any> {
  // Create task in RTNM
  const task = await rtmn.tasks.create({
    title: `[${review.source}] ${issue.category} issue reported`,
    description: `
Review Issue Detected

Source: ${review.source}
Rating: ${review.rating}/5
Sentiment: ${analysis.sentimentScore}

Issue Category: ${issue.category}
Matched Keyword: "${issue.keyword}"

Review Text:
${review.text}

Actions Required:
1. Review the full review: ${review.url}
2. Investigate the ${issue.category} issue
3. Take corrective action
4. Update this task with resolution

Review Date: ${review.createdAt}
    `.trim(),
    priority: issue.priority,
    assignedTo: issue.team,
    dueDate: getDueDate(issue.priority),
    tags: ['review-response', issue.category, review.source],
    customFields: {
      reviewId: review.id,
      brandId: review.brandId,
      source: review.source,
      rating: review.rating
    }
  });

  return task;
}

function getDueDate(priority: string): Date {
  const now = new Date();
  switch (priority) {
    case 'high': return new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
    case 'medium': return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    case 'low': return new Date(now.getTime() + 72 * 60 * 60 * 1000); // 3 days
  }
}
```

---

## Step 5: Slack Notifications

```typescript
async function sendSlackNotification(review: any, issues: Issue[], tasks: any[]) {
  const priorityEmoji = {
    high: '🔴',
    medium: '🟡',
    low: '🟢'
  };

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${priorityEmoji[issues[0].priority]} Negative Review - Action Required`
      }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Source:*\n${review.source}` },
        { type: 'mrkdwn', text: `*Rating:*\n${review.rating}/5` },
        { type: 'mrkdwn', text: `*Issues:*\n${issues.map(i => i.category).join(', ')}` },
        { type: 'mrkdwn', text: `*Tasks Created:*\n${tasks.length}` }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Review Excerpt:*\n${review.text.substring(0, 200)}...`
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View Review' },
          url: review.url
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View Tasks' },
          action_id: 'view_tasks'
        }
      ]
    }
  ];

  // Send to team channels based on issues
  const channels = [...new Set(issues.map(i => i.team))];

  for (const channel of channels) {
    try {
      await slack.chat.postMessage({
        channel: `#${channel}`,
        blocks,
        text: `Negative review requires attention from ${channel} team`
      });
    } catch (error) {
      console.error(`Failed to send to #${channel}:`, error);
    }
  }
}
```

---

## Step 6: Subscribe to Events

```typescript
// Set up event subscription
async function initializeWorkflow() {
  // Subscribe to all review events
  rtmn.events.subscribe('brandpulse.review.created', async (event) => {
    const review = event.data;
    await processReviewWorkflow(review);
  });

  // Also process existing reviews
  const existingReviews = await rtmn.brandpulse.reviews.list({
    brandId: 'brand_abc123',
    sentiment: 'negative',
    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
  });

  for (const review of existingReviews.data) {
    if (!review.workflowStatus) {
      await processReviewWorkflow(review);
    }
  }

  console.log('Workflow initialized. Monitoring for new reviews...');
}

// Run the workflow
initializeWorkflow().catch(console.error);
```

---

## Step 7: Resolution Tracking

```typescript
// When a task is completed
rtmn.events.subscribe('rtnm.task.completed', async (event) => {
  const { task, completedBy } = event.data;

  if (task.tags?.includes('review-response')) {
    const reviewId = task.customFields?.reviewId;
    if (reviewId) {
      // Update review with task resolution
      await rtmn.brandpulse.reviews.update(reviewId, {
        $push: {
          resolutions: {
            taskId: task.id,
            resolvedBy: completedBy,
            resolvedAt: new Date(),
            category: task.tags.find(t => Object.keys(ISSUE_CATEGORIES).includes(t))
          }
        }
      });

      // Check if all tasks are resolved
      const review = await rtmn.brandpulse.reviews.get(reviewId);
      const allResolved = review.tasksCreated?.every(t => t.status === 'completed');

      if (allResolved) {
        await rtmn.brandpulse.reviews.update(reviewId, {
          workflowStatus: 'resolved'
        });

        // Send resolution summary to Slack
        await slack.chat.postMessage({
          channel: '#hotel-operations',
          text: `✅ All tasks resolved for review ${reviewId}. Workflow complete.`
        });
      }
    }
  }
});
```

---

## Complete Workflow Code

```typescript
import { RTMNClient } from '@rtmn/sdk';
import { WebClient } from '@slack/web-api';

const rtmn = new RTMNClient({ apiKey: process.env.RTMN_API_KEY });
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const ISSUE_CATEGORIES = {
  service: { keywords: ['service', 'staff', 'rude', 'wait'], team: 'front-desk', priority: 'high' },
  cleanliness: { keywords: ['clean', 'dirty', 'smell'], team: 'housekeeping', priority: 'high' },
  food: { keywords: ['food', 'meal', 'restaurant'], team: 'kitchen', priority: 'medium' },
  value: { keywords: ['price', 'value', 'expensive'], team: 'management', priority: 'low' },
  room: { keywords: ['room', 'bed', 'ac', 'noise'], team: 'maintenance', priority: 'medium' }
};

async function main() {
  // Subscribe to new reviews
  rtmn.events.subscribe('brandpulse.review.created', async (event) => {
    const review = event.data;
    if (review.sentimentScore < -0.2) {
      const issues = categorizeIssues(review.text);
      for (const issue of issues) {
        const task = await rtmn.tasks.create({
          title: `[${review.source}] ${issue.category} issue`,
          description: review.text,
          priority: issue.priority,
          assignedTo: issue.team,
          tags: ['review-response', issue.category]
        });
        await slack.chat.postMessage({
          channel: `#${issue.team}`,
          text: `Review issue: ${issue.category} - ${review.url}`
        });
      }
    }
  });

  console.log('Review workflow running...');
}

main().catch(console.error);
```

---

## Next Steps

- [Hotel OS Integration](HOTEL-INTEGRATION.md)
- [Digital Twins Deep Dive](docs/concepts/DIGITAL-TWINS.md)
- [Event Bus Reference](docs/concepts/EVENT-BUS.md)
