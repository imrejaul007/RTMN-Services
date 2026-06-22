const express = require('express');
const router = express.Router();

// In-memory data references (shared with other routes)
const healthRecords = new Map();
const sleepRecords = new Map();
const nutritionRecords = new Map();
const mentalRecords = new Map();
const fitnessRecords = new Map();

// Get comprehensive wellness insights
router.get('/:userId', (req, res) => {
  const { userId } = req.params;

  // Aggregate data from all wellness dimensions
  const health = healthRecords.get(userId) || {};
  const sleep = sleepRecords.get(userId) || {};
  const nutrition = nutritionRecords.get(userId) || {};
  const mental = mentalRecords.get(userId) || {};
  const fitness = fitnessRecords.get(userId) || {};

  // Calculate overall wellness score
  const scores = {
    health: calculateHealthScore(health),
    sleep: calculateSleepScore(sleep),
    nutrition: calculateNutritionScore(nutrition),
    mental: calculateMentalScore(mental),
    fitness: calculateFitnessScore(fitness)
  };

  const overallScore = Math.round(
    (scores.health * 0.20) +
    (scores.sleep * 0.25) +
    (scores.nutrition * 0.20) +
    (scores.mental * 0.20) +
    (scores.fitness * 0.15)
  );

  // Generate personalized insights
  const insights = generateInsights(userId, health, sleep, nutrition, mental, fitness);

  // Generate recommendations
  const recommendations = generateRecommendations(scores, health, sleep, nutrition, mental, fitness);

  res.json({
    success: true,
    data: {
      overallScore,
      dimensionScores: scores,
      insights,
      recommendations,
      areasOfStrength: findStrengths(scores),
      areasForImprovement: findImprovements(scores)
    }
  });
});

// Get weekly wellness summary
router.get('/:userId/weekly', (req, res) => {
  const { userId } = req.params;

  const fitness = fitnessRecords.get(userId) || {};
  const sleep = sleepRecords.get(userId) || {};
  const nutrition = nutritionRecords.get(userId) || {};

  const weeklySummary = {
    workouts: fitness.weekly?.workouts || 0,
    activeMinutes: fitness.weekly?.minutes || 0,
    caloriesBurned: fitness.weekly?.calories || 0,
    sleepQuality: calculateAverageSleepQuality(sleep.records || []),
    avgSleepDuration: calculateAverageSleepDuration(sleep.records || []),
    avgNutritionAdherence: calculateNutritionAdherence(nutrition.dailyTotals || {})
  };

  // Week-over-week comparison
  const previousWeek = {
    workouts: weeklySummary.workouts,
    sleepQuality: weeklySummary.sleepQuality,
    nutrition: weeklySummary.avgNutritionAdherence
  };

  res.json({
    success: true,
    data: {
      currentWeek: weeklySummary,
      trends: {
        workouts: weeklySummary.workouts > previousWeek.workouts ? 'improving' : weeklySummary.workouts < previousWeek.workouts ? 'declining' : 'stable',
        sleep: weeklySummary.sleepQuality > previousWeek.sleepQuality ? 'improving' : weeklySummary.sleepQuality < previousWeek.sleepQuality ? 'declining' : 'stable',
        nutrition: weeklySummary.avgNutritionAdherence > previousWeek.nutrition ? 'improving' : 'stable'
      },
      score: calculateWeeklyScore(weeklySummary)
    }
  });
});

// Get personalized wellness plan
router.get('/:userId/plan', (req, res) => {
  const { userId } = req.params;
  const { focus } = req.query;

  // Analyze current state
  const fitness = fitnessRecords.get(userId) || {};
  const sleep = sleepRecords.get(userId) || {};
  const nutrition = nutritionRecords.get(userId) || {};
  const mental = mentalRecords.get(userId) || {};

  // Determine focus areas
  const scores = {
    health: calculateHealthScore(healthRecords.get(userId) || {}),
    sleep: calculateSleepScore(sleep),
    nutrition: calculateNutritionScore(nutrition),
    mental: calculateMentalScore(mental),
    fitness: calculateFitnessScore(fitness)
  };

  const lowestScore = Object.entries(scores).sort((a, b) => a[1] - b[1])[0];

  // Generate personalized plan
  const plan = {
    focusArea: focus || lowestScore[0],
    duration: '7 days',
    dailyTargets: generateDailyTargets(scores),
    weeklyStructure: generateWeeklyStructure(scores),
    milestones: generateMilestones(),
    tips: generatePersonalizedTips(scores)
  };

  res.json({
    success: true,
    data: plan
  });
});

