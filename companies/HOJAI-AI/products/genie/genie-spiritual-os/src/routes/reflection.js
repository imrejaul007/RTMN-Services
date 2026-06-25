const express = require('express');
const router = express.Router();

// In-memory reflection / journaling storage
const reflections = new Map();

// Reflection prompts (rotate through these to inspire journaling)
const reflectionPrompts = [
  'What am I most grateful for today?',
  'What did I learn about myself this week?',
  'Where did I feel most at peace this month?',
  'What fear is holding me back right now?',
  'How have I grown in the past year?',
  'What does my ideal day look like?',
  'What would I tell my younger self today?',
  'What is one thing I can let go of?',
  'How am I showing up for the people I love?',
  'What brings me the most joy, and why?'
];

/**
 * GET /reflection/prompts
 * Get a random reflection prompt (or all prompts).
 */
router.get('/prompts', (req, res) => {
  const { count = 1 } = req.query;
  const shuffled = [...reflectionPrompts].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(parseInt(count), reflectionPrompts.length));
  res.json({
    success: true,
    data: { prompts: selected, total: reflectionPrompts.length }
  });
});

/**
 * POST /reflection/add/:userId
 * Add a new reflection entry.
 */
router.post('/add/:userId', (req, res) => {
  const { userId } = req.params;
  const { title, body, mood = 'neutral', themes = [] } = req.body;

  if (!body || body.trim().length < 5) {
    return res.status(400).json({
      success: false,
      error: 'Reflection body is required (min 5 characters)'
    });
  }

  const entry = {
    id: `refl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    title: title || 'Untitled reflection',
    body: body.trim(),
    mood,
    themes: Array.isArray(themes) ? themes : [],
    wordCount: body.trim().split(/\s+/).length,
    createdAt: new Date().toISOString()
  };

  if (!reflections.has(userId)) reflections.set(userId, []);
  reflections.get(userId).push(entry);

  res.status(201).json({
    success: true,
    message: 'Reflection saved',
    data: entry
  });
});

/**
 * GET /reflection/list/:userId
 * List all reflections for a user.
 */
router.get('/list/:userId', (req, res) => {
  const { userId } = req.params;
  const { limit = 50 } = req.query;

  const list = (reflections.get(userId) || [])
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      total: list.length,
      totalWords: list.reduce((sum, r) => sum + (r.wordCount || 0), 0),
      reflections: list
    }
  });
});

/**
 * GET /reflection/search/:userId
 * Search reflections by text or theme.
 */
router.get('/search/:userId', (req, res) => {
  const { userId } = req.params;
  const { q, theme } = req.query;

  const list = reflections.get(userId) || [];
  let results = list;

  if (q) {
    const lower = q.toLowerCase();
    results = results.filter(r =>
      r.title.toLowerCase().includes(lower) ||
      r.body.toLowerCase().includes(lower)
    );
  }

  if (theme) {
    results = results.filter(r => r.themes?.includes(theme));
  }

  res.json({
    success: true,
    data: { total: results.length, results }
  });
});

module.exports = router;