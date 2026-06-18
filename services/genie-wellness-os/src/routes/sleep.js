const express = require('express');
const router = express.Router();

// In-memory sleep data storage
const sleepRecords = new Map();
const sleepGoals = new Map();

// Sleep quality factors
const sleepFactors = [
  { id: 'screen_time', name: 'Screen Time Before Bed', weight: 0.15, ideal: '< 30 min' },
  { id: 'caffeine', name: 'Caffeine Intake', weight: 0.12, ideal: '< 6 hours before bed' },
  { id: 'exercise', name: 'Exercise During Day', weight: 0.10, ideal: '5-6 hours before bed' },
  { id: 'alcohol', name: 'Alcohol Consumption', weight: 0.08, ideal: 'None' },
  { id: 'room_temp', name: 'Room Temperature', weight: 0.10, ideal: '65-68°F' },
  { id: 'noise', name: 'Noise Level', weight: 0.08, ideal: '< 30 dB' },
  { id: 'light', name: 'Room Darkness', weight: 0.07, ideal: 'Complete darkness' },
  { id: 'consistency', name: 'Sleep Schedule Consistency', weight: 0.15, ideal: 'Same time daily' },
  { id: 'stress', name: 'Stress Level', weight: 0.10, ideal: 'Low' },
  { id: 'hydration', name: 'Hydration', weight: 0.05, ideal: 'Balanced' }
];

// Get user's sleep profile
router.get('/profile/:userId', (req, res) => {
  const { userId } = req.params;

  const profile = sleepRecords.get(userId) || {
    userId,
    bedtimeGoal: '22:00',
    wakeTimeGoal: '06:00',
    sleepDurationGoal: 8,
    sleepQualityGoal: 85,
    averageBedtime: null,
    averageWakeTime: null,
    averageSleepDuration: null,
    averageQuality: null,
    totalNights: 0,
    streak: 0,
    lastSleepDate: null
  };

  res.json({
    success: true,
    data: profile
  });
});

// Set sleep goals
router.post('/profile/:userId/goals', (req, res) => {
  const { userId } = req.params;
  const { bedtime, wakeTime, qualityGoal } = req.body;

  const profile = sleepRecords.get(userId) || { userId };

  profile.bedtimeGoal = bedtime || profile.bedtimeGoal || '22:00';
  profile.wakeTimeGoal = wakeTime || profile.wakeTimeGoal || '06:00';
  profile.sleepDurationGoal = calculateDuration(bedtime || profile.bedtimeGoal, wakeTime || profile.wakeTimeGoal);
  profile.sleepQualityGoal = qualityGoal || 85;

  sleepRecords.set(userId, profile);
  sleepGoals.set(userId, profile);

  res.json({
    success: true,
    message: 'Sleep goals updated',
    data: {
      bedtime: profile.bedtimeGoal,
      wakeTime: profile.wakeTimeGoal,
      duration: profile.sleepDurationGoal,
      qualityGoal: profile.sleepQualityGoal
    }
  });
});

// Log sleep
router.post('/log/:userId', (req, res) => {
  const { userId } = req.params;
  const { bedtime, wakeTime, quality, factors, notes, tags } = req.body;

  if (!bedtime || !wakeTime) {
    return res.status(400).json({
      success: false,
      error: 'bedtime and wakeTime are required'
    });
  }

  const duration = calculateDuration(bedtime, wakeTime);
  const qualityScore = quality || calculateQualityScore(factors);

  const record = {
    id: `sleep-${Date.now()}`,
    userId,
    date: new Date().toISOString().split('T')[0],
    bedtime,
    wakeTime,
    duration,
    quality: qualityScore,
    factors: factors || {},
    notes,
    tags: tags || [],
    createdAt: new Date().toISOString()
  };

  // Store record
  if (!sleepRecords.has(userId)) {
    sleepRecords.set(userId, {
      userId,
      records: [],
      bedtimeGoal: '22:00',
      wakeTimeGoal: '06:00',
      sleepDurationGoal: 8,
      totalNights: 0,
      streak: 0
    });
  }

  const userProfile = sleepRecords.get(userId);
  userProfile.records.push(record);
  userProfile.totalNights++;

  // Update streak
  userProfile.streak = updateStreak(userProfile);

  // Update averages
  updateAverages(userProfile);

  res.json({
    success: true,
    message: 'Sleep logged successfully',
    data: {
      record,
      streak: userProfile.streak,
      weeklyAverage: getWeeklyAverage(userProfile.records),
      insights: generateSleepInsights(record, userProfile)
    }
  });
});