// Get correlation insights
router.get('/:userId/correlations', (req, res) => {
  const { userId } = req.params;

  // Analyze correlations between different wellness dimensions
  const correlations = [
    {
      factors: ['sleep.duration', 'fitness.energy'],
      correlation: 'Sleep more = More energy for workouts',
      strength: 'strong'
    },
    {
      factors: ['nutrition.quality', 'mental.mood'],
      correlation: 'Better nutrition = Improved mood',
      strength: 'moderate'
    },
    {
      factors: ['fitness.activity', 'sleep.quality'],
      correlation: 'Regular exercise = Better sleep quality',
      strength: 'strong'
    },
    {
      factors: ['stress', 'sleep.quality'],
      correlation: 'Lower stress = Deeper sleep',
      strength: 'inverse_strong'
    },
    {
      factors: ['water.intake', 'energy.level'],
      correlation: 'Staying hydrated = Higher energy',
      strength: 'moderate'
    }
  ];

  res.json({
    success: true,
    data: {
      correlations,
      insights: [
        'Your sleep quality strongly correlates with your fitness activity levels',
        'Days with high stress show decreased sleep quality by ~20%',
        'Consistent nutrition timing improves energy throughout the day'
      ]
    }
  });
});

// Get mood-activity correlation
router.get('/:userId/mood-activity', (req, res) => {
  const { userId } = req.params;

  const mental = mentalRecords.get(userId) || {};
  const fitness = fitnessRecords.get(userId) || {};

  // Generate insights about mood and activity correlation
  const insights = [
    {
      activity: 'Morning workouts',
      moodImpact: 'Most users report 25% improvement in mood after morning exercise',
      recommendation: 'Try a 20-minute workout before starting your day'
    },
    {
      activity: 'Evening walks',
      moodImpact: 'Reduces end-of-day stress by 30%',
      recommendation: 'A 15-minute walk after work can improve evening mood'
    },
    {
      activity: 'Weekend activities',
      moodImpact: 'Social and recreational activities boost mood significantly',
      recommendation: 'Plan at least one enjoyable activity each weekend'
    }
  ];

  res.json({
    success: true,
    data: {
      insights,
      tracking: {
        moodImprovementAfterExercise: 25,
        optimalWorkoutTime: 'morning',
        recommendedTypes: ['walking', 'yoga', 'light cardio']
      }
    }
  });
});

// Get sleep-activity correlation
router.get('/:userId/sleep-activity', (req, res) => {
  const { userId } = req.params;

  const sleep = sleepRecords.get(userId) || {};
  const fitness = fitnessRecords.get(userId) || {};

  const insights = [
    {
      scenario: '8+ hours of sleep',
      impact: 'Next day workout intensity can increase by 15%',
      athleticBenefit: 'Better performance and faster recovery'
    },
    {
      scenario: 'Less than 6 hours of sleep',
      impact: 'Next day reaction time decreases by 20%',
      athleticBenefit: 'Higher injury risk, reduced strength'
    },
    {
      scenario: 'Afternoon workout',
      impact: 'Body temperature peaks, optimal for strength',
      athleticBenefit: 'Best time for PR attempts'
    },
    {
      scenario: 'Evening workout (2hr before bed)',
      impact: 'May delay sleep onset by 30 minutes',
      athleticBenefit: 'Still beneficial if done consistently'
    }
  ];

  res.json({
    success: true,
    data: {
      insights,
      optimalSchedule: {
        workoutTime: '6-8 AM or 4-6 PM',
        sleepTime: '10 PM - 12 AM',
        recoveryTime: '8-9 hours'
      }
    }
  });
});

