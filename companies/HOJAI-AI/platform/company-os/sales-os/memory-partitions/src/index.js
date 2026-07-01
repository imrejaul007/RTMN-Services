/**
 * Sales Memory Partitions - SalesOS
 *
 * Customer memory storage for SalesOS:
 * - Interactions history
 * - Preferences
 * - Key facts
 * - AI context
 *
 * Port: 5065
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5065;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ============================================================
// INTERFACES
// ============================================================

/**
 * @typedef {Object} CustomerMemory
 * @property {string} customerId
 * @property {Interaction[]} interactions
 * @property {Preferences} preferences
 * @property {HistoryEntry[]} history
 * @property {AIContext} aiContext
 */

/**
 * @typedef {Object} Interaction
 * @property {string} id
 * @property {string} type - call, email, meeting, whatsapp, in_app
 * @property {Date} date
 * @property {string} summary
 * @property {string} outcome
 * @property {string} sentiment
 */

/**
 * @typedef {Object} Preferences
 * @property {string} channel - whatsapp, email, call
 * @property {string} time - morning, afternoon, evening
 * @property {string} language - en, hi, etc
 * @property {string} tone - formal, casual
 */

/**
 * @typedef {Object} AIContext
 * @property {Date} lastResearch
 * @property {string} contextSummary
 * @property {string[]} keyFacts
 * @property {string[]} openQuestions
 * @property {string[]} preferredTopics
 */

// ============================================================
// STORAGE
// ============================================================

const memories = new Map();

// Sample memories
const sampleMemories = [
  {
    customerId: 'CUS001',
    interactions: [
      { id: uuidv4(), type: 'meeting', date: new Date(), summary: 'Q2 business review - impressive growth', outcome: 'positive', sentiment: 'positive' },
      { id: uuidv4(), type: 'email', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), summary: 'Discussed expansion requirements', outcome: 'action_items', sentiment: 'neutral' },
      { id: uuidv4(), type: 'call', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), summary: 'Technical deep dive on API integration', outcome: 'positive', sentiment: 'positive' },
    ],
    preferences: { channel: 'whatsapp', time: 'morning', language: 'en', tone: 'casual' },
    history: [
      { id: uuidv4(), date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), type: 'purchase', description: 'Enterprise license renewed', value: 150000 },
      { id: uuidv4(), date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), type: 'expansion', description: 'Added 20 seats', value: 50000 },
    ],
    aiContext: {
      lastResearch: new Date(),
      contextSummary: 'TechCorp is a fast-growing tech company in Bangalore. Currently using enterprise plan with 50 seats. Interested in GCC expansion.',
      keyFacts: [
        'VP Engineering (Rahul) is the champion',
        'CFO (Priya) is the economic buyer',
        'Interested in GCC expansion features',
        'Current usage: 85% of allocated seats',
        'High engagement - logs in daily',
        'Preferred contact: WhatsApp, mornings',
      ],
      openQuestions: [
        'What is the timeline for GCC expansion?',
        'Are there budget constraints for Q3?',
      ],
      preferredTopics: ['AI features', 'Analytics', 'Integration'],
    },
  },
  {
    customerId: 'CUS002',
    interactions: [
      { id: uuidv4(), type: 'call', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), summary: 'Discussed billing concerns', outcome: 'resolved', sentiment: 'neutral' },
      { id: uuidv4(), type: 'email', date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), summary: 'Follow-up on feature request', outcome: 'pending', sentiment: 'neutral' },
    ],
    preferences: { channel: 'email', time: 'afternoon', language: 'en', tone: 'formal' },
    history: [
      { id: uuidv4(), date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), type: 'purchase', description: 'Professional plan subscribed', value: 60000 },
    ],
    aiContext: {
      lastResearch: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      contextSummary: 'Global Retail Solutions is a retail company in Delhi. Using professional plan with 15 seats. Had billing issues last month.',
      keyFacts: [
        'CTO (Amit) is the champion',
        'Had billing dispute in June - resolved',
        'Feature request: Custom reporting',
        'Engagement is declining - login twice weekly',
        'Prefers email communication',
      ],
      openQuestions: [
        'Is the billing issue truly resolved?',
        'What features would improve their experience?',
      ],
      preferredTopics: ['Reporting', 'Customization'],
    },
  },
];

