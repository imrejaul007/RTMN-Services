/**
 * Emotion Routes - Emotional intelligence endpoints
 */

import express from 'express';

const router = express.Router();

// Emotion categories and their intensities
const EMOTIONS = {
  joy: { emoji: '😊', variations: ['happy', 'excited', 'content', 'grateful', 'proud'] },
  love: { emoji: '❤️', variations: ['loved', 'connected', 'appreciated', 'compassionate'] },
  surprise: { emoji: '😮', variations: ['amazed', 'shocked', 'confused', 'curious'] },
  sadness: { emoji: '😢', variations: ['sad', 'lonely', 'disappointed', 'grieving'] },
  anger: { emoji: '😠', variations: ['angry', 'frustrated', 'annoyed', 'resentful'] },
  fear: { emoji: '😨', variations: ['scared', 'anxious', 'worried', 'stressed'] },
  disgust: { emoji: '😒', variations: ['disgusted', 'contempt', 'aversion', 'bored'] }
};

// Emotion response templates
const EMOTION_RESPONSES = {
  joy: [
    "I love seeing you this happy! Tell me more about what's bringing you joy.",
    "Your happiness is contagious! What's the highlight of this feeling?",
    "This is wonderful! I'd love to hear more about what's going well."
  ],
  love: [
    "Love is a beautiful feeling. What's making you feel so connected?",
    "Feeling loved is one of the best things in life. What's contributing to this?",
    "That's a warm feeling. Who or what is making you feel appreciated?"
  ],
  surprise: [
    "That does sound surprising! How are you processing this?",
    "Wow, that's unexpected. What are your thoughts about it?",
    "Life is full of surprises. How are you feeling about this one?"
  ],
  sadness: [
    "I'm here with you. Would you like to talk about what's making you feel this way?",
    "It's okay to feel sad. I'm here to listen without judgment.",
    "Sadness is a natural part of life. Take your time to feel it."
  ],
  anger: [
    "I can sense your frustration. What happened that's making you feel this way?",
    "Anger is valid. Let's work through it together.",
    "It's okay to feel angry. What's the source of this frustration?"
  ],
  fear: [
    "I understand you're feeling anxious. What's worrying you?",
    "Fear can be overwhelming. Would you like to talk about what's scaring you?",
    "You're not alone. Let's take this one step at a time."
  ],
  disgust: [
    "That sounds unpleasant. What specifically is bothering you?",
    "I hear you. Sometimes things just don't sit right.",
    "It's fine to feel this way. What's your honest reaction to this?"
  ]
};

/**
 * POST /emotion/analyze
 * Analyze text for emotional content
 */
router.post('/emotion/analyze', async (req, res) => {
  const { text, context } = req.body;

  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Text is required'
    });
  }

  // Simple keyword-based emotion analysis
  // In production, this would use AI/NLP
  const analysis = analyzeEmotionalContent(text);

  // Generate response based on detected emotions
  const primaryEmotion = analysis.primary;
  const responses = EMOTION_RESPONSES[primaryEmotion] || EMOTION_RESPONSES.surprise;
  const suggestedResponse = responses[Math.floor(Math.random() * responses.length)];

  res.json({
    success: true,
    analysis: {
      ...analysis,
      suggestedResponse,
      intensity: calculateIntensity(text)
    }
  });
});

/**
 * POST /emotion/process
 * Process emotional expression and generate response
 */
router.post('/emotion/process', async (req, res) => {
  const { userId, emotion, intensity, context, message } = req.body;
  const storage = req.app.locals.storage;

  // Store emotional event
  if (!storage.emotionalContext.has(userId)) {
    storage.emotionalContext.set(userId, { emotions: [], history: [] });
  }

  const emotionEvent = {
    id: Date.now().toString(),
    emotion,
    intensity: intensity || 5,
    context: context || '',
    message,
    timestamp: new Date().toISOString()
  };

  const userContext = storage.emotionalContext.get(userId);
  userContext.emotions.push(emotionEvent);
  userContext.history.push(emotionEvent);

  // Keep only last 100 events
  if (userContext.history.length > 100) {
    userContext.history = userContext.history.slice(-100);
  }

  storage.emotionalContext.set(userId, userContext);

  // Generate appropriate response
  const response = generateEmotionalResponse(emotion, intensity, userContext);

  res.json({
    success: true,
    emotion: emotionEvent,
    response
  });
});

/**
 * GET /emotion/:userId/history
 * Get emotional history
 */
router.get('/emotion/:userId/history', async (req, res) => {
  const { userId } = req.params;
  const { days } = req.query;
  const storage = req.app.locals.storage;

  const userContext = storage.emotionalContext.get(userId);
  let history = userContext?.history || [];

  // Filter by days
  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    history = history.filter(e => new Date(e.timestamp) >= cutoff);
  }

  // Analyze patterns
  const patterns = analyzeEmotionalPatterns(history);

  res.json({
    success: true,
    history,
    patterns,
    count: history.length
  });
});

