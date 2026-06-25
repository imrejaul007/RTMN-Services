/**
 * Planner Routes — todos, habits, time-blocks, daily snapshot.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['pending', 'in-progress', 'completed', 'cancelled'];
const FREQUENCIES = ['daily', 'weekly', 'weekdays', 'custom'];
const BLOCK_TYPES = ['focus', 'meeting', 'break', 'health', 'personal', 'other'];

module.exports = function({ todosStore, habitsStore, habitLogsStore, blocksStore }) {
  const router = express.Router();

  // === TODOS ===
  router.get('/todos/by-user/:userId', (req, res) => {
    const { status, date, priority } = req.query;
    let list = Array.from(todosStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(t => t.userId === req.params.userId);
    if (status) list = list.filter(t => t.status === status);
    if (priority) list = list.filter(t => t.priority === priority);
    if (date) list = list.filter(t => t.due === date);
    // Sort: high first, then by due date
    list.sort((a, b) => {
      const pa = { high: 0, medium: 1, low: 2 }[a.priority] ?? 3;
      const pb = { high: 0, medium: 1, low: 2 }[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      return (a.due || 'z').localeCompare(b.due || 'z');
    });
    res.json({ success: true, total: list.length, todos: list });
  });

  router.post('/todos/by-user/:userId', (req, res) => {
    const { title, priority = 'medium', due, tags = [] } = req.body || {};
    if (!title || title.trim().length < 2) return res.status(400).json({ success: false, error: 'title required' });
    if (!PRIORITIES.includes(priority)) return res.status(400).json({ success: false, error: `priority must be: ${PRIORITIES.join(', ')}` });
    const id = `td-${uuidv4().slice(0, 8)}`;
    const t = {
      id, userId: req.params.userId, title: title.trim(), priority,
      status: 'pending', due: due || null, tags,
      createdAt: new Date().toISOString(),
    };
    todosStore.set(id, t);
    res.status(201).json({ success: true, data: t });
  });

  // Specific todo routes MUST come before /todos/by-user pattern
  router.patch('/todos/:todoId', (req, res) => {
    const t = todosStore.get(req.params.todoId);
    if (!t) return res.status(404).json({ success: false, error: 'Todo not found' });
    const { title, priority, status, due, tags } = req.body || {};
    if (title !== undefined) t.title = title;
    if (priority !== undefined) {
      if (!PRIORITIES.includes(priority)) return res.status(400).json({ success: false, error: `priority must be: ${PRIORITIES.join(', ')}` });
      t.priority = priority;
    }
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return res.status(400).json({ success: false, error: `status must be: ${STATUSES.join(', ')}` });
      t.status = status;
      if (status === 'completed' && !t.completedAt) t.completedAt = new Date().toISOString();
    }
    if (due !== undefined) t.due = due;
    if (tags !== undefined) t.tags = tags;
    todosStore.set(req.params.todoId, t);
    res.json({ success: true, data: t });
  });

  router.delete('/todos/:todoId', (req, res) => {
    const t = todosStore.get(req.params.todoId);
    if (!t) return res.status(404).json({ success: false, error: 'Todo not found' });
    todosStore.delete(req.params.todoId);
    res.json({ success: true, deleted: req.params.todoId });
  });

  router.post('/todos/:todoId/complete', (req, res) => {
    const t = todosStore.get(req.params.todoId);
    if (!t) return res.status(404).json({ success: false, error: 'Todo not found' });
    t.status = 'completed';
    t.completedAt = new Date().toISOString();
    todosStore.set(req.params.todoId, t);
    res.json({ success: true, data: t });
  });

  // === HABITS ===
  router.get('/habits/by-user/:userId', (req, res) => {
    const habits = Array.from(habitsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(h => h.userId === req.params.userId);
    const logs = Array.from(habitLogsStore.entries()).map(([k, v]) => ({ id: k, ...v }));
    const today = new Date().toISOString().slice(0, 10);
    const enriched = habits.map((h) => {
      const habitLogs = logs.filter((l) => l.habitId === h.id).sort((a, b) => b.date.localeCompare(a.date));
      const todayLog = habitLogs.find((l) => l.date === today);
      // Compute current streak
      const loggedDays = new Set(habitLogs.map((l) => l.date));
      let streak = 0;
      for (let i = 0; i < 365; i++) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        if (loggedDays.has(d)) streak += 1;
        else if (i > 0) break;
      }
      return { ...h, todayDone: !!todayLog, currentStreak: streak, totalLogs: habitLogs.length };
    });
    res.json({ success: true, total: enriched.length, habits: enriched });
  });

  router.post('/habits/by-user/:userId', (req, res) => {
    const { title, frequency = 'daily', icon = '✨' } = req.body || {};
    if (!title || title.trim().length < 2) return res.status(400).json({ success: false, error: 'title required' });
    if (!FREQUENCIES.includes(frequency)) return res.status(400).json({ success: false, error: `frequency must be: ${FREQUENCIES.join(', ')}` });
    const id = `hb-${uuidv4().slice(0, 8)}`;
    const h = { id, userId: req.params.userId, title: title.trim(), frequency, icon, createdAt: new Date().toISOString() };
    habitsStore.set(id, h);
    res.status(201).json({ success: true, data: h });
  });

  router.post('/habits/:habitId/log', (req, res) => {
    const h = habitsStore.get(req.params.habitId);
    if (!h) return res.status(404).json({ success: false, error: 'Habit not found' });
    const date = req.body?.date || req.query.date || new Date().toISOString().slice(0, 10);
    // Idempotent: same habit + date → no duplicate
    const existing = Array.from(habitLogsStore.entries())
      .find(([, v]) => v.habitId === req.params.habitId && v.date === date && v.userId === h.userId);
    if (existing) return res.json({ success: true, data: existing[1], alreadyLogged: true });
    const id = `hl-${uuidv4().slice(0, 8)}`;
    const log = { id, habitId: req.params.habitId, userId: h.userId, date };
    habitLogsStore.set(id, log);
    res.status(201).json({ success: true, data: log });
  });

  router.delete('/habits/:habitId', (req, res) => {
    const h = habitsStore.get(req.params.habitId);
    if (!h) return res.status(404).json({ success: false, error: 'Habit not found' });
    // Cascade delete logs
    const logs = Array.from(habitLogsStore.entries()).filter(([, v]) => v.habitId === req.params.habitId);
    for (const [k] of logs) habitLogsStore.delete(k);
    habitsStore.delete(req.params.habitId);
    res.json({ success: true, deleted: req.params.habitId, logsDeleted: logs.length });
  });

  // === TIME BLOCKS ===
  router.get('/blocks/by-user/:userId', (req, res) => {
    const { date } = req.query;
    let list = Array.from(blocksStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(b => b.userId === req.params.userId);
    if (date) list = list.filter((b) => b.start.slice(0, 10) === date);
    list.sort((a, b) => a.start.localeCompare(b.start));
    res.json({ success: true, total: list.length, blocks: list });
  });

  router.post('/blocks/by-user/:userId', (req, res) => {
    const { title, start, end, type = 'focus' } = req.body || {};
    if (!title || !start || !end) return res.status(400).json({ success: false, error: 'title, start, end required' });
    if (!BLOCK_TYPES.includes(type)) return res.status(400).json({ success: false, error: `type must be: ${BLOCK_TYPES.join(', ')}` });
    if (new Date(end) <= new Date(start)) return res.status(400).json({ success: false, error: 'end must be after start' });
    const id = `bk-${uuidv4().slice(0, 8)}`;
    const b = { id, userId: req.params.userId, title: title.trim(), start, end, type, createdAt: new Date().toISOString() };
    blocksStore.set(id, b);
    res.status(201).json({ success: true, data: b });
  });

  router.delete('/blocks/:blockId', (req, res) => {
    const b = blocksStore.get(req.params.blockId);
    if (!b) return res.status(404).json({ success: false, error: 'Block not found' });
    blocksStore.delete(req.params.blockId);
    res.json({ success: true, deleted: req.params.blockId });
  });

  // === TODAY (snapshot) ===
  router.get('/today/:userId', (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const todos = Array.from(todosStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter((t) => t.userId === req.params.userId && t.due === today && t.status !== 'completed');
    const habits = Array.from(habitsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter((h) => h.userId === req.params.userId);
    const logs = Array.from(habitLogsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter((l) => l.userId === req.params.userId && l.date === today);
    const habitsWithStatus = habits.map((h) => ({ ...h, todayDone: logs.some((l) => l.habitId === h.id) }));
    const blocks = Array.from(blocksStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter((b) => b.userId === req.params.userId && b.start.slice(0, 10) === today)
      .sort((a, b) => a.start.localeCompare(b.start));
    res.json({
      success: true,
      data: {
        date: today,
        todos: { count: todos.length, list: todos },
        habits: { total: habitsWithStatus.length, done: habitsWithStatus.filter((h) => h.todayDone).length, list: habitsWithStatus },
        blocks: { count: blocks.length, list: blocks },
      },
    });
  });

  // === STATS ===
  router.get('/stats/:userId', (req, res) => {
    const todos = Array.from(todosStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter((t) => t.userId === req.params.userId);
    const habits = Array.from(habitsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter((h) => h.userId === req.params.userId);
    const logs = Array.from(habitLogsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter((l) => l.userId === req.params.userId);
    const todosByStatus = { pending: 0, 'in-progress': 0, completed: 0, cancelled: 0 };
    for (const t of todos) todosByStatus[t.status] = (todosByStatus[t.status] || 0) + 1;
    // 7-day habit completion rate
    const last7Days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
    const expected = habits.length * 7;
    const actual = logs.filter((l) => last7Days.includes(l.date)).length;
    res.json({
      success: true,
      data: {
        totalTodos: todos.length,
        todosByStatus,
        totalHabits: habits.length,
        totalHabitLogs: logs.length,
        habitCompletion7d: expected > 0 ? Math.round((actual / expected) * 100) : 0,
        overdueTodos: todos.filter((t) => t.due && t.due < new Date().toISOString().slice(0, 10) && t.status !== 'completed').length,
      },
    });
  });

  return router;
};