sampleMemories.forEach(m => memories.set(m.customerId, m));

// ============================================================
// HEALTH
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Sales Memory Partitions',
    version: '1.0.0',
    port: PORT,
    memoriesCount: memories.size,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// MEMORY CRUD
// ============================================================

app.get('/:customerId', (req, res) => {
  const memory = memories.get(req.params.customerId);
  if (!memory) {
    return res.json({
      success: true,
      memory: {
        customerId: req.params.customerId,
        interactions: [],
        preferences: { channel: 'email', time: 'morning', language: 'en', tone: 'formal' },
        history: [],
        aiContext: {
          lastResearch: null,
          contextSummary: '',
          keyFacts: [],
          openQuestions: [],
          preferredTopics: [],
        },
      },
    });
  }
  res.json({ success: true, memory });
});

app.put('/:customerId', (req, res) => {
  const existing = memories.get(req.params.customerId) || {
    customerId: req.params.customerId,
    interactions: [],
    preferences: { channel: 'email', time: 'morning', language: 'en', tone: 'formal' },
    history: [],
    aiContext: { lastResearch: null, contextSummary: '', keyFacts: [], openQuestions: [], preferredTopics: [] },
  };

  const updated = { ...existing, ...req.body };
  memories.set(req.params.customerId, updated);
  res.json({ success: true, memory: updated });
});

// ============================================================
// INTERACTIONS
// ============================================================

app.post('/:customerId/interactions', (req, res) => {
  let memory = memories.get(req.params.customerId);
  if (!memory) {
    memory = {
      customerId: req.params.customerId,
      interactions: [],
      preferences: { channel: 'email', time: 'morning', language: 'en', tone: 'formal' },
      history: [],
      aiContext: { lastResearch: null, contextSummary: '', keyFacts: [], openQuestions: [], preferredTopics: [] },
    };
  }

  const interaction = {
    id: uuidv4(),
    type: req.body.type || 'manual',
    date: new Date(),
    summary: req.body.summary,
    outcome: req.body.outcome,
    sentiment: req.body.sentiment,
    ...req.body,
  };

  memory.interactions.unshift(interaction);
  if (memory.interactions.length > 100) memory.interactions.pop();
  memories.set(req.params.customerId, memory);

  res.json({ success: true, interaction, memory });
});

app.get('/:customerId/interactions', (req, res) => {
  const memory = memories.get(req.params.customerId);
  if (!memory) return res.json({ success: true, interactions: [] });

  const { limit = 50, type, since } = req.query;
  let interactions = [...memory.interactions];

  if (type) interactions = interactions.filter(i => i.type === type);
  if (since) interactions = interactions.filter(i => new Date(i.date) > new Date(since));

  res.json({
    success: true,
    count: interactions.length,
    interactions: interactions.slice(0, Number(limit)),
  });
});

// ============================================================
// HISTORY
// ============================================================

app.post('/:customerId/history', (req, res) => {
  let memory = memories.get(req.params.customerId);
  if (!memory) {
    memory = {
      customerId: req.params.customerId,
      interactions: [],
      preferences: { channel: 'email', time: 'morning', language: 'en', tone: 'formal' },
      history: [],
      aiContext: { lastResearch: null, contextSummary: '', keyFacts: [], openQuestions: [], preferredTopics: [] },
    };
  }

  const entry = {
    id: uuidv4(),
    date: new Date(),
    type: req.body.type,
    description: req.body.description,
    value: req.body.value,
    ...req.body,
  };

  memory.history.unshift(entry);
  if (memory.history.length > 200) memory.history.pop();
  memories.set(req.params.customerId, memory);

  res.json({ success: true, entry, memory });
});

app.get('/:customerId/history', (req, res) => {
  const memory = memories.get(req.params.customerId);
  if (!memory) return res.json({ success: true, history: [] });

  const { limit = 50, type } = req.query;
  let history = [...memory.history];

  if (type) history = history.filter(h => h.type === type);

  res.json({
    success: true,
    count: history.length,
    history: history.slice(0, Number(limit)),
  });
});

// ============================================================
// AI CONTEXT
// ============================================================

