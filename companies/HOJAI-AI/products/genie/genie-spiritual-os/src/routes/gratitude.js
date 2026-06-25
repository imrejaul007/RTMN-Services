const express = require('express');
const router = express.Router();

// In-memory gratitude tracking
const gratitudeEntries = new Map();

/**
 * GET /gratitude/today/:userId
 * Get today's gratitude entry (or null).
 */
router.get('/today/:userId', (req, res) => {
  const { userId } = req.params;
  const today = new Date().toISOString().slice(0, 10);

  const entries = gratitudeEntries.get(userId) || [];
  const todayEntry = entries.find(e => e.date === today);

  res.json({
    success: true,
    data: { entry: todayEntry || null, hasEntry: !!todayEntry }
  });
});

/**
 * POST /gratitude/add/:userId
 * Log a gratitude entry for today (or specified date).
 */
router.post('/add/:userId', (req, res) => {
  const { userId } = req.params;
  const { items, mood = 'grateful', note, date } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'items must be a non-empty array of gratitude items'
    });
  }

  const entryDate = date || new Date().toISOString().slice(0, 10);
  const entry = {
    id: `grat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    items: items.slice(0, 10), // cap at 10
    mood,
    note: note || null,
    date: entryDate,
    createdAt: new Date().toISOString()
  };

  if (!gratitudeEntries.has(userId)) gratitudeEntries.set(userId, []);
  gratitudeEntries.get(userId).push(entry);

  res.status(201).json({
    success: true,
    message: 'Gratitude entry added',
    data: entry
  });
});

/**
 * GET /gratitude/history/:userId
 * Get gratitude history for the last N days.
 */
router.get('/history/:userId', (req, res) => {
  const { userId } = req.params;
  const { days = 30 } = req.query;

  const entries = gratitudeEntries.get(userId) || [];
  const cutoff = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

  const filtered = entries
    .filter(e => new Date(e.date) >= cutoff)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Compute streak
  const dates = new Set(filtered.map(e => e.date));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const d = cursor.toISOString().slice(0, 10);
    if (dates.has(d)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  res.json({
    success: true,
    data: {
      total: filtered.length,
      streak,
      entries: filtered
    }
  });
});

/**
 * GET /gratitude/themes/:userId
 * Extract recurring themes/keywords from gratitude entries.
 */
router.get('/themes/:userId', (req, res) => {
  const { userId } = req.params;
  const entries = gratitudeEntries.get(userId) || [];

  const counts = {};
  for (const e of entries) {
    for (const item of e.items) {
      // Simple word split
      const words = item.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      for (const w of words) counts[w] = (counts[w] || 0) + 1;
    }
  }

  const themes = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ theme: word, count }));

  res.json({
    success: true,
    data: { themes }
  });
});

module.exports = router;