// Get sleep records
router.get('/records/:userId', (req, res) => {
  const { userId } = req.params;
  const { days = 7 } = req.query;

  const profile = sleepRecords.get(userId);
  if (!profile || !profile.records) {
    return res.status(404).json({
      success: false,
      error: 'No sleep records found'
    });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(days));

  const records = profile.records
    .filter(r => new Date(r.date) >= cutoff)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({
    success: true,
    data: {
      records,
      summary: {
        averageDuration: records.reduce((sum, r) => sum + r.duration, 0) / (records.length || 1),
        averageQuality: records.reduce((sum, r) => sum + r.quality, 0) / (records.length || 1),
        nightsLogged: records.length
      }
    }
  });
});

// Get sleep trends
router.get('/trends/:userId', (req, res) => {
  const { userId } = req.params;
  const { period = '7d' } = req.query;

  const profile = sleepRecords.get(userId);
  if (!profile || !profile.records) {
    return res.status(404).json({
      success: false,
      error: 'No sleep data found'
    });
  }

  const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const records = profile.records
    .filter(r => new Date(r.date) >= cutoff)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const trends = records.map(r => ({
    date: r.date,
    duration: r.duration,
    quality: r.quality,
    bedtime: r.bedtime,
    wakeTime: r.wakeTime
  }));

  // Calculate weekly patterns
  const byDayOfWeek = {};
  records.forEach(r => {
    const day = new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' });
    if (!byDayOfWeek[day]) byDayOfWeek[day] = [];
    byDayOfWeek[day].push(r.duration);
  });

  const weeklyPattern = Object.entries(byDayOfWeek).map(([day, durations]) => ({
    day,
    averageDuration: Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
  }));

  res.json({
    success: true,
    data: {
      period,
      daysLogged: records.length,
      trends,
      weeklyPattern,
      averages: {
        duration: Math.round((records.reduce((sum, r) => sum + r.duration, 0) / (records.length || 1)) * 10) / 10,
        quality: Math.round(records.reduce((sum, r) => sum + r.quality, 0) / (records.length || 1))
      },
      recommendations: generateSleepRecommendations(records)
    }
  });
});

// Get sleep factors
router.get('/factors', (req, res) => {
  res.json({
    success: true,
    data: sleepFactors
  });
});

// Log pre-sleep routine
router.post('/routine/:userId', (req, res) => {
  const { userId } = req.params;
  const { activities, startTime, completed } = req.body;

  const routine = {
    id: `routine-${Date.now()}`,
    userId,
    date: new Date().toISOString().split('T')[0],
    startTime: startTime || '21:00',
    activities: activities || [
      { name: 'Screen off', duration: 30, completed: completed?.[0] || false },
      { name: 'Light stretching', duration: 10, completed: completed?.[1] || false },
      { name: 'Reading', duration: 20, completed: completed?.[2] || false },
      { name: 'Meditation', duration: 10, completed: completed?.[3] || false },
      { name: 'Sleep', duration: 0, completed: completed?.[4] || false }
    ],
    createdAt: new Date().toISOString()
  };

  // Calculate impact on quality
  const completedCount = routine.activities.filter(a => a.completed).length;
  const completionRate = (completedCount / (routine.activities.length - 1)) * 100; // Exclude sleep
  const qualityBonus = completionRate > 80 ? 5 : completionRate > 50 ? 2 : 0;

  res.json({
    success: true,
    data: {
      routine,
      completionRate: Math.round(completionRate),
      qualityBonus,
      nextActivity: routine.activities.find(a => !a.completed)
    }
  });
});

