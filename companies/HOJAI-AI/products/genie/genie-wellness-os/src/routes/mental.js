const express = require('express');
const router = express.Router();

// In-memory mental wellness data
const mentalRecords = new Map();
const moodLogs = new Map();
const meditationSessions = new Map();
const breathingExercises = new Map();

// Mental wellness exercises library
const exercises = {
  breathing: [
    { id: 'box-breathing', name: 'Box Breathing', duration: 4, rounds: 4, description: 'Inhale 4s, hold 4s, exhale 4s, hold 4s', benefits: ['Reduces anxiety', 'Improves focus', 'Calms nervous system'] },
    { id: '4-7-8', name: '4-7-8 Breathing', duration: 8, rounds: 4, description: 'Inhale 4s, hold 7s, exhale 8s', benefits: ['Promotes sleep', 'Reduces panic', 'Manages cravings'] },
    { id: ' diaphragmatic', name: 'Deep Diaphragmatic', duration: 5, rounds: 6, description: 'Deep belly breaths, expand on inhale, contract on exhale', benefits: ['Activates parasympathetic', 'Lowers cortisol', 'Reduces tension'] },
    { id: 'alternate-nostril', name: 'Alternate Nostril', duration: 6, rounds: 5, description: 'Close one nostril, breathe through other, alternate', benefits: ['Balances hemispheres', 'Reduces anxiety', 'Improves focus'] },
    { id: 'energizing', name: 'Energizing Breath', duration: 2, rounds: 20, description: 'Rapid exhales through nose, passive inhales', benefits: ['Increases energy', 'Wakes up body', 'Boosts alertness'] }
  ],
  meditation: [
    { id: 'body-scan', name: 'Body Scan', duration: 10, description: 'Systematically focus attention on each body part', benefits: ['Increases body awareness', 'Releases tension', 'Grounds in present'] },
    { id: 'loving-kindness', name: 'Loving Kindness', duration: 10, description: 'Cultivate compassion for self and others', benefits: ['Increases empathy', 'Reduces negativity', 'Builds connections'] },
    { id: 'mindfulness', name: 'Mindfulness', duration: 10, description: 'Focus on breath, note thoughts without judgment', benefits: ['Improves focus', 'Reduces rumination', 'Builds awareness'] },
    { id: 'visualization', name: 'Guided Visualization', duration: 15, description: 'Imagine peaceful scenes and positive outcomes', benefits: ['Reduces stress', 'Increases motivation', 'Enhances creativity'] },
    { id: 'gratitude', name: 'Gratitude Practice', duration: 5, description: 'Reflect on things you are grateful for', benefits: ['Shifts perspective', 'Increases positivity', 'Improves sleep'] },
    { id: 'transcendental', name: 'Transcendental', duration: 20, description: 'Repeat mantra silently, transcend thought', benefits: ['Deep relaxation', 'Reduces anxiety', 'Increases creativity'] }
  ],
  journaling: [
    { id: 'gratitude-journal', name: '3 Gratitudes', duration: 5, description: 'Write down 3 things you are grateful for', prompt: 'What are 3 things you are grateful for today?' },
    { id: 'emotion-check', name: 'Emotion Check-in', duration: 5, description: 'Identify and process current emotions', prompt: 'What emotions am I feeling right now? What triggered them?' },
    { id: 'thought-catch', name: 'Thought Catching', duration: 10, description: 'Identify and reframe negative thoughts', prompt: 'What negative thought patterns am I noticing? Can I reframe them?' },
    { id: 'values-reflection', name: 'Values Reflection', duration: 10, description: 'Connect daily actions to core values', prompt: 'Did my actions today align with my values?' },
    { id: 'future-self', name: 'Future Self Letter', duration: 15, description: 'Write to your future self', prompt: 'What do I want my future self to know about today?' }
  ],
  stretching: [
    { id: 'neck-shoulders', name: 'Neck & Shoulders', duration: 5, description: 'Release tension from desk work', moves: ['Shoulder rolls', 'Neck tilts', 'Chin tucks'] },
    { id: 'hip-opener', name: 'Hip Opener', duration: 8, description: 'Release hip tension and improve mobility', moves: ['Hip circles', 'Pigeon pose', 'Butterfly stretch'] },
    { id: 'back-relief', name: 'Back Relief', duration: 10, description: 'Stretch and strengthen back muscles', moves: ['Cat-cow', 'Child\'s pose', 'Gentle twist'] },
    { id: 'full-body', name: 'Full Body Wake-up', duration: 15, description: 'Complete morning stretch routine', moves: ['Sun salutation', 'Standing stretches', 'Final relaxation'] }
  ]
};