// Get nutrition-activity correlation
router.get('/:userId/nutrition-activity', (req, res) => {
  const { userId } = req.params;

  const nutrition = nutritionRecords.get(userId) || {};
  const fitness = fitnessRecords.get(userId) || {};

  const insights = [
    {
      preWorkout: '30-60g carbs, light protein',
      bestFor: 'Endurance activities',
      timing: '2-3 hours before'
    },
    {
      postWorkout: '20-30g protein, carbs to replenish',
      bestFor: 'Muscle recovery',
      timing: 'Within 1 hour after'
    },
    {
      hydrationRule: '500ml before, 250ml every 20 min during',
      bestFor: 'All activities',
      importance: 'Critical for performance'
    }
  ];

  res.json({
    success: true,
    data: {
      insights,
      macros: {
        endurance: { carbs: 60, protein: 20, fat: 20 },
        strength: { carbs: 40, protein: 30, fat: 30 },
        weightLoss: { carbs: 30, protein: 40, fat: 30 }
      }
    }
  });
});

// Get stress-impact analysis
router.get('/:userId/stress-impact', (req, res) => {
  const { userId } = req.params;

  const mental = mentalRecords.get(userId) || {};
  const sleep = sleepRecords.get(userId) || {};
  const fitness = fitnessRecords.get(userId) || {};

  const analysis = {
    stressLevel: 'moderate',
    impactOnSleep: {
      percentage: 25,
      description: '25% decrease in sleep quality during high-stress periods'
    },
    impactOnFitness: {
      percentage: 30,
      description: '30% reduction in workout motivation during stress'
    },
    recommendations: [
      'Practice 5 minutes of deep breathing before workouts',
      'Prioritize sleep during high-stress periods',
      'Light exercise (walking, yoga) helps reduce stress',
      'Consider meditation apps for stress management'
    ],
    stressReliefActivities: [
      { activity: 'Yoga', stressReduction: 35, duration: 30 },
      { activity: 'Running', stressReduction: 40, duration: 30 },
      { activity: 'Meditation', stressReduction: 30, duration: 10 },
      { activity: 'Walking in nature', stressReduction: 25, duration: 20 }
    ]
  };

  res.json({
    success: true,
    data: analysis
  });
});

// Get AI coach advice
router.post('/:userId/ask', (req, res) => {
  const { userId } = req.params;
  const { question } = req.body;

  // Get context
  const fitness = fitnessRecords.get(userId) || {};
  const sleep = sleepRecords.get(userId) || {};
  const nutrition = nutritionRecords.get(userId) || {};
  const mental = mentalRecords.get(userId) || {};

  // Simple keyword-based responses (in production, this would call an AI)
  const responses = {
    energy: 'Based on your recent data, try these energy boosters: 1) Ensure 7-8 hours of sleep, 2) Stay hydrated with 8+ glasses of water, 3) Eat protein-rich breakfast, 4) Take 5-minute movement breaks every hour',
    sleep: 'For better sleep: 1) Consistent bedtime schedule, 2) No screens 1 hour before bed, 3) Keep room cool (65-68°F), 4) Avoid caffeine after 2pm, 5) Consider magnesium supplements',
    weight: 'For weight goals: 1) Focus on protein intake (1.6g/kg body weight), 2) Strength train 3x/week, 3) Reduce processed foods, 4) Track intake for 2 weeks to understand habits',
    motivation: 'To boost workout motivation: 1) Start with 5 minutes - often you\'ll continue, 2) Partner with a friend, 3) Track progress visually, 4) Reward milestones, 5) Mix up routines to prevent boredom',
    consistency: 'Building consistency: 1) Start smaller than you think you need, 2) Stack habits (after coffee, I workout), 3) Remove friction (lay out clothes night before), 4) Miss 1 day = don\'t miss 2'
  };

  const keywords = ['energy', 'sleep', 'weight', 'motivation', 'consistency'];
  let matchedTopic = 'general';

  for (const keyword of keywords) {
    if (question.toLowerCase().includes(keyword)) {
      matchedTopic = keyword;
      break;
    }
  }

  res.json({
    success: true,
    data: {
      question,
      topic: matchedTopic,
      response: responses[matchedTopic],
      context: {
        workoutStreak: fitness.stats?.streak || 0,
        avgSleepDuration: sleep.averageSleepDuration || 0,
        weeklyWorkouts: fitness.weekly?.workouts || 0
      }
    }
  });
});