// Get sleep debt
router.get('/debt/:userId', (req, res) => {
  const { userId } = req.params;

  const profile = sleepRecords.get(userId);
  if (!profile || !profile.records) {
    return res.json({
      success: true,
      data: {
        sleepDebt: 0,
        message: 'Log more sleep to track debt'
      }
    });
  }

  const goal = profile.sleepDurationGoal || 8;
  const last7Days = profile.records.slice(-7);
  const totalSlept = last7Days.reduce((sum, r) => sum + r.duration, 0);
  const targetTotal = goal * 7;
  const sleepDebt = Math.max(0, targetTotal - totalSlept);

  res.json({
    success: true,
    data: {
      sleepDebt: Math.round(sleepDebt * 10) / 10,
      inDebt: sleepDebt > 0,
      last7Days: {
        slept: Math.round(totalSlept * 10) / 10,
        target: targetTotal,
        deficit: Math.round(sleepDebt * 10) / 10
      },
      recommendations: sleepDebt > 5 ?
        ['Take a nap today if possible', 'Go to bed 30 minutes earlier'] :
        sleepDebt > 2 ?
        ['Try to sleep an extra 20 minutes tonight'] :
        ['Your sleep debt is manageable']
    }
  });
});

// Get sleep score
router.get('/score/:userId', (req, res) => {
  const { userId } = req.params;

  const profile = sleepRecords.get(userId);
  const lastNight = profile?.records?.[profile.records.length - 1];

  if (!lastNight) {
    return res.json({
      success: true,
      data: {
        overallScore: null,
        message: 'Log your sleep to get a score'
      }
    });
  }

  const durationScore = calculateDurationScore(lastNight.duration, profile.sleepDurationGoal);
  const consistencyScore = calculateConsistencyScore(profile.records);
  const qualityScore = lastNight.quality;

  const overallScore = Math.round(
    (durationScore * 0.35) +
    (qualityScore * 0.35) +
    (consistencyScore * 0.30)
  );

  res.json({
    success: true,
    data: {
      overallScore,
      breakdown: {
        duration: { score: durationScore, weight: 35, contribution: Math.round(durationScore * 0.35) },
        quality: { score: qualityScore, weight: 35, contribution: Math.round(qualityScore * 0.35) },
        consistency: { score: consistencyScore, weight: 30, contribution: Math.round(consistencyScore * 0.30) }
      },
      rating: overallScore >= 90 ? 'Excellent' :
              overallScore >= 80 ? 'Great' :
              overallScore >= 70 ? 'Good' :
              overallScore >= 60 ? 'Fair' : 'Needs Improvement'
    }
  });
});

// Helper functions
function calculateDuration(bedtime, wakeTime) {
  const [bedH, bedM] = bedtime.split(':').map(Number);
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);

  let duration = (wakeH * 60 + wakeM) - (bedH * 60 + bedM);
  if (duration < 0) duration += 24 * 60;

  return Math.round((duration / 60) * 10) / 10;
}

