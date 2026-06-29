import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4731;

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory stores
const habits = new Map();
const habitLogs = new Map();
const patterns = new Map();

// Track a habit action
function trackHabit(entityId, habitId, action, metadata = {}) {
  if (!habitLogs.has(entityId)) {
    habitLogs.set(entityId, []);
  }

  const log = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    habitId,
    action,
    metadata,
    timestamp: new Date().toISOString()
  };

  habitLogs.get(entityId).push(log);
  return log;
}

// Calculate consistency score
function calculateConsistency(entityId, habitId, days = 30) {
  const logs = (habitLogs.get(entityId) || [])
    .filter(l => l.habitId === habitId);

  if (logs.length === 0) return { score: 0, streak: 0, completed: 0 };

  // Calculate streak
  const sortedLogs = logs.sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  let streak = 1;
  for (let i = 1; i < sortedLogs.length; i++) {
    const prev = new Date(sortedLogs[i-1].timestamp);
    const curr = new Date(sortedLogs[i].timestamp);
    const diff = (prev - curr) / (1000 * 60 * 60 * 24);

    if (diff <= 1.5) {
      streak++;
    } else {
      break;
    }
  }

  // Calculate completion rate
  const expectedActions = days; // Once per day assumption
  const completedActions = logs.length;
  const score = Math.min(1, completedActions / expectedActions);

  return {
    score: Math.round(score * 100) / 100,
    streak,
    completed: completedActions,
    expected: expectedActions
  };
}

// Detect patterns in habit data
function detectPatterns(entityId, habitId) {
  const logs = (habitLogs.get(entityId) || [])
    .filter(l => l.habitId === habitId);

  if (logs.length < 3) {
    return { patterns: [], routine: null };
  }

  const detectedPatterns = [];

  // Time-of-day pattern
  const times = logs.map(l => {
    const hour = new Date(l.timestamp).getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  });

  const timeCounts = {};
  for (const t of times) {
    timeCounts[t] = (timeCounts[t] || 0) + 1;
  }

  const mostCommonTime = Object.entries(timeCounts)
    .sort((a, b) => b[1] - a[1])[0];

  if (mostCommonTime && mostCommonTime[1] / logs.length > 0.5) {
    detectedPatterns.push({
      type: 'time_of_day',
      value: mostCommonTime[0],
      confidence: mostCommonTime[1] / logs.length
    });
  }

  // Day-of-week pattern
  const days = logs.map(l => new Date(l.timestamp).getDay());
  const dayCounts = {};
  for (const d of days) {
    dayCounts[d] = (dayCounts[d] || 0) + 1;
  }

  const mostCommonDay = Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])[0];

  if (mostCommonDay && mostCommonDay[1] / logs.length > 0.3) {
    detectedPatterns.push({
      type: 'day_of_week',
      value: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][mostCommonDay[0]],
      confidence: mostCommonDay[1] / logs.length
    });
  }

  return {
    patterns: detectedPatterns,
    routine: detectedPatterns.length > 0 ? 'detected' : 'none'
  };
}

// POST /habits - Create habit
app.post('/habits', (req, res) => {
  const { entityId, name, frequency, target, impact, triggers, tags } = req.body;

  if (!entityId || !name) {
    return res.status(400).json({ error: 'entityId and name are required' });
  }

  const habit = {
    id: `habit-${Date.now()}`,
    entityId,
    name,
    frequency: frequency || 'daily',
    target: target || 1,
    impact: impact || 'neutral', // positive, negative, neutral
    triggers: triggers || [],
    tags: tags || [],
    createdAt: new Date().toISOString(),
    status: 'active'
  };

  habits.set(habit.id, habit);

  res.json({ success: true, habit });
});

// GET /habits - List habits
app.get('/habits', (req, res) => {
  const { entityId, status, tags } = req.query;

  let result = Array.from(habits.values());

  if (entityId) {
    result = result.filter(h => h.entityId === entityId);
  }
  if (status) {
    result = result.filter(h => h.status === status);
  }
  if (tags) {
    const tagList = tags.split(',');
    result = result.filter(h => h.tags.some(t => tagList.includes(t)));
  }

  res.json({ habits: result, count: result.length });
});

// GET /habits/:id - Get habit details
app.get('/habits/:id', (req, res) => {
  const { id } = req.params;
  const habit = habits.get(id);

  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  const consistency = calculateConsistency(habit.entityId, id);
  const patternData = detectPatterns(habit.entityId, id);

  res.json({
    habit,
    consistency,
    patterns: patternData
  });
});

// POST /habits/:id/log - Log habit action
app.post('/habits/:id/log', (req, res) => {
  const { id } = req.params;
  const { action, metadata } = req.body;

  const habit = habits.get(id);
  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  const log = trackHabit(habit.entityId, id, action || 'completed', metadata);
  const consistency = calculateConsistency(habit.entityId, id);

  res.json({ success: true, log, consistency });
});

// POST /habits/:id/evaluate - Evaluate habit performance
app.post('/habits/:id/evaluate', (req, res) => {
  const { id } = req.params;
  const { days } = req.body;

  const habit = habits.get(id);
  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  const consistency = calculateConsistency(habit.entityId, id, days || 30);
  const patterns = detectPatterns(habit.entityId, id);
  const logs = (habitLogs.get(habit.entityId) || [])
    .filter(l => l.habitId === id);

  // Impact analysis
  const impact = analyzeImpact(habit.entityId, id, habit.impact);

  res.json({
    habit,
    consistency,
    patterns,
    impact,
    totalActions: logs.length,
    evaluationPeriod: `${days || 30} days`
  });
});

function analyzeImpact(entityId, habitId, habitImpact) {
  const logs = (habitLogs.get(entityId) || [])
    .filter(l => l.habitId === habitId);

  // In production, this would correlate habit completion with outcomes
  return {
    type: habitImpact,
    correlation: habitImpact === 'positive' ? 0.75 : habitImpact === 'negative' ? -0.3 : 0,
    trend: 'stable',
    description: habitImpact === 'positive'
      ? 'Habit correlates with positive outcomes'
      : habitImpact === 'negative'
        ? 'Habit may be harmful'
        : 'Neutral habit'
  };
}

// GET /habits/:id/patterns - Get habit patterns
app.get('/habits/:id/patterns', (req, res) => {
  const { id } = req.params;
  const habit = habits.get(id);

  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  const patternData = detectPatterns(habit.entityId, id);

  res.json({
    habitId: id,
    patterns: patternData.patterns,
    routine: patternData.routine
  });
});

// GET /habits/:id/consistency - Get consistency score
app.get('/habits/:id/consistency', (req, res) => {
  const { id } = req.params;
  const { days } = req.query;
  const habit = habits.get(id);

  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  const consistency = calculateConsistency(habit.entityId, id, parseInt(days) || 30);

  res.json({
    habitId: id,
    ...consistency
  });
});

// DELETE /habits/:id - Delete habit
app.delete('/habits/:id', (req, res) => {
  const { id } = req.params;
  const habit = habits.get(id);

  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  habit.status = 'deleted';
  habits.set(id, habit);

  res.json({ success: true });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'habit-engine',
    port: PORT,
    habits: habits.size,
    entities: habitLogs.size
  });
});

app.listen(PORT, () => {
  console.log(`Habit Engine running on port ${PORT}`);
});

export default app;