// Mood tracking
const moodCategories = [
  { id: 'happy', name: 'Happy', emoji: '😊', color: '#FFD700' },
  { id: 'excited', name: 'Excited', emoji: '🤩', color: '#FF6B6B' },
  { id: 'calm', name: 'Calm', emoji: '😌', color: '#98D8C8' },
  { id: 'grateful', name: 'Grateful', emoji: '🙏', color: '#DDA0DD' },
  { id: 'hopeful', name: 'Hopeful', emoji: '🌟', color: '#87CEEB' },
  { id: 'content', name: 'Content', emoji: '☺️', color: '#90EE90' },
  { id: 'anxious', name: 'Anxious', emoji: '😰', color: '#FFB347' },
  { id: 'sad', name: 'Sad', emoji: '😢', color: '#6B7AA1' },
  { id: 'angry', name: 'Angry', emoji: '😠', color: '#FF6B6B' },
  { id: 'stressed', name: 'Stressed', emoji: '😫', color: '#CD853F' },
  { id: 'tired', name: 'Tired', emoji: '😴', color: '#A9A9A9' },
  { id: 'lonely', name: 'Lonely', emoji: '🥺', color: '#B0C4DE' }
];

// Get mental wellness dashboard
router.get('/dashboard/:userId', (req, res) => {
  const { userId } = req.params;

  const mentalData = mentalRecords.get(userId) || {
    userId,
    moodHistory: [],
    meditationMinutes: 0,
    journalEntries: 0,
    streak: 0,
    overallScore: 70,
    lastUpdated: null
  };

  res.json({
    success: true,
    data: {
      ...mentalData,
      recentMoods: mentalData.moodHistory.slice(-7),
      moodCategories,
      availableExercises: {
        breathing: exercises.breathing.length,
        meditation: exercises.meditation.length,
        journaling: exercises.journaling.length,
        stretching: exercises.stretching.length
      }
    }
  });
});

// Log mood
router.post('/mood/:userId', (req, res) => {
  const { userId } = req.params;
  const { moodId, intensity = 5, notes, triggers, factors } = req.body;

  const mood = moodCategories.find(m => m.id === moodId);
  if (!mood) {
    return res.status(400).json({
      success: false,
      error: 'Invalid mood',
      available: moodCategories.map(m => m.id)
    });
  }

  const entry = {
    id: `mood-${Date.now()}`,
    userId,
    mood: { ...mood, intensity },
    notes,
    triggers: triggers || [],
    factors: factors || [],
    timestamp: new Date().toISOString()
  };

  if (!moodLogs.has(userId)) {
    moodLogs.set(userId, []);
  }
  moodLogs.get(userId).push(entry);

  // Update mental records
  const mentalData = mentalRecords.get(userId) || { userId, moodHistory: [], meditationMinutes: 0 };
  mentalData.moodHistory.push(entry);
  mentalData.lastUpdated = new Date().toISOString();
  mentalRecords.set(userId, mentalData);

  res.json({
    success: true,
    data: {
      entry,
      insight: generateMoodInsight(entry, moodLogs.get(userId)),
      tips: generateMoodTips(entry.mood)
    }
  });
});

// Get mood history
router.get('/mood/:userId', (req, res) => {
  const { userId } = req.params;
  const { days = 7 } = req.query;

  const logs = moodLogs.get(userId) || [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(days));

  const filtered = logs.filter(l => new Date(l.timestamp) > cutoff);

  // Calculate mood distribution
  const distribution = {};
  moodCategories.forEach(m => distribution[m.id] = 0);
  filtered.forEach(l => distribution[l.mood.id]++);

  // Calculate average intensity
  const avgIntensity = filtered.length ?
    Math.round(filtered.reduce((sum, l) => sum + l.mood.intensity, 0) / filtered.length) : 0;

  res.json({
    success: true,
    data: {
      entries: filtered.reverse(),
      daysLogged: filtered.length,
      distribution,
      averageIntensity: avgIntensity,
      trend: calculateMoodTrend(filtered)
    }
  });
});

// Get exercises
router.get('/exercises', (req, res) => {
  const { type } = req.query;

  if (type && exercises[type]) {
    return res.json({
      success: true,
      data: exercises[type]
    });
  }

  res.json({
    success: true,
    data: exercises,
    types: Object.keys(exercises)
  });
});