/**
 * GET /emotion/:userId/insights
 * Get emotional insights
 */
router.get('/emotion/:userId/insights', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const userContext = storage.emotionalContext.get(userId);
  const history = userContext?.history || [];

  if (history.length < 5) {
    return res.json({
      success: true,
      insights: [{
        type: 'encouragement',
        message: "Keep sharing your feelings! More data helps me understand you better."
      }],
      limited: true
    });
  }

  const insights = generateEmotionalInsights(history);

  res.json({
    success: true,
    insights
  });
});

/**
 * POST /emotion/:userId/check
 * Check emotional wellbeing
 */
router.post('/emotion/:userId/check', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const userContext = storage.emotionalContext.get(userId);
  const history = userContext?.history || [];

  // Calculate wellbeing score
  const recentHistory = history.slice(-10);
  let score = 5; // Neutral baseline

  if (recentHistory.length > 0) {
    const positiveEmotions = ['joy', 'love'];
    const negativeEmotions = ['sadness', 'anger', 'fear'];

    const positiveCount = recentHistory.filter(e => positiveEmotions.includes(e.emotion)).length;
    const negativeCount = recentHistory.filter(e => negativeEmotions.includes(e.emotion)).length;

    score = 5 + (positiveCount * 0.5) - (negativeCount * 0.5);
    score = Math.max(1, Math.min(10, score));
  }

  // Generate wellbeing status
  let status, message;
  if (score >= 8) {
    status = 'thriving';
    message = "You're doing wonderfully! Your emotional wellbeing is strong.";
  } else if (score >= 6) {
    status = 'good';
    message = "You're in a good space emotionally. Keep it up!";
  } else if (score >= 4) {
    status = 'okay';
    message = "You're managing, but there's room to improve your emotional wellbeing.";
  } else if (score >= 2) {
    status = 'struggling';
    message = "I can see you're going through a tough time. I'm here for you.";
  } else {
    status = 'critical';
    message = "I'm concerned about your emotional wellbeing. Please reach out for support.";
  }

  res.json({
    success: true,
    wellbeing: {
      score: Math.round(score * 10) / 10,
      status,
      message,
      recentHistory: recentHistory.length
    }
  });
});

/**
 * POST /emotion/:userId/support
 * Get emotional support
 */
router.post('/emotion/:userId/support', async (req, res) => {
  const { userId } = req.params;
  const { emotion, situation } = req.body;
  const storage = req.app.locals.storage;

  const support = generateEmotionalSupport(emotion, situation);

  res.json({
    success: true,
    support
  });
});

// Helper functions
function analyzeEmotionalContent(text) {
  const lower = text.toLowerCase();

  // Emotion keyword mappings
  const emotionKeywords = {
    joy: ['happy', 'excited', 'great', 'wonderful', 'amazing', 'love', 'joy', 'delighted', 'thrilled'],
    love: ['love', 'loved', 'appreciated', 'connected', 'warm', 'caring', 'miss'],
    surprise: ['wow', 'surprised', 'shocked', 'unexpected', "can't believe", 'amazing'],
    sadness: ['sad', 'unhappy', 'down', 'lonely', 'miss', 'lost', 'grieving', 'disappointed'],
    anger: ['angry', 'mad', 'frustrated', 'annoyed', 'hate', 'furious', 'irritated'],
    fear: ['scared', 'afraid', 'worried', 'anxious', 'nervous', 'stressed', 'terrified'],
    disgust: ['disgusted', 'gross', 'dislike', 'hate', 'boring', 'annoying']
  };

  // Score each emotion
  const scores = {};
  Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
    scores[emotion] = keywords.filter(k => lower.includes(k)).length;
  });

  // Find primary emotion
  const primary = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0];

  return {
    primary: primary[1] > 0 ? primary[0] : 'neutral',
    scores,
    detectedEmotions: Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .map(([emotion]) => emotion)
  };
}

function calculateIntensity(text) {
  const lower = text.toLowerCase();
  let intensity = 5;

  // Intensifiers
  if (lower.includes('very') || lower.includes('really')) intensity += 1;
  if (lower.includes('extremely') || lower.includes('absolutely')) intensity += 2;
  if (lower.includes('so') || lower.includes('super')) intensity += 1;

  // De-intensifiers
  if (lower.includes('a little') || lower.includes('slightly')) intensity -= 1;
  if (lower.includes('kind of') || lower.includes('sort of')) intensity -= 1;

  return Math.max(1, Math.min(10, intensity));
}

