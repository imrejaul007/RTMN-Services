/**
 * Journal Routes - AI-powered journaling endpoints
 */

import express from 'express';
import { Journal, JOURNAL_TYPES, analyzeJournalInsights, generateJournalSummary } from '../models/journal.js';

const router = express.Router();

/**
 * GET /journal/types
 * Get all journal types
 */
router.get('/journal/types', (req, res) => {
  res.json({
    success: true,
    types: JOURNAL_TYPES
  });
});

/**
 * GET /journal/:userId
 * Get all journals for user
 */
router.get('/journal/:userId', async (req, res) => {
  const { userId } = req.params;
  const { type, date, days, limit, tags } = req.query;
  const storage = req.app.locals.storage;

  let journals = storage.journals.get(userId) || [];

  // Filter by type
  if (type) {
    journals = journals.filter(j => j.type === type);
  }

  // Filter by date
  if (date) {
    journals = journals.filter(j => j.date === date);
  }

  // Filter by days
  if (days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    journals = journals.filter(j => new Date(j.date) >= cutoffDate);
  }

  // Filter by tags
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim());
    journals = journals.filter(j => j.tags?.some(t => tagList.includes(t)));
  }

  // Sort by date descending
  journals = journals.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Apply limit
  if (limit) {
    journals = journals.slice(0, parseInt(limit));
  }

  res.json({
    success: true,
    journals,
    count: journals.length
  });
});

/**
 * POST /journal/:userId
 * Create a new journal entry
 */
router.post('/journal/:userId', async (req, res) => {
  const { userId } = req.params;
  const {
    type, title, content, mood, moodScore, highlights,
    challenges, gratitude, lessons, goals, people, activities,
    energy, sleep, tags, voiceNote
  } = req.body;

  const storage = req.app.locals.storage;

  if (!content && !voiceNote) {
    return res.status(400).json({
      success: false,
      error: 'Content or voiceNote is required'
    });
  }

  // Initialize storage
  if (!storage.journals.has(userId)) {
    storage.journals.set(userId, []);
  }

  const journal = new Journal({
    userId,
    type: type || 'daily',
    title: title || generateTitle(type, content),
    content,
    mood,
    moodScore: moodScore || 5,
    highlights: highlights || [],
    challenges: challenges || [],
    gratitude: gratitude || [],
    lessons: lessons || [],
    goals: goals || [],
    people: people || [],
    activities: activities || [],
    energy,
    sleep,
    tags: tags || [],
    voiceNote,
    sentiment: analyzeSentiment(content)
  });

  storage.journals.get(userId).push(journal.toJSON());

  res.json({
    success: true,
    journal: journal.toJSON(),
    message: 'Journal entry created'
  });
});

/**
 * GET /journal/:userId/:journalId
 * Get a specific journal entry
 */
router.get('/journal/:userId/:journalId', async (req, res) => {
  const { userId, journalId } = req.params;
  const storage = req.app.locals.storage;

  const journals = storage.journals.get(userId) || [];
  const journal = journals.find(j => j.id === journalId);

  if (!journal) {
    return res.status(404).json({
      success: false,
      error: 'Journal entry not found'
    });
  }

  res.json({
    success: true,
    journal
  });
});

/**
 * PUT /journal/:userId/:journalId
 * Update a journal entry
 */
router.put('/journal/:userId/:journalId', async (req, res) => {
  const { userId, journalId } = req.params;
  const updates = req.body;
  const storage = req.app.locals.storage;

  const journals = storage.journals.get(userId) || [];
  const index = journals.findIndex(j => j.id === journalId);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Journal entry not found'
    });
  }

  updates.updatedAt = new Date().toISOString();
  journals[index] = { ...journals[index], ...updates };
  storage.journals.set(userId, journals);

  res.json({
    success: true,
    journal: journals[index]
  });
});

/**
 * DELETE /journal/:userId/:journalId
 * Delete a journal entry
 */
router.delete('/journal/:userId/:journalId', async (req, res) => {
  const { userId, journalId } = req.params;
  const storage = req.app.locals.storage;

  const journals = storage.journals.get(userId) || [];
  const filtered = journals.filter(j => j.id !== journalId);

  if (filtered.length === journals.length) {
    return res.status(404).json({
      success: false,
      error: 'Journal entry not found'
    });
  }

  storage.journals.set(userId, filtered);

  res.json({
    success: true,
    message: 'Journal entry deleted'
  });
});

/**
 * GET /journal/:userId/date/:date
 * Get journal for specific date
 */
router.get('/journal/:userId/date/:date', async (req, res) => {
  const { userId, date } = req.params;
  const storage = req.app.locals.storage;

  const journals = storage.journals.get(userId) || [];
  const dayJournals = journals.filter(j => j.date === date);

  res.json({
    success: true,
    date,
    journals: dayJournals,
    count: dayJournals.length,
    hasEntry: dayJournals.length > 0
  });
});

/**
 * GET /journal/:userId/today
 * Get today's journal
 */
router.get('/journal/:userId/today', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const today = new Date().toISOString().split('T')[0];
  const journals = storage.journals.get(userId) || [];
  const todayJournals = journals.filter(j => j.date === today);

  res.json({
    success: true,
    date: today,
    journals: todayJournals,
    count: todayJournals.length,
    hasEntry: todayJournals.length > 0
  });
});