function calculateQualityScore(factors) {
  if (!factors || Object.keys(factors).length === 0) return 70;

  let score = 100;
  for (const [factorId, value] of Object.entries(factors)) {
    const factor = sleepFactors.find(f => f.id === factorId);
    if (factor) {
      if (factorId === 'screen_time' && value > 60) score -= 15;
      if (factorId === 'caffeine' && value > 6) score -= 10;
      if (factorId === 'stress' && value > 7) score -= 12;
      if (factorId === 'consistency' && value < 0.7) score -= 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function updateStreak(profile) {
  if (!profile.records || profile.records.length === 0) return 0;

  const lastRecord = profile.records[profile.records.length - 1];
  const lastDate = new Date(lastRecord.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) return profile.streak || 1;
  if (daysDiff === 1) return (profile.streak || 0) + 1;
  return 1; // Reset streak
}

function updateAverages(profile) {
  if (!profile.records || profile.records.length === 0) return;

  const recent = profile.records.slice(-30);
  profile.averageSleepDuration = Math.round(
    recent.reduce((sum, r) => sum + r.duration, 0) / recent.length * 10
  ) / 10;
  profile.averageQuality = Math.round(
    recent.reduce((sum, r) => sum + r.quality, 0) / recent.length
  );

  const bedtimeMinutes = recent.map(r => {
    const [h, m] = r.bedtime.split(':').map(Number);
    return h * 60 + m;
  });
  profile.averageBedtime = minutesToTime(
    Math.round(bedtimeMinutes.reduce((a, b) => a + b, 0) / bedtimeMinutes.length)
  );

  const wakeMinutes = recent.map(r => {
    const [h, m] = r.wakeTime.split(':').map(Number);
    return h * 60 + m;
  });
  profile.averageWakeTime = minutesToTime(
    Math.round(wakeMinutes.reduce((a, b) => a + b, 0) / wakeMinutes.length)
  );
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getWeeklyAverage(records) {
  const last7 = records.slice(-7);
  return {
    duration: Math.round((last7.reduce((sum, r) => sum + r.duration, 0) / (last7.length || 1)) * 10) / 10,
    quality: Math.round(last7.reduce((sum, r) => sum + r.quality, 0) / (last7.length || 1))
  };
}

function generateSleepInsights(record, profile) {
  const insights = [];

  if (record.duration < 7) {
    insights.push({ type: 'duration', message: 'You need more sleep. Aim for 7-9 hours.' });
  } else if (record.duration >= 8) {
    insights.push({ type: 'duration', message: 'Great job getting enough sleep!' });
  }

  if (record.quality < 70) {
    insights.push({ type: 'quality', message: 'Consider improving sleep hygiene.' });
  }

  const factors = record.factors || {};
  if (factors.screen_time > 60) {
    insights.push({ type: 'factor', message: 'Reduce screen time before bed for better quality.' });
  }

  return insights;
}

function calculateDurationScore(duration, goal) {
  if (duration >= goal) return 100;
  return Math.round((duration / goal) * 100);
}

function calculateConsistencyScore(records) {
  if (records.length < 3) return 70;

  const bedtimes = records.slice(-7).map(r => {
    const [h, m] = r.bedtime.split(':').map(Number);
    return h * 60 + m;
  });

  const avgBedtime = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
  const variance = bedtimes.reduce((sum, t) => sum + Math.pow(t - avgBedtime, 2), 0) / bedtimes.length;
  const stdDev = Math.sqrt(variance);

  // Score based on standard deviation (lower is better)
  if (stdDev <= 30) return 100;
  if (stdDev <= 60) return 85;
  if (stdDev <= 90) return 70;
  return 50;
}

function generateSleepRecommendations(records) {
  if (records.length < 3) {
    return ['Log at least 3 nights of sleep to get personalized recommendations.'];
  }

  const recommendations = [];
  const avgDuration = records.reduce((sum, r) => sum + r.duration, 0) / records.length;
  const avgQuality = records.reduce((sum, r) => sum + r.quality, 0) / records.length;

  if (avgDuration < 7) {
    recommendations.push('Your average sleep is under 7 hours. Try going to bed 30 minutes earlier.');
  }

  if (avgQuality < 75) {
    recommendations.push('Focus on improving sleep quality through a consistent bedtime routine.');
    recommendations.push('Avoid caffeine after 2pm and screens 1 hour before bed.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Your sleep is on track! Maintain your current habits.');
  }

  return recommendations;
}

module.exports = router;