/**
 * HOJAI Studio - AI UX Researcher Service
 * Heatmaps, session recordings, personas
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4764;
app.use(express.json());

const sessions = new Map(); // sessionId -> session data
const heatmaps = new Map(); // projectId -> heatmap data
const personas = new Map(); // projectId -> personas
const events = []; // all events
const funnels = []; // funnel definitions

// Event types
const EVENT_TYPES = ['pageview', 'click', 'scroll', 'hover', 'input', 'submit', 'error', 'custom'];

// REST API - Track Event
app.post('/api/track', (req, res) => {
  const { sessionId, projectId, eventType, eventData, userId, timestamp } = req.body;

  const event = {
    id: uuidv4(),
    sessionId,
    projectId,
    eventType,
    eventData,
    userId,
    timestamp: timestamp || new Date().toISOString()
  };

  events.push(event);
  if (events.length > 100000) events.shift();

  // Update session
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      projectId,
      userId,
      events: [],
      startedAt: event.timestamp,
      lastActivity: event.timestamp
    });
  }

  const session = sessions.get(sessionId);
  session.events.push(event);
  session.lastActivity = event.timestamp;
  session.pageviews = session.events.filter(e => e.eventType === 'pageview').length;
  session.clicks = session.events.filter(e => e.eventType === 'click').length;

  res.json({ tracked: true });
});

// REST API - Start Session
app.post('/api/sessions', (req, res) => {
  const { projectId, userId, metadata = {} } = req.body;
  const sessionId = uuidv4();

  const session = {
    id: sessionId,
    projectId,
    userId,
    metadata,
    events: [],
    status: 'active',
    startedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };

  sessions.set(sessionId, session);
  res.json(session);
});

// REST API - Get Session
app.get('/api/sessions/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

app.get('/api/sessions', (req, res) => {
  const { projectId, status } = req.query;
  let list = Array.from(sessions.values());
  if (projectId) list = list.filter(s => s.projectId === projectId);
  if (status) list = list.filter(s => s.status === status);
  res.json(list.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)));
});

// REST API - End Session
app.post('/api/sessions/:sessionId/end', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  session.status = 'ended';
  session.endedAt = new Date().toISOString();
  session.duration = new Date(session.endedAt) - new Date(session.startedAt);

  res.json(session);
});

// REST API - Heatmap
app.get('/api/heatmaps/:projectId', (req, res) => {
  const { pageUrl } = req.query;
  const projectEvents = events.filter(e => e.projectId === req.params.projectId && e.eventType === 'click');

  // Generate heatmap data
  const heatmap = {
    projectId: req.params.projectId,
    pageUrl: pageUrl || 'all',
    clicks: [],
    scroll: [],
    generatedAt: new Date().toISOString()
  };

  // Simulate click heatmap
  for (let i = 0; i < 100; i++) {
    heatmap.clicks.push({
      x: Math.round(Math.random() * 100),
      y: Math.round(Math.random() * 100),
      intensity: Math.round(Math.random() * 100)
    });
  }

  // Scroll depth
  heatmap.scroll = [
    { depth: 0, percentage: 100 },
    { depth: 25, percentage: 80 },
    { depth: 50, percentage: 60 },
    { depth: 75, percentage: 40 },
    { depth: 100, percentage: 20 }
  ];

  heatmaps.set(req.params.projectId, heatmap);
  res.json(heatmap);
});

// REST API - Generate Persona
app.post('/api/personas', (req, res) => {
  const { projectId, name, demographics, goals, painPoints, behavior } = req.body;

  const persona = {
    id: uuidv4(),
    projectId,
    name: name || generatePersonaName(),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uuidv4()}`,
    demographics: demographics || generateDemographics(),
    goals: goals || generateGoals(),
    painPoints: painPoints || generatePainPoints(),
    behavior: behavior || generateBehavior(),
    createdAt: new Date().toISOString()
  };

  if (!personas.has(projectId)) personas.set(projectId, []);
  personas.get(projectId).push(persona);

  res.json(persona);
});

app.get('/api/personas/:projectId', (req, res) => {
  const projectPersonas = personas.get(req.params.projectId) || [];
  res.json(projectPersonas);
});

app.delete('/api/personas/:personaId', (req, res) => {
  personas.forEach((list, projectId) => {
    const filtered = list.filter(p => p.id !== req.params.personaId);
    if (filtered.length !== list.length) {
      personas.set(projectId, filtered);
    }
  });
  res.json({ deleted: true });
});

// REST API - Analytics
app.get('/api/analytics/:projectId', (req, res) => {
  const projectEvents = events.filter(e => e.projectId === req.params.projectId);
  const projectSessions = Array.from(sessions.values()).filter(s => s.projectId === req.params.projectId);

  const analytics = {
    projectId: req.params.projectId,
    timestamp: new Date().toISOString(),

    sessions: {
      total: projectSessions.length,
      active: projectSessions.filter(s => s.status === 'active').length,
      completed: projectSessions.filter(s => s.status === 'ended').length,
      avgDuration: projectSessions.length > 0
        ? Math.round(projectSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / projectSessions.length / 1000)
        : 0
    },

    events: {
      total: projectEvents.length,
      byType: EVENT_TYPES.reduce((acc, type) => {
        acc[type] = projectEvents.filter(e => e.eventType === type).length;
        return acc;
      }, {})
    },

    engagement: {
      avgClicks: projectSessions.length > 0
        ? Math.round(projectSessions.reduce((sum, s) => sum + (s.clicks || 0), 0) / projectSessions.length)
        : 0,
      avgPageviews: projectSessions.length > 0
        ? Math.round(projectSessions.reduce((sum, s) => sum + (s.pageviews || 0), 0) / projectSessions.length)
        : 0,
      bounceRate: calculateBounceRate(projectSessions)
    },

    conversion: {
      rate: Math.round(Math.random() * 30 + 5),
      visits: Math.round(Math.random() * 1000 + 100)
    }
  };

  res.json(analytics);
});

// REST API - Funnels
app.post('/api/funnels', (req, res) => {
  const { projectId, name, steps } = req.body;
  const funnel = {
    id: uuidv4(),
    projectId,
    name,
    steps,
    createdAt: new Date().toISOString()
  };

  funnels.push(funnel);
  res.json(funnel);
});

app.get('/api/funnels/:funnelId/analysis', (req, res) => {
  const funnel = funnels.find(f => f.id === req.params.funnelId);
  if (!funnel) return res.status(404).json({ error: 'Funnel not found' });

  // Generate funnel analysis
  const analysis = {
    funnelId: funnel.id,
    name: funnel.name,
    steps: funnel.steps.map((step, i) => ({
      ...step,
      visitors: Math.round(1000 * Math.pow(0.6, i)),
      dropoff: i > 0 ? Math.round(Math.random() * 20 + 10) : 0
    })),
    overallConversion: Math.round(Math.random() * 15 + 2)
  };

  res.json(analysis);
});

// REST API - Session Recording
app.get('/api/recordings/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const recording = {
    sessionId: session.id,
    events: session.events,
    duration: session.duration,
    pageviews: session.pageviews,
    clicks: session.clicks,
    mouseMovements: generateMouseMovements(),
    scrollDepth: generateScrollDepth()
  };

  res.json(recording);
});

function generatePersonaName() {
  const first = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Sage', 'River'];
  const last = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
}

function generateDemographics() {
  return {
    age: Math.round(Math.random() * 40 + 20),
    occupation: ['Developer', 'Designer', 'Manager', 'Executive', 'Freelancer'][Math.floor(Math.random() * 5)],
    techSavvy: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
    location: ['Urban', 'Suburban', 'Rural'][Math.floor(Math.random() * 3)]
  };
}

function generateGoals() {
  const goals = [
    'Complete tasks quickly and efficiently',
    'Find specific information',
    'Compare products and prices',
    'Learn new features',
    'Troubleshoot issues'
  ];
  return goals.slice(0, Math.floor(Math.random() * 3) + 1);
}

function generatePainPoints() {
  const painPoints = [
    'Confusing navigation',
    'Slow page loads',
    'Hard to find information',
    'Complex checkout process',
    'Poor mobile experience'
  ];
  return painPoints.slice(0, Math.floor(Math.random() * 3) + 1);
}

function generateBehavior() {
  return {
    sessionFrequency: ['Daily', 'Weekly', 'Monthly'][Math.floor(Math.random() * 3)],
    avgSessionDuration: Math.round(Math.random() * 15 + 3),
    preferredDevice: ['Desktop', 'Mobile', 'Tablet'][Math.floor(Math.random() * 3)],
    timeOnSite: Math.round(Math.random() * 30 + 5)
  };
}

function calculateBounceRate(sessions) {
  const bounced = sessions.filter(s => s.pageviews === 1).length;
  return sessions.length > 0 ? Math.round((bounced / sessions.length) * 100) : 0;
}

function generateMouseMovements() {
  const movements = [];
  for (let i = 0; i < 50; i++) {
    movements.push({
      x: Math.round(Math.random() * 100),
      y: Math.round(Math.random() * 100),
      t: i * 100
    });
  }
  return movements;
}

function generateScrollDepth() {
  return [
    { depth: 0, duration: Math.round(Math.random() * 2000) },
    { depth: 25, duration: Math.round(Math.random() * 3000) },
    { depth: 50, duration: Math.round(Math.random() * 5000) },
    { depth: 75, duration: Math.round(Math.random() * 3000) },
    { depth: 100, duration: Math.round(Math.random() * 2000) }
  ];
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'ai-ux-researcher', sessions: sessions.size, events: events.length }));
app.listen(PORT, () => console.log(`AI UX Researcher running on port ${PORT}`));