// Get specific exercise
router.get('/exercise/:type/:exerciseId', (req, res) => {
  const { type, exerciseId } = req.params;

  const typeExercises = exercises[type];
  if (!typeExercises) {
    return res.status(404).json({
      success: false,
      error: 'Invalid exercise type',
      types: Object.keys(exercises)
    });
  }

  const exercise = typeExercises.find(e => e.id === exerciseId);
  if (!exercise) {
    return res.status(404).json({
      success: false,
      error: 'Exercise not found',
      available: typeExercises.map(e => e.id)
    });
  }

  res.json({
    success: true,
    data: exercise
  });
});

// Start meditation session
router.post('/meditate/:userId', (req, res) => {
  const { userId } = req.params;
  const { exerciseId, duration, notes } = req.body;

  const exercise = exercises.meditation.find(e => e.id === exerciseId);
  if (!exercise) {
    return res.status(400).json({
      success: false,
      error: 'Invalid meditation exercise'
    });
  }

  const session = {
    id: `med-${Date.now()}`,
    userId,
    exercise: { ...exercise, completedDuration: duration || exercise.duration },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    notes,
    completed: true
  };

  if (!meditationSessions.has(userId)) {
    meditationSessions.set(userId, []);
  }
  meditationSessions.get(userId).push(session);

  // Update mental records
  const mentalData = mentalRecords.get(userId) || { userId, moodHistory: [], meditationMinutes: 0 };
  mentalData.meditationMinutes = (mentalData.meditationMinutes || 0) + session.exercise.completedDuration;
  mentalData.lastUpdated = new Date().toISOString();
  mentalRecords.set(userId, mentalData);

  res.json({
    success: true,
    message: 'Meditation completed',
    data: {
      session,
      streak: calculateMeditationStreak(userId),
      weeklyTotal: getWeeklyMeditation(userId),
      benefits: exercise.benefits
    }
  });
});

// Get meditation history
router.get('/meditation/:userId', (req, res) => {
  const { userId } = req.params;
  const { days = 7 } = req.query;

  const sessions = meditationSessions.get(userId) || [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(days));

  const filtered = sessions.filter(s => new Date(s.startedAt) > cutoff);

  const totalMinutes = filtered.reduce((sum, s) => sum + s.exercise.completedDuration, 0);
  const averageDuration = filtered.length ?
    Math.round(totalMinutes / filtered.length) : 0;

  res.json({
    success: true,
    data: {
      sessions: filtered.reverse(),
      totalSessions: filtered.length,
      totalMinutes,
      averageDuration,
      favoriteExercise: getFavoriteExercise(filtered),
      streak: calculateMeditationStreak(userId)
    }
  });
});

// Journal entry
router.post('/journal/:userId', (req, res) => {
  const { userId } = req.params;
  const { exerciseId, prompt, content, mood } = req.body;

  const exercise = exercises.journaling.find(e => e.id === exerciseId);
  const journalPrompt = prompt || exercise?.prompt || 'How are you feeling today?';

  const entry = {
    id: `journal-${Date.now()}`,
    userId,
    exercise,
    prompt: journalPrompt,
    content,
    mood,
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0]
  };

  if (!mentalRecords.has(userId)) {
    mentalRecords.set(userId, { userId, moodHistory: [], meditationMinutes: 0, journalEntries: 0 });
  }

  const mentalData = mentalRecords.get(userId);
  mentalData.journalEntries = (mentalData.journalEntries || 0) + 1;
  mentalRecords.set(userId, mentalData);

  res.json({
    success: true,
    message: 'Journal entry saved',
    data: {
      entry,
      reflection: generateJournalReflection(entry)
    }
  });
});

// Get journal entries
router.get('/journal/:userId', (req, res) => {
  const { userId } = req.params;
  const { days = 30 } = req.query;

  const mentalData = mentalRecords.get(userId);
  const entries = mentalData?.journalHistory?.filter(e => {
    const d = new Date(e.timestamp);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    return d > cutoff;
  }) || [];

  res.json({
    success: true,
    data: {
      entries: entries.reverse(),
      totalEntries: entries.length
    }
  });
});

