const express = require('express');
const router = express.Router();

// In-memory meditation session storage
const sessions = new Map();

// Meditation types
const meditationTypes = [
  'breath', 'body-scan', 'mantra', 'loving-kindness', 'visualization', 'walking', 'sound', 'movement'
];

/**
 * GET /meditation/types
 * List available meditation types.
 */
router.get('/types', (req, res) => {
  res.json({
    success: true,
    data: {
      types: meditationTypes,
      typeDescriptions: {
        'breath': 'Focused breathing exercises for calm and presence',
        'body-scan': 'Progressive relaxation through the body',
        'mantra': 'Repetitive phrase or sound to focus the mind',
        'loving-kindness': 'Cultivating compassion for self and others',
        'visualization': 'Guided imagery for relaxation or goal-setting',
        'walking': 'Mindful movement and grounded presence',
        'sound': 'Meditation with ambient sounds or music',
        'movement': 'Gentle yoga-like movements'
      }
    }
  });
});

/**
 * POST /meditation/log/:userId
 * Log a meditation session.
 */
router.post('/log/:userId', (req, res) => {
  const { userId } = req.params;
  const { type, minutes, focus, note } = req.body;

  if (!meditationTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: `Invalid type. Must be one of: ${meditationTypes.join(', ')}`
    });
  }

  if (!minutes || minutes < 1) {
    return res.status(400).json({
      success: false,
      error: 'minutes must be at least 1'
    });
  }

  const session = {
    id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    type,
    minutes: Math.min(minutes, 240), // cap at 4 hours
    focus: focus || null,
    note: note || null,
    completedAt: new Date().toISOString()
  };

  if (!sessions.has(userId)) sessions.set(userId, []);
  sessions.get(userId).push(session);

  res.status(201).json({
    success: true,
    message: 'Meditation session logged',
    data: session
  });
});

/**
 * GET /meditation/stats/:userId
 * Get meditation statistics for a user.
 */
router.get('/stats/:userId', (req, res) => {
  const { userId } = req.params;

  const userSessions = sessions.get(userId) || [];
  if (userSessions.length === 0) {
    return res.json({
      success: true,
      data: {
        totalSessions: 0,
        totalMinutes: 0,
        streakDays: 0,
        byType: {}
      }
    });
  }

  // By type
  const byType = {};
  for (const s of userSessions) {
    byType[s.type] = (byType[s.type] || 0) + 1;
  }

  // Streak: consecutive days
  const dates = new Set(userSessions.map(s => s.completedAt.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const d = cursor.toISOString().slice(0, 10);
    if (dates.has(d)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  // Total minutes
  const totalMinutes = userSessions.reduce((sum, s) => sum + s.minutes, 0);

  res.json({
    success: true,
    data: {
      totalSessions: userSessions.length,
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      streakDays: streak,
      averageMinutes: Math.round(totalMinutes / userSessions.length),
      byType,
      favoriteType: Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] || null
    }
  });
});

/**
 * GET /meditation/recent/:userId
 * Get recent meditation sessions.
 */
router.get('/recent/:userId', (req, res) => {
  const { userId } = req.params;
  const { limit = 10 } = req.query;

  const recent = (sessions.get(userId) || [])
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, parseInt(limit));

  res.json({
    success: true,
    data: { sessions: recent }
  });
});

module.exports = router;