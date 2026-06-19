/**
 * Companion Routes - Main companion interaction endpoints
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * GET /api/companion/:userId/profile
 * Get user's companion relationship profile
 */
router.get('/api/companion/:userId/profile', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  let profile = storage.relationshipLevels.get(userId) || {
    userId,
    level: 1,
    xp: 0,
    companionName: 'Genie',
    companionStyle: 'friendly', // friendly, mentor, coach, therapist, funny
    personalityTraits: ['caring', 'patient', 'curious'],
    conversationCount: 0,
    memoryQuality: 'surface', // surface, moderate, deep
    milestones: [],
    startedAt: new Date().toISOString(),
    lastInteraction: null,
    interactionHistory: []
  };

  res.json({
    success: true,
    profile: {
      level: profile.level,
      xp: profile.xp,
      companionName: profile.companionName,
      companionStyle: profile.companionStyle,
      personalityTraits: profile.personalityTraits,
      memoryQuality: profile.memoryQuality,
      interactionCount: profile.conversationCount,
      milestones: profile.milestones,
      startedAt: profile.startedAt,
      lastInteraction: profile.lastInteraction
    }
  });
});

/**
 * PUT /api/companion/:userId/style
 * Update companion's communication style
 */
router.put('/api/companion/:userId/style', async (req, res) => {
  const { userId } = req.params;
  const { style, personalityTraits, companionName } = req.body;
  const storage = req.app.locals.storage;

  let profile = storage.relationshipLevels.get(userId) || {};
  profile.companionStyle = style || profile.companionStyle || 'friendly';
  profile.personalityTraits = personalityTraits || profile.personalityTraits || ['caring'];
  profile.companionName = companionName || profile.companionName || 'Genie';

  storage.relationshipLevels.set(userId, profile);

  res.json({
    success: true,
    message: 'Companion style updated',
    style: profile.companionStyle,
    traits: profile.personalityTraits,
    name: profile.companionName
  });
});

/**
 * POST /api/companion/:userId/interact
 * Record a companion interaction
 */
router.post('/api/companion/:userId/interact', async (req, res) => {
  const { userId } = req.params;
  const { type, topic, sentiment, duration } = req.body;
  const storage = req.app.locals.storage;

  let profile = storage.relationshipLevels.get(userId) || {
    userId,
    level: 1,
    xp: 0,
    conversationCount: 0
  };

  // Calculate XP gained
  const xpGained = calculateXP(type, sentiment, duration);
  profile.xp += xpGained;
  profile.conversationCount += 1;
  profile.lastInteraction = new Date().toISOString();

  // Check for level up
  const oldLevel = profile.level;
  profile.level = calculateLevel(profile.xp);

  // Record interaction
  profile.interactionHistory = profile.interactionHistory || [];
  profile.interactionHistory.push({
    type,
    topic,
    sentiment,
    duration,
    xp: xpGained,
    timestamp: new Date().toISOString()
  });

  // Keep only last 100 interactions
  if (profile.interactionHistory.length > 100) {
    profile.interactionHistory = profile.interactionHistory.slice(-100);
  }

  storage.relationshipLevels.set(userId, profile);

  res.json({
    success: true,
    xp: xpGained,
    totalXp: profile.xp,
    level: profile.level,
    leveledUp: profile.level > oldLevel
  });
});

/**
 * POST /api/companion/:userId/milestone
 * Record a relationship milestone
 */
router.post('/api/companion/:userId/milestone', async (req, res) => {
  const { userId } = req.params;
  const { title, description, type } = req.body;
  const storage = req.app.locals.storage;

  let profile = storage.relationshipLevels.get(userId) || {};
  profile.milestones = profile.milestones || [];

  const milestone = {
    id: uuidv4(),
    title,
    description,
    type,
    achievedAt: new Date().toISOString()
  };

  profile.milestones.push(milestone);

  // Bonus XP for milestones
  profile.xp += 50;
  profile.level = calculateLevel(profile.xp);

  storage.relationshipLevels.set(userId, profile);

  res.json({
    success: true,
    milestone,
    newLevel: profile.level
  });
});

/**
 * GET /api/companion/:userId/checkin
 * Get a check-in prompt
 */
router.get('/api/companion/:userId/checkin', async (req, res) => {
  const { userId } = req.params;
  const { time } = req.query;
  const storage = req.app.locals.storage;

  // Time of day determines check-in type
  const hour = time ? parseInt(time) : new Date().getHours();
  const profile = storage.relationshipLevels.get(userId);

  let checkin = {
    greeting: getGreeting(hour),
    type: getCheckinType(hour),
    prompts: getCheckinPrompts(hour, profile)
  };

  res.json({
    success: true,
    checkin
  });
});