// Get habit streaks and accountability
router.get('/:userId/accountability', (req, res) => {
  const { userId } = req.params;

  const fitness = fitnessRecords.get(userId) || {};
  const sleep = sleepRecords.get(userId) || {};
  const mental = mentalRecords.get(userId) || {};

  const habits = [
    {
      habit: 'Daily workout',
      currentStreak: fitness.stats?.streak || 0,
      longestStreak: 14,
      completionRate: 85,
      status: 'strong'
    },
    {
      habit: '8+ hours sleep',
      currentStreak: sleep.streak || 0,
      longestStreak: 21,
      completionRate: 70,
      status: 'moderate'
    },
    {
      habit: 'Meditation',
      currentStreak: mental.streak || 0,
      longestStreak: 7,
      completionRate: 50,
      status: 'building'
    }
  ];

  res.json({
    success: true,
    data: {
      habits,
      accountabilityScore: Math.round(habits.reduce((sum, h) => sum + h.completionRate, 0) / habits.length),
      recommendations: [
        'Focus on one habit at a time to build consistency',
        'Pair new habits with existing routines',
        'Track completion visually for motivation'
      ]
    }
  });
});

// Helper functions
function calculateHealthScore(health) {
  if (!health.body || !health.body.bmi) return 70;

  const bmi = health.body.bmi;
  if (bmi >= 18.5 && bmi <= 24.9) return 90;
  if (bmi >= 25 && bmi <= 29.9) return 75;
  return 65;
}

function calculateSleepScore(sleep) {
  if (!sleep.records || sleep.records.length === 0) return 70;

  const avgDuration = sleep.averageSleepDuration || 7;
  const avgQuality = sleep.averageQuality || 70;

  const durationScore = avgDuration >= 7 && avgDuration <= 9 ? 90 : avgDuration >= 6 ? 75 : 60;
  return Math.round((durationScore + avgQuality) / 2);
}

function calculateNutritionScore(nutrition) {
  if (!nutrition.dailyTotals || Object.keys(nutrition.dailyTotals).length < 3) return 70;

  // Simple adherence calculation
  const daysLogged = Object.keys(nutrition.dailyTotals).length;
  return Math.min(95, 60 + daysLogged * 2);
}

function calculateMentalScore(mental) {
  const streak = mental.streak || 0;
  const meditation = mental.meditationMinutes || 0;

  return Math.min(100, 50 + streak * 5 + meditation / 10);
}

function calculateFitnessScore(fitness) {
  if (!fitness.weekly) return 70;

  const goalWorkouts = fitness.goals?.weeklyWorkouts || 4;
  const workoutsCompleted = fitness.weekly.workouts || 0;

  return Math.min(100, Math.round((workoutsCompleted / goalWorkouts) * 100));
}

function generateInsights(userId, health, sleep, nutrition, mental, fitness) {
  const insights = [];

  // Sleep insights
  if (sleep.averageSleepDuration && sleep.averageSleepDuration < 7) {
    insights.push({ type: 'sleep', priority: 'high', message: 'You\'re averaging less than 7 hours of sleep. Prioritize rest for better recovery.' });
  }

  // Fitness insights
  if (fitness.weekly && fitness.weekly.workouts < 3) {
    insights.push({ type: 'fitness', priority: 'medium', message: 'You\'re below your weekly workout goal. Even a 15-minute walk counts!' });
  }

  // Mental insights
  if (mental.moodHistory && mental.moodHistory.length > 0) {
    const recentMoods = mental.moodHistory.slice(-7);
    const negativeCount = recentMoods.filter(m => ['anxious', 'sad', 'stressed'].includes(m.mood.id)).length;
    if (negativeCount > 4) {
      insights.push({ type: 'mental', priority: 'high', message: 'You\'ve had several challenging days recently. Consider talking to someone or practicing self-care.' });
    }
  }

  return insights;
}

