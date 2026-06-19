const express = require('express');
const router = express.Router();

// In-memory health data storage
const healthRecords = new Map();
const vitalTrends = new Map();

// Health vitals categories
const vitalRanges = {
  heartRate: { min: 60, max: 100, unit: 'bpm', optimal: 72 },
  bloodPressure: { systolic: { min: 90, max: 120 }, diastolic: { min: 60, max: 80 }, unit: 'mmHg' },
  bloodOxygen: { min: 95, max: 100, unit: '%', optimal: 98 },
  temperature: { min: 97.8, max: 99.1, unit: '°F', optimal: 98.6 },
  weight: { unit: 'lbs' }, // varies by person
  height: { unit: 'inches' }, // fixed
  bmi: { min: 18.5, max: 24.9, unit: 'kg/m²', optimal: 22 },
  steps: { min: 5000, max: 10000, unit: 'steps/day', optimal: 8000 },
  water: { min: 6, max: 12, unit: 'glasses/day', optimal: 8 },
  sleep: { min: 7, max: 9, unit: 'hours', optimal: 8 }
};

// Get user's health profile
router.get('/profile/:userId', (req, res) => {
  const { userId } = req.params;

  const profile = healthRecords.get(userId) || {
    userId,
    vitals: {
      heartRate: null,
      bloodPressure: { systolic: null, diastolic: null },
      bloodOxygen: null,
      temperature: null
    },
    body: {
      height: null,
      currentWeight: null,
      targetWeight: null,
      bmi: null
    },
    baseline: {},
    lastUpdated: null
  };

  res.json({
    success: true,
    data: profile
  });
});

// Set up health profile
router.post('/profile/:userId', (req, res) => {
  const { userId } = req.params;
  const { age, gender, height, weight, activityLevel, conditions } = req.body;

  const profile = healthRecords.get(userId) || {
    userId,
    vitals: {},
    body: {},
    baseline: {},
    lastUpdated: new Date().toISOString()
  };

  // Set body metrics
  profile.body = {
    height: height || profile.body.height,
    currentWeight: weight || profile.body.currentWeight,
    targetWeight: req.body.targetWeight || profile.body.targetWeight,
    gender: gender || profile.body.gender,
    age: age || profile.body.age
  };

  // Calculate BMI
  if (height && weight) {
    const heightM = height * 0.0254; // inches to meters
    const weightKg = weight * 0.453592; // lbs to kg
    profile.body.bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  }

  profile.activityLevel = activityLevel || 'moderate';
  profile.conditions = conditions || [];
  profile.lastUpdated = new Date().toISOString();

  healthRecords.set(userId, profile);

  res.json({
    success: true,
    message: 'Health profile updated',
    data: profile
  });
});

// Log vital signs
router.post('/vitals/:userId', (req, res) => {
  const { userId } = req.params;
  const { heartRate, bloodPressure, bloodOxygen, temperature, timestamp } = req.body;

  const entry = {
    timestamp: timestamp || new Date().toISOString(),
    heartRate,
    bloodPressure,
    bloodOxygen,
    temperature
  };

  // Validate vital ranges
  const alerts = [];
  if (heartRate && (heartRate < 40 || heartRate > 150)) {
    alerts.push({ type: 'heartRate', severity: 'warning', message: 'Heart rate outside normal range' });
  }
  if (bloodPressure) {
    if (bloodPressure.systolic > 140 || bloodPressure.diastolic > 90) {
      alerts.push({ type: 'bloodPressure', severity: 'high', message: 'High blood pressure detected' });
    }
    if (bloodPressure.systolic < 90 || bloodPressure.diastolic < 60) {
      alerts.push({ type: 'bloodPressure', severity: 'warning', message: 'Low blood pressure detected' });
    }
  }
  if (bloodOxygen && bloodOxygen < 90) {
    alerts.push({ type: 'bloodOxygen', severity: 'critical', message: 'Low blood oxygen - seek medical attention' });
  }
  if (temperature && (temperature < 97 || temperature > 101)) {
    alerts.push({ type: 'temperature', severity: 'warning', message: 'Temperature outside normal range' });
  }

  // Store in trends
  if (!vitalTrends.has(userId)) {
    vitalTrends.set(userId, []);
  }
  vitalTrends.get(userId).push(entry);

  res.json({
    success: true,
    message: alerts.length === 0 ? 'Vitals logged successfully' : 'Vitals logged with alerts',
    data: {
      entry,
      alerts,
      recommendations: alerts.length > 0 ? getVitalRecommendations(alerts) : []
    }
  });
});

// Get vital trends
router.get('/vitals/:userId/trends', (req, res) => {
  const { userId } = req.params;
  const { period = '7d' } = req.query;

  const trends = vitalTrends.get(userId) || [];
  const now = new Date();
  let cutoff;

  switch (period) {
    case '24h': cutoff = new Date(now - 24 * 60 * 60 * 1000); break;
    case '7d': cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
    case '30d': cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
    default: cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);
  }

  const filtered = trends.filter(t => new Date(t.timestamp) > cutoff);

  // Calculate averages
  const averages = {
    heartRate: filtered.filter(t => t.heartRate).reduce((sum, t) => sum + t.heartRate, 0) / (filtered.filter(t => t.heartRate).length || 1),
    bloodOxygen: filtered.filter(t => t.bloodOxygen).reduce((sum, t) => sum + t.bloodOxygen, 0) / (filtered.filter(t => t.bloodOxygen).length || 1),
    temperature: filtered.filter(t => t.temperature).reduce((sum, t) => sum + t.temperature, 0) / (filtered.filter(t => t.temperature).length || 1)
  };

  res.json({
    success: true,
    data: {
      period,
      dataPoints: filtered.length,
      trends: filtered,
      averages: {
        heartRate: Math.round(averages.heartRate),
        bloodOxygen: Math.round(averages.bloodOxygen * 10) / 10,
        temperature: Math.round(averages.temperature * 10) / 10
      }
    }
  });
});

