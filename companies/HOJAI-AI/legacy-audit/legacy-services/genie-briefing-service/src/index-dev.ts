/**
 * GENIE Briefing Service - Development Version
 * Uses in-memory storage (no MongoDB required)
 * Version: 1.0.0 | Date: May 30, 2026
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = parseInt(process.env.PORT || '4706', 10);

// In-memory storage
const briefings = new Map();
const briefingsByUser = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Health endpoints
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-briefing-service',
    version: '1.0.0',
    storage: 'in-memory',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/health/live', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/ready', (_req, res) => {
  res.json({
    status: 'ready',
    checks: { memory: 'ok' },
    timestamp: new Date().toISOString(),
  });
});

// Helper: create response
function createResponse(success: boolean, data?: any, error?: any) {
  const result: any = { success };
  if (data !== undefined) result.data = data;
  if (error) result.error = error;
  result.meta = {
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  };
  return result;
}

// GET /api/briefings/today
app.get('/api/briefings/today', (req, res) => {
  const userId = req.headers['x-user-id'] as string || 'anonymous';
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}:${today}`;

  const briefing = briefings.get(key);
  if (!briefing) {
    res.status(404).json(createResponse(false, undefined, { code: 'BRIEFING_NOT_FOUND', message: 'No briefing found for today' }));
    return;
  }
  res.json(createResponse(true, briefing));
});

// GET /api/briefings/morning
app.get('/api/briefings/morning', (req, res) => {
  const userId = req.headers['x-user-id'] as string || 'anonymous';
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}:${today}:morning`;

  const briefing = briefings.get(key);
  res.json(createResponse(true, briefing || generateMorningBriefing(userId)));
});

// GET /api/briefings/evening
app.get('/api/briefings/evening', (req, res) => {
  const userId = req.headers['x-user-id'] as string || 'anonymous';
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}:${today}:evening`;

  const briefing = briefings.get(key);
  res.json(createResponse(true, briefing || generateEveningBriefing(userId)));
});

// GET /api/briefings
app.get('/api/briefings', (req, res) => {
  const userId = req.headers['x-user-id'] as string || 'anonymous';
  const userBriefings = briefingsByUser.get(userId) || [];
  res.json(createResponse(true, { briefings: userBriefings, count: userBriefings.length }));
});

// POST /api/briefings/generate
app.post('/api/briefings/generate', (req, res) => {
  const { userId, type = 'daily' } = req.body;
  const uid = userId || 'anonymous';

  const today = new Date().toISOString().split('T')[0];
  const briefing = type === 'morning' ? generateMorningBriefing(uid)
               : type === 'evening' ? generateEveningBriefing(uid)
               : generateDailyBriefing(uid);

  briefings.set(`${uid}:${today}:${type}`, briefing);

  const userBriefings = briefingsByUser.get(uid) || [];
  userBriefings.push(briefing);
  briefingsByUser.set(uid, userBriefings);

  res.json(createResponse(true, briefing));
});

// PATCH /api/briefings/:id/dismiss
app.patch('/api/briefings/:id/dismiss', (req, res) => {
  const { id } = req.params;
  res.json(createResponse(true, { dismissed: true, id }));
});

// DELETE /api/briefings/:id
app.delete('/api/briefings/:id', (req, res) => {
  const { id } = req.params;
  res.json(createResponse(true, { deleted: true, id }));
});

// Start server
app.listen(PORT, () => {
  console.log(`🎯 GENIE Briefing Service running on port ${PORT}`);
  console.log(`   Storage: In-Memory (Development Mode)`);
});

// Generate mock morning briefing
function generateMorningBriefing(userId: string) {
  const today = new Date().toDateString();
  return {
    id: `briefing_${Date.now()}`,
    userId,
    date: today,
    type: 'morning',
    sections: [
      {
        id: 'weather',
        type: 'weather',
        title: 'Weather',
        content: 'Partly cloudy, 24°C in Mumbai',
      },
      {
        id: 'tasks',
        type: 'tasks',
        title: 'Top Tasks',
        items: [
          { id: '1', title: 'Review Q2 report', priority: 'high', completed: false },
          { id: '2', title: 'Call with team', priority: 'medium', completed: false },
        ],
      },
      {
        id: 'reminders',
        type: 'reminders',
        title: 'Reminders',
        items: [
          { id: 'r1', title: 'Follow up with client', time: '10:00 AM' },
        ],
      },
    ],
    summary: 'Good morning! You have 2 high priority tasks today.',
  };
}

// Generate mock evening briefing
function generateEveningBriefing(userId: string) {
  return {
    id: `briefing_${Date.now()}`,
    userId,
    date: new Date().toDateString(),
    type: 'evening',
    sections: [
      {
        id: 'summary',
        type: 'summary',
        title: 'Day Summary',
        content: 'You completed 5 tasks today. Great work!',
      },
      {
        id: 'tomorrow',
        type: 'tomorrow',
        title: 'Tomorrow',
        items: [
          { id: 't1', title: 'Team standup at 9 AM' },
          { id: 't2', title: 'Project deadline' },
        ],
      },
    ],
    summary: 'Great day! 5 tasks completed.',
  };
}

// Generate mock daily briefing
function generateDailyBriefing(userId: string) {
  return {
    id: `briefing_${Date.now()}`,
    userId,
    date: new Date().toDateString(),
    type: 'daily',
    sections: [
      {
        id: 'weather',
        type: 'weather',
        title: 'Weather',
        content: 'Sunny, 28°C',
      },
      {
        id: 'tasks',
        type: 'tasks',
        title: 'Tasks',
        items: [
          { id: '1', title: 'Complete documentation', priority: 'medium', completed: false },
        ],
      },
      {
        id: 'meetings',
        type: 'meetings',
        title: 'Meetings',
        items: [
          { id: 'm1', title: 'Sprint planning', time: '2:00 PM' },
        ],
      },
    ],
    summary: 'You have 3 meetings and 5 tasks today.',
  };
}

export default app;