app.put('/:customerId/context', (req, res) => {
  let memory = memories.get(req.params.customerId);
  if (!memory) {
    memory = {
      customerId: req.params.customerId,
      interactions: [],
      preferences: { channel: 'email', time: 'morning', language: 'en', tone: 'formal' },
      history: [],
      aiContext: { lastResearch: null, contextSummary: '', keyFacts: [], openQuestions: [], preferredTopics: [] },
    };
  }

  memory.aiContext = {
    ...memory.aiContext,
    lastResearch: new Date(),
    ...req.body,
  };

  memories.set(req.params.customerId, memory);
  res.json({ success: true, aiContext: memory.aiContext });
});

app.post('/:customerId/context/facts', (req, res) => {
  let memory = memories.get(req.params.customerId);
  if (!memory) {
    memory = {
      customerId: req.params.customerId,
      interactions: [],
      preferences: { channel: 'email', time: 'morning', language: 'en', tone: 'formal' },
      history: [],
      aiContext: { lastResearch: null, contextSummary: '', keyFacts: [], openQuestions: [], preferredTopics: [] },
    };
  }

  const { fact, question } = req.body;

  if (fact) memory.aiContext.keyFacts.push(fact);
  if (question) memory.aiContext.openQuestions.push(question);

  memories.set(req.params.customerId, memory);
  res.json({ success: true, aiContext: memory.aiContext });
});

app.delete('/:customerId/context/facts/:index', (req, res) => {
  const memory = memories.get(req.params.customerId);
  if (!memory) return res.status(404).json({ error: 'Memory not found' });

  memory.aiContext.keyFacts.splice(Number(req.params.index), 1);
  memories.set(req.params.customerId, memory);
  res.json({ success: true, aiContext: memory.aiContext });
});

// ============================================================
// SUMMARY
// ============================================================

app.get('/:customerId/summary', (req, res) => {
  const memory = memories.get(req.params.customerId);
  if (!memory) {
    return res.json({
      success: true,
      summary: {
        customerId: req.params.customerId,
        totalInteractions: 0,
        lastInteraction: null,
        preferredChannel: 'email',
        keyFacts: [],
        openQuestions: [],
      },
    });
  }

  const recentInteractions = memory.interactions.slice(0, 5);
  const positiveInteractions = memory.interactions.filter(i => i.sentiment === 'positive').length;
  const totalInteractions = memory.interactions.length;

  const summary = {
    customerId: memory.customerId,
    totalInteractions,
    recentInteractions,
    lastInteraction: memory.interactions[0]?.date || null,
    preferredChannel: memory.preferences.channel,
    sentiment: totalInteractions > 0 ? (positiveInteractions / totalInteractions * 100).toFixed(0) + '% positive' : 'N/A',
    keyFacts: memory.aiContext.keyFacts.slice(0, 5),
    openQuestions: memory.aiContext.openQuestions,
    contextSummary: memory.aiContext.contextSummary,
    history: memory.history.slice(0, 5),
  };

  res.json({ success: true, summary });
});

// ============================================================
// SEARCH
// ============================================================

app.get('/search/all', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ success: true, results: [] });

  const results = [];
  const searchLower = q.toLowerCase();

  memories.forEach((memory, customerId) => {
    // Search in interactions
    memory.interactions.forEach(i => {
      if (i.summary?.toLowerCase().includes(searchLower)) {
        results.push({ customerId, type: 'interaction', match: i });
      }
    });

    // Search in facts
    memory.aiContext.keyFacts.forEach(fact => {
      if (fact.toLowerCase().includes(searchLower)) {
        results.push({ customerId, type: 'fact', match: fact });
      }
    });

    // Search in questions
    memory.aiContext.openQuestions.forEach(q => {
      if (q.toLowerCase().includes(searchLower)) {
        results.push({ customerId, type: 'question', match: q });
      }
    });
  });

  res.json({ success: true, query: q, count: results.length, results });
});

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════╗`);
  console.log(`║      Sales Memory Partitions - SalesOS v1.0     ║`);
  console.log(`╠═══════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                      ║`);
  console.log(`║  Memories: ${memories.size}                                     ║`);
  console.log(`╚═══════════════════════════════════════════════════╝`);
});

module.exports = app;