// Breathing exercise session
router.post('/breathe/:userId', (req, res) => {
  const { userId } = req.params;
  const { exerciseId, rounds } = req.body;

  const exercise = exercises.breathing.find(e => e.id === exerciseId);
  if (!exercise) {
    return res.status(400).json({
      success: false,
      error: 'Invalid breathing exercise'
    });
  }

  const completedRounds = rounds || exercise.rounds;
  const session = {
    id: `breathe-${Date.now()}`,
    userId,
    exercise: { ...exercise, completedRounds },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  };

  if (!breathingExercises.has(userId)) {
    breathingExercises.set(userId, []);
  }
  breathingExercises.get(userId).push(session);

  res.json({
    success: true,
    data: {
      session,
      instructions: generateBreathingInstructions(exercise),
      benefits: exercise.benefits
    }
  });
});

// Get mental wellness score
router.get('/score/:userId', (req, res) => {
  const { userId } = req.params;

  const mentalData = mentalRecords.get(userId) || {
    moodHistory: [],
    meditationMinutes: 0,
    journalEntries: 0
  };

  const moodLogs = mentalRecords.get(userId)?.moodHistory?.slice(-30) || [];
  const meditationSessions = meditationSessions.get(userId) || [];

  // Calculate component scores
  const moodScore = calculateMoodScore(moodLogs);
  const meditationScore = calculateMeditationScore(meditationSessions);
  const journalingScore = Math.min(100, mentalData.journalEntries * 10);
  const streakScore = calculateStreakScore(mentalData.streak);

  const overallScore = Math.round(
    (moodScore * 0.35) +
    (meditationScore * 0.25) +
    (journalingScore * 0.20) +
    (streakScore * 0.20)
  );

  res.json({
    success: true,
    data: {
      overallScore,
      breakdown: {
        mood: { score: moodScore, weight: 35 },
        meditation: { score: meditationScore, weight: 25 },
        journaling: { score: journalingScore, weight: 20 },
        streak: { score: streakScore, weight: 20 }
      },
      rating: overallScore >= 90 ? 'Excellent' :
              overallScore >= 75 ? 'Good' :
              overallScore >= 60 ? 'Fair' : 'Needs Attention',
      recommendations: generateScoreRecommendations(overallScore)
    }
  });
});

// Stress check
router.post('/stress-check/:userId', (req, res) => {
  const { userId } = req.params;
  const { symptoms } = req.body;

  const stressIndicators = [
    { id: 'headache', weight: 2, name: 'Headaches' },
    { id: 'tension', weight: 1.5, name: 'Muscle tension' },
    { id: 'sleep', weight: 2, name: 'Sleep issues' },
    { id: 'irritability', weight: 1, name: 'Irritability' },
    { id: 'appetite', weight: 1, name: 'Appetite changes' },
    { id: 'focus', weight: 1.5, name: 'Difficulty focusing' },
    { id: 'fatigue', weight: 1, name: 'Fatigue' },
    { id: 'racing', weight: 1.5, name: 'Racing thoughts' }
  ];

  let stressScore = 0;
  const matchedSymptoms = [];

  (symptoms || []).forEach(s => {
    const indicator = stressIndicators.find(i => i.id === s);
    if (indicator) {
      stressScore += indicator.weight;
      matchedSymptoms.push(indicator.name);
    }
  });

  const normalizedScore = Math.min(100, stressScore * 12.5);
  const level = normalizedScore >= 75 ? 'High' :
                normalizedScore >= 50 ? 'Moderate' :
                normalizedScore >= 25 ? 'Mild' : 'Low';

  res.json({
    success: true,
    data: {
      stressScore: Math.round(normalizedScore),
      level,
      symptoms: matchedSymptoms,
      recommendations: generateStressRecommendations(level),
      exercises: level === 'High' || level === 'Moderate' ?
        [exercises.breathing[0], exercises.meditation[0]] : []
    }
  });
});

// Helper functions
function generateMoodInsight(entry, history) {
  const todayCount = history.filter(h =>
    new Date(h.timestamp).toDateString() === new Date().toDateString()
  ).length;

  if (todayCount > 3) {
    return 'Frequent mood check-ins help track patterns. Keep it up!';
  }

  const positiveMoods = ['happy', 'excited', 'calm', 'grateful', 'hopeful', 'content'];
  if (positiveMoods.includes(entry.mood.id)) {
    return 'Great mood today! Note what contributed to this feeling.';
  }

  return 'Every emotion is valid. Consider what triggered this feeling.';
}

function generateMoodTips(mood) {
  const tips = {
    anxious: ['Practice deep breathing', 'List 5 things you can control', 'Limit news/social media'],
    sad: ['Reach out to someone', 'Gentle movement helps', 'Be gentle with yourself'],
    angry: ['Take space before responding', 'Physical activity can help', 'Identify the underlying feeling'],
    stressed: ['Break tasks into smaller steps', 'Prioritize and delegate', 'Take short breaks'],
    tired: ['Check your sleep quality', 'Light movement', 'Hydration check'],
    lonely: ['Reach out to a friend', 'Join a community activity', 'Consider volunteering']
  };

  return tips[mood.id] || ['Take a moment to breathe', 'Practice self-compassion'];
}