// Log weight
router.post('/weight/:userId', (req, res) => {
  const { userId } = req.params;
  const { weight, timestamp } = req.body;

  const profile = healthRecords.get(userId) || { userId, body: {} };
  profile.body.currentWeight = weight;
  profile.body.lastWeightLog = timestamp || new Date().toISOString();

  // Calculate progress to target
  if (profile.body.targetWeight) {
    const startWeight = profile.body.startWeight || weight;
    const totalToLose = startWeight - profile.body.targetWeight;
    const lost = startWeight - weight;
    profile.body.progress = Math.round((lost / totalToLose) * 100);
  }

  healthRecords.set(userId, profile);

  res.json({
    success: true,
    data: {
      currentWeight: weight,
      targetWeight: profile.body.targetWeight,
      progress: profile.body.progress || 0,
      trend: getWeightTrend(userId)
    }
  });
});

// Get weight history
router.get('/weight/:userId/history', (req, res) => {
  const { userId } = req.params;

  const trends = vitalTrends.get(userId) || [];
  const weightLogs = trends
    .filter(t => t.weight)
    .map(t => ({ date: t.timestamp, weight: t.weight }));

  res.json({
    success: true,
    data: {
      current: healthRecords.get(userId)?.body?.currentWeight,
      target: healthRecords.get(userId)?.body?.targetWeight,
      history: weightLogs
    }
  });
});

// Set weight goal
router.post('/weight/:userId/goal', (req, res) => {
  const { userId } = req.params;
  const { targetWeight, currentWeight, timeframe } = req.body;

  const profile = healthRecords.get(userId) || { userId, body: {} };
  profile.body.targetWeight = targetWeight;
  profile.body.startWeight = currentWeight || profile.body.currentWeight;
  profile.body.goalTimeframe = timeframe;

  const weeklyGoal = profile.body.startWeight && timeframe ?
    Math.abs(profile.body.startWeight - targetWeight) / (timeframe / 7) : null;

  healthRecords.set(userId, profile);

  res.json({
    success: true,
    message: 'Weight goal set',
    data: {
      targetWeight,
      weeklyGoal: weeklyGoal ? Math.round(weeklyGoal * 10) / 10 : null,
      timeframe
    }
  });
});

// Get daily checkup
router.get('/daily/:userId', (req, res) => {
  const { userId } = req.params;

  const profile = healthRecords.get(userId);
  const today = new Date().toDateString();
  const todayTrends = (vitalTrends.get(userId) || []).filter(
    t => new Date(t.timestamp).toDateString() === today
  );

  const todayVitals = todayTrends[todayTrends.length - 1] || {};

  res.json({
    success: true,
    data: {
      date: today,
      vitals: {
        heartRate: todayVitals.heartRate || profile?.vitals?.heartRate || null,
        bloodPressure: todayVitals.bloodPressure || profile?.vitals?.bloodPressure || null,
        bloodOxygen: todayVitals.bloodOxygen || profile?.vitals?.bloodOxygen || null,
        temperature: todayVitals.temperature || profile?.vitals?.temperature || null
      },
      body: profile?.body || {},
      reminders: generateHealthReminders(profile),
      score: calculateHealthScore(profile, todayVitals)
    }
  });
});

// Helper functions
function getVitalRecommendations(alerts) {
  return alerts.map(alert => {
    switch (alert.type) {
      case 'heartRate':
        return 'Practice deep breathing and reduce caffeine intake. If persistent, consult a doctor.';
      case 'bloodPressure':
        return 'Reduce sodium intake, increase physical activity, and manage stress. Monitor regularly.';
      case 'bloodOxygen':
        return 'Seek immediate medical attention if below 90%. Practice deep breathing exercises.';
      case 'temperature':
        return 'Rest and hydrate. If fever persists above 101°F, consult a doctor.';
      default:
        return 'Monitor and consult healthcare provider if concerned.';
    }
  });
}

function getWeightTrend(userId) {
  const trends = vitalTrends.get(userId) || [];
  const weights = trends.filter(t => t.weight).slice(-7);
  if (weights.length < 2) return 'insufficient_data';

  const recent = weights[weights.length - 1].weight;
  const older = weights[0].weight;

  if (recent < older - 0.5) return 'losing';
  if (recent > older + 0.5) return 'gaining';
  return 'maintaining';
}

function generateHealthReminders(profile) {
  const reminders = [];
  const now = new Date().getHours();

  if (now < 10) reminders.push({ type: 'hydration', message: 'Start your day with a glass of water' });
  if (now >= 18 && now < 20) reminders.push({ type: 'dinner', message: 'Have a light, nutritious dinner' });
  if (profile?.activityLevel === 'sedentary') {
    reminders.push({ type: 'activity', message: 'Take a short walk - you\'ve been sedentary today' });
  }

  return reminders;
}

function calculateHealthScore(profile, todayVitals) {
  let score = 85; // Base score

  if (profile?.body?.bmi) {
    const bmi = profile.body.bmi;
    if (bmi >= 18.5 && bmi <= 24.9) score += 10;
    else if (bmi >= 25 && bmi <= 29.9) score += 5;
  }

  if (todayVitals?.heartRate) {
    if (todayVitals.heartRate >= 60 && todayVitals.heartRate <= 100) score += 5;
  }

  return Math.min(100, score);
}

module.exports = router;