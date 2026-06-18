/**
 * Genie Serendipity Service
 * Port: 4714
 *
 * Memory resurfacing engine - surfaces old memories at the right time
 * "One year ago you wanted to launch CorpPerks"
 * "You promised Ali you'd call him"
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.GENIE_SERENDIPITY_PORT || 4714;

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory stores
const memories = new Map();
const resurfacedItems = new Map();
const subscriptions = new Map();

// Sample memories for demo
const sampleMemories = [
  { id: 'mem-1', title: 'Business idea: CorpPerks', content: 'Launch a corporate perks platform for Indian startups', category: 'work', tags: ['idea', 'startup', 'corpperks'], createdAt: '2025-06-18T10:00:00Z' },
  { id: 'mem-2', title: 'Promise to Ali', content: 'Call Ali next week to discuss partnership', category: 'personal', tags: ['ali', 'call', 'promise'], createdAt: '2025-06-10T14:00:00Z' },
  { id: 'mem-3', title: 'Book recommendation', content: 'Read Atomic Habits by James Clear - highly recommended', category: 'personal', tags: ['book', 'habits', 'productivity'], createdAt: '2025-05-20T09:00:00Z' },
  { id: 'mem-4', title: 'Trip to Dubai', content: 'Plan trip to Dubai - visit investor meeting', category: 'travel', tags: ['dubai', 'investor', 'trip'], createdAt: '2025-04-15T11:00:00Z' },
  { id: 'mem-5', title: 'Learn Spanish', content: 'Add Spanish to New Year resolutions - by December 2025', category: 'personal', tags: ['spanish', 'resolution', 'learning'], createdAt: '2025-01-01T08:00:00Z' }
];

sampleMemories.forEach(m => memories.set(m.id, m));

// ==================== HEALTH ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-serendipity',
    version: '1.0.0',
    port: PORT,
    resurfacedCount: resurfacedItems.size
  });
});

// ==================== MAIN ENDPOINTS ====================

/**
 * GET /api/serendipity
 * Get resurfaced memories based on current context
 */