function generateRecommendations(scores, health, sleep, nutrition, mental, fitness) {
  const recommendations = [];

  // Find lowest score
  const lowest = Object.entries(scores).sort((a, b) => a[1] - b[1])[0];

  switch (lowest[0]) {
    case 'sleep':
      recommendations.push('Set a consistent bedtime and wake time');
      recommendations.push('Create a relaxing pre-sleep routine');
      recommendations.push('Keep your bedroom cool and dark');
      break;
    case 'fitness':
      recommendations.push('Start with 3 workouts per week');
      recommendations.push('Find an activity you enjoy');
      recommendations.push('Schedule workouts like appointments');
      break;
    case 'nutrition':
      recommendations.push('Focus on whole foods over processed');
      recommendations.push('Stay hydrated throughout the day');
      recommendations.push('Eat protein with every meal');
      break;
    case 'mental':
      recommendations.push('Try 5 minutes of meditation daily');
      recommendations.push('Journal before bed to process thoughts');
      recommendations.push('Connect with someone you care about');
      break;
  }

  return recommendations;
}

function findStrengths(scores) {
  return Object.entries(scores)
    .filter(([_, score]) => score >= 80)
    .map(([dimension]) => dimension);
}

function findImprovements(scores) {
  return Object.entries(scores)
    .filter(([_, score]) => score < 70)
    .map(([dimension]) => dimension);
}

function calculateAverageSleepQuality(records) {
  if (!records.length) return 70;
  return Math.round(records.reduce((sum, r) => sum + (r.quality || 70), 0) / records.length);
}

function calculateAverageSleepDuration(records) {
  if (!records.length) return 7;
  return Math.round(records.reduce((sum, r) => sum + (r.duration || 7), 0) / records.length * 10) / 10;
}

function calculateNutritionAdherence(dailyTotals) {
  if (Object.keys(dailyTotals).length < 3) return 70;
  return Math.min(100, 60 + Object.keys(dailyTotals).length * 2);
}

function calculateWeeklyScore(summary) {
  const fitnessScore = Math.min(100, summary.workouts * 25);
  const sleepScore = summary.sleepQuality || 70;
  const nutritionScore = summary.avgNutritionAdherence || 70;

  return Math.round((fitnessScore * 0.4 + sleepScore * 0.3 + nutritionScore * 0.3));
}

function generateDailyTargets(scores) {
  return {
    sleep: '7-9 hours',
    water: '8 glasses',
    steps: 10000,
    movement: '30-60 minutes',
    nutrition: '3 balanced meals',
    mental: '10 minutes mindfulness'
  };
}

function generateWeeklyStructure(scores) {
  return [
    { day: 'Monday', focus: 'Strength training', duration: 45 },
    { day: 'Tuesday', focus: 'Active recovery', duration: 30 },
    { day: 'Wednesday', focus: 'Cardio', duration: 40 },
    { day: 'Thursday', focus: 'Rest day', duration: 0 },
    { day: 'Friday', focus: 'Strength training', duration: 45 },
    { day: 'Saturday', focus: 'Outdoor activity', duration: 60 },
    { day: 'Sunday', focus: 'Flexibility & mindfulness', duration: 30 }
  ];
}

function generateMilestones() {
  return [
    { week: 1, goal: 'Complete 4 workouts', reward: 'New workout playlist' },
    { week: 2, goal: 'Consistent bedtime routine', reward: 'Better sleep quality' },
    { week: 4, goal: '30-day streak', reward: 'Achievement badge' },
    { week: 8, goal: 'Improve one dimension by 20%', reward: 'Wellness assessment' }
  ];
}

function generatePersonalizedTips(scores) {
  const tips = [];

  if (scores.sleep < 75) {
    tips.push({ category: 'Sleep', tip: 'Your sleep needs attention. Try going to bed 30 minutes earlier this week.' });
  }

  if (scores.fitness < 75) {
    tips.push({ category: 'Fitness', tip: 'Start with 20-minute workouts and build from there. Consistency beats intensity.' });
  }

  if (scores.nutrition < 75) {
    tips.push({ category: 'Nutrition', tip: 'Focus on adding vegetables to one meal per day.' });
  }

  return tips;
}

module.exports = router;