/**
 * POST /journal/:userId/auto
 * Auto-generate journal from conversation
 */
router.post('/journal/:userId/auto', async (req, res) => {
  const { userId } = req.params;
  const { conversation, mood, moodScore, activities, people } = req.body;
  const storage = req.app.locals.storage;

  if (!conversation) {
    return res.status(400).json({
      success: false,
      error: 'Conversation content is required'
    });
  }

  // Initialize storage
  if (!storage.journals.has(userId)) {
    storage.journals.set(userId, []);
  }

  // Parse conversation into journal structure
  const parsed = parseConversation(conversation);

  const journal = new Journal({
    userId,
    type: 'daily',
    title: parsed.title || `Journal - ${new Date().toLocaleDateString()}`,
    content: parsed.content,
    mood: mood || parsed.mood,
    moodScore: moodScore || 5,
    highlights: parsed.highlights || [],
    challenges: parsed.challenges || [],
    gratitude: parsed.gratitude || [],
    lessons: parsed.lessons || [],
    activities: activities || [],
    people: people || [],
    autoGenerated: true,
    sentiment: parsed.sentiment
  });

  storage.journals.get(userId).push(journal.toJSON());

  res.json({
    success: true,
    journal: journal.toJSON(),
    message: 'Auto-generated journal entry created',
    parsed
  });
});

/**
 * GET /journal/:userId/insights
 * Get AI insights from journal entries
 */
router.get('/journal/:userId/insights', async (req, res) => {
  const { userId } = req.params;
  const { days } = req.query;
  const storage = req.app.locals.storage;

  let journals = storage.journals.get(userId) || [];

  // Filter by days
  if (days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    journals = journals.filter(j => new Date(j.date) >= cutoffDate);
  }

  const insights = analyzeJournalInsights(journals);

  res.json({
    success: true,
    ...insights,
    basedOn: journals.length
  });
});

/**
 * GET /journal/:userId/timeline
 * Get journal timeline
 */
router.get('/journal/:userId/timeline', async (req, res) => {
  const { userId } = req.params;
  const { year, month } = req.query;
  const storage = req.app.locals.storage;

  let journals = storage.journals.get(userId) || [];

  // Filter by year
  if (year) {
    journals = journals.filter(j => j.date.startsWith(year));
  }

  // Filter by month
  if (month) {
    journals = journals.filter(j => {
      const d = new Date(j.date);
      return d.getMonth() + 1 === parseInt(month);
    });
  }

  // Sort by date
  journals = journals.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Generate timeline entries
  const timeline = journals.map(j => ({
    id: j.id,
    date: j.date,
    type: j.type,
    title: j.title,
    mood: j.mood,
    moodScore: j.moodScore,
    sentiment: j.sentiment,
    preview: j.content?.substring(0, 100) + '...'
  }));

  res.json({
    success: true,
    timeline,
    count: timeline.length
  });
});

/**
 * GET /journal/:userId/prompts/:type
 * Get journal prompts for a type
 */
router.get('/journal/:userId/prompts/:type', async (req, res) => {
  const { type } = req.params;
  const storage = req.app.locals.storage;

  const journalType = JOURNAL_TYPES[type];

  if (!journalType) {
    return res.status(404).json({
      success: false,
      error: 'Journal type not found'
    });
  }

  res.json({
    success: true,
    type,
    name: journalType.name,
    description: journalType.description,
    prompts: journalType.prompts
  });
});

// Helper functions
function generateTitle(type, content) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  if (type === 'gratitude') {
    return `Gratitude - ${today}`;
  } else if (type === 'reflection') {
    return `Reflection - ${today}`;
  } else if (type === 'milestone') {
    return `Milestone - ${today}`;
  }

  return `Journal - ${today}`;
}

function analyzeSentiment(content) {
  if (!content) return 'neutral';

  const positive = ['happy', 'excited', 'grateful', 'love', 'amazing', 'great', 'wonderful', 'awesome', 'blessed'];
  const negative = ['sad', 'angry', 'frustrated', 'stressed', 'worried', 'anxious', 'disappointed', 'lonely'];

  const lower = content.toLowerCase();
  const posCount = positive.filter(w => lower.includes(w)).length;
  const negCount = negative.filter(w => lower.includes(w)).length;

  if (posCount > negCount) return 'positive';
  if (negCount > posCount) return 'negative';
  return 'neutral';
}

function parseConversation(conversation) {
  // Simple parsing - in production, this would use AI
  const lines = conversation.split('\n');
  const highlights = [];
  const challenges = [];
  const gratitude = [];
  const lessons = [];
  let mood = null;

  lines.forEach(line => {
    const lower = line.toLowerCase();
    if (lower.includes('best part') || lower.includes('highlight')) {
      highlights.push(line);
    } else if (lower.includes('challenge') || lower.includes('difficult')) {
      challenges.push(line);
    } else if (lower.includes('grateful') || lower.includes('thankful')) {
      gratitude.push(line);
    } else if (lower.includes('learned') || lower.includes('lesson')) {
      lessons.push(line);
    }
  });

  return {
    title: `Conversation Summary - ${new Date().toLocaleDateString()}`,
    content: conversation,
    highlights,
    challenges,
    gratitude,
    lessons,
    mood,
    sentiment: analyzeSentiment(conversation)
  };
}

export default router;
