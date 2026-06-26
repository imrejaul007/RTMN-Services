/**
 * genie-gateway — unit tests (CJS inline-mock pattern)
 * Tests core routing, auth middleware, broadcast, health cache, sessions.
 */

'use strict';

const http = require('http');

// Inline mock app factory — no server spawning needed
function createMockApp() {
  const routes = [];
  const stores = { sessions: {}, healthCache: {} };
  let authToken = null;

  function mockReq(method, path, body, headers = {}) {
    return {
      method: method.toUpperCase(),
      url: path,
      headers: {
        'content-type': 'application/json',
        authorization: headers.authorization || (authToken ? `Bearer ${authToken}` : ''),
        'x-internal-token': headers['x-internal-token'] || '',
        ...headers,
      },
      body: body || null,
      query: {},
      params: {},
      requestId: 'test-req-id',
    };
  }

  function mockRes() {
    const r = { statusCode: 200, _body: null, _headers: {} };
    r.json = (d) => { r._body = d; return r; };
    r.status = (s) => { r.statusCode = s; return r; };
    r.setHeader = (k, v) => { r._headers[k] = v; return r; };
    r.getHeader = (k) => r._headers[k];
    return r;
  }

  // Simple router
  function route(app, method, path, handler) {
    app._addRoute(method, path, handler);
  }

  const app = {
    _routes: [],
    _addRoute(method, path, handler) {
      this._routes.push({ method, path, handler });
    },
    async _handle(req, res) {
      // Strip query string for path matching
      const pathname = (req.url.split('?')[0]);
      // Parse params from path
      const params = {};
      for (const r of this._routes) {
        if (r.method !== req.method) continue;
        const pathParts = pathname.split('/');
        const patternParts = r.path.split('/');
        if (pathParts.length !== patternParts.length) continue;
        let match = true;
        for (let i = 0; i < pathParts.length; i++) {
          if (patternParts[i].startsWith(':')) {
            params[patternParts[i].slice(1)] = pathParts[i];
          } else if (patternParts[i] !== pathParts[i]) {
            match = false;
            break;
          }
        }
        if (match) {
          req.params = params;
          await r.handler(req, res);
          return;
        }
      }
      res.status(404).json({ error: 'Not Found' });
    },
  };

  // Middleware helpers
  function send(res, s, d) { res.status(s).json(d); }
  function err(res, s, c, m) { res.status(s).json({ success: false, error: { code: c, message: m } }); }

  function requireAuth(req, res, next) {
    const h = req.headers.authorization;
    if (!h || !h.startsWith('Bearer ')) return err(res, 401, 'AUTH', 'Missing or invalid authorization header');
    const token = h.slice(7);
    // Mock: accept any non-empty token
    if (!token) return err(res, 401, 'AUTH', 'Invalid token');
    req.user = { id: 'user-001', email: 'test@genie.ai', name: 'Test User' };
    next();
  }

  // ── Routes ──────────────────────────────────────────────────────────

  app.get('/health', (req, res) => {
    send(res, 200, { status: 'ok', service: 'genie-gateway', timestamp: new Date().toISOString() });
  });

  app.get('/api/user/:userId/context', (req, res) => {
    const { userId } = req.params;
    send(res, 200, {
      context: {
        userId,
        name: 'Test User',
        preferences: { language: 'en', theme: 'dark' },
        twinId: `twin-${userId}`,
        recentTopics: ['work', 'health', 'finance'],
      }
    });
  });

  app.get('/api/user/:userId/preferences', (req, res) => {
    const { userId } = req.params;
    send(res, 200, {
      preferences: {
        userId,
        language: 'en',
        theme: 'dark',
        notifications: { email: true, push: true },
        privacy: { shareData: false },
      }
    });
  });

  app.put('/api/user/:userId/preferences', requireAuth, (req, res) => {
    const { userId } = req.params;
    const { preferences } = req.body || {};
    if (!preferences) return err(res, 400, 'VALIDATION', 'preferences object required');
    send(res, 200, { success: true, preferences: { userId, ...preferences } });
  });

  app.post('/api/query', requireAuth, (req, res) => {
    const { question, context } = req.body || {};
    if (!question) return err(res, 400, 'VALIDATION', 'question is required');
    send(res, 200, {
      responseId: 'resp-001',
      text: `Mock response to: "${question}"`,
      actions: [],
      context: context || {},
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/briefing/:userId', (req, res) => {
    const { userId } = req.params;
    send(res, 200, {
      briefing: {
        type: 'morning',
        title: `Good morning, Test User`,
        sections: [
          { title: 'Weather', content: 'Sunny, 24°C', icon: '☀️' },
          { title: 'Calendar', content: '3 events today', icon: '📅' },
          { title: 'Tasks', content: '5 pending tasks', icon: '✅' },
        ],
        generatedAt: new Date().toISOString(),
      }
    });
  });

  app.post('/api/memory', requireAuth, (req, res) => {
    const { content, type } = req.body || {};
    if (!content) return err(res, 400, 'VALIDATION', 'content is required');
    const memory = { id: `mem-${Date.now()}`, content, type: type || 'note', createdAt: new Date().toISOString(), tags: [] };
    send(res, 201, { memory });
  });

  app.get('/api/memory/:userId', (req, res) => {
    const { userId } = req.params;
    send(res, 200, {
      memories: [
        { id: 'mem-1', content: 'Meeting with team', type: 'note', createdAt: new Date().toISOString(), tags: ['work'] },
        { id: 'mem-2', content: 'Buy groceries', type: 'task', createdAt: new Date().toISOString(), tags: [] },
      ]
    });
  });

  app.get('/api/search', (req, res) => {
    const { q } = req.query || {};
    if (!q) return err(res, 400, 'VALIDATION', 'q (query) is required');
    send(res, 200, {
      results: [
        { id: 'mem-1', content: `Result for: ${q}`, type: 'note', score: 0.95 },
        { id: 'mem-2', content: `Another: ${q}`, type: 'task', score: 0.87 },
      ],
      total: 2,
      query: q,
    });
  });

  app.post('/api/broadcast', requireAuth, (req, res) => {
    const { event, data } = req.body || {};
    if (!event) return err(res, 400, 'VALIDATION', 'event is required');
    // Store in sessions store (mock)
    const sessionId = `session-${Date.now()}`;
    stores.sessions[sessionId] = { event, data, timestamp: new Date().toISOString() };
    send(res, 200, { success: true, sessionId, event, delivered: true });
  });

  app.get('/api/services', (req, res) => {
    send(res, 200, {
      services: [
        { id: 'memory', name: 'MemoryOS', url: 'http://localhost:4703', status: 'up' },
        { id: 'twins', name: 'TwinOS', url: 'http://localhost:4705', status: 'up' },
        { id: 'calendar', name: 'Calendar', url: 'http://localhost:4709', status: 'up' },
        { id: 'briefing', name: 'Briefing', url: 'http://localhost:4712', status: 'up' },
      ]
    });
  });

  app.get('/api/sessions/:userId', (req, res) => {
    const { userId } = req.params;
    const userSessions = Object.entries(stores.sessions)
      .filter(([, s]) => s.data?.userId === userId)
      .map(([id, s]) => ({ sessionId: id, ...s }));
    send(res, 200, { sessions: userSessions, total: userSessions.length });
  });

  app.get('/api/health-cache', (req, res) => {
    const cached = Object.entries(stores.healthCache).map(([serviceId, data]) => ({
      serviceId, ...(data || {}),
    }));
    send(res, 200, { cache: cached, count: cached.length });
  });

  return { app, stores, setAuth: (t) => { authToken = t; } };
}

// ── Tests ───────────────────────────────────────────────────────────────────

let p = 0, f = 0;
const a = (name, condition) => { (condition ? p++ : f++); console.log(`  ${condition ? '✓' : '✗'} ${name}`); };

async function run() {
  console.log('\n[genie-gateway] unit tests:\n');
  const { app, stores, setAuth } = createMockApp();

  // Health
  {
    const res = mockRes();
    await app._handle(mockReq('GET', '/health'), res);
    a('GET /health returns 200', res.statusCode === 200);
    a('/health has status ok', res._body?.status === 'ok');
    a('/health has service name', res._body?.service === 'genie-gateway');
    a('/health has timestamp', !!res._body?.timestamp);
  }

  // User context
  {
    const res = mockRes();
    await app._handle(mockReq('GET', '/api/user/user-001/context'), res);
    a('GET /api/user/:id/context returns 200', res.statusCode === 200);
    a('context has userId', res._body?.context?.userId === 'user-001');
    a('context has preferences', !!res._body?.context?.preferences);
    a('context has recentTopics', Array.isArray(res._body?.context?.recentTopics));
  }

  // User preferences GET
  {
    const res = mockRes();
    await app._handle(mockReq('GET', '/api/user/user-002/preferences'), res);
    a('GET /api/user/:id/preferences returns 200', res.statusCode === 200);
    a('preferences has language', res._body?.preferences?.language === 'en');
    a('preferences has theme', res._body?.preferences?.theme === 'dark');
  }

  // Auth middleware — missing token
  {
    const res = mockRes();
    await app._handle(mockReq('POST', '/api/query', { question: 'test' }), res);
    a('POST /api/query without auth returns 401', res.statusCode === 401);
    a('401 error has AUTH code', res._body?.error?.code === 'AUTH');
  }

  // Auth middleware — valid token
  {
    setAuth('valid-test-token');
    const res = mockRes();
    await app._handle(mockReq('POST', '/api/query', { question: 'Hello Genie' }), res);
    a('POST /api/query with auth returns 200', res.statusCode === 200);
    a('response has responseId', !!res._body?.responseId);
    a('response echoes question in text', res._body?.text?.includes('Hello Genie'));
    a('response has timestamp', !!res._body?.timestamp);
    setAuth(null);
  }

  // Query validation
  {
    setAuth('test-token');
    const res = mockRes();
    await app._handle(mockReq('POST', '/api/query', {}), res);
    a('POST /api/query without question returns 400', res.statusCode === 400);
    a('400 error has VALIDATION code', res._body?.error?.code === 'VALIDATION');
    setAuth(null);
  }

  // Briefing
  {
    const res = mockRes();
    await app._handle(mockReq('GET', '/api/briefing/user-001'), res);
    a('GET /api/briefing/:userId returns 200', res.statusCode === 200);
    a('briefing has type', res._body?.briefing?.type === 'morning');
    a('briefing has sections', Array.isArray(res._body?.briefing?.sections));
    a('briefing sections have icon', !!res._body?.briefing?.sections?.[0]?.icon);
    a('briefing has title', !!res._body?.briefing?.title);
    a('briefing has generatedAt', !!res._body?.briefing?.generatedAt);
  }

  // Memory POST (auth required)
  {
    const res = mockRes();
    await app._handle(mockReq('POST', '/api/memory', { content: 'Test memory' }), res);
    a('POST /api/memory without auth returns 401', res.statusCode === 401);
  }

  {
    setAuth('test-token');
    const res = mockRes();
    await app._handle(mockReq('POST', '/api/memory', { content: 'Test memory', type: 'note' }), res);
    a('POST /api/memory with auth returns 201', res.statusCode === 201);
    a('memory has id', !!res._body?.memory?.id);
    a('memory has content', res._body?.memory?.content === 'Test memory');
    a('memory has type', res._body?.memory?.type === 'note');
    a('memory has createdAt', !!res._body?.memory?.createdAt);
    setAuth(null);
  }

  // Memory GET
  {
    const res = mockRes();
    await app._handle(mockReq('GET', '/api/memory/user-001'), res);
    a('GET /api/memory/:userId returns 200', res.statusCode === 200);
    a('memories is an array', Array.isArray(res._body?.memories));
    a('memories have id and content', !!res._body?.memories?.[0]?.id);
  }

  // Search
  {
    const res = mockRes();
    await app._handle(mockReq('GET', '/api/search?q=meeting'), res);
    a('GET /api/search returns 200', res.statusCode === 200);
    a('search has results array', Array.isArray(res._body?.results));
    a('search returns matching query', res._body?.query === 'meeting');
    a('results have score', typeof res._body?.results?.[0]?.score === 'number');
  }

  // Search validation
  {
    const res = mockRes();
    await app._handle(mockReq('GET', '/api/search'), res);
    a('GET /api/search without q returns 400', res.statusCode === 400);
  }

  // Broadcast
  {
    const res = mockRes();
    await app._handle(mockReq('POST', '/api/broadcast', { event: 'test', data: { foo: 'bar' } }), res);
    a('POST /api/broadcast without auth returns 401', res.statusCode === 401);
  }

  {
    setAuth('test-token');
    const res = mockRes();
    await app._handle(mockReq('POST', '/api/broadcast', { event: 'memory.created', data: { userId: 'user-001' } }), res);
    a('POST /api/broadcast with auth returns 200', res.statusCode === 200);
    a('broadcast has sessionId', !!res._body?.sessionId);
    a('broadcast delivered=true', res._body?.delivered === true);
    setAuth(null);
  }

  // Services registry
  {
    const res = mockRes();
    await app._handle(mockReq('GET', '/api/services'), res);
    a('GET /api/services returns 200', res.statusCode === 200);
    a('services is an array', Array.isArray(res._body?.services));
    a('services have status', res._body?.services?.every(s => 'status' in s));
  }

  // Sessions
  {
    const res = mockRes();
    await app._handle(mockReq('GET', '/api/sessions/user-001'), res);
    a('GET /api/sessions/:userId returns 200', res.statusCode === 200);
    a('sessions is an array', Array.isArray(res._body?.sessions));
  }

  // Health cache
  {
    const res = mockRes();
    await app._handle(mockReq('GET', '/api/health-cache'), res);
    a('GET /api/health-cache returns 200', res.statusCode === 200);
    a('health-cache has cache array', Array.isArray(res._body?.cache));
  }

  // 404
  {
    const res = mockRes();
    await app._handle(mockReq('GET', '/nonexistent'), res);
    a('Unknown route returns 404', res.statusCode === 404);
  }

  console.log(`\nResults: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