function analyzeEmotionalPatterns(history) {
  const patterns = [];

  if (history.length < 7) return patterns;

  // Time patterns
  const timeGroups = { morning: [], afternoon: [], evening: [], night: [] };
  history.forEach(e => {
    const hour = new Date(e.timestamp).getHours();
    if (hour >= 6 && hour < 12) timeGroups.morning.push(e);
    else if (hour >= 12 && hour < 17) timeGroups.afternoon.push(e);
    else if (hour >= 17 && hour < 21) timeGroups.evening.push(e);
    else timeGroups.night.push(e);
  });

  // Find best time
  const avgScore = (emotions) => {
    const positive = ['joy', 'love'];
    return emotions.filter(e => positive.includes(e.emotion)).length / Math.max(1, emotions.length);
  };

  const bestTime = Object.entries(timeGroups)
    .map(([time, emotions]) => ({ time, score: avgScore(emotions) }))
    .sort((a, b) => b.score - a.score)[0];

  if (bestTime && bestTime.score > 0.5) {
    patterns.push(`You tend to feel most positive during the ${bestTime.time}`);
  }

  // Emotional triggers
  const contexts = history.filter(e => e.context).map(e => e.context);
  if (contexts.length > 0) {
    patterns.push(`Your emotions are often triggered by: ${[...new Set(contexts)].slice(0, 3).join(', ')}`);
  }

  return patterns;
}

function generateEmotionalResponse(emotion, intensity, userContext) {
  const emotionData = EMOTIONS[emotion] || EMOTIONS.surprise;
  const responses = EMOTION_RESPONSES[emotion] || EMOTION_RESPONSES.surprise;

  return {
    emoji: emotionData.emoji,
    message: responses[Math.floor(Math.random() * responses.length)],
    suggestions: getEmotionSuggestions(emotion, intensity)
  };
}

function getEmotionSuggestions(emotion, intensity) {
  const suggestions = {
    joy: ['Share your joy with someone', 'Capture this moment', 'Express gratitude'],
    love: ['Tell someone you appreciate them', 'Reach out to a loved one', 'Practice self-compassion'],
    sadness: ['Talk to someone you trust', 'Practice self-care', 'Allow yourself to feel'],
    anger: ['Take deep breaths', 'Write it down', 'Step away and reflect'],
    fear: ['Break down what you\'re afraid of', 'Focus on what you can control', 'Seek support'],
    surprise: ['Process what happened', 'Adapt to the new information', 'Stay curious'],
    disgust: ['Remove yourself from the situation if needed', 'Focus on something positive']
  };

  return suggestions[emotion] || ['Take a moment to process your feelings'];
}

function generateEmotionalInsights(history) {
  const insights = [];

  // Count emotions
  const emotionCounts = {};
  history.forEach(e => {
    emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
  });

  const total = history.length;

  // Positive ratio
  const positive = (emotionCounts.joy || 0) + (emotionCounts.love || 0);
  const negative = (emotionCounts.sadness || 0) + (emotionCounts.anger || 0) + (emotionCounts.fear || 0);

  if (positive > negative * 2) {
    insights.push({
      type: 'positive',
      category: 'emotional_balance',
      message: "You've been experiencing more positive emotions lately. This is wonderful!",
      data: { positiveRatio: (positive / total * 100).toFixed(0) + '%' }
    });
  } else if (negative > positive * 2) {
    insights.push({
      type: 'support',
      category: 'emotional_balance',
      message: "You've been going through some tough emotional times. Remember, it's okay to ask for help.",
      data: { negativeRatio: (negative / total * 100).toFixed(0) + '%' }
    });
  }

  // Most common emotion
  const mostCommon = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])[0];

  if (mostCommon) {
    insights.push({
      type: 'observation',
      category: 'dominant_emotion',
      message: `You've been feeling ${mostCommon[0]} most often recently.`,
      data: { emotion: mostCommon[0], count: mostCommon[1] }
    });
  }

  // Intensity trends
  const avgIntensity = history.reduce((a, e) => a + (e.intensity || 5), 0) / history.length;
  if (avgIntensity > 7) {
    insights.push({
      type: 'observation',
      category: 'intensity',
      message: "Your emotions tend to run intense. This shows passion and depth.",
      data: { averageIntensity: avgIntensity.toFixed(1) }
    });
  }

  return insights;
}

function generateEmotionalSupport(emotion, situation) {
  const support = {
    acknowledgment: EMOTION_RESPONSES[emotion]?.[0] || "I hear you.",
    copingStrategies: getEmotionSuggestions(emotion, 5),
    reflection: [],
    nextSteps: []
  };

  // Add reflection questions based on emotion
  switch (emotion) {
    case 'sadness':
      support.reflection.push("What's one small thing that usually lifts your spirits?");
      support.nextSteps.push("Consider reaching out to someone you trust");
      break;
    case 'anger':
      support.reflection.push("What would the best version of yourself want you to do right now?");
      support.nextSteps.push("Try the 4-7-8 breathing technique");
      break;
    case 'fear':
      support.reflection.push("What's the worst that could happen? How likely is that?");
      support.nextSteps.push("Focus on what you can control");
      break;
    default:
      support.reflection.push("What do you need right now?");
  }

  return support;
}

export default router;
