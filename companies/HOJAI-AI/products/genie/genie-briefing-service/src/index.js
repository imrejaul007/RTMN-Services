/**
 * Genie Briefing Service
 *
 * Port: 4712
 *
 * Daily briefings: Morning, Evening, Weekly
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.GENIE_BRIEFING_PORT || 4712;

app.use(helmet());
app.use(cors());
app.use(express.json());

const serviceConfig = {
  calendarUrl: process.env.CALENDAR_URL || 'http://localhost:4709',
  memoryInboxUrl: process.env.MEMORY_INBOX_URL || 'http://localhost:4710',
  healthTwinUrl: process.env.HEALTH_TWIN_URL || 'http://localhost:4717'
};

const briefings = new PersistentMap('briefings', { serviceName: 'genie-briefing-service' });
const subscriptions = new PersistentMap('subscriptions', { serviceName: 'genie-briefing-service' });

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'genie-briefing-service', port: PORT, version: '1.0.0' });
});

/**
 * GET /api/briefing/morning
 */
app.get('/api/briefing/morning', async (req, res) => {
  try {
    const { userId = 'default', date = new Date().toISOString().split('T')[0] } = req.query;
    const briefing = await generateMorningBriefing({ userId, date });
    briefings.set(briefing.id, briefing);
    res.json({ success: true, briefing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/briefing/evening
 */
app.get('/api/briefing/evening', async (req, res) => {
  try {
    const { userId = 'default', date = new Date().toISOString().split('T')[0] } = req.query;
    const briefing = await generateEveningBriefing({ userId, date });
    briefings.set(briefing.id, briefing);
    res.json({ success: true, briefing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/briefing/weekly
 */
app.get('/api/briefing/weekly', async (req, res) => {
  try {
    const { userId = 'default' } = req.query;
    const briefing = await generateWeeklyBriefing({ userId });
    briefings.set(briefing.id, briefing);
    res.json({ success: true, briefing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/briefing/today
 */
app.get('/api/briefing/today', async (req, res) => {
  try {
    const { userId = 'default' } = req.query;
    const hour = new Date().getHours();
    const briefing = hour < 12 
      ? await generateMorningBriefing({ userId })
      : await generateEveningBriefing({ userId });
    briefings.set(briefing.id, briefing);
    res.json({ success: true, briefing, type: hour < 12 ? 'morning' : 'evening' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/briefing/history
 * (registered before /:id so Express doesn't treat "history" as an id)
 */
app.get('/api/briefing/history', (req, res) => {
  const { userId, type, limit = 10 } = req.query;
  let result = Array.from(briefings.values());
  if (userId) result = result.filter(b => b.userId === userId);
  if (type) result = result.filter(b => b.type === type);
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  result = result.slice(0, Number(limit));
  res.json({ success: true, briefings: result });
});

/**
 * GET /api/briefing/:id
 */
app.get('/api/briefing/:id', (req, res) => {
  const briefing = briefings.get(req.params.id);
  if (!briefing) return res.status(404).json({ success: false, error: 'Briefing not found' });
  res.json({ success: true, briefing });
});

/**
 * POST /api/subscribe
 */
app.post('/api/subscribe',requireAuth,  (req, res) => {
  const { userId, type = 'both', time = '08:00', channels = ['whatsapp'] } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
  
  const subscription = {
    id: uuidv4(), userId, type, time, channels, active: true,
    createdAt: new Date().toISOString()
  };
  subscriptions.set(subscription.id, subscription);
  res.status(201).json({ success: true, subscription });
});

/**
 * GET /api/subscriptions
 */
app.get('/api/subscriptions', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
  const userSubs = Array.from(subscriptions.values()).filter(s => s.userId === userId && s.active);
  res.json({ success: true, subscriptions: userSubs });
});

/**
 * DELETE /api/subscribe/:id
 */
app.delete('/api/subscribe/:id',requireAuth,  (req, res) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) return res.status(404).json({ success: false, error: 'Not found' });
  sub.active = false;
  subscriptions.set(sub.id, sub);
  res.json({ success: true, message: 'Unsubscribed' });
});

async function generateMorningBriefing({ userId, date }) {
  const today = new Date(date);
  const greeting = today.getHours() < 12 ? 'Good Morning' : 'Good Evening';
  
  return {
    id: uuidv4(),
    userId,
    type: 'morning',
    date,
    greeting: `${greeting}! Here's your briefing for ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`,
    sections: [
      {
        type: 'weather',
        title: 'Weather',
        icon: '☀️',
        content: 'Sunny, 28°C in Mumbai',
        details: { temperature: 28, condition: 'sunny', location: 'Mumbai' }
      },
      {
        type: 'calendar',
        title: "Today's Schedule",
        icon: '📅',
        content: '3 meetings scheduled',
        items: [
          { time: '10:00 AM', title: 'Team Standup', location: 'Zoom' },
          { time: '2:00 PM', title: 'Client Call', location: 'Google Meet' },
          { time: '4:00 PM', title: 'Project Review', location: 'Office' }
        ]
      },
      {
        type: 'tasks',
        title: 'Pending Tasks',
        icon: '📋',
        content: '5 tasks need attention',
        items: [
          { task: 'Review Q2 report', priority: 'high', due: 'Today' },
          { task: 'Send proposal to client', priority: 'high', due: 'Today' },
          { task: 'Update project docs', priority: 'medium', due: 'Tomorrow' }
        ]
      },
      {
        type: 'health',
        title: 'Health Summary',
        icon: '❤️',
        content: 'Your health metrics',
        metrics: [
          { metric: 'Steps', value: '7,234', target: '10,000', progress: 72 },
          { metric: 'Sleep', value: '7.5 hrs', target: '8 hrs', progress: 94 },
          { metric: 'Water', value: '5 glasses', target: '8 glasses', progress: 62 }
        ]
      },
      {
        type: 'reminders',
        title: 'Important Reminders',
        icon: '🔔',
        items: [
          "Call Dr. Sharma at 11 AM",
          "Submit expense report by EOD",
          "Birthday: Rahul's birthday tomorrow"
        ]
      },
      {
        type: 'priorities',
        title: 'Suggested Priorities',
        icon: '⭐',
        items: [
          { priority: 1, task: 'Client presentation prep' },
          { priority: 2, task: 'Review budget proposal' },
          { priority: 3, task: 'Follow up with sales team' }
        ]
      }
    ],
    createdAt: new Date().toISOString()
  };
}

async function generateEveningBriefing({ userId, date }) {
  return {
    id: uuidv4(),
    userId,
    type: 'evening',
    date,
    greeting: 'Good Evening! Here\'s your day summary.',
    sections: [
      {
        type: 'summary',
        title: 'Day Summary',
        icon: '📊',
        content: 'A productive day with 3 meetings and 4 tasks completed',
        stats: {
          meetings: 3,
          tasksCompleted: 4,
          tasksPending: 2,
          focusHours: 5.5
        }
      },
      {
        type: 'completed',
        title: 'Completed Today',
        icon: '✅',
        items: [
          'Team standup attended',
          'Client proposal sent',
          'Budget review completed',
          'Followed up with 3 leads'
        ]
      },
      {
        type: 'pending',
        title: 'Still Pending',
        icon: '⏳',
        items: [
          'Update project documentation',
          'Review design mockups'
        ]
      },
      {
        type: 'tomorrow',
        title: 'Tomorrow',
        icon: '📆',
        items: [
          { time: '9:00 AM', title: 'Strategy Meeting' },
          { time: '2:00 PM', title: ' investor Call' },
          { time: '5:00 PM', title: 'Weekly Review' }
        ]
      },
      {
        type: 'health',
        title: 'Health Today',
        icon: '❤️',
        metrics: [
          { metric: 'Steps Taken', value: '8,542', goal: '10,000' },
          { metric: 'Active Hours', value: '2.5 hrs', goal: '3 hrs' },
          { metric: 'Water', value: '7 glasses', goal: '8 glasses' }
        ]
      },
      {
        type: 'sleep',
        title: 'Sleep Tonight',
        icon: '😴',
        content: 'Target: 8 hours. Suggested bedtime: 10:30 PM',
        reminder: 'Wind down routine: dim lights, avoid screens'
      }
    ],
    createdAt: new Date().toISOString()
  };
}

async function generateWeeklyBriefing({ userId }) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  return {
    id: uuidv4(),
    userId,
    type: 'weekly',
    dateRange: { start: weekStart.toISOString().split('T')[0], end: weekEnd.toISOString().split('T')[0] },
    greeting: `Your week at a glance: ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    sections: [
      {
        type: 'overview',
        title: 'Week Overview',
        icon: '📊',
        content: 'A great week with significant progress',
        stats: {
          tasksCompleted: 18,
          meetingsHeld: 12,
          newLeads: 8,
          revenue: '₹2.5L',
          focusHours: 32
        }
      },
      {
        type: 'highlights',
        title: 'Highlights',
        icon: '🌟',
        items: [
          'Closed deal with TechCorp worth ₹5L',
          'Launched new marketing campaign',
          'Shipped v2.0 of the product',
          'Hired 2 new team members'
        ]
      },
      {
        type: 'metrics',
        title: 'Key Metrics',
        icon: '📈',
        metrics: [
          { metric: 'Tasks Done', value: '18/25', trend: 'up' },
          { metric: 'Meetings', value: '12', trend: 'down' },
          { metric: 'Focus Time', value: '32 hrs', trend: 'up' },
          { metric: 'Health Score', value: '85%', trend: 'stable' }
        ]
      },
      {
        type: 'delayed',
        title: 'Delayed Items',
        icon: '⚠️',
        items: [
          'API documentation (2 days overdue)',
          'Design review (1 day overdue)'
        ]
      },
      {
        type: 'nextweek',
        title: 'Next Week Priorities',
        icon: '🎯',
        items: [
          'Q3 planning session',
          'Investor pitch preparation',
          'Team performance reviews',
          'Product launch event'
        ]
      }
    ],
    createdAt: new Date().toISOString()
  };
}
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



// Install readiness routes (LLM + DB + combined readiness)
installReadinessRoutes(app, { serviceName: 'genie-briefing-service' });

// Seed subscriptions with demo data on first boot
const seedPlans = [
  {
    store: subscriptions,
    items: normalizeSeedData([
      { id: 'sub-morning-1', userId: 'demo-user', type: 'morning', time: '08:00', channels: ['whatsapp', 'email'], active: true },
      { id: 'sub-evening-1', userId: 'demo-user', type: 'evening', time: '20:00', channels: ['email'], active: true },
      { id: 'sub-weekly-1', userId: 'demo-user', type: 'weekly', time: '09:00', channels: ['whatsapp'], active: true },
      { id: 'sub-both-1', userId: 'demo-user', type: 'both', time: '08:00', channels: ['whatsapp'], active: true },
      { id: 'sub-morning-2', userId: 'demo-user-2', type: 'morning', time: '07:30', channels: ['push'], active: true },
    ]),
  },
];
const seeded = autoSeed(seedPlans, { serviceName: 'genie-briefing-service' });
if (seeded) console.log('[genie-briefing-service] demo data seeded');

const server = app.listen(PORT, () => {
  console.log('📋 Genie Briefing Service started on port ' + PORT);
});
installGracefulShutdown(server);

module.exports = app;
