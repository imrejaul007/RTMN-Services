/**
 * Wellness Routes — metrics / workouts / meals / goals / insights / dashboard
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const VALID_METRIC_TYPES = ['weight', 'sleep', 'steps', 'water', 'mood', 'energy', 'heart_rate', 'blood_pressure', 'custom'];
const VALID_WORKOUT_TYPES = ['cardio', 'strength', 'yoga', 'swimming', 'cycling', 'walking', 'sports', 'other'];
const VALID_MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const VALID_PERIODS = ['daily', 'weekly', 'monthly'];

module.exports = function({ metricsStore, workoutsStore, mealsStore, goalsStore }) {
  const router = express.Router();

  // === METRICS ===
  router.get('/metrics/:userId', (req, res) => {
    let list = Array.from(metricsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(m => m.userId === req.params.userId);
    if (req.query.type) list = list.filter(m => m.type === req.query.type);
    if (req.query.from) list = list.filter(m => m.date >= req.query.from);
    if (req.query.to) list = list.filter(m => m.date <= req.query.to);
    list.sort((a, b) => b.date.localeCompare(a.date));
    res.json({ success: true, total: list.length, metrics: list });
  });

  router.post('/metrics/:userId', (req, res) => {
    const { type, value, unit, date } = req.body || {};
    if (!VALID_METRIC_TYPES.includes(type)) return res.status(400).json({ success: false, error: `type must be one of: ${VALID_METRIC_TYPES.join(', ')}` });
    if (typeof value !== 'number' || isNaN(value)) return res.status(400).json({ success: false, error: 'value must be a number' });
    const id = `m-${uuidv4().slice(0, 8)}`;
    const m = { id, userId: req.params.userId, type, value, unit: unit || '', date: date || new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString() };
    metricsStore.set(id, m);
    res.status(201).json({ success: true, data: m });
  });

  router.delete('/metrics/:entryId/:userId', (req, res) => {
    const m = metricsStore.get(req.params.entryId);
    if (!m) return res.status(404).json({ success: false, error: 'Not found' });
    if (m.userId !== req.params.userId) return res.status(403).json({ success: false, error: 'Not yours' });
    metricsStore.delete(req.params.entryId);
    res.json({ success: true, deleted: req.params.entryId });
  });

  // === WORKOUTS ===
  router.get('/workouts/:userId', (req, res) => {
    const list = Array.from(workoutsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(w => w.userId === req.params.userId)
      .sort((a, b) => b.date.localeCompare(a.date));
    res.json({ success: true, total: list.length, workouts: list });
  });

  router.post('/workouts/:userId', (req, res) => {
    const { type, title, duration, calories = 0, date, intensity = 'moderate' } = req.body || {};
    if (!VALID_WORKOUT_TYPES.includes(type)) return res.status(400).json({ success: false, error: `type must be one of: ${VALID_WORKOUT_TYPES.join(', ')}` });
    if (!title || title.trim().length < 2) return res.status(400).json({ success: false, error: 'title required' });
    if (typeof duration !== 'number' || duration <= 0) return res.status(400).json({ success: false, error: 'duration must be > 0' });
    const id = `wo-${uuidv4().slice(0, 8)}`;
    const w = { id, userId: req.params.userId, type, title: title.trim(), duration, calories, date: date || new Date().toISOString().slice(0, 10), intensity };
    workoutsStore.set(id, w);
    res.status(201).json({ success: true, data: w });
  });

  // === MEALS ===
  router.get('/meals/:userId', (req, res) => {
    let list = Array.from(mealsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(m => m.userId === req.params.userId);
    if (req.query.day) list = list.filter(m => m.date === req.query.day);
    if (req.query.meal) list = list.filter(m => m.meal === req.query.meal);
    list.sort((a, b) => a.date.localeCompare(b.date));
    res.json({ success: true, total: list.length, meals: list });
  });

  router.post('/meals/:userId', (req, res) => {
    const { name, calories, meal, date, protein = 0, carbs = 0, fat = 0 } = req.body || {};
    if (!name || name.trim().length < 2) return res.status(400).json({ success: false, error: 'name required' });
    if (!VALID_MEALS.includes(meal)) return res.status(400).json({ success: false, error: `meal must be one of: ${VALID_MEALS.join(', ')}` });
    if (typeof calories !== 'number' || calories < 0) return res.status(400).json({ success: false, error: 'calories must be >= 0' });
    const id = `ml-${uuidv4().slice(0, 8)}`;
    const m = { id, userId: req.params.userId, name: name.trim(), calories, protein, carbs, fat, meal, date: date || new Date().toISOString().slice(0, 10) };
    mealsStore.set(id, m);
    res.status(201).json({ success: true, data: m });
  });

  // === GOALS ===
  router.get('/goals/:userId', (req, res) => {
    const list = Array.from(goalsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(g => g.userId === req.params.userId);
    res.json({ success: true, total: list.length, goals: list });
  });

  router.post('/goals/:userId', (req, res) => {
    const { title, metric, target, unit, period = 'daily' } = req.body || {};
    if (!title || title.trim().length < 3) return res.status(400).json({ success: false, error: 'title required (min 3 chars)' });
    if (typeof target !== 'number' || target <= 0) return res.status(400).json({ success: false, error: 'target must be > 0' });
    if (!VALID_PERIODS.includes(period)) return res.status(400).json({ success: false, error: `period must be one of: ${VALID_PERIODS.join(', ')}` });
    const id = `gl-${uuidv4().slice(0, 8)}`;
    const g = { id, userId: req.params.userId, title: title.trim(), metric: metric || 'custom', target, unit: unit || '', period, progress: 0, createdAt: new Date().toISOString() };
    goalsStore.set(id, g);
    res.status(201).json({ success: true, data: g });
  });

  router.post('/goals/:goalId/progress/:userId', (req, res) => {
    const g = goalsStore.get(req.params.goalId);
    if (!g) return res.status(404).json({ success: false, error: 'Goal not found' });
    if (g.userId !== req.params.userId) return res.status(403).json({ success: false, error: 'Not your goal' });
    const amount = parseFloat(req.query.amount ?? req.body?.amount ?? '0');
    if (isNaN(amount)) return res.status(400).json({ success: false, error: 'amount must be a number' });
    g.progress = Math.max(0, g.progress + amount);
    g.updatedAt = new Date().toISOString();
    goalsStore.set(req.params.goalId, g);
    res.json({ success: true, data: g });
  });

  // === INSIGHTS (LLM weekly summary) ===
  router.get('/insights/:userId', async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const allMetrics = Array.from(metricsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(m => m.userId === req.params.userId && m.date >= weekAgo);
    const workouts = Array.from(workoutsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(w => w.userId === req.params.userId && w.date >= weekAgo);
    const meals = Array.from(mealsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(m => m.userId === req.params.userId && m.date >= weekAgo);

    // Aggregate by metric type
    const byType = {};
    for (const m of allMetrics) {
      if (!byType[m.type]) byType[m.type] = [];
      byType[m.type].push(m.value);
    }
    const summary = {};
    for (const [type, values] of Object.entries(byType)) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      summary[type] = { avg: Math.round(avg * 10) / 10, days: values.length, unit: allMetrics.find(m => m.type === type)?.unit };
    }

    const fallback = {
      period: { from: weekAgo, to: today },
      metrics: summary,
      workoutsCount: workouts.length,
      workoutsCalories: workouts.reduce((a, w) => a + (w.calories || 0), 0),
      mealsCount: meals.length,
      caloriesIn: meals.reduce((a, m) => a + (m.calories || 0), 0),
      tips: [
        workouts.length < 3 ? 'Try to add 1-2 more workouts this week — aim for 150+ minutes.' : 'Great workout consistency! Keep it up.',
        (summary.steps?.avg || 0) < 8000 ? 'Bump daily steps to 8K+ — try a walking meeting or after-dinner stroll.' : 'Strong step count — your cardiovascular health thanks you.',
        (summary.sleep?.avg || 0) < 7 ? 'Sleep under 7h tanks everything else. Protect your bedtime.' : 'Sleep is dialed in. Maintain the routine.',
      ],
      generatedAt: new Date().toISOString(),
      source: 'template',
    };

    try {
      const out = await callLLM({
        prompt: `User wellness data this week:\n${JSON.stringify(summary, null, 2)}\nWorkouts: ${workouts.length}, total cal burned: ${fallback.workoutsCalories}.\nMeals logged: ${meals.length}, total cal in: ${fallback.caloriesIn}.\n\nGive 3 tight, specific, opinionated weekly tips. No fluff.`,
        system: 'You are a sharp personal wellness coach. Specific, no-BS, evidence-based.',
        maxTokens: 400,
      });
      const text = typeof out === 'string' ? out : (out?.text || out?.content || '');
      if (text) {
        fallback.tips = [text];
        fallback.source = 'llm';
      }
    } catch { /* keep fallback */ }

    res.json({ success: true, data: fallback });
  });

  // === DASHBOARD (today's snapshot) ===
  router.get('/dashboard/:userId', (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const todayMetrics = Array.from(metricsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(m => m.userId === req.params.userId && m.date === today);
    const todayMeals = Array.from(mealsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(m => m.userId === req.params.userId && m.date === today);
    const todayWorkouts = Array.from(workoutsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(w => w.userId === req.params.userId && w.date === today);

    const metricMap = {};
    for (const m of todayMetrics) metricMap[m.type] = { value: m.value, unit: m.unit };

    const caloriesIn = todayMeals.reduce((a, m) => a + (m.calories || 0), 0);
    const caloriesOut = todayWorkouts.reduce((a, w) => a + (w.calories || 0), 0);

    res.json({
      success: true,
      data: {
        date: today,
        metrics: metricMap,
        meals: { count: todayMeals.length, calories: caloriesIn, list: todayMeals },
        workouts: { count: todayWorkouts.length, calories: caloriesOut, list: todayWorkouts },
        netCalories: caloriesIn - caloriesOut,
      },
    });
  });

  return router;
};