app.get('/api/serendipity', async (req, res) => {
  try {
    const { userId = 'default', context = {}, limit = 5 } = req.query;
    const contextObj = context === 'string' ? JSON.parse(context) : context;

    const items = await generateSerendipityItems({ userId, context: contextObj, limit: Number(limit) });

    res.json({
      success: true,
      items,
      count: items.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/serendipity/time
 * Get time-based resurfaced items (anniversaries, past events)
 */
app.get('/api/serendipity/time', async (req, res) => {
  try {
    const { userId = 'default', period = 'week' } = req.query;

    const items = await getTimeBasedResurfacing({ userId, period });

    res.json({
      success: true,
      type: 'time-based',
      period,
      items,
      count: items.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/serendipity/context
 * Get context-based resurfaced items
 */
app.get('/api/serendipity/context', async (req, res) => {
  try {
    const { userId = 'default', currentContext } = req.query;
    const context = currentContext ? JSON.parse(currentContext) : {};

    const items = await getContextBasedResurfacing({ userId, context });

    res.json({
      success: true,
      type: 'context-based',
      items,
      count: items.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/serendipity/people
 * Get resurfaced memories about people
 */
app.get('/api/serendipity/people', async (req, res) => {
  try {
    const { userId = 'default', limit = 5 } = req.query;

    const items = await getPeopleBasedResurfacing({ userId, limit: Number(limit) });

    res.json({
      success: true,
      type: 'people-based',
      items,
      count: items.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/serendipity/daily
 * Get daily resurfaced items (one for each day of the week)
 */
app.get('/api/serendipity/daily', async (req, res) => {
  try {
    const { userId = 'default' } = req.query;

    const items = await generateDailySerendipity({ userId });

    res.json({
      success: true,
      type: 'daily',
      items,
      count: items.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== FEEDBACK ====================

/**
 * POST /api/serendipity/:id/feedback
 * Track user feedback on resurfaced items
 */
app.post('/api/serendipity/:id/feedback', (req, res) => {
  const { useful, userId = 'default' } = req.body;

  const item = resurfacedItems.get(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }

  item.feedback = { useful, timestamp: new Date().toISOString(), userId };

  // Learn from feedback
  if (useful) {
    item.resurfacedCount = (item.resurfacedCount || 0) + 1;
    item.successScore = (item.successScore || 0) + 1;
  } else {
    item.successScore = (item.successScore || 1) - 0.5;
  }

  resurfacedItems.set(item.id, item);

  res.json({ success: true, item });
});

/**
 * GET /api/serendipity/history
 * Get resurfacing history
 */
app.get('/api/serendipity/history', (req, res) => {
  const { userId, limit = 50 } = req.query;

  const history = Array.from(resurfacedItems.values())
    .filter(item => !userId || item.userId === userId)
    .sort((a, b) => new Date(b.resurfacedAt) - new Date(a.resurfacedAt))
    .slice(0, Number(limit));

  res.json({ success: true, history, count: history.length });
});

// ==================== SUBSCRIPTIONS ====================

/**
 * POST /api/subscribe
 * Subscribe to resurfaced memories
 */
app.post('/api/subscribe', (req, res) => {
  const { userId, frequency = 'daily', channels = ['whatsapp'], preferences = {} } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId required' });
  }

  const subscription = {
    id: uuidv4(),
    userId,
    frequency,
    channels,
    preferences: {
      maxItems: preferences.maxItems || 3,
      topics: preferences.topics || ['all'],
      excludeTopics: preferences.excludeTopics || [],
      ...preferences
    },
    active: true,
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

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId required' });
  }

  const userSubs = Array.from(subscriptions.values())
    .filter(s => s.userId === userId && s.active);

  res.json({ success: true, subscriptions: userSubs });
});

// ==================== GENERATION HELPERS ====================

async function generateSerendipityItems({ userId, context, limit }) {
  const items = [];
  const now = new Date();

  // 1. Time-based (anniversaries)
  const timeItems = await getTimeBasedResurfacing({ userId, period: 'month' });
  items.push(...timeItems.slice(0, 2));

  // 2. People-based
  const peopleItems = await getPeopleBasedResurfacing({ userId, limit: 2 });
  items.push(...peopleItems);

  // 3. Promise/follow-up reminders
  const promiseItems = getPromiseResurfacing();
  items.push(...promiseItems);

  // 4. Pattern matching with current context
  if (context.topic || context.activity) {
    const contextItems = await getContextBasedResurfacing({ userId, context });
    items.push(...contextItems.slice(0, 1));
  }

  return items.slice(0, limit);
}

async function getTimeBasedResurfacing({ userId, period }) {
  const items = [];
  const now = new Date();
  const allMemories = Array.from(memories.values());

  // Find memories from the same period last year
  allMemories.forEach(memory => {
    const memoryDate = new Date(memory.createdAt);
    const lastYearDate = new Date(now);
    lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);

    // Check if same day last year
    if (
      memoryDate.getMonth() === lastYearDate.getMonth() &&
      memoryDate.getDate() === lastYearDate.getDate()
    ) {
      items.push({
        id: `ser-${uuidv4()}`,
        userId,
        type: 'anniversary',
        trigger: 'same-day-last-year',
        title: `On this day last year: ${memory.title}`,
        description: memory.content,
        relatedMemory: memory,
        resurfacedAt: now.toISOString(),
        resurfacedCount: 0,
        successScore: 0,
        icon: '📅'
      });
    }
  });

  // Find promises/commitments due
  const promiseKeywords = ['promise', 'should', 'must', 'need to', 'by'];
  allMemories.forEach(memory => {
    const hasPromise = promiseKeywords.some(k => memory.content?.toLowerCase().includes(k));
    if (hasPromise) {
      const daysSince = Math.floor((now - new Date(memory.createdAt)) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7 && daysSince <= 14) {
        items.push({
          id: `ser-${uuidv4()}`,
          userId,
          type: 'follow-up',
          trigger: 'pending-promise',
          title: `Follow up: ${memory.title}`,
          description: `You noted this ${daysSince} days ago: "${memory.content.substring(0, 100)}..."`,
          relatedMemory: memory,
          resurfacedAt: now.toISOString(),
          resurfacedCount: 0,
          successScore: 0,
          icon: '🔔'
        });
      }
    }
  });

  return items;
}

async function getPeopleBasedResurfacing({ userId, limit }) {
  const items = [];
  const now = new Date();
  const allMemories = Array.from(memories.values());

  // Find memories about people who haven't been contacted recently
  const personKeywords = ['ali', 'rahul', 'priya', 'amit', 'friend', 'call', 'meet'];

  allMemories.forEach(memory => {
    const hasPerson = personKeywords.some(k => memory.content?.toLowerCase().includes(k));
    if (hasPerson && memory.createdAt) {
      const daysSince = Math.floor((now - new Date(memory.createdAt)) / (1000 * 60 * 60 * 24));

      // Surface if person mentioned but not contacted in 7+ days
      if (daysSince >= 7 && daysSince <= 30) {
        // Extract person name
        const personMatch = memory.content.match(/(?:call|meet|message|text)\s+([A-Z][a-z]+)/i);
        const personName = personMatch ? personMatch[1] : 'someone';

        items.push({
          id: `ser-${uuidv4()}`,
          userId,
          type: 'people',
          trigger: 'person-follow-up',
          title: `You mentioned ${personName}`,
          description: `"${memory.content.substring(0, 80)}..."`,
          relatedMemory: memory,
          action: `Call ${personName}`,
          resurfacedAt: now.toISOString(),
          resurfacedCount: 0,
          successScore: 0,
          icon: '👤'
        });
      }
    }
  });

  return items.slice(0, limit);
}

function getPromiseResurfacing() {
  const items = [];
  const now = new Date();

  // Find memories with promises/commitments
  const allMemories = Array.from(memories.values());
  allMemories.forEach(memory => {
    const content = memory.content?.toLowerCase() || '';
    if (content.includes('promise') || content.includes('said i would')) {
      items.push({
        id: `ser-${uuidv4()}`,
        userId: memory.userId || 'default',
        type: 'promise',
        trigger: 'kept-promise',
        title: 'Did you keep this promise?',
        description: memory.content,
        relatedMemory: memory,
        resurfacedAt: now.toISOString(),
        resurfacedCount: 0,
        successScore: 0,
        icon: '🤝'
      });
    }
  });

  return items.slice(0, 2);
}

async function getContextBasedResurfacing({ userId, context }) {
  const items = [];
  const allMemories = Array.from(memories.values());
  const now = new Date();

  // Match current context with old memories
  const contextKeywords = [
    context.topic,
    context.activity,
    context.location,
    context.emotion
  ].filter(Boolean);

  allMemories.forEach(memory => {
    const content = `${memory.title} ${memory.content}`.toLowerCase();
    const hasMatch = contextKeywords.some(k => content.includes(k?.toLowerCase()));

    if (hasMatch) {
      items.push({
        id: `ser-${uuidv4()}`,
        userId,
        type: 'context-match',
        trigger: 'similar-context',
        title: `Related to what you're doing: ${memory.title}`,
        description: memory.content,
        relatedMemory: memory,
        matchedContext: context,
        resurfacedAt: now.toISOString(),
        resurfacedCount: 0,
        successScore: 0,
        icon: '💡'
      });
    }
  });

  return items;
}

async function generateDailySerendipity({ userId }) {
  const dayOfWeek = new Date().getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return [
    {
      id: `ser-daily-${dayOfWeek}`,
      userId,
      type: 'daily',
      trigger: 'day-of-week',
      title: `${dayNames[dayOfWeek]} Reflection`,
      description: 'What did you accomplish this day last week? Last month?',
      icon: dayOfWeek === 0 ? '🌟' : dayOfWeek === 6 ? '🎉' : '💭',
      suggestions: [
        'Review your weekly goals',
        'Check pending follow-ups',
        'Look at your gratitude journal'
      ]
    },
    {
      id: `ser-weekly-${dayOfWeek}`,
      userId,
      type: 'weekly',
      trigger: 'weekly-pattern',
      title: 'Weekly Pattern',
      description: 'You tend to be most productive on Tuesdays. Want to schedule focus time?',
      icon: '📊',
      action: 'Schedule focus time'
    }
  ];
}

app.listen(PORT, () => {
  console.log(`✨ Genie Serendipity Service started on port ${PORT}`);
  console.log('   Surfacing old memories at the right time');
});

module.exports = app;
