const express = require('express');
const router = express.Router();

// In-memory prayer tracking (state is also persisted to JSON via PersistentMap at the parent)
const prayers = new Map();
const prayerStreaks = new Map();

// Prayer categories
const prayerCategories = [
  'family', 'health', 'work', 'guidance', 'gratitude', 'peace', 'forgiveness', 'provision', 'wisdom', 'protection'
];

/**
 * GET /prayer/categories
 * List available prayer categories.
 */
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: { categories: prayerCategories }
  });
});

/**
 * GET /prayer/list/:userId
 * List all prayer requests for a user.
 */
router.get('/list/:userId', (req, res) => {
  const { userId } = req.params;
  const { status } = req.query; // 'active', 'answered', 'all'

  let userPrayers = Array.from(prayers.get(userId) || []);
  if (status === 'active') userPrayers = userPrayers.filter(p => !p.answered);
  else if (status === 'answered') userPrayers = userPrayers.filter(p => p.answered);

  res.json({
    success: true,
    data: {
      total: userPrayers.length,
      prayers: userPrayers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
  });
});

/**
 * POST /prayer/add/:userId
 * Add a new prayer request.
 */
router.post('/add/:userId', (req, res) => {
  const { userId } = req.params;
  const { text, category = 'general', tags = [] } = req.body;

  if (!text || text.trim().length < 3) {
    return res.status(400).json({
      success: false,
      error: 'Prayer text is required (min 3 characters)'
    });
  }

  const prayer = {
    id: `prayer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: text.trim(),
    category: prayerCategories.includes(category) ? category : 'general',
    tags: Array.isArray(tags) ? tags : [],
    answered: false,
    answeredAt: null,
    createdAt: new Date().toISOString()
  };

  if (!prayers.has(userId)) prayers.set(userId, []);
  prayers.get(userId).push(prayer);

  res.status(201).json({
    success: true,
    message: 'Prayer added',
    data: prayer
  });
});

/**
 * POST /prayer/answered/:userId/:prayerId
 * Mark a prayer as answered.
 */
router.post('/answered/:userId/:prayerId', (req, res) => {
  const { userId, prayerId } = req.params;
  const { note } = req.body;

  const list = prayers.get(userId) || [];
  const prayer = list.find(p => p.id === prayerId);

  if (!prayer) {
    return res.status(404).json({ success: false, error: 'Prayer not found' });
  }

  prayer.answered = true;
  prayer.answeredAt = new Date().toISOString();
  prayer.answerNote = note || null;

  res.json({
    success: true,
    message: 'Prayer marked as answered',
    data: prayer
  });
});

/**
 * GET /prayer/streak/:userId
 * Get current prayer streak (consecutive days with at least one prayer).
 */
router.get('/streak/:userId', (req, res) => {
  const { userId } = req.params;

  const list = prayers.get(userId) || [];
  if (list.length === 0) {
    return res.json({ success: true, data: { current: 0, longest: 0, lastDate: null } });
  }

  // Compute streak based on unique prayer dates
  const dates = new Set(list.map(p => p.createdAt.slice(0, 10)));
  const sorted = Array.from(dates).sort().reverse();

  let current = 0;
  const today = new Date().toISOString().slice(0, 10);
  let cursor = new Date(today);

  for (let i = 0; i < sorted.length; i++) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (dates.has(dateStr)) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  res.json({
    success: true,
    data: {
      current,
      longest: Math.max(current, prayerStreaks.get(userId)?.longest || 0),
      lastDate: sorted[0],
      totalPrayers: list.length,
      answeredCount: list.filter(p => p.answered).length
    }
  });
});

module.exports = router;