function calculateMoodTrend(entries) {
  if (entries.length < 2) return 'insufficient_data';

  const recent = entries.slice(-3).map(e => e.mood.intensity);
  const older = entries.slice(-6, -3).map(e => e.mood.intensity);

  if (!older.length) return 'improving';

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  if (recentAvg > olderAvg + 0.5) return 'improving';
  if (recentAvg < olderAvg - 0.5) return 'declining';
  return 'stable';
}

function calculateMeditationStreak(userId) {
  const sessions = meditationSessions.get(userId) || [];
  if (!sessions.length) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];

    const hasSession = sessions.some(s =>
      new Date(s.startedAt).toISOString().split('T')[0] === dateStr
    );

    if (hasSession) streak++;
    else if (i > 0) break;
  }

  return streak;
}

function getWeeklyMeditation(userId) {
  const sessions = meditationSessions.get(userId) || [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  return sessions
    .filter(s => new Date(s.startedAt) > cutoff)
    .reduce((sum, s) => sum + s.exercise.completedDuration, 0);
}

function getFavoriteExercise(sessions) {
  if (!sessions.length) return null;

  const counts = {};
  sessions.forEach(s => counts[s.exercise.id] = (counts[s.exercise.id] || 0) + 1);

  const favorite = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return exercises.meditation.find(m => m.id === favorite[0]);
}

function generateBreathingInstructions(exercise) {
  const instructions = [];

  for (let i = 0; i < exercise.rounds; i++) {
    instructions.push({
      phase: 'inhale',
      duration: exercise.duration,
      instruction: 'Breathe in slowly...'
    });
    if (exercise.id === 'box-breathing' || exercise.id === '4-7-8') {
      instructions.push({
        phase: 'hold',
        duration: exercise.duration,
        instruction: 'Hold your breath...'
      });
    }
    instructions.push({
      phase: 'exhale',
      duration: exercise.duration,
      instruction: 'Breathe out slowly...'
    });
  }

  return instructions;
}

function calculateMoodScore(moodLogs) {
  if (!moodLogs.length) return 70;

  const positiveMoods = ['happy', 'excited', 'calm', 'grateful', 'hopeful', 'content'];
  const positive = moodLogs.filter(m => positiveMoods.includes(m.mood.id)).length;
  const avgIntensity = moodLogs.reduce((sum, m) => sum + m.mood.intensity, 0) / moodLogs.length;

  return Math.round((positive / moodLogs.length) * 50 + avgIntensity * 5);
}

function calculateMeditationScore(sessions) {
  if (!sessions.length) return 0;

  const lastWeek = sessions.filter(s => {
    const d = new Date(s.startedAt);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return d > cutoff;
  });

  const minutes = lastWeek.reduce((sum, s) => sum + s.exercise.completedDuration, 0);
  return Math.min(100, minutes * 2);
}

function calculateStreakScore(streak) {
  if (streak >= 30) return 100;
  if (streak >= 14) return 80;
  if (streak >= 7) return 60;
  if (streak >= 3) return 40;
  return streak > 0 ? 20 : 0;
}

function generateScoreRecommendations(score) {
  if (score >= 90) return ['Your mental wellness is excellent!', 'Maintain your healthy habits'];
  if (score >= 75) return ['Good progress!', 'Try adding more meditation if not already'];
  if (score >= 60) return ['Room for improvement', 'Focus on one area to start'];
  return ['Consider professional support', 'Small steps lead to big changes'];
}

function generateJournalReflection(entry) {
  const reflections = [
    'Writing helps process emotions. Well done for taking time to reflect.',
    'Self-reflection is a sign of growth.',
    'Notice any patterns emerging from your entries?'
  ];

  return reflections[Math.floor(Math.random() * reflections.length)];
}

function generateStressRecommendations(level) {
  if (level === 'High') {
    return ['Prioritize rest and recovery', 'Consider talking to a professional', 'Remove non-essential commitments'];
  }
  if (level === 'Moderate') {
    return ['Incorporate daily relaxation', 'Review workload and priorities', 'Stay connected with support'];
  }
  return ['Continue healthy habits', 'Monitor stress levels', 'Practice prevention'];
}

module.exports = router;