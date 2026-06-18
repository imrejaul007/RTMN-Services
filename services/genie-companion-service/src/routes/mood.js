/**
 * Mood Routes - Mood tracking endpoints
 */

import express from 'express';
import { Mood, MOOD_CATEGORIES, analyzeMoodTrend, getMoodResponses } from '../models/mood.js';

const router = express.Router();

/**
 * GET /mood/categories
 * Get all available mood categories
 */
router.get('/mood/categories', (req, res) => {
  res.json({
    success: true,
    categories: MOOD_CATEGORIES
  });
});

/**
 * POST /mood/track
 * Track a new mood entry
 */
router.post('/mood/track', async (req, res) => {
  const { userId, mood, intensity, secondary, causes, activities, people, location, notes, energy, stress, sleep } = req.body;
  const storage = req.app.locals.storage;

  if (!userId || !mood) {
    return res.status(400).json({
      success: false,
      error: 'userId and mood are required'
    });
  }

  // Initialize user's mood storage
  if (!storage.moods.has(userId)) {
    storage.moods.set(userId, []);
  }

  const moodEntry = new Mood({
    userId,
    mood,
    intensity: intensity || 5,
    secondary: secondary || [],
    causes: causes || [],
    activities: activities || [],
    people: people || [],
    location,
    notes,
    energy: energy || 5,
    stress: stress || 5,
    sleep
  });

  storage.moods.get(userId).push(moodEntry.toJSON());

  // Generate response based on mood
  const response = getMoodResponses(mood, intensity || 5);

  res.json({
    success: true,
    mood: moodEntry.toJSON(),
    response,
    message: 'Mood tracked successfully'
  });
});

/**
 * GET /mood/:userId
 * Get mood history for user
 */
router.get('/mood/:userId', async (req, res) => {
  const { userId } = req.params;
  const { days, category, limit } = req.query;
  const storage = req.app.locals.storage;

  let moods = storage.moods.get(userId) || [];

  // Filter by days
  if (days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    moods = moods.filter(m => new Date(m.timestamp) >= cutoffDate);
  }

  // Sort by timestamp descending
  moods = moods.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Apply limit
  if (limit) {
    moods = moods.slice(0, parseInt(limit));
  }

  // Analyze trends
  const trend = analyzeMoodTrend(moods);

  res.json({
    success: true,
    moods,
    count: moods.length,
    trend
  });
});

/**
 * GET /mood/:userId/today
 * Get today's mood entry
 */
router.get('/mood/:userId/today', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const today = new Date().toISOString().split('T')[0];
  const moods = storage.moods.get(userId) || [];
  const todayMoods = moods.filter(m => m.date === today);

  res.json({
    success: true,
    date: today,
    moods: todayMoods,
    count: todayMoods.length,
    moodLogged: todayMoods.length > 0
  });
});

/**
 * GET /mood/:userId/trend
 * Get mood trend analysis
 */
router.get('/mood/:userId/trend', async (req, res) => {
  const { userId } = req.params;
  const { days } = req.query;
  const storage = req.app.locals.storage;

  const numDays = parseInt(days) || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - numDays);

  const moods = (storage.moods.get(userId) || [])
    .filter(m => new Date(m.timestamp) >= cutoffDate)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const trend = analyzeMoodTrend(moods);

  // Calculate weekly averages
  const weeklyAverages = [];
  const weeks = Math.ceil(numDays / 7);
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - i * 7);

    const weekMoods = moods.filter(m => {
      const date = new Date(m.timestamp);
      return date >= weekStart && date < weekEnd;
    });

    if (weekMoods.length > 0) {
      const avgIntensity = weekMoods.reduce((a, m) => a + m.intensity, 0) / weekMoods.length;
      weeklyAverages.unshift({
        week: `Week ${weeks - i}`,
        average: Math.round(avgIntensity * 10) / 10,
        count: weekMoods.length
      });
    }
  }

  // Find patterns
  const patterns = analyzePatterns(moods);

  res.json({
    success: true,
    period: `${numDays} days`,
    overall: trend,
    weekly: weeklyAverages,
    patterns,
    entryCount: moods.length
  });
});

/**
 * POST /mood/:userId/insight
 * Get AI insight about mood patterns
 */
router.post('/mood/:userId/insight', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const moods = storage.moods.get(userId) || [];
  const insights = generateMoodInsights(moods);

  res.json({
    success: true,
    insights
  });
});

/**
 * PUT /mood/:userId/:moodId
 * Update a mood entry
 */
router.put('/mood/:userId/:moodId', async (req, res) => {
  const { userId, moodId } = req.params;
  const updates = req.body;
  const storage = req.app.locals.storage;

  const moods = storage.moods.get(userId) || [];
  const index = moods.findIndex(m => m.id === moodId);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Mood entry not found'
    });
  }

  moods[index] = { ...moods[index], ...updates };
  storage.moods.set(userId, moods);

  res.json({
    success: true,
    mood: moods[index]
  });
});

/**
 * DELETE /mood/:userId/:moodId
 * Delete a mood entry
 */
router.delete('/mood/:userId/:moodId', async (req, res) => {
  const { userId, moodId } = req.params;
  const storage = req.app.locals.storage;

  const moods = storage.moods.get(userId) || [];
  const filtered = moods.filter(m => m.id !== moodId);

  if (filtered.length === moods.length) {
    return res.status(404).json({
      success: false,
      error: 'Mood entry not found'
    });
  }

  storage.moods.set(userId, filtered);

  res.json({
    success: true,
    message: 'Mood entry deleted'
  });
});

// Helper functions
function analyzePatterns(moods) {
  const patterns = [];

  if (moods.length < 7) {
    return patterns;
  }

  // Time-based patterns
  const morningMoods = moods.filter(m => m.hour >= 6 && m.hour < 12);
  const afternoonMoods = moods.filter(m => m.hour >= 12 && m.hour < 17);
  const eveningMoods = moods.filter(m => m.hour >= 17 && m.hour < 21);

  const avgByTime = [
    { time: 'morning', avg: avgIntensity(morningMoods) },
    { time: 'afternoon', avg: avgIntensity(afternoonMoods) },
    { time: 'evening', avg: avgIntensity(eveningMoods) }
  ];

  const bestTime = avgByTime.reduce((a, b) => a.avg > b.avg ? a : b);
  const worstTime = avgByTime.reduce((a, b) => a.avg < b.avg ? a : b);

  if (bestTime.avg - worstTime.avg > 1) {
    patterns.push(`You tend to feel best during ${bestTime.time}`);
  }

  // Sleep correlation
  const withSleep = moods.filter(m => m.sleep);
  if (withSleep.length >= 5) {
    const sleepGood = withSleep.filter(m => m.sleep >= 7);
    const sleepBad = withSleep.filter(m => m.sleep < 6);
    if (sleepGood.length > sleepBad.length) {
      patterns.push("You generally feel better when you get 7+ hours of sleep");
    }
  }

  // Common causes
  const allCauses = moods.flatMap(m => m.causes || []);
  const causeCounts = {};
  allCauses.forEach(c => {
    causeCounts[c] = (causeCounts[c] || 0) + 1;
  });
  const topCauses = Object.entries(causeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cause]) => cause);

  if (topCauses.length > 0) {
    patterns.push(`Common factors affecting your mood: ${topCauses.join(', ')}`);
  }

  return patterns;
}

function avgIntensity(moods) {
  if (moods.length === 0) return 0;
  return moods.reduce((a, m) => a + m.intensity, 0) / moods.length;
}

function generateMoodInsights(moods) {
  const insights = [];

  if (moods.length < 3) {
    insights.push({
      type: 'encouragement',
      message: "Keep tracking your mood! More data helps me understand you better."
    });
    return insights;
  }

  const trend = analyzeMoodTrend(moods);

  if (trend.trend === 'improving') {
    insights.push({
      type: 'positive',
      message: "Your mood has been trending upward! Whatever you're doing, keep it up."
    });
  } else if (trend.trend === 'declining') {
    insights.push({
      type: 'support',
      message: "I've noticed your mood has been lower lately. Remember, it's okay to not be okay. I'm here to talk."
    });
  }

  // Dominant mood insight
  if (trend.dominant) {
    const dominantMood = [...MOOD_CATEGORIES.positive, ...MOOD_CATEGORIES.neutral, ...MOOD_CATEGORIES.negative]
      .find(m => m.name === trend.dominant);

    if (dominantMood) {
      insights.push({
        type: 'observation',
        message: `You often feel ${dominantMood.name}. ${dominantMood.description}`
      });
    }
  }

  // Actionable suggestions
  if (trend.average < 4) {
    insights.push({
      type: 'suggestion',
      message: "Consider trying: more sunlight, physical activity, or connecting with someone you care about."
    });
  } else if (trend.average > 7) {
    insights.push({
      type: 'celebration',
      message: "You're in a great space! This is a good time to tackle challenging goals."
    });
  }

  return insights;
}

export default router;