/**
 * POST /api/companion/:userId/checkin
 * Submit a check-in response
 */
router.post('/api/companion/:userId/checkin', async (req, res) => {
  const { userId } = req.params;
  const { response, mood, energy, note } = req.body;
  const storage = req.app.locals.storage;

  // Record check-in
  const checkins = storage.emotionalContext.get(userId) || { checkins: [] };
  checkins.checkins.push({
    timestamp: new Date().toISOString(),
    response,
    mood,
    energy,
    note
  });
  storage.emotionalContext.set(userId, checkins);

  // Update relationship
  let profile = storage.relationshipLevels.get(userId) || {};
  profile.xp += 10;
  profile.level = calculateLevel(profile.xp);
  storage.relationshipLevels.set(userId, profile);

  res.json({
    success: true,
    xp: 10,
    level: profile.level
  });
});

/**
 * GET /api/companion/:userId/celebrate
 * Get celebration content for user
 */
router.get('/api/companion/:userId/celebrate', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const today = new Date();
  const celebrations = [];

  // Check for birthdays (would integrate with CorpID in production)
  // Check for milestones achieved
  const profile = storage.relationshipLevels.get(userId);

  // Get today's date celebrations
  const dateStr = today.toISOString().split('T')[0];

  res.json({
    success: true,
    celebrations: [
      {
        type: 'daily_motivation',
        message: getRandomMotivation(),
        timestamp: today.toISOString()
      }
    ]
  });
});

// Helper functions
function calculateXP(type, sentiment, duration) {
  let base = 10;

  if (type === 'deep_conversation') base = 25;
  else if (type === 'journal') base = 20;
  else if (type === 'milestone') base = 30;
  else if (type === 'learning') base = 15;

  if (sentiment === 'positive') base *= 1.2;
  else if (sentiment === 'negative') base *= 0.8;

  if (duration && duration > 30) base *= 1.5;

  return Math.round(base);
}

function calculateLevel(xp) {
  // Levels: 1=0, 2=100, 3=250, 4=500, 5=1000, etc.
  if (xp < 100) return 1;
  if (xp < 250) return 2;
  if (xp < 500) return 3;
  if (xp < 1000) return 4;
  if (xp < 2000) return 5;
  if (xp < 4000) return 6;
  if (xp < 7000) return 7;
  if (xp < 10000) return 8;
  if (xp < 15000) return 9;
  return 10;
}

function getGreeting(hour) {
  if (hour < 6) return "Hey night owl 🦉";
  if (hour < 12) return "Good morning! ☀️";
  if (hour < 17) return "Good afternoon! 🌤️";
  if (hour < 21) return "Good evening! 🌅";
  return "Hey there! 🌙";
}

function getCheckinType(hour) {
  if (hour >= 6 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getCheckinPrompts(hour, profile) {
  const level = profile?.level || 1;
  const memoryQuality = profile?.memoryQuality || 'surface';

  const morningPrompts = [
    "How did you sleep?",
    "What's one thing you want to accomplish today?",
    "What's on your mind this morning?"
  ];

  const afternoonPrompts = [
    "How's your day going so far?",
    "Did you get a chance to work on your goals?",
    "What's been the highlight of your day?"
  ];

  const eveningPrompts = [
    "How was your day?",
    "What was the best part of today?",
    "What did you learn today?",
    "What are you grateful for?"
  ];

  const nightPrompts = [
    "Ready to wind down?",
    "How are you feeling right now?",
    "Anything on your mind before sleep?"
  ];

  let prompts;
  if (hour >= 6 && hour < 10) prompts = morningPrompts;
  else if (hour >= 10 && hour < 17) prompts = afternoonPrompts;
  else if (hour >= 17 && hour < 21) prompts = eveningPrompts;
  else prompts = nightPrompts;

  // Level up prompts based on relationship depth
  if (level >= 5) {
    prompts.push("How are you feeling about your progress lately?");
  }

  return prompts;
}

function getRandomMotivation() {
  const motivations = [
    "You're doing amazing, keep going! 💪",
    "Every step forward is progress. 🌱",
    "I believe in you. ✨",
    "Today is full of possibilities! 🌟",
    "Your journey inspires me. 🌈",
    "Small wins lead to big victories. 🏆",
    "You're stronger than you think. 💫",
    "Keep shining! ☀️",
    "One day at a time. 🌻",
    "Your potential is limitless. 🚀"
  ];
  return motivations[Math.floor(Math.random() * motivations.length)];
}

export default router;
