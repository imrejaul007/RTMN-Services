/**
 * Genie Gateway - Personal AI Orchestrator
 * Port 4701
 *
 * The central orchestrator for Genie Personal AI
 * Routes requests to appropriate services (Memory, Twins, Briefing, Calendar, etc.)
 */

const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4701;

// Logger
const logger = {
  info: (msg, meta = {}) => console.log(`[${new Date().toISOString()}] INFO: ${msg}`, meta),
  error: (msg, meta = {}) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`, meta)
};

// Service URLs (defaults to localhost)
const SERVICE_URLS = {
  memory: process.env.MEMORY_URL || 'http://localhost:4703',
  twins: process.env.TWINS_URL || 'http://localhost:4705',
  calendar: process.env.CALENDAR_URL || 'http://localhost:4709',
  briefing: process.env.BRIEFING_URL || 'http://localhost:4706',
  personalTwin: process.env.PERSONAL_TWIN_URL || 'http://localhost:4708',
  financialTwin: process.env.FINANCIAL_TWIN_URL || 'http://localhost:4715',
  healthTwin: process.env.HEALTH_TWIN_URL || 'http://localhost:4717',
  founderTwin: process.env.FOUNDER_TWIN_URL || 'http://localhost:4716',
  relationshipTwin: process.env.RELATIONSHIP_TWIN_URL || 'http://localhost:4705',
  corpid: process.env.CORPID_URL || 'http://localhost:4702'
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, error: { code: 'RATE_LIMITED' } }
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-gateway',
    port: PORT,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Readiness check
app.get('/ready', async (req, res) => {
  const services = {};

  for (const [name, url] of Object.entries(SERVICE_URLS)) {
    try {
      await axios.get(`${url}/health`, { timeout: 2000 });
      services[name] = 'up';
    } catch {
      services[name] = 'down';
    }
  }

  const allUp = Object.values(services).every(s => s === 'up');
  res.json({ ready: allUp, services });
});

// ==================== USER CONTEXT ====================

/**
 * Get full user context from all services
 */
app.get('/api/user/:userId/context', async (req, res) => {
  const { userId } = req.params;

  try {
    const [memory, personalTwin, financialTwin, healthTwin] = await Promise.allSettled([
      axios.get(`${SERVICE_URLS.memory}/api/memory/${userId}`).catch(() => ({ data: null })),
      axios.get(`${SERVICE_URLS.personalTwin}/api/twin/${userId}`).catch(() => ({ data: null })),
      axios.get(`${SERVICE_URLS.financialTwin}/api/twin/${userId}`).catch(() => ({ data: null })),
      axios.get(`${SERVICE_URLS.healthTwin}/api/twin/${userId}`).catch(() => ({ data: null }))
    ]);

    res.json({
      success: true,
      userId,
      context: {
        memory: memory.value?.data || null,
        personalTwin: personalTwin.value?.data || null,
        financialTwin: financialTwin.value?.data || null,
        healthTwin: healthTwin.value?.data || null
      }
    });
  } catch (error) {
    logger.error('Failed to get user context', { userId, error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get user preferences
 */
app.get('/api/user/:userId/preferences', async (req, res) => {
  const { userId } = req.params;

  try {
    const response = await axios.get(`${SERVICE_URLS.memory}/api/preferences/${userId}`);
    res.json(response.data);
  } catch (error) {
    res.json({ success: true, preferences: {} });
  }
});

/**
 * Update user preferences
 */
app.put('/api/user/:userId/preferences',requireAuth, async (req, res) => {
  const { userId } = req.params;
  const { preferences } = req.body;

  try {
    await axios.put(`${SERVICE_URLS.memory}/api/preferences/${userId}`, { preferences });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AI QUERY ====================

/**
 * Main AI query endpoint - routes to appropriate AI service
 */
app.post('/api/query',requireAuth, async (req, res) => {
  const { query, userId, sessionId, context = {} } = req.body;

  if (!query) {
    return res.status(400).json({ success: false, error: 'Query is required' });
  }

  logger.info('Processing query', { query: query.substring(0, 50), userId });

  try {
    // Get user context for richer responses
    let userContext = {};
    if (userId) {
      try {
        const ctxResponse = await axios.get(`${SERVICE_URLS.memory}/api/context/${userId}`);
        userContext = ctxResponse.data.context || {};
      } catch {}
    }

    // Simple AI response generation (in production, call actual AI)
    const response = generateAIResponse(query, { ...userContext, ...context });

    res.json({
      success: true,
      query,
      response,
      requestId: uuidv4(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Query failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate AI response based on query type
 */
function generateAIResponse(query, context) {
  const q = query.toLowerCase();

  // Check query intent
  if (q.includes('weather')) {
    return {
      type: 'weather',
      message: 'Based on your location, it\'s currently sunny with a temperature of 28°C.',
      data: { temp: 28, condition: 'sunny', location: context.location || 'Mumbai' }
    };
  }

  if (q.includes('task') || q.includes('to do') || q.includes('todo')) {
    return {
      type: 'tasks',
      message: 'You have 3 tasks pending for today.',
      data: { tasks: ['Review quarterly report', 'Call with team', 'Send proposal'] }
    };
  }

  if (q.includes('meeting') || q.includes('schedule') || q.includes('calendar')) {
    return {
      type: 'calendar',
      message: 'You have 2 meetings scheduled today.',
      data: { meetings: ['Standup at 10 AM', 'Product review at 3 PM'] }
    };
  }

  if (q.includes('remind') || q.includes('reminder')) {
    return {
      type: 'reminder',
      message: 'I\'ll remind you. What would you like to be reminded about?',
      data: { awaiting: 'reminder_details' }
    };
  }

  // Default response
  return {
    type: 'general',
    message: `I understand you want to: "${query}". How can I help you with this?`,
    suggestions: ['Show my tasks', 'Check my schedule', 'Set a reminder']
  };
}

// ==================== TWIN OPERATIONS ====================

/**
 * Get all twins data for user
 */
app.get('/api/twins/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const twins = await Promise.allSettled([
      axios.get(`${SERVICE_URLS.personalTwin}/api/twin/${userId}`),
      axios.get(`${SERVICE_URLS.financialTwin}/api/twin/${userId}`),
      axios.get(`${SERVICE_URLS.healthTwin}/api/twin/${userId}`),
      axios.get(`${SERVICE_URLS.founderTwin}/api/twin/${userId}`),
      axios.get(`${SERVICE_URLS.relationshipTwin}/api/twin/${userId}`)
    ]);

    const result = {};
    const twinNames = ['personal', 'financial', 'health', 'founder', 'relationship'];
    twins.forEach((t, i) => {
      if (t.status === 'fulfilled') {
        result[twinNames[i]] = t.value.data;
      }
    });

    res.json({ success: true, userId, twins: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== BRIEFING ====================

/**
 * Get daily briefing
 */
app.get('/api/briefing/:userId', async (req, res) => {
  const { userId } = req.params;
  const { type = 'morning' } = req.query;

  try {
    const response = await axios.get(`${SERVICE_URLS.briefing}/api/briefing/${userId}?type=${type}`, {
      timeout: 5000
    });
    res.json(response.data);
  } catch (error) {
    // Return mock briefing if service unavailable
    res.json({
      success: true,
      briefing: {
        type,
        greeting: type === 'morning' ? 'Good morning!' : 'Good evening!',
        message: 'Here\'s your daily summary.',
        sections: {
          weather: { temp: 28, condition: 'sunny' },
          tasks: { count: 3, items: ['Review report', 'Team call'] },
          calendar: { count: 2, items: ['Standup 10 AM', 'Review 3 PM'] },
          insights: ['You\'re more productive in the mornings']
        }
      }
    });
  }
});

// ==================== MEMORY OPERATIONS ====================

/**
 * Store memory
 */
app.post('/api/memory',requireAuth, async (req, res) => {
  const { userId, content, type = 'general' } = req.body;

  if (!userId || !content) {
    return res.status(400).json({ success: false, error: 'userId and content required' });
  }

  try {
    await axios.post(`${SERVICE_URLS.memory}/api/memory`, { userId, content, type });
    res.json({ success: true, message: 'Memory stored' });
  } catch (error) {
    logger.error('Failed to store memory', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get memories
 */
app.get('/api/memory/:userId', async (req, res) => {
  const { userId } = req.params;
  const { type, limit = 50 } = req.query;

  try {
    const response = await axios.get(`${SERVICE_URLS.memory}/api/memory/${userId}`, {
      params: { type, limit }
    });
    res.json(response.data);
  } catch (error) {
    res.json({ success: true, memories: [], count: 0 });
  }
});

// ==================== SEARCH ====================

/**
 * Search across all services
 */
app.get('/api/search', async (req, res) => {
  const { q, userId, type = 'all' } = req.query;

  if (!q) {
    return res.status(400).json({ success: false, error: 'Query (q) is required' });
  }

  logger.info('Searching', { query: q, userId, type });

  try {
    const results = {
      query: q,
      timestamp: new Date().toISOString(),
      results: []
    };

    // Search memories
    if (type === 'all' || type === 'memory') {
      try {
        const memResponse = await axios.get(`${SERVICE_URLS.memory}/api/search`, {
          params: { q, userId }
        });
        if (memResponse.data.results) {
          results.results.push(...memResponse.data.results.map(r => ({ ...r, source: 'memory' })));
        }
      } catch {}
    }

    // Search calendar
    if (type === 'all' || type === 'calendar') {
      try {
        const calResponse = await axios.get(`${SERVICE_URLS.calendar}/api/search`, {
          params: { q, userId }
        });
        if (calResponse.data.results) {
          results.results.push(...calResponse.data.results.map(r => ({ ...r, source: 'calendar' })));
        }
      } catch {}
    }

    res.json({ success: true, ...results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== BROADCAST (TwinOS) ====================

/**
 * Broadcast event to all twins
 */
app.post('/api/broadcast',requireAuth, async (req, res) => {
  const { userId, event, data } = req.body;

  if (!userId || !event) {
    return res.status(400).json({ success: false, error: 'userId and event required' });
  }

  try {
    await axios.post(`${SERVICE_URLS.twins}/api/broadcast`, { userId, event, data });
    res.json({ success: true, message: 'Event broadcasted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SERVICE REGISTRY ====================

/**
 * Get all connected services
 */
app.get('/api/services', (req, res) => {
  res.json({
    success: true,
    services: Object.entries(SERVICE_URLS).map(([name, url]) => ({
      name,
      url: url.replace('http://', '').replace('https://', ''),
      status: 'configured'
    })),
    gateway: {
      name: 'genie-gateway',
      version: '1.0.0',
      port: PORT
    }
  });
});

// ==================== ERROR HANDLER ====================

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { requestId: req.requestId, error: err.message });
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
  });
});

// ==================== START ====================

const server = app.listen(PORT, () => {
  logger.info(`Genie Gateway started on port ${PORT}`);
  logger.info(`Connected services:`, Object.keys(SERVICE_URLS));
});
installGracefulShutdown(server);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  process.exit(0);
});

module.exports